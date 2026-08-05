import 'dotenv/config';
import { Resend } from 'resend';
import { logger } from '../../utils/logger';
import { emailAuditDb } from '../emailAuditDb';
import {
  SendEmailResult,
  WelcomeEmailOptions,
  VerificationEmailOptions,
  PasswordResetOptions,
  PasswordChangedOptions,
  SessionConfirmationOptions,
} from './types';
import {
  getWelcomeEmailTemplate,
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getPasswordChangedEmailTemplate,
  getSessionConfirmationEmailTemplate,
} from './emailTemplates';

/**
 * Helper para obter a instância do cliente Resend utilizando estritamente a variável de ambiente.
 * Nunca utiliza chaves cadastradas diretamente no código-fonte.
 */
export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY || '';
  if (!apiKey) {
    logger.warn('RESEND_INTEGRATION', '[ResendService] RESEND_API_KEY não foi encontrada em process.env. Verifique o arquivo .env.');
  }
  return new Resend(apiKey);
}

/**
 * Instância exportada para retrocompatibilidade que reencaminha chamadas dinamicamente
 */
export const resendClient = new Proxy({} as Resend, {
  get(_target, prop: keyof Resend) {
    const client = getResendClient();
    const val = client[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  },
});

const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM || 'Sessão Certa <nao-responda@sessaocerta.shop>';

/**
 * Centralized Resend Service for Sessão Certa
 */
export class ResendService {
  /**
   * Helper privado para despacho seguro com auditoria e fallback gracioso
   */
  private static async sendEmailInternal(
    to: string,
    subject: string,
    html: string,
    text: string,
    category: string,
    meta?: Record<string, any>
  ): Promise<SendEmailResult> {
    const from = process.env.EMAIL_FROM || 'Sessão Certa <nao-responda@sessaocerta.shop>';
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      const missingKeyError = 'Variável de ambiente RESEND_API_KEY não encontrada no ambiente Vercel/Servidor.';
      logger.error('RESEND_INTEGRATION', `[ResendService] ${missingKeyError}`, { to, category });
      return {
        success: false,
        error: missingKeyError,
        provider: 'Resend',
      };
    }

    try {
      logger.info('EMAIL_DISPATCH', `[ResendService] Despachando e-mail de ${category} para ${to}`, {
        from,
        subject,
        meta,
        hasApiKey: true,
      });

      // Tentativa oficial usando o domínio oficial sessaocerta.shop (nao-responda@sessaocerta.shop)
      let response = await resendClient.emails.send({
        from,
        to: [to],
        subject,
        html,
        text,
        replyTo: 'nao-responda@sessaocerta.shop',
      });

      // Fallback de contingência caso o ambiente de testes exija onboarding@resend.dev
      if (response.error && response.error.message.toLowerCase().includes('domain')) {
        const fallbackFrom = 'Sessão Certa <onboarding@resend.dev>';
        logger.warn('RESEND_INTEGRATION', `[ResendService] Ajustando fallback temporário para ${fallbackFrom}`, {
          originalFrom: from,
          error: response.error.message,
        });

        response = await resendClient.emails.send({
          from: fallbackFrom,
          to: [to],
          subject,
          html,
          text,
          replyTo: 'nao-responda@sessaocerta.shop',
        });
      }

      if (response.error) {
        logger.error('RESEND_INTEGRATION', `[ResendService] Erro retornado pela API do Resend para ${to}`, {
          error: response.error.message,
          name: response.error.name,
        });

        return {
          success: false,
          error: response.error.message,
          provider: 'Resend',
        };
      }

      if (response.data?.id) {
        // Registra disparo no banco de dados de auditoria
        emailAuditDb.recordDispatch({
          emailId: response.data.id,
          to,
          from,
          subject,
          status: 'sent',
          provider: 'Resend API (sessaocerta.shop)',
          meta: { category, ...meta },
        });

        logger.info('EMAIL_DISPATCH', `[ResendService] E-mail despachado com sucesso. Message ID: ${response.data.id}`);
      }

      return {
        success: true,
        messageId: response.data?.id,
        provider: 'Resend (sessaocerta.shop)',
      };
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro inesperado na API do Resend';
      logger.error('RESEND_INTEGRATION', `[ResendService] Exceção crítica no envio para ${to}`, {
        exception: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        provider: 'Resend',
      };
    }
  }

  /**
   * 1. Envio de Boas-vindas após criar conta
   */
  public static async sendWelcomeEmail(opts: WelcomeEmailOptions): Promise<SendEmailResult> {
    const template = getWelcomeEmailTemplate(opts);
    return this.sendEmailInternal(
      opts.to,
      template.subject,
      template.html,
      template.text,
      'welcome',
      { name: opts.name }
    );
  }

  /**
   * 2. Envio de Verificação de E-mail / Código de Ativação
   */
  public static async sendVerificationEmail(opts: VerificationEmailOptions): Promise<SendEmailResult> {
    const template = getVerificationEmailTemplate(opts);
    return this.sendEmailInternal(
      opts.to,
      template.subject,
      template.html,
      template.text,
      'verification',
      { name: opts.name, code: opts.code }
    );
  }

  /**
   * 3. Envio de Recuperação de Senha
   */
  public static async sendPasswordResetEmail(opts: PasswordResetOptions): Promise<SendEmailResult> {
    const template = getPasswordResetEmailTemplate(opts);
    return this.sendEmailInternal(
      opts.to,
      template.subject,
      template.html,
      template.text,
      'password_reset',
      { name: opts.name }
    );
  }

  /**
   * 4. Envio de Confirmação de Alteração de Senha
   */
  public static async sendPasswordChangedEmail(opts: PasswordChangedOptions): Promise<SendEmailResult> {
    const template = getPasswordChangedEmailTemplate(opts);
    return this.sendEmailInternal(
      opts.to,
      template.subject,
      template.html,
      template.text,
      'password_changed',
      { name: opts.name, ip: opts.ipAddress }
    );
  }

  /**
   * 5. Envio de Confirmação de Consulta
   */
  public static async sendSessionConfirmationEmail(opts: SessionConfirmationOptions): Promise<SendEmailResult> {
    const template = getSessionConfirmationEmailTemplate(opts);
    return this.sendEmailInternal(
      opts.to,
      template.subject,
      template.html,
      template.text,
      'session_confirmation',
      {
        patientName: opts.patientName,
        psychologistName: opts.psychologistName,
        date: opts.date,
        time: opts.time,
        type: opts.type,
      }
    );
  }
}
