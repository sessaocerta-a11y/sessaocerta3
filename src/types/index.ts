export type PatientStatus = 'ativo' | 'arquivado' | 'alta' | 'pausa';
export type AttendanceType = 'online' | 'presencial' | 'hibrido';
export type SessionStatus = 'agendada' | 'confirmada' | 'solicita_reagendamento' | 'realizada' | 'cancelada_paciente' | 'cancelada_psicologo' | 'falta';
export type PaymentStatus = 'pago' | 'pendente' | 'isento';

export interface PatientChangeHistoryItem {
  id: string;
  timestamp: string; // e.g. "01/08/2026 17:50"
  user: string; // "Clara (Assistente Virtual)" or "Psicólogo(a)"
  field: string;
  oldValue: string;
  newValue: string;
}

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
  city?: string;
  state?: string;
  neighborhood?: string;
  country?: string; // Default: 'Brasil'
  notes?: string;
  changeHistory?: PatientChangeHistoryItem[];
}

export interface Session {
  id: string;
  patientId: string;
  patientName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes?: number;
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
  archivedPatientsCount?: number;
  dischargedPatientsCount?: number;
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

export type ClaraActionType = 
  | 'add_patient'
  | 'edit_patient'
  | 'delete_patient'
  | 'archive_patient'
  | 'discharge_patient'
  | 'create_session'
  | 'reschedule_session'
  | 'cancel_session'
  | 'create_clinical_note'
  | 'send_email'
  | 'send_whatsapp'
  | 'confirm_session'
  | 'mark_paid'
  | 'open_prontuario'
  | 'open_patients_list'
  | 'open_schedule'
  | 'send_whatsapp_reminder';

export interface ClaraPendingAction {
  id: string;
  type: ClaraActionType;
  title: string;
  description: string;
  sessionId?: string;
  patientId?: string;
  patientName?: string;
  date?: string;
  time?: string;
  amount?: number;
  newDate?: string;
  newTime?: string;
  patientData?: {
    name?: string;
    email?: string;
    phone?: string;
    cpf?: string;
    sessionPrice?: number;
    sessionType?: 'online' | 'presencial';
  };
  notes?: string;
  messageText?: string;
  emailSubject?: string;
  emailBody?: string;
  missingField?: string;
}

export interface ClaraProactiveInsight {
  id: string;
  category: 'agenda' | 'finance' | 'opportunity' | 'performance' | 'birthday';
  title: string;
  description: string;
  badgeText: string;
  badgeColor: string; // e.g. emerald, amber, sky, purple
  actionLabel?: string;
  actionPrompt?: string;
  pendingAction?: ClaraPendingAction;
}

export interface ClaraChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  pendingAction?: ClaraPendingAction;
  actionExecuted?: boolean;
}

