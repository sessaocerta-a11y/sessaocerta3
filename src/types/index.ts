export type PatientStatus = 'ativo' | 'pausa' | 'alta';
export type AttendanceType = 'online' | 'presencial' | 'hibrido';
export type SessionStatus = 'agendada' | 'confirmada' | 'solicita_reagendamento' | 'realizada' | 'cancelada_paciente' | 'cancelada_psicologo' | 'falta';
export type PaymentStatus = 'pago' | 'pendente' | 'isento';

export interface Patient {
  id: string;
  name: string;
  cpf: string;
  birthDate: string; // YYYY-MM-DD
  phone: string;
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  status: PatientStatus;
  attendanceType: AttendanceType;
  sessionPrice: number;
  preferredSchedule?: string;
  initialAnamnesis?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  patientId: string;
  patientName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  type: AttendanceType;
  videoUrl?: string;
  price: number;
  status: SessionStatus;
  paymentStatus: PaymentStatus;
  clinicalNotes?: string; // Prontuário / Evolução da sessão
  moodRating?: number; // 1 to 5 (1 = Muito angustiado, 5 = Muito bem/Estável)
  homework?: string;
  topicsAddressed?: string[];
  whatsappReminderSent?: boolean;
  whatsappReminderDate?: string;
}

export interface PsychologistProfile {
  id: string;
  name: string;
  email: string;
  crp: string; // ex: CRP 06/142859
  specialty: string; // ex: Terapia Cognitivo-Comportamental (TCC)
  phone: string;
  avatarUrl?: string;
  sessionDefaultPrice: number;
  sessionDefaultDuration: number; // minutes
  clinicAddress?: string;
  pixKey?: string;
  whatsappTemplate: string;
  isAdmin?: boolean;
  isMasterAdmin?: boolean;
  role?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  crp: string;
  isConfirmed: boolean;
  verificationCode?: string;
  codeCreatedAt?: number;
  verificationAttempts?: number;
  confirmedAt?: string;
  isMasterAdmin?: boolean;
  createdAt: string;
  profile: PsychologistProfile;
  patients: Patient[];
  sessions: Session[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  detail: string;
  user: string;
}

export interface DashboardStats {
  activePatientsCount: number;
  monthlySessionsCount: number;
  monthlyRevenueReceived: number;
  monthlyRevenuePending: number;
  attendanceRate: number; // percentage
  nextSessionToday?: Session;
}

export interface AppointmentSeries {
  id: string;
  patientId: string;
  dayOfWeek: number; // 0..6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  frequency: 'semanal' | 'quinzenal';
  attendanceType: AttendanceType;
  price: number;
  active: boolean;
}

export interface ReminderQueueItem {
  id: string;
  sessionId: string;
  patientName: string;
  type: '24h_before' | '2h_before' | 'manual';
  scheduledAt: string;
  status: 'scheduled' | 'processing' | 'sent' | 'delivered' | 'failed';
  attempts: number;
}

export interface SystemNotification {
  id: string;
  title: string;
  description: string;
  type: 'confirmation' | 'reschedule' | 'cancellation' | 'reminder';
  read: boolean;
  createdAt: string;
}

