import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

export type WhatsAppSessionStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'reschedule_requested';

export interface WhatsAppSessionRecord {
  id: string;
  session_id: string;
  patient_phone: string;
  patient_name: string;
  psychologist_name: string;
  session_date: string;
  session_time: string;
  status: WhatsAppSessionStatus;
  created_at: string;
  updated_at: string;
}

export interface RegisterSessionInput {
  sessionId: string;
  patientPhone: string;
  patientName: string;
  psychologistName?: string;
  date: string;
  time: string;
  status?: WhatsAppSessionStatus | 'pending';
}

// Arquivo de persistência local como fallback/backup resiliente
const LOCAL_DB_FILE = path.join(process.cwd(), '.data_whatsapp_sessions.json');

interface LocalFileStore {
  sessionsById: Record<string, WhatsAppSessionRecord>;
  sessionsByPhone: Record<string, WhatsAppSessionRecord>;
  processedMessages: Record<string, string>;
}

class WhatsAppDbService {
  private supabase: SupabaseClient | null = null;
  private memoryCache: LocalFileStore = {
    sessionsById: {},
    sessionsByPhone: {},
    processedMessages: {}
  };

  constructor() {
    this.initSupabase();
    this.loadLocalFile();
  }

  private initSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        logger.info('WHATSAPP', '[WHATSAPP DB] Cliente Supabase inicializado com sucesso.');
      } catch (err: any) {
        logger.error('WHATSAPP', '[WHATSAPP DB] Erro ao inicializar Supabase client', { error: err.message });
      }
    } else {
      logger.info('WHATSAPP', '[WHATSAPP DB] Supabase URL/Key não configurados. Utilizando armazenamento persistente em arquivo local.');
    }
  }

  private loadLocalFile() {
    try {
      if (fs.existsSync(LOCAL_DB_FILE)) {
        const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.memoryCache = {
          sessionsById: parsed.sessionsById || {},
          sessionsByPhone: parsed.sessionsByPhone || {},
          processedMessages: parsed.processedMessages || {}
        };
      }
    } catch (err) {
      // Se falhar ao ler, mantemos estrutura inicial
    }
  }

  private saveLocalFile() {
    try {
      const dir = path.dirname(LOCAL_DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(this.memoryCache, null, 2), 'utf-8');
    } catch (err) {
      // Falha silenciosa para gravação
    }
  }

  /**
   * Normaliza o status da sessão para os valores aceitos
   */
  private normalizeStatus(inputStatus?: string): WhatsAppSessionStatus {
    if (inputStatus === 'confirmed') return 'confirmed';
    if (inputStatus === 'cancelled') return 'cancelled';
    if (inputStatus === 'reschedule_requested') return 'reschedule_requested';
    return 'scheduled';
  }

  /**
   * Registra uma nova sessão no armazenamento persistente
   */
  public async registerSession(input: RegisterSessionInput): Promise<WhatsAppSessionRecord> {
    const cleanPhone = input.patientPhone.replace(/\D/g, '');
    const now = new Date().toISOString();
    const status = this.normalizeStatus(input.status);

    const record: WhatsAppSessionRecord = {
      id: `wasess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      session_id: input.sessionId,
      patient_phone: cleanPhone,
      patient_name: input.patientName,
      psychologist_name: input.psychologistName || 'Dra. Fernanda',
      session_date: input.date,
      session_time: input.time,
      status,
      created_at: now,
      updated_at: now
    };

    // 1. Atualizar arquivo local / cache em disco
    this.memoryCache.sessionsById[record.session_id] = record;
    this.memoryCache.sessionsByPhone[cleanPhone] = record;
    this.saveLocalFile();

    // 2. Se Supabase estiver ativo, persista no banco
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('whatsapp_sessions')
          .upsert({
            session_id: record.session_id,
            patient_phone: record.patient_phone,
            patient_name: record.patient_name,
            psychologist_name: record.psychologist_name,
            session_date: record.session_date,
            session_time: record.session_time,
            status: record.status,
            updated_at: now
          }, { onConflict: 'session_id' });

        if (error) {
          logger.error('WHATSAPP', '[WHATSAPP DB] Erro ao registrar sessão no Supabase', { error: error.message });
        }
      } catch (err: any) {
        logger.error('WHATSAPP', '[WHATSAPP DB] Exceção ao salvar no Supabase', { error: err.message });
      }
    }

    const logMsg = `[WHATSAPP SESSION] Sessão registrada (ID: ${record.session_id}, Paciente: ${record.patient_name}, Telefone: ${cleanPhone})`;
    console.log(logMsg);
    logger.info('WHATSAPP', logMsg, { sessionId: record.session_id, status: record.status });

    return record;
  }

  /**
   * Consulta os dados da sessão pelo sessionId no armazenamento persistente
   */
  public async getSessionData(sessionId: string): Promise<WhatsAppSessionRecord | undefined> {
    if (!sessionId) return undefined;

    // Tentar consultar no Supabase primeiro se disponível
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle();

        if (!error && data) {
          const record: WhatsAppSessionRecord = {
            id: data.id || sessionId,
            session_id: data.session_id,
            patient_phone: data.patient_phone,
            patient_name: data.patient_name,
            psychologist_name: data.psychologist_name || 'Dra. Fernanda',
            session_date: data.session_date,
            session_time: data.session_time,
            status: this.normalizeStatus(data.status),
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString()
          };

          const logMsg = `[WHATSAPP SESSION] Sessão localizada (ID: ${sessionId})`;
          console.log(logMsg);
          logger.info('WHATSAPP', logMsg, { sessionId, status: record.status });
          return record;
        }
      } catch (err) {
        // Fallback para arquivo local
      }
    }

    // Backup em arquivo local
    const localRecord = this.memoryCache.sessionsById[sessionId];
    if (localRecord) {
      const logMsg = `[WHATSAPP SESSION] Sessão localizada (ID: ${sessionId})`;
      console.log(logMsg);
      logger.info('WHATSAPP', logMsg, { sessionId, status: localRecord.status });
      return localRecord;
    }

    const notFoundLog = `[WHATSAPP SESSION] Sessão não encontrada (ID: ${sessionId})`;
    console.log(notFoundLog);
    logger.warn('WHATSAPP', notFoundLog, { sessionId });
    return undefined;
  }

  /**
   * Consulta os dados da sessão pelo telefone do paciente no armazenamento persistente
   */
  public async getSessionDataByPhone(phone: string): Promise<WhatsAppSessionRecord | undefined> {
    if (!phone) return undefined;
    const cleanPhone = phone.replace(/\D/g, '');

    // Tentar consultar no Supabase se disponível
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('patient_phone', cleanPhone)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          const record: WhatsAppSessionRecord = {
            id: data.id || data.session_id,
            session_id: data.session_id,
            patient_phone: data.patient_phone,
            patient_name: data.patient_name,
            psychologist_name: data.psychologist_name || 'Dra. Fernanda',
            session_date: data.session_date,
            session_time: data.session_time,
            status: this.normalizeStatus(data.status),
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString()
          };

          const logMsg = `[WHATSAPP SESSION] Sessão localizada por telefone (${cleanPhone})`;
          console.log(logMsg);
          logger.info('WHATSAPP', logMsg, { phone: cleanPhone, sessionId: record.session_id });
          return record;
        }
      } catch (err) {
        // Fallback
      }
    }

    // Backup em arquivo local
    const localRecord = this.memoryCache.sessionsByPhone[cleanPhone];
    if (localRecord) {
      const logMsg = `[WHATSAPP SESSION] Sessão localizada por telefone (${cleanPhone})`;
      console.log(logMsg);
      logger.info('WHATSAPP', logMsg, { phone: cleanPhone, sessionId: localRecord.session_id });
      return localRecord;
    }

    const notFoundLog = `[WHATSAPP SESSION] Sessão não encontrada para o telefone (${cleanPhone})`;
    console.log(notFoundLog);
    logger.warn('WHATSAPP', notFoundLog, { phone: cleanPhone });
    return undefined;
  }

  /**
   * Atualiza o status da sessão no armazenamento persistente
   */
  public async updateSessionStatus(sessionId: string, newStatus: WhatsAppSessionStatus): Promise<boolean> {
    const now = new Date().toISOString();
    const session = await this.getSessionData(sessionId);

    if (session) {
      session.status = newStatus;
      session.updated_at = now;

      this.memoryCache.sessionsById[sessionId] = session;
      this.memoryCache.sessionsByPhone[session.patient_phone] = session;
      this.saveLocalFile();

      if (this.supabase) {
        try {
          await this.supabase
            .from('whatsapp_sessions')
            .update({ status: newStatus, updated_at: now })
            .eq('session_id', sessionId);
        } catch (err) {
          // Erro tratado silenciosamente
        }
      }

      const logMsg = `[WHATSAPP SESSION] Status atualizado (ID: ${sessionId}, Novo Status: ${newStatus})`;
      console.log(logMsg);
      logger.info('WHATSAPP', logMsg, { sessionId, newStatus });
      return true;
    }

    return false;
  }

  /**
   * Verifica se o message.id (wamid) já foi processado no banco de dados persistente
   */
  public async isMessageProcessed(messageId: string): Promise<boolean> {
    if (!messageId || messageId === 'sem_id') return false;

    // 1. Checar no Supabase se disponível
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('whatsapp_processed_messages')
          .select('message_id')
          .eq('message_id', messageId)
          .maybeSingle();

        if (!error && data) {
          return true;
        }
      } catch (err) {
        // Fallback
      }
    }

    // 2. Checar no arquivo local
    return Boolean(this.memoryCache.processedMessages[messageId]);
  }

  /**
   * Registra o message.id no armazenamento persistente para idempotência
   */
  public async recordProcessedMessage(messageId: string): Promise<void> {
    if (!messageId || messageId === 'sem_id') return;

    const now = new Date().toISOString();

    // 1. Salvar no arquivo local
    this.memoryCache.processedMessages[messageId] = now;
    this.saveLocalFile();

    // 2. Salvar no Supabase se disponível
    if (this.supabase) {
      try {
        await this.supabase
          .from('whatsapp_processed_messages')
          .upsert({ message_id: messageId, processed_at: now }, { onConflict: 'message_id' });
      } catch (err) {
        // Fallback
      }
    }
  }
}

export const whatsappDbService = new WhatsAppDbService();
