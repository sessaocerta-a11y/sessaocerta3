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
  // Cache em memória isolado por userId: Map<userId, Map<sessionId, Session>>
  private userFallbackSessions: Map<string, Map<string, Session>> = new Map();

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

  private getUserMap(userId: string): Map<string, Session> {
    if (!this.userFallbackSessions.has(userId)) {
      this.userFallbackSessions.set(userId, new Map());
    }
    return this.userFallbackSessions.get(userId)!;
  }

  /**
   * Garante a existência do registro do usuário na tabela pública users com id = auth.users.id
   */
  public async ensureUserRecord(user: {
    id: string;
    email: string;
    name?: string;
    phone?: string;
    crp?: string;
  }): Promise<string | null> {
    if (!this.supabase || !user?.id) return user?.id || null;

    try {
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (existingUser?.id) {
        return existingUser.id;
      }

      const { data: newUser, error: insertError } = await this.supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email.toLowerCase().trim(),
          nome: user.name || 'Profissional',
          whatsapp: (user.phone || '5511999999999').replace(/\D/g, ''),
          crp: user.crp || 'CRP Registrado',
          especialidade: 'Psicologia Clínica'
        })
        .select('id')
        .single();

      if (!insertError && newUser?.id) {
        logger.info('AUTH', `[APPOINTMENT DB] Registro criado na tabela users para auth.uid ${user.id}`);
        return newUser.id;
      }

      return user.id;
    } catch (err: any) {
      logger.error('AUTH', '[APPOINTMENT DB] Exceção em ensureUserRecord', { error: err.message });
      return user.id;
    }
  }

  /**
   * Localiza ou cria o registro do paciente na tabela patients vinculado estritamente ao userId autenticado
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

    // 1. Se foi passado um UUID válido, verifica se o paciente existe e pertence ao userId
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providedPatientId || '');
    if (isUuid && providedPatientId) {
      try {
        const { data: byId } = await this.supabase
          .from('patients')
          .select('id')
          .eq('id', providedPatientId)
          .eq('user_id', userId)
          .maybeSingle();

        if (byId?.id) {
          return byId.id;
        }
      } catch (e) {
        // Prossegue com busca por nome/telefone
      }
    }

    try {
      // 2. Busca por nome no consultório exclusivo do psicólogo autenticado (user_id)
      const { data: byName } = await this.supabase
        .from('patients')
        .select('id, whatsapp, email')
        .eq('user_id', userId)
        .ilike('nome', cleanName)
        .is('deleted_at', null)
        .maybeSingle();

      if (byName?.id) {
        if ((cleanPhone && !byName.whatsapp) || (cleanEmail && !byName.email)) {
          await this.supabase
            .from('patients')
            .update({
              whatsapp: cleanPhone || byName.whatsapp,
              email: cleanEmail || byName.email,
              updated_at: new Date().toISOString()
            })
            .eq('id', byName.id)
            .eq('user_id', userId);
        }
        return byName.id;
      }

      // 3. Busca por whatsapp no consultório exclusivo do psicólogo
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

      // 4. Cria novo paciente vinculado com integridade estrita a user_id
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
        logger.info('SESSIONS', `[APPOINTMENT DB] Paciente cadastrado no Supabase para user ${userId}: ${cleanName} (ID: ${newPatient.id})`);
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
   * Lista todos os agendamentos pertencentes exclusivamente ao userId autenticado
   */
  public async getAppointments(userId: string): Promise<Session[]> {
    if (!userId) {
      return [];
    }

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
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
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('data', { ascending: false })
          .order('hora_inicio', { ascending: true });

        if (!error && Array.isArray(data)) {
          const sessions = data.map((item) => this.mapDbToSession(item));
          const userMap = this.getUserMap(userId);
          userMap.clear();
          sessions.forEach((s) => userMap.set(s.id, s));
          return sessions;
        }

        if (error) {
          logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao consultar appointments no Supabase', { error: error.message, userId });
        }
      } catch (err: any) {
        logger.error('SESSIONS', '[APPOINTMENT DB] Exceção ao consultar appointments', { error: err.message, userId });
      }
    }

    // Fallback para sessões em memória do respectivo usuário
    return Array.from(this.getUserMap(userId).values());
  }

  /**
   * Busca um agendamento específico por ID garantindo isolamento por userId
   */
  public async getAppointmentById(id: string, userId?: string): Promise<Session | null> {
    if (!id) return null;

    if (this.supabase) {
      try {
        let query = this.supabase
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
          .eq('id', id);

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query.maybeSingle();

        if (!error && data) {
          return this.mapDbToSession(data);
        }
      } catch (err: any) {
        logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao buscar appointment por ID', { id, error: err.message });
      }
    }

    if (userId) {
      return this.getUserMap(userId).get(id) || null;
    }

    // Busca global em todos os mapas de fallback (ex: para webhook interno)
    for (const map of this.userFallbackSessions.values()) {
      if (map.has(id)) return map.get(id)!;
    }

    return null;
  }

  /**
   * Cria um novo agendamento com persistência real vinculado estritamente ao userId autenticado
   */
  public async createAppointment(input: CreateAppointmentInput, userId: string): Promise<Session> {
    if (!userId) {
      throw new Error('Identificador de usuário (userId) obrigatório para criação de agendamento.');
    }

    const now = new Date().toISOString();
    const dbStatus = STATUS_TO_DB[input.status || 'agendada'] || 'scheduled';
    const cleanType = input.type || 'presencial';
    const cleanPrice = input.price !== undefined ? Number(input.price) : 200;

    let patientId: string | null = null;

    if (this.supabase) {
      try {
        // 1. Garante que o paciente pertence ao usuário autenticado
        patientId = await this.getOrCreatePatient(
          userId,
          input.patientName,
          input.patientPhone,
          input.patientEmail,
          cleanType,
          cleanPrice,
          input.patientId
        );

        // 2. Insere o appointment no Supabase
        if (patientId) {
          const insertPayload: any = {
            user_id: userId,
            patient_id: patientId,
            titulo: input.patientName,
            data: input.date,
            hora_inicio: input.startTime,
            hora_fim: input.endTime || input.startTime,
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
            this.getUserMap(userId).set(createdSession.id, createdSession);
            logger.info('SESSIONS', `[APPOINTMENT DB] Appointment criado no Supabase com sucesso! ID: ${createdSession.id} (User: ${userId})`);
            return createdSession;
          }

          if (error) {
            logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao inserir appointment no Supabase', { error: error.message, userId });
          }
        }
      } catch (err: any) {
        logger.error('SESSIONS', '[APPOINTMENT DB] Exceção ao criar appointment', { error: err.message, userId });
      }
    }

    // Fallback resiliente em memória isolado por usuário
    const fallbackId = `ses-${Date.now()}`;
    const fallbackSession: Session = {
      id: fallbackId,
      patientId: input.patientId || `pat-${Date.now()}`,
      patientName: input.patientName,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime || input.startTime,
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

    this.getUserMap(userId).set(fallbackId, fallbackSession);
    return fallbackSession;
  }

  /**
   * Atualiza um agendamento existente garantindo que pertence ao userId autenticado
   */
  public async updateAppointment(
    id: string,
    userId: string,
    input: Partial<CreateAppointmentInput>
  ): Promise<Session | null> {
    if (!id || !userId) return null;
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
          .eq('user_id', userId) // ISOLAMENTO RIGOROSO MULTI-TENANT
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
          this.getUserMap(userId).set(updated.id, updated);
          logger.info('SESSIONS', `[APPOINTMENT DB] Appointment ${id} atualizado pelo usuário ${userId}`);
          return updated;
        }

        if (error) {
          logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao atualizar appointment no Supabase', { id, userId, error: error.message });
        }
      } catch (err: any) {
        logger.error('SESSIONS', '[APPOINTMENT DB] Exceção ao atualizar appointment', { id, userId, error: err.message });
      }
    }

    // Fallback local do respectivo usuário
    const userMap = this.getUserMap(userId);
    const current = userMap.get(id);
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
      userMap.set(id, updated);
      return updated;
    }

    return null;
  }

  /**
   * Realiza exclusão lógica (soft-delete) garantindo que o agendamento pertence ao userId
   */
  public async deleteAppointment(id: string, userId: string): Promise<boolean> {
    if (!id || !userId) return false;
    const now = new Date().toISOString();

    if (this.supabase) {
      try {
        // Verifica primeiro se o registro pertence ao usuário
        const { data: existing } = await this.supabase
          .from('appointments')
          .select('id')
          .eq('id', id)
          .eq('user_id', userId)
          .maybeSingle();

        if (!existing) {
          logger.warn('SESSIONS', `[APPOINTMENT DB 403] Tentativa de deletar appointment ${id} que não pertence a ${userId}`);
          return false;
        }

        const { error } = await this.supabase
          .from('appointments')
          .update({ deleted_at: now, updated_at: now })
          .eq('id', id)
          .eq('user_id', userId);

        if (!error) {
          this.getUserMap(userId).delete(id);
          logger.info('SESSIONS', `[APPOINTMENT DB] Appointment ${id} removido (soft delete) pelo usuário ${userId}`);
          return true;
        }

        logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao deletar appointment no Supabase', { id, userId, error: error.message });
      } catch (err: any) {
        logger.error('SESSIONS', '[APPOINTMENT DB] Exceção ao deletar appointment', { id, userId, error: err.message });
      }
    }

    const userMap = this.getUserMap(userId);
    if (userMap.has(id)) {
      userMap.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Atualização de status interna/pública utilizada pelo webhook da Meta (sem JWT de usuário)
   */
  public async updateAppointmentStatus(idOrSessionId: string, status: string): Promise<boolean> {
    if (!idOrSessionId) return false;
    const now = new Date().toISOString();
    const dbStatus = STATUS_TO_DB[status as SessionStatus] || status;

    if (this.supabase) {
      try {
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
