import { SupabaseClient } from '@supabase/supabase-js';
import { getScopedSupabaseClient } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';
import { Patient, PatientStatus, AttendanceType } from '../types/index.js';

export interface CreatePatientInput {
  name: string;
  cpf?: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  status?: PatientStatus;
  attendanceType?: AttendanceType;
  sessionPrice?: number;
  preferredSchedule?: string;
  initialAnamnesis?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  country?: string;
  notes?: string;
}

export class PatientDbService {
  /**
   * Converte registro do Supabase (tabela patients) para o modelo Patient do frontend
   */
  public mapDbToPatient(record: any): Patient {
    let extraData: any = {};
    if (record.observacoes_administrativas) {
      try {
        if (record.observacoes_administrativas.startsWith('{')) {
          extraData = JSON.parse(record.observacoes_administrativas);
        } else {
          extraData = { notes: record.observacoes_administrativas };
        }
      } catch {
        extraData = { notes: record.observacoes_administrativas };
      }
    }

    const cleanDate = (d?: string) => {
      if (!d) return '';
      return d.split('T')[0];
    };

    return {
      id: record.id,
      name: record.nome || 'Paciente sem nome',
      cpf: record.cpf || '',
      birthDate: cleanDate(record.data_nascimento),
      phone: record.whatsapp || record.telefone || '',
      email: record.email || '',
      emergencyContactName: record.nome_contato_emergencia || '',
      emergencyContactPhone: record.telefone_contato_emergencia || '',
      status: (record.status as PatientStatus) || 'ativo',
      attendanceType: (record.attendance_type as AttendanceType) || 'presencial',
      sessionPrice: Number(record.session_price) || 200,
      preferredSchedule: extraData.preferredSchedule || undefined,
      initialAnamnesis: extraData.initialAnamnesis || undefined,
      city: extraData.city || undefined,
      state: extraData.state || undefined,
      neighborhood: extraData.neighborhood || undefined,
      country: extraData.country || 'Brasil',
      notes: extraData.notes || undefined,
      changeHistory: extraData.changeHistory || undefined,
      createdAt: cleanDate(record.created_at) || new Date().toISOString().split('T')[0]
    };
  }

  /**
   * Converte dados parciais ou completos de Patient para o formato de inserção/atualização no PostgreSQL
   */
  private mapPatientToDb(patientData: Partial<Patient>): any {
    const payload: any = {};

    if (patientData.name !== undefined) payload.nome = patientData.name.trim();
    if (patientData.cpf !== undefined) payload.cpf = patientData.cpf ? patientData.cpf.trim() : null;
    if (patientData.birthDate !== undefined) payload.data_nascimento = patientData.birthDate || null;
    if (patientData.phone !== undefined) {
      const clean = patientData.phone.replace(/\D/g, '');
      payload.telefone = clean || null;
      payload.whatsapp = clean || '5511999999999';
    }
    if (patientData.email !== undefined) payload.email = patientData.email ? patientData.email.trim().toLowerCase() : null;
    if (patientData.emergencyContactName !== undefined) payload.nome_contato_emergencia = patientData.emergencyContactName ? patientData.emergencyContactName.trim() : null;
    if (patientData.emergencyContactPhone !== undefined) payload.telefone_contato_emergencia = patientData.emergencyContactPhone ? patientData.emergencyContactPhone.trim() : null;
    if (patientData.status !== undefined) payload.status = patientData.status;
    if (patientData.attendanceType !== undefined) payload.attendance_type = patientData.attendanceType;
    if (patientData.sessionPrice !== undefined) payload.session_price = Number(patientData.sessionPrice);

    // Agrupa campos adicionais em observacoes_administrativas como JSON
    const hasExtras = 
      patientData.preferredSchedule !== undefined ||
      patientData.initialAnamnesis !== undefined ||
      patientData.city !== undefined ||
      patientData.state !== undefined ||
      patientData.neighborhood !== undefined ||
      patientData.country !== undefined ||
      patientData.notes !== undefined ||
      patientData.changeHistory !== undefined;

    if (hasExtras) {
      payload.observacoes_administrativas = JSON.stringify({
        preferredSchedule: patientData.preferredSchedule,
        initialAnamnesis: patientData.initialAnamnesis,
        city: patientData.city,
        state: patientData.state,
        neighborhood: patientData.neighborhood,
        country: patientData.country || 'Brasil',
        notes: patientData.notes,
        changeHistory: patientData.changeHistory
      });
    }

    return payload;
  }

  /**
   * Lista todos os pacientes ativos ou cadastrados para o usuário autenticado (filtrado por user_id via RLS e query)
   */
  public async listPatients(token: string, userId: string): Promise<Patient[]> {
    if (!token || !userId) {
      throw new Error('Token de autenticação e userId são obrigatórios.');
    }

    const client = getScopedSupabaseClient(token);
    const { data, error } = await client
      .from('patients')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('nome', { ascending: true });

    if (error) {
      logger.error('PATIENTS', '[PATIENT DB] Erro ao listar pacientes no Supabase', { error: error.message, userId });
      throw new Error(`Erro ao consultar pacientes: ${error.message}`);
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((row) => this.mapDbToPatient(row));
  }

  /**
   * Obtém um paciente por UUID garantindo que pertence estritamente ao userId autenticado
   */
  public async getPatientById(token: string, userId: string, patientId: string): Promise<Patient | null> {
    if (!token || !userId || !patientId) return null;

    const client = getScopedSupabaseClient(token);
    const { data, error } = await client
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      logger.error('PATIENTS', '[PATIENT DB] Erro ao buscar paciente por ID', { error: error.message, patientId, userId });
      throw new Error(`Erro ao buscar paciente: ${error.message}`);
    }

    if (!data) return null;

    return this.mapDbToPatient(data);
  }

  /**
   * Cria um novo paciente persistido no Supabase, vinculado obrigatoriamente a userId
   */
  public async createPatient(
    token: string,
    userId: string,
    patientData: Omit<Patient, 'id' | 'createdAt'>
  ): Promise<Patient> {
    if (!token || !userId) {
      throw new Error('Autenticação necessária para cadastrar paciente.');
    }

    if (!patientData.name || !patientData.name.trim()) {
      throw new Error('O nome do paciente é obrigatório.');
    }

    const client = getScopedSupabaseClient(token);
    const now = new Date().toISOString();
    const dbPayload = {
      ...this.mapPatientToDb(patientData),
      user_id: userId,
      status: patientData.status || 'ativo',
      attendance_type: patientData.attendanceType || 'presencial',
      session_price: patientData.sessionPrice !== undefined ? Number(patientData.sessionPrice) : 200,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await client
      .from('patients')
      .insert(dbPayload)
      .select('*')
      .single();

    if (error || !data) {
      const errMsg = error?.message || 'Falha desconhecida ao inserir paciente.';
      logger.error('PATIENTS', '[PATIENT DB] Erro ao criar paciente no Supabase', { error: errMsg, userId });
      throw new Error(`Falha ao persistir paciente no banco de dados: ${errMsg}`);
    }

    const created = this.mapDbToPatient(data);
    logger.info('PATIENTS', `[PATIENT DB] Paciente cadastrado com sucesso no Supabase: ${created.name} (UUID: ${created.id}) para user ${userId}`);
    return created;
  }

  /**
   * Atualiza dados de um paciente existente garantindo proteção IDOR (apenas se user_id coincidir)
   */
  public async updatePatient(
    token: string,
    userId: string,
    patientId: string,
    patientData: Partial<Patient>
  ): Promise<Patient | null> {
    if (!token || !userId || !patientId) {
      throw new Error('Parâmetros obrigatórios ausentes para atualização de paciente.');
    }

    const client = getScopedSupabaseClient(token);
    const now = new Date().toISOString();
    const updatePayload = {
      ...this.mapPatientToDb(patientData),
      updated_at: now
    };

    const { data, error } = await client
      .from('patients')
      .update(updatePayload)
      .eq('id', patientId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select('*')
      .maybeSingle();

    if (error) {
      logger.error('PATIENTS', '[PATIENT DB] Erro ao atualizar paciente no Supabase', { error: error.message, patientId, userId });
      throw new Error(`Falha ao atualizar paciente no Supabase: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const updated = this.mapDbToPatient(data);
    logger.info('PATIENTS', `[PATIENT DB] Paciente ${patientId} atualizado com sucesso no Supabase pelo user ${userId}`);
    return updated;
  }

  /**
   * Arquiva um paciente (altera status para 'arquivado')
   */
  public async archivePatient(token: string, userId: string, patientId: string): Promise<Patient | null> {
    return this.updatePatient(token, userId, patientId, { status: 'arquivado' });
  }

  /**
   * Exclusão lógica (soft-delete) do paciente, definindo deleted_at
   */
  public async deletePatient(token: string, userId: string, patientId: string): Promise<boolean> {
    if (!token || !userId || !patientId) return false;

    const client = getScopedSupabaseClient(token);
    const now = new Date().toISOString();

    const { data, error } = await client
      .from('patients')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', patientId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) {
      logger.error('PATIENTS', '[PATIENT DB] Erro ao deletar paciente no Supabase', { error: error.message, patientId, userId });
      throw new Error(`Falha ao deletar paciente no Supabase: ${error.message}`);
    }

    return Boolean(data?.id);
  }
}

export const patientDbService = new PatientDbService();
