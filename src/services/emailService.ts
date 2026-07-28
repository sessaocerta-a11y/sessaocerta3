import { Resend } from 'resend';
import { logger } from '../utils/logger';
import { emailAuditDb } from './emailAuditDb';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_jSXGQ2gF_Ap48f8dqgqEuoRPAAV6YjBzY';
export const resend = new Resend(RESEND_API_KEY);

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

/**
 * Envia o e-mail transacional de verificação de cadastro para o usuário.
 * 
 * @param to Endereço de e-mail do destinatário
 * @param name Nome do usuário
 * @param code Código de 6 dígitos gerado
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  code: string
): Promise<SendEmailResult> {
  const recipientName = name || 'Profissional';
  const subject = 'Seu código de verificação • Sessão Certa';
  const from = process.env.RESEND_FROM_EMAIL || 'Sessão Certa <sessaocerta@gmail.com>';

  const plainText = `
Olá, ${recipientName}.

Recebemos uma solicitação para criar sua conta no Sessão Certa.

Utilize o código abaixo para confirmar seu endereço de e-mail.

# ${code}

Este código expira em 10 minutos.

Caso você não tenha solicitado este cadastro, basta ignorar esta mensagem.

Atenciosamente,

Equipe Sessão Certa

Tecnologia que organiza o cuidado humano.
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificação de E-mail • Sessão Certa</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 24px 12px; }
    .email-wrapper { max-width: 560px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); }
    .header { background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #065f46; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; background: #10b981; border-radius: 16px; margin-bottom: 12px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3); }
    .logo-text { font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; margin: 0; }
    .slogan { font-size: 13px; color: #a7f3d0; margin-top: 4px; font-weight: 500; }
    .body-content { padding: 32px 28px; }
    .greeting { font-size: 18px; font-weight: 700; color: #f3f4f6; margin-bottom: 12px; }
    .paragraph { font-size: 14px; color: #9ca3af; line-height: 1.6; margin-bottom: 24px; }
    .code-container { background-color: #030712; border: 2px dashed #10b981; border-radius: 16px; padding: 24px; text-align: center; margin: 28px 0; }
    .code-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #34d399; font-weight: 800; margin-bottom: 8px; }
    .code-number { font-size: 40px; font-weight: 900; color: #10b981; font-family: 'Courier New', Courier, monospace; letter-spacing: 8px; margin: 4px 0; }
    .code-timer { font-size: 12px; color: #6b7280; margin-top: 8px; }
    .signature { margin-top: 32px; pt: 20px; border-top: 1px solid #1f2937; padding-top: 20px; font-size: 13px; color: #9ca3af; line-height: 1.5; }
    .tagline { color: #10b981; font-weight: 600; font-style: italic; margin-top: 4px; font-size: 12px; }
    .footer { text-align: center; font-size: 11px; color: #4b5563; padding: 20px; background-color: #0b0f19; border-top: 1px solid #111827; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <div class="logo-badge">
        <span style="font-size: 28px; color: #ffffff;">❖</span>
      </div>
      <h1 class="logo-text">Sessão Certa</h1>
      <div class="slogan">Gestão Inteligente para Consultórios de Psicologia</div>
    </div>

    <div class="body-content">
      <div class="greeting">Olá, ${recipientName}.</div>
      
      <p class="paragraph">
        Recebemos uma solicitação para criar sua conta no <strong>Sessão Certa</strong>.
      </p>
      
      <p class="paragraph" style="margin-bottom: 0;">
        Utilize o código abaixo para confirmar seu endereço de e-mail:
      </p>

      <div class="code-container">
        <div class="code-label">Seu Código de Verificação</div>
        <div class="code-number">${code}</div>
        <div class="code-timer">⏱️ Este código expira em 10 minutos.</div>
      </div>

      <p class="paragraph">
        Caso você não tenha solicitado este cadastro, basta ignorar esta mensagem.
      </p>

      <div class="signature">
        Atenciosamente,<br>
        <strong style="color: #f3f4f6;">Equipe Sessão Certa</strong>
        <div class="tagline">Tecnologia que organiza o cuidado humano.</div>
      </div>
    </div>

    <div class="footer">
      Sessão Certa &copy; 2026 — sessaocerta@gmail.com<br>
      Este e-mail transacional foi gerado automaticamente.
    </div>
  </div>
</body>
</html>
`.trim();

  try {
    logger.info('EMAIL_DISPATCH', `Iniciando envio de e-mail de verificação para ${to}`, { recipientName, from });

    // Tentativa com o remetente oficial solicitado
    let response = await resend.emails.send({
      from,
      to: [to],
      subject,
      text: plainText,
      html: htmlContent,
      replyTo: 'sessaocerta@gmail.com',
    });

    // Caso o domínio sessaocerta@gmail.com não possua DKIM/SPF verificado no painel do Resend,
    // o Resend exige o uso do remetente onboarding@resend.dev para entregas sem falha em contas gratuitas/teste.
    if (response.error && response.error.message.toLowerCase().includes('domain')) {
      logger.warn('RESEND_INTEGRATION', 'Domínio de remetente não verificado no Resend. Aplicando fallback para onboarding@resend.dev', {
        originalFrom: from,
        resendError: response.error.message
      });
      response = await resend.emails.send({
        from: 'Sessão Certa <onboarding@resend.dev>',
        to: [to],
        subject,
        text: plainText,
        html: htmlContent,
        replyTo: 'sessaocerta@gmail.com',
      });
    }

    if (response.error) {
      logger.error('RESEND_INTEGRATION', `Falha no envio de e-mail via Resend para ${to}`, {
        error: response.error.message,
        code: response.error.name
      });
      return {
        success: false,
        error: response.error.message,
        provider: 'Resend',
      };
    }

    if (response.data?.id) {
      emailAuditDb.recordDispatch({
        emailId: response.data.id,
        to,
        from,
        subject,
        status: 'sent',
        provider: 'Resend Transactional API',
        meta: { recipientName, code }
      });
    }

    logger.info('EMAIL_DISPATCH', `E-mail de verificação entregue com sucesso para ${to}`, {
      messageId: response.data?.id,
      recipient: to
    });

    return {
      success: true,
      messageId: response.data?.id,
      provider: 'Resend',
    };
  } catch (err: any) {
    logger.error('RESEND_INTEGRATION', `Exceção crítica durante o processamento do e-mail para ${to}`, {
      exception: err.message || err
    });
    return {
      success: false,
      error: err.message || 'Erro desconhecido ao enviar e-mail',
      provider: 'Resend',
    };
  }
}
