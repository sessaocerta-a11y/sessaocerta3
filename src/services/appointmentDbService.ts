import { SupabaseClient } from '@supabase/supabase-js';
import { getScopedSupabaseClient, getAdminSupabaseClient } from '../middleware/authMiddleware.js';
import { patientDbService } from './patientDbService.js';
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
  /**
   * Garante a existência do registro do usuário na tabela pública users com id = auth.users.id
   */
  public async ensureUserRecord(
    user: {
      id: string;
      email: string;
      name?: string;
      phone?: string;
      crp?: string;
    },
    token?: string
  ): Promise<string | null> {
    if (!user?.id) return null;

    const client = token ? getScopedSupabaseClient(token) : (getAdminSupabaseClient() || getScopedSupabaseClient(''));
    if (!client) return user.id;

    try {
      const { data: existingUser, error: selError } = await client
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (existingUser?.id) {
        return existingUser.id;
      }

      const emailVal = (user.email || '').toLowerCase().trim() || `${user.id}@sessaocerta.shop`;
      const phoneVal = (user.phone || '5511999999999').replace(/\D/g, '') || '5511999999999';

      const { data: newUser, error: insertError } = await client
        .from('users')
        .upsert({
          id: user.id,
          email: emailVal,
          nome: user.name || 'Profissional',
          whatsapp: phoneVal,
          crp: user.crp || 'CRP Registrado',
          especialidade: 'Psicologia Clínica',
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select('id')
        .single();

      if (!insertError && newUser?.id) {
        logger.info('AUTH', `[APPOINTMENT DB] Registro garantido na tabela users para auth.uid ${user.id}`);
        return newUser.id;
      }

      if (insertError) {
        logger.warn('AUTH', '[APPOINTMENT DB] Aviso ao inserir na tabela users (possível registro prévio)', { error: insertError.message });
      }

      return user.id;
    } catch (err: any) {
      logger.error('AUTH', '[APPOINTMENT DB] Exceção em ensureUserRecord', { error: err.message });
      return user.id;
    }
  }

  /**
   * Converte registro da tabela appointments do Supabase para a interface Session do frontend
   */
  public mapDbToSession(record: any): Session {
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
   * Lista todos os agendamentos pertencentes exclusivamente ao userId autenticado via cliente com JWT
   */
  public async getAppointments(token: string, userId: string): Promise<Session[]> {
    if (!token || !userId) {
      throw new Error('Token de autenticação e userId são obrigatórios para listar agendamentos.');
    }

    const client = getScopedSupabaseClient(token);
    const { data, error } = await client
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
          telefone
        )
      `)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('data', { ascending: false })
      .order('hora_inicio', { ascending: true });

    if (error) {
      logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao consultar appointments no Supabase', { error: error.message, userId });
      throw new Error(`Erro ao consultar agendamentos no banco de dados: ${error.message}`);
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item) => this.mapDbToSession(item));
  }

  /**
   * Busca um agendamento específico por ID garantindo isolamento por userId
   */
  public async getAppointmentById(token: string, userId: string, id: string): Promise<Session | null> {
    if (!token || !userId || !id) return null;

    const client = getScopedSupabaseClient(token);
    const { data, error } = await client
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
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao buscar appointment por ID', { id, userId, error: error.message });
      throw new Error(`Erro ao buscar agendamento: ${error.message}`);
    }

    if (!data) return null;
    return this.mapDbToSession(data);
  }

  /**
   * Cria um novo agendamento com persistência real vinculado estritamente ao userId autenticado.
   * Não utiliza fallback falso; se falhar no banco, lança erro com a mensagem exata.
   */
  public async createAppointment(
    token: string,
    userId: string,
    input: CreateAppointmentInput
  ): Promise<Session> {
    if (!token || !userId) {
      throw new Error('Identificador de usuário (userId) e token são obrigatórios para criação de agendamento.');
    }

    if (!input.patientName || !input.date || !input.startTime) {
      throw new Error('Campos obrigatórios ausentes: Nome do paciente, Data e Horário.');
    }

    const client = getScopedSupabaseClient(token);

    // 1. Garante que o usuário existe na tabela users
    await this.ensureUserRecord({
      id: userId,
      email: input.userEmail || '',
      name: input.userName,
      phone: input.userPhone
    }, token);

    // 2. Resolve o UUID real do paciente na tabela patients
    let patientUuid: string | null = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.patientId || '');

    if (isUuid && input.patientId) {
      const { data: existingPatient } = await client
        .from('patients')
        .select('id')
        .eq('id', input.patientId)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingPatient?.id) {
        patientUuid = existingPatient.id;
      }
    }

    // Se não encontrou por UUID direto, busca por nome/whatsapp ou cria o paciente de forma definitiva
    if (!patientUuid) {
      const cleanName = input.patientName.trim();
      const cleanPhone = (input.patientPhone || '').replace(/\D/g, '');
      const cleanEmail = (input.patientEmail || '').trim().toLowerCase();

      // Tenta localizar por nome no consultório do profissional
      const { data: byName } = await client
        .from('patients')
        .select('id')
        .eq('user_id', userId)
        .ilike('nome', cleanName)
        .is('deleted_at', null)
        .maybeSingle();

      if (byName?.id) {
        patientUuid = byName.id;
      } else {
        // Cria o paciente no Supabase com persistência real
        const createdPatient = await patientDbService.createPatient(token, userId, {
          name: cleanName,
          cpf: '',
          birthDate: '',
          phone: cleanPhone || '5511999999999',
          email: cleanEmail,
          emergencyContactName: 'Contato de Emergência',
          emergencyContactPhone: cleanPhone || '5511999999999',
          status: 'ativo',
          attendanceType: input.type || 'presencial',
          sessionPrice: input.price !== undefined ? Number(input.price) : 200
        });
        patientUuid = createdPatient.id;
      }
    }

    if (!patientUuid) {
      throw new Error('Não foi possível associar ou criar o registro do paciente no banco de dados.');
    }

    const now = new Date().toISOString();
    const dbStatus = STATUS_TO_DB[input.status || 'agendada'] || 'scheduled';
    const cleanType = input.type || 'presencial';
    const cleanPrice = input.price !== undefined ? Number(input.price) : 200;

    const insertPayload: any = {
      user_id: userId,
      patient_id: patientUuid,
      titulo: input.patientName.trim(),
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

    const { data, error } = await client
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

    if (error || !data) {
      const errMsg = error?.message || 'Falha ao inserir registro de agendamento.';
      logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao inserir appointment no Supabase', { error: errMsg, userId });
      throw new Error(`Falha ao persistir agendamento no Supabase: ${errMsg}`);
    }

    const createdSession = this.mapDbToSession(data);
    logger.info('SESSIONS', `[APPOINTMENT DB] Agendamento criado com sucesso no Supabase! UUID: ${createdSession.id} (User: ${userId})`);
    return createdSession;
  }

  /**
   * Atualiza um agendamento existente garantindo que pertence ao userId autenticado
   */
  public async updateAppointment(
    token: string,
    userId: string,
    id: string,
    input: Partial<CreateAppointmentInput>
  ): Promise<Session | null> {
    if (!token || !id || !userId) return null;
    const now = new Date().toISOString();
    const client = getScopedSupabaseClient(token);

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
    if (input.patientName) updatePayload.titulo = input.patientName.trim();

    const { data, error } = await client
      .from('appointments')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userId)
      .is('deleted_at', null)
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

    if (error) {
      logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao atualizar appointment no Supabase', { id, userId, error: error.message });
      throw new Error(`Falha ao atualizar agendamento no Supabase: ${error.message}`);
    }

    if (!data) return null;
    return this.mapDbToSession(data);
  }

  /**
   * Realiza exclusão lógica (soft-delete) garantindo que o agendamento pertence ao userId
   */
  public async deleteAppointment(token: string, userId: string, id: string): Promise<boolean> {
    if (!token || !id || !userId) return false;
    const now = new Date().toISOString();
    const client = getScopedSupabaseClient(token);

    const { data, error } = await client
      .from('appointments')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) {
      logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao deletar appointment no Supabase', { id, userId, error: error.message });
      throw new Error(`Falha ao excluir agendamento no Supabase: ${error.message}`);
    }

    return Boolean(data?.id);
  }

  /**
   * Atualização de status interna/pública utilizada pelo webhook da Meta
   */
  public async updateAppointmentStatus(idOrSessionId: string, status: string): Promise<boolean> {
    if (!idOrSessionId) return false;
    const now = new Date().toISOString();
    const dbStatus = STATUS_TO_DB[status as SessionStatus] || status;
    const adminClient = getAdminSupabaseClient() || getScopedSupabaseClient('');

    try {
      const { data, error } = await adminClient
        .from('appointments')
        .update({ status: dbStatus, updated_at: now })
        .eq('id', idOrSessionId)
        .select('id')
        .maybeSingle();

      if (!error && data?.id) {
        logger.info('SESSIONS', `[APPOINTMENT DB] Status do appointment ${idOrSessionId} atualizado para ${dbStatus}`);
        return true;
      }

      const { error: err2 } = await adminClient
        .from('appointments')
        .update({ status: dbStatus, updated_at: now })
        .or(`token_confirmacao.eq.${idOrSessionId},token_reagendamento.eq.${idOrSessionId}`);

      if (!err2) return true;
    } catch (err: any) {
      logger.error('SESSIONS', '[APPOINTMENT DB] Erro ao atualizar status do appointment', { id: idOrSessionId, error: err.message });
    }

    return false;
  }
}

export const appointmentDbService = new AppointmentDbService();
