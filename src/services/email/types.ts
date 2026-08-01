export type EmailCategory =
  | 'welcome'
  | 'verification'
  | 'password_reset'
  | 'password_changed'
  | 'session_confirmation';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface WelcomeEmailOptions {
  to: string;
  name: string;
  loginUrl?: string;
}

export interface VerificationEmailOptions {
  to: string;
  name: string;
  code: string;
  verificationUrl?: string;
  expiresInMinutes?: number;
}

export interface PasswordResetOptions {
  to: string;
  name: string;
  resetToken: string;
  resetUrl?: string;
  expiresInMinutes?: number;
}

export interface PasswordChangedOptions {
  to: string;
  name: string;
  changedAt?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionConfirmationOptions {
  to: string;
  patientName: string;
  psychologistName: string;
  date: string; // YYYY-MM-DD or formatted
  time: string; // HH:mm
  type: 'online' | 'presencial' | 'hibrido';
  videoUrl?: string;
  clinicAddress?: string;
  price?: number;
  notes?: string;
}

export interface RenderedEmailTemplate {
  subject: string;
  html: string;
  text: string;
}
