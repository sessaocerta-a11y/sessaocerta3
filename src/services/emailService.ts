import { ResendService } from './email/resendService';
import {
  SendEmailResult,
  WelcomeEmailOptions,
  VerificationEmailOptions,
  PasswordResetOptions,
  PasswordChangedOptions,
  SessionConfirmationOptions,
} from './email/types';

export { resendClient as resend } from './email/resendService';
export * from './email/types';
export { ResendService } from './email/resendService';

/**
 * Função de retrocompatibilidade para o envio de e-mail de verificação
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  code: string
): Promise<SendEmailResult> {
  return ResendService.sendVerificationEmail({
    to,
    name,
    code,
  });
}

/**
 * Função de envio de e-mail de boas-vindas
 */
export async function sendWelcomeEmail(
  to: string,
  name: string,
  loginUrl?: string
): Promise<SendEmailResult> {
  return ResendService.sendWelcomeEmail({
    to,
    name,
    loginUrl,
  });
}

/**
 * Função de envio de recuperação de senha
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string,
  resetUrl?: string
): Promise<SendEmailResult> {
  return ResendService.sendPasswordResetEmail({
    to,
    name,
    resetToken,
    resetUrl,
  });
}

/**
 * Função de envio de confirmação de alteração de senha
 */
export async function sendPasswordChangedEmail(
  to: string,
  name: string,
  ipAddress?: string
): Promise<SendEmailResult> {
  return ResendService.sendPasswordChangedEmail({
    to,
    name,
    ipAddress,
  });
}

/**
 * Função de envio de confirmação de consulta
 */
export async function sendSessionConfirmationEmail(
  opts: SessionConfirmationOptions
): Promise<SendEmailResult> {
  return ResendService.sendSessionConfirmationEmail(opts);
}
