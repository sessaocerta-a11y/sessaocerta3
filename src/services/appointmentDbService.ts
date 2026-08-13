import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';
import { Session, SessionStatus, PaymentStatus, AttendanceType } from '../types/index.js';

export interface CreateAppointmentInput {
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes?: number;
  type?: AttendanceType;
  videoUrl?: string;
  price?: number;
  status?: SessionStatus;
  paymentStatus?: PaymentStatus;
  clinicalNotes?: string;
  moodRating?: number;
  homework?: string;
  topicsAddressed?: string[];
  whatsappReminderSent?: boolean;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
}

// Mapeamento de Status entre o Frontend e o Enum PostgreSQL do Supabase
export const STATUS_TO_DB: Record<SessionStatus, string> = {
  agendada: 'scheduled',
  confirmada: 'confirmed',
  solicita_reagendamento: 'reschedule_requested',
  cancelada_paciente: 'cancelled_by_patient',
  cancelada_psicologo: 'cancelled_by_psychologist',
  realizada: 'completed',
  falta: 'no_show'
};

export const DB_TO_STATUS: Record<string, SessionStatus> = {
  scheduled: 'agendada',
  pending_confirmation: 'agendada',
  confirmed: 'confirmada',
  reschedule_requested: 'solicita_reagendamento',
  cancelled: 'cancelada_paciente',
  cancelled_by_patient: 'cancelada_paciente',
  cancelled_by_psychologist: 'cancelada_psicologo',
  completed: 'realizada',
  no_show: 'falta'
};

class AppointmentDbService {
  private supabase: SupabaseClient | null = null;
  private localFallbackSessions: Map<string, Session> = new Map();

  constructor() {
    this.initSupabase();
  }

  private initSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        logger.info('SESSIONS', '[APPOINTMENT DB] Cliente Supabase inicializado com sucesso.');
      } catch (err: any) {
        logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao inicializar Supabase client', { error: err.message });
      }
    } else {
      logger.info('SESSIONS', '[APPOINTMENT DB] Supabase URL/Key não configurados. Utilizando fallback em memória.');
    }
  }

  public isSupabaseConnected(): boolean {
    return Boolean(this.supabase);
  }

  /**
   * Localiza ou cria o registro do psicólogo na tabela users para manter integridade relacional
   */
  public async getOrCreateUser(email?: string, name?: string, phone?: string): Promise<string | null> {
    if (!this.supabase) return null;
    const userEmail = (email || 'sessaocerta@gmail.com').toLowerCase().trim();
    const userName = name || 'Dra. Fernanda';
    const userPhone = (phone || '5511999999999').replace(/\D/g, '');

    try {
      // 1. Tenta buscar usuário existente pelo e-mail
      const { data: existingUser, error: findError } = await this.supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .maybeSingle();

      if (!findError && existingUser?.id) {
        return existingUser.id;
      }

      // 2. Se não existir, insere um novo usuário
      const { data: newUser, error: insertError } = await this.supabase
        .from('users')
        .insert({
          email: userEmail,
          nome: userName,
          whatsapp: userPhone || '5511999999999',
          crp: 'CRP 06/142859',
          especialidade: 'Terapia Cognitivo-Comportamental'
        })
        .select('id')
        .single();

      if (!insertError && newUser?.id) {
        return newUser.id;
      }

      logger.warn('SESSIONS', '[APPOINTMENT DB] Falha ao criar usuário na tabela users', { error: insertError?.message });
      return null;
    } catch (err: any) {
      logger.error('SESSIONS', '[APPOINTMENT DB] Exceção em getOrCreateUser', { error: err.message });
      return null;
    }
  }

  /**
   * Localiza ou cria o registro do paciente na tabela patients para garantir patient_id válido
   */
  public async getOrCreatePatient(
    userId: string,
    patientName: string,
    patientPhone?: string,
    patientEmail?: string,
    attendanceType: AttendanceType = 'presencial',
    sessionPrice: number = 200,
    providedPatientId?: string
  ): Promise<string | null> {
    if (!this.supabase) return null;
    const cleanPhone = (patientPhone || '').replace(/\D/g, '');
    const cleanEmail = (patientEmail || '').trim().toLowerCase();
    const cleanName = (patientName || 'Paciente').trim();

    // 1. Se foi passado um UUID válido, verifica se o paciente existe com este ID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providedPatientId || '');
    if (isUuid && providedPatientId) {
      try {
        const { data: byId } = await this.supabase
          .from('patients')
          .select('id')
          .eq('id', providedPatientId)
          .maybeSingle();

        if (byId?.id) {
          return byId.id;
        }
      } catch (e) {
        // Prossegue com busca por nome/telefone
      }
    }

    try {
      // 2. Busca por nome no mesmo consultório (user_id)
      const { data: byName } = await this.supabase
        .from('patients')
        .select('id, whatsapp, email')
        .eq('user_id', userId)
        .ilike('nome', cleanName)
        .is('deleted_at', null)
        .maybeSingle();

      if (byName?.id) {
        // Se encontramos o paciente e temos novo telefone/email, atualizamos se necessário
        if ((cleanPhone && !byName.whatsapp) || (cleanEmail && !byName.email)) {
          await this.supabase
            .from('patients')
            .update({
              whatsapp: cleanPhone || byName.whatsapp,
              email: cleanEmail || byName.email,
              updated_at: new Date().toISOString()
            })
            .eq('id', byName.id);
        }
        return byName.id;
      }

      // 3. Se não encontrar por nome, busca por whatsapp (se fornecido)
      if (cleanPhone) {
        const { data: byPhone } = await this.supabase
          .from('patients')
          .select('id')
          .eq('user_id', userId)
          .eq('whatsapp', cleanPhone)
          .is('deleted_at', null)
          .maybeSingle();

        if (byPhone?.id) {
          return byPhone.id;
        }
      }

      // 4. Se não existe, cria novo paciente com integridade referencial
      const { data: newPatient, error: insertErr } = await this.supabase
        .from('patients')
        .insert({
          user_id: userId,
          nome: cleanName,
          whatsapp: cleanPhone || '5511999999999',
          telefone: cleanPhone || null,
          email: cleanEmail || null,
          attendance_type: attendanceType,
          session_price: sessionPrice,
          status: 'ativo'
        })
        .select('id')
        .single();

      if (!insertErr && newPatient?.id) {
        logger.info('SESSIONS', `[APPOINTMENT DB] Paciente cadastrado no Supabase: ${cleanName} (ID: ${newPatient.id})`);
        return newPatient.id;
      }

      logger.warn('SESSIONS', '[APPOINTMENT DB] Erro ao inserir paciente', { error: insertErr?.message });
      return null;
    } catch (err: any) {
      logger.error('SESSIONS', '[APPOINTMENT DB] Exceção em getOrCreatePatient', { error: err.message });
      return null;
    }
  }

  /**
   * Converte registro da tabela appointments do Supabase para a interface Session do frontend
   */
  private mapDbToSession(record: any): Session {
    const rawStatus = record.status || 'scheduled';
    const frontendStatus = DB_TO_STATUS[rawStatus] || 'agendada';

    // Formata horários para HH:mm
    const formatTime = (t?: string) => {
      if (!t) return '10:00';
      return t.length >= 5 ? t.substring(0, 5) : t;
    };

    const patientName = record.patients?.nome || record.titulo || 'Paciente';
    const patientId = record.patient_id || record.patients?.id || '';

    return {
      id: record.id,
      patientId: patientId,
      patientName: patientName,
      date: record.data,
      startTime: formatTime(record.hora_inicio),
      endTime: formatTime(record.hora_fim),
      durationMinutes: record.duracao_minutos || 50,
      type: (record.modalidade as AttendanceType) || 'presencial',
      videoUrl: record.video_url || undefined,
      price: Number(record.valor) || 200,
      status: frontendStatus,
      paymentStatus: (record.payment_status as PaymentStatus) || 'pendente',
      clinicalNotes: record.clinical_notes || undefined,
      moodRating: record.mood_rating || undefined,
      homework: record.homework || undefined,
      whatsappReminderSent: Boolean(record.whatsapp_reminder_sent),
      whatsappReminderDate: record.updated_at
    };
  }

  /**
   * Lista todos os agendamentos ativos da tabela appointments do Supabase
   */
  public async getAppointments(userEmail?: string): Promise<Session[]> {
    if (this.supabase) {
      try {
        let query = this.supabase
          .from('appointments')
          .select(`
            id,
            user_id,
            patient_id,
            series_id,
            titulo,
            data,
            hora_inicio,
            hora_fim,
            duracao_minutos,
            modalidade,
            video_url,
            valor,
            status,
            payment_status,
            clinical_notes,
            mood_rating,
            homework,
            whatsapp_reminder_sent,
            created_at,
            updated_at,
            deleted_at,
            patients (
              id,
              nome,
              whatsapp,
              email,
              phone: telefone
            )
          `)
          .is('deleted_at', null)
          .order('data', { ascending: false })
          .order('hora_inicio', { ascending: true });

        const { data, error } = await query;

        if (!error && Array.isArray(data)) {
          const sessions = data.map((item) => this.mapDbToSession(item));
          // Atualiza cache em memória
          sessions.forEach((s) => this.localFallbackSessions.set(s.id, s));
          return sessions;
        }

        if (error) {
          logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao consultar appointments no Supabase', { error: error.message });
        }
      } catch (err: any) {
        logger.error('SESSIONS', '[APPOINTMENT DB] Exceção ao consultar appointments', { error: err.message });
      }
    }

    // Fallback para sessões em memória
    return Array.from(this.localFallbackSessions.values());
  }

  /**
   * Busca um agendamento específico por ID
   */
  public async getAppointmentById(id: string): Promise<Session | null> {
    if (!id) return null;

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('appointments')
          .select(`
            *,
            patients (
              id,
              nome,
              whatsapp,
              email,
              telefone
            )
          `)
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          return this.mapDbToSession(data);
        }
      } catch (err: any) {
        logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao buscar appointment por ID', { id, error: err.message });
      }
    }

    return this.localFallbackSessions.get(id) || null;
  }

  /**
   * Cria um novo agendamento com persistência real na tabela appointments do Supabase
   */
  public async createAppointment(input: CreateAppointmentInput): Promise<Session> {
    const now = new Date().toISOString();
    const dbStatus = STATUS_TO_DB[input.status || 'agendada'] || 'scheduled';
    const cleanType = input.type || 'presencial';
    const cleanPrice = input.price !== undefined ? Number(input.price) : 200;

    let userId: string | null = null;
    let patientId: string | null = null;

    if (this.supabase) {
      try {
        // 1. Garante integridade do usuário (psicólogo)
        userId = await this.getOrCreateUser(input.userEmail, input.userName, input.userPhone);

        // 2. Garante integridade do paciente (tabela patients)
        if (userId) {
          patientId = await this.getOrCreatePatient(
            userId,
            input.patientName,
            input.patientPhone,
            input.patientEmail,
            cleanType,
            cleanPrice,
            input.patientId
          );
        }

        // 3. Insere o appointment no Supabase
        if (userId && patientId) {
          const insertPayload: any = {
            user_id: userId,
            patient_id: patientId,
            titulo: input.patientName,
            data: input.date,
            hora_inicio: input.startTime,
            hora_fim: input.endTime,
            duracao_minutos: input.durationMinutes || 50,
            modalidade: cleanType,
            video_url: cleanType === 'online' ? input.videoUrl : null,
            valor: cleanPrice,
            status: dbStatus,
            payment_status: input.paymentStatus || 'pendente',
            clinical_notes: input.clinicalNotes || null,
            mood_rating: input.moodRating || null,
            homework: input.homework || null,
            whatsapp_reminder_sent: Boolean(input.whatsappReminderSent),
            created_at: now,
            updated_at: now
          };

          const { data, error } = await this.supabase
            .from('appointments')
            .insert(insertPayload)
            .select(`
              *,
              patients (
                id,
                nome,
                whatsapp,
                email,
                telefone
              )
            `)
            .single();

          if (!error && data) {
            const createdSession = this.mapDbToSession(data);
            this.localFallbackSessions.set(createdSession.id, createdSession);
            logger.info('SESSIONS', `[APPOINTMENT DB] Appointment criado no Supabase com sucesso! ID: ${createdSession.id}`);
            return createdSession;
          }

          if (error) {
            logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao inserir appointment no Supabase', { error: error.message });
          }
        }
      } catch (err: any) {
        logger.error('SESSIONS', '[APPOINTMENT DB] Exceção ao criar appointment', { error: err.message });
      }
    }

    // Fallback resiliente caso Supabase não esteja disponível
    const fallbackId = `ses-${Date.now()}`;
    const fallbackSession: Session = {
      id: fallbackId,
      patientId: input.patientId || `pat-${Date.now()}`,
      patientName: input.patientName,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes: input.durationMinutes || 50,
      type: cleanType,
      videoUrl: cleanType === 'online' ? input.videoUrl : undefined,
      price: cleanPrice,
      status: input.status || 'agendada',
      paymentStatus: input.paymentStatus || 'pendente',
      clinicalNotes: input.clinicalNotes,
      moodRating: input.moodRating,
      homework: input.homework,
      whatsappReminderSent: Boolean(input.whatsappReminderSent),
      whatsappReminderDate: now
    };

    this.localFallbackSessions.set(fallbackId, fallbackSession);
    return fallbackSession;
  }

  /**
   * Atualiza um agendamento existente no Supabase
   */
  public async updateAppointment(id: string, input: Partial<CreateAppointmentInput>): Promise<Session | null> {
    if (!id) return null;
    const now = new Date().toISOString();

    if (this.supabase) {
      try {
        const updatePayload: any = {
          updated_at: now
        };

        if (input.date) updatePayload.data = input.date;
        if (input.startTime) updatePayload.hora_inicio = input.startTime;
        if (input.endTime) updatePayload.hora_fim = input.endTime;
        if (input.durationMinutes) updatePayload.duracao_minutos = input.durationMinutes;
        if (input.type) updatePayload.modalidade = input.type;
        if (input.videoUrl !== undefined) updatePayload.video_url = input.videoUrl;
        if (input.price !== undefined) updatePayload.valor = Number(input.price);
        if (input.status) updatePayload.status = STATUS_TO_DB[input.status] || input.status;
        if (input.paymentStatus) updatePayload.payment_status = input.paymentStatus;
        if (input.clinicalNotes !== undefined) updatePayload.clinical_notes = input.clinicalNotes;
        if (input.moodRating !== undefined) updatePayload.mood_rating = input.moodRating;
        if (input.homework !== undefined) updatePayload.homework = input.homework;
        if (input.whatsappReminderSent !== undefined) updatePayload.whatsapp_reminder_sent = input.whatsappReminderSent;
        if (input.patientName) updatePayload.titulo = input.patientName;

        const { data, error } = await this.supabase
          .from('appointments')
          .update(updatePayload)
          .eq('id', id)
          .select(`
            *,
            patients (
              id,
              nome,
              whatsapp,
              email,
              telefone
            )
          `)
          .maybeSingle();

        if (!error && data) {
          const updated = this.mapDbToSession(data);
          this.localFallbackSessions.set(updated.id, updated);
          logger.info('SESSIONS', `[APPOINTMENT DB] Appointment ${id} atualizado no Supabase`);
          return updated;
        }

        if (error) {
          logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao atualizar appointment no Supabase', { id, error: error.message });
        }
      } catch (err: any) {
        logger.error('SESSIONS', '[APPOINTMENT DB] Exceção ao atualizar appointment', { id, error: err.message });
      }
    }

    // Fallback local
    const current = this.localFallbackSessions.get(id);
    if (current) {
      const updated: Session = {
        ...current,
        patientName: input.patientName || current.patientName,
        date: input.date || current.date,
        startTime: input.startTime || current.startTime,
        endTime: input.endTime || current.endTime,
        durationMinutes: input.durationMinutes ?? current.durationMinutes,
        type: input.type || current.type,
        videoUrl: input.videoUrl !== undefined ? input.videoUrl : current.videoUrl,
        price: input.price !== undefined ? Number(input.price) : current.price,
        status: input.status || current.status,
        paymentStatus: input.paymentStatus || current.paymentStatus,
        clinicalNotes: input.clinicalNotes !== undefined ? input.clinicalNotes : current.clinicalNotes,
        moodRating: input.moodRating !== undefined ? input.moodRating : current.moodRating,
        homework: input.homework !== undefined ? input.homework : current.homework,
        whatsappReminderSent: input.whatsappReminderSent !== undefined ? input.whatsappReminderSent : current.whatsappReminderSent,
        whatsappReminderDate: now
      };
      this.localFallbackSessions.set(id, updated);
      return updated;
    }

    return null;
  }

  /**
   * Realiza exclusão lógica (soft-delete) ou física de agendamento na tabela appointments
   */
  public async deleteAppointment(id: string): Promise<boolean> {
    if (!id) return false;
    const now = new Date().toISOString();

    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('appointments')
          .update({ deleted_at: now, updated_at: now })
          .eq('id', id);

        if (!error) {
          this.localFallbackSessions.delete(id);
          logger.info('SESSIONS', `[APPOINTMENT DB] Appointment ${id} removido (soft delete) no Supabase`);
          return true;
        }

        logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao deletar appointment no Supabase', { id, error: error.message });
      } catch (err: any) {
        logger.error('SESSIONS', '[APPOINTMENT DB] Exceção ao deletar appointment', { id, error: err.message });
      }
    }

    this.localFallbackSessions.delete(id);
    return true;
  }

  /**
   * Atualiza diretamente o status do appointment no Supabase (usado pelos webhooks do WhatsApp)
   */
  public async updateAppointmentStatus(idOrSessionId: string, status: string): Promise<boolean> {
    if (!idOrSessionId) return false;
    const now = new Date().toISOString();
    const dbStatus = STATUS_TO_DB[status as SessionStatus] || status;

    if (this.supabase) {
      try {
        // Tenta atualizar diretamente por ID
        const { data, error } = await this.supabase
          .from('appointments')
          .update({ status: dbStatus, updated_at: now })
          .eq('id', idOrSessionId)
          .select('id')
          .maybeSingle();

        if (!error && data?.id) {
          logger.info('SESSIONS', `[APPOINTMENT DB] Status do appointment ${idOrSessionId} atualizado para ${dbStatus}`);
          return true;
        }

        // Se o idOrSessionId for um ID customizado (ex: ses-123...), tenta buscar também por token ou correlação
        const { error: err2 } = await this.supabase
          .from('appointments')
          .update({ status: dbStatus, updated_at: now })
          .or(`token_confirmacao.eq.${idOrSessionId},token_reagendamento.eq.${idOrSessionId}`);

        if (!err2) {
          return true;
        }
      } catch (err: any) {
        logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao atualizar status do appointment', { id: idOrSessionId, error: err.message });
      }
    }

    return false;
  }
}

export const appointmentDbService = new AppointmentDbService();
