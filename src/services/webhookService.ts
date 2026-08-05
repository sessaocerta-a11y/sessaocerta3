import { emailAuditDb, EmailAuditRecord } from './emailAuditDb.js';
import { logger } from '../utils/logger.js';

export interface ResendWebhookPayload {
  created_at?: string;
  type: string;
  data: {
    email_id?: string;
    id?: string;
    to?: string[] | string;
    from?: string;
    subject?: string;
    created_at?: string;
    error?: {
      message?: string;
      name?: string;
    };
    [key: string]: any;
  };
}

export interface WebhookProcessResult {
  success: boolean;
  message: string;
  eventType?: string;
  emailId?: string;
  record?: EmailAuditRecord | null;
  error?: string;
}

/**
 * Processa eventos de webhook do Resend (como 'email.delivered', 'email.failed', 'email.bounced')
 * e atualiza o banco de dados de auditoria para acompanhamento de entregabilidade.
 */
export function processResendWebhook(payload: ResendWebhookPayload): WebhookProcessResult {
  if (!payload || !payload.type || !payload.data) {
    logger.warn('RESEND_INTEGRATION', 'Webhook ignorado: Payload do Resend malformado ou ausente.');
    return {
      success: false,
      message: 'Payload inválido ou ausente.',
      error: 'Payload malformado'
    };
  }

  const eventType = payload.type;
  const emailId = payload.data.email_id || payload.data.id;

  if (!emailId) {
    logger.warn('RESEND_INTEGRATION', 'Webhook recebido sem identificador de e-mail (email_id ou id).', { payload });
    return {
      success: false,
      message: 'Identificador de e-mail não encontrado no payload.',
      eventType,
      error: 'ID do e-mail ausente'
    };
  }

  logger.info('RESEND_INTEGRATION', `Webhook Resend recebido [${eventType}] para ID: ${emailId}`, {
    emailId,
    eventType,
    to: payload.data.to,
    subject: payload.data.subject
  });

  // Atualiza o banco de auditoria
  const record = emailAuditDb.updateStatusFromWebhook(payload);

  // Registro de auditoria conforme o resultado de entregabilidade
  if (eventType === 'email.failed' || eventType === 'email.bounced') {
    logger.error('RESEND_INTEGRATION', `Falha de entregabilidade ou Bounce registrado para e-mail ID ${emailId}`, {
      emailId,
      eventType,
      to: payload.data.to,
      errorDetails: payload.data.error || 'E-mail rejeitado ou não entregue'
    });
  } else if (eventType === 'email.delivered') {
    logger.audit('EMAIL_DISPATCH', `Confirmação de entrega em caixa de entrada para o e-mail ID ${emailId}`, {
      emailId,
      to: payload.data.to,
      timestamp: payload.created_at
    });
  }

  return {
    success: true,
    message: `Evento '${eventType}' processado com sucesso para o e-mail ID ${emailId}.`,
    eventType,
    emailId,
    record
  };
}
