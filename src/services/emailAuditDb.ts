import { logger } from '../utils/logger';

export type EmailDeliveryStatus = 
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'delivery_delayed'
  | 'bounced'
  | 'complained'
  | 'opened'
  | 'clicked'
  | 'failed';

export interface EmailEventLog {
  type: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface EmailAuditRecord {
  id: string;
  emailId: string;
  to: string;
  from?: string;
  subject: string;
  status: EmailDeliveryStatus;
  provider: string;
  createdAt: string;
  updatedAt: string;
  events: EmailEventLog[];
  meta?: Record<string, any>;
}

class EmailAuditDatabase {
  private records: Map<string, EmailAuditRecord> = new Map();

  /**
   * Registra um novo e-mail despachado ou atualiza se já existir
   */
  public recordDispatch(data: {
    emailId: string;
    to: string;
    from?: string;
    subject: string;
    status?: EmailDeliveryStatus;
    provider?: string;
    meta?: Record<string, any>;
  }): EmailAuditRecord {
    const now = new Date().toISOString();
    const existing = this.records.get(data.emailId);

    if (existing) {
      existing.status = data.status || existing.status;
      existing.updatedAt = now;
      if (data.meta) {
        existing.meta = { ...existing.meta, ...data.meta };
      }
      existing.events.push({
        type: data.status || 'updated',
        timestamp: now,
        details: data.meta
      });
      return existing;
    }

    const initialStatus: EmailDeliveryStatus = data.status || 'sent';
    const newRecord: EmailAuditRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      emailId: data.emailId,
      to: data.to,
      from: data.from || 'Sessão Certa <sessaocerta@gmail.com>',
      subject: data.subject,
      status: initialStatus,
      provider: data.provider || 'Resend',
      createdAt: now,
      updatedAt: now,
      events: [
        {
          type: `email.${initialStatus}`,
          timestamp: now,
          details: { message: 'Registro inicial de despacho de e-mail.' }
        }
      ],
      meta: data.meta
    };

    this.records.set(data.emailId, newRecord);
    logger.audit('EMAIL_DISPATCH', `Novo e-mail registrado no banco de auditoria (ID: ${data.emailId})`, {
      to: data.to,
      subject: data.subject,
      status: initialStatus
    });

    return newRecord;
  }

  /**
   * Atualiza o status do e-mail recebido via Webhook do Resend
   */
  public updateStatusFromWebhook(webhookPayload: {
    type: string;
    created_at?: string;
    data: {
      email_id?: string;
      id?: string;
      to?: string[] | string;
      from?: string;
      subject?: string;
      [key: string]: any;
    };
  }): EmailAuditRecord | null {
    const emailId = webhookPayload.data?.email_id || webhookPayload.data?.id;
    if (!emailId) {
      logger.warn('RESEND_INTEGRATION', 'Webhook recebido sem email_id no payload', webhookPayload);
      return null;
    }

    const eventType = webhookPayload.type; // ex: email.sent, email.delivered, email.bounced
    const now = webhookPayload.created_at || new Date().toISOString();
    let normalizedStatus: EmailDeliveryStatus = 'sent';

    if (eventType.includes('delivered')) normalizedStatus = 'delivered';
    else if (eventType.includes('bounced')) normalizedStatus = 'bounced';
    else if (eventType.includes('complained')) normalizedStatus = 'complained';
    else if (eventType.includes('opened')) normalizedStatus = 'opened';
    else if (eventType.includes('clicked')) normalizedStatus = 'clicked';
    else if (eventType.includes('delayed')) normalizedStatus = 'delivery_delayed';
    else if (eventType.includes('failed')) normalizedStatus = 'failed';

    let record = this.records.get(emailId);

    if (!record) {
      // Se a notificação do webhook chegar antes ou se o e-mail não tiver registro prévio
      const recipient = Array.isArray(webhookPayload.data.to) 
        ? webhookPayload.data.to[0] 
        : (webhookPayload.data.to || 'Desconhecido');

      record = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        emailId,
        to: recipient,
        from: webhookPayload.data.from || 'Sessão Certa <sessaocerta@gmail.com>',
        subject: webhookPayload.data.subject || 'Notificação do Sistema',
        status: normalizedStatus,
        provider: 'Resend Webhook',
        createdAt: now,
        updatedAt: now,
        events: []
      };
      this.records.set(emailId, record);
    }

    record.status = normalizedStatus;
    record.updatedAt = new Date().toISOString();
    record.events.push({
      type: eventType,
      timestamp: now,
      details: webhookPayload.data
    });

    logger.info('RESEND_INTEGRATION', `Status de e-mail atualizado via Webhook: ${eventType} -> ${emailId}`, {
      emailId,
      to: record.to,
      newStatus: normalizedStatus
    });

    return record;
  }

  /**
   * Retorna todos os registros de auditoria de e-mail
   */
  public getAllRecords(limit = 100): EmailAuditRecord[] {
    return Array.from(this.records.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }

  /**
   * Obtém registro por emailId
   */
  public getByEmailId(emailId: string): EmailAuditRecord | undefined {
    return this.records.get(emailId);
  }
}

export const emailAuditDb = new EmailAuditDatabase();
