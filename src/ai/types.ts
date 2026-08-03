import {
  Patient,
  Session,
  PsychologistProfile,
  ClaraChatMessage,
  ClaraPendingAction,
  ClaraActionType,
  ClaraProactiveInsight
} from '../types';

export type ClaraIntentType =
  | 'CADASTRAR_PACIENTE'
  | 'EDITAR_PACIENTE'
  | 'ARQUIVAR_PACIENTE'
  | 'DAR_ALTA_PACIENTE'
  | 'REATIVAR_PACIENTE'
  | 'EXCLUIR_PACIENTE'
  | 'CRIAR_CONSULTA'
  | 'REAGENDAR_CONSULTA'
  | 'CANCELAR_CONSULTA'
  | 'CONSULTAR_AGENDA'
  | 'CONSULTAR_PACIENTES'
  | 'CONSULTAR_FINANCEIRO'
  | 'CONSULTAR_PRONTUARIOS'
  | 'CONVERSAR_NORMALMENTE'
  | 'CUMPRIMENTAR'
  | 'AGRADECER';

export interface ExtractedEntities {
  name?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  sessionPrice?: number;
  cpf?: string;
  emergencyContact?: string;
  notes?: string;
  rawTextRemaining?: string;
  confidence: {
    name: number;
    phone: number;
    email: number;
    cpf: number;
    location: number;
    price: number;
    overall: number;
  };
}

export type RegistrationStep =
  | 'AGUARDANDO_NOME'
  | 'AGUARDANDO_CONFIRMACAO_NOME'
  | 'AGUARDANDO_TELEFONE'
  | 'AGUARDANDO_EMAIL'
  | 'AGUARDANDO_LOCALIDADE'
  | 'AGUARDANDO_PRECO'
  | 'AGUARDANDO_CPF'
  | 'AGUARDANDO_CONTATO_EMERGENCIA'
  | 'AGUARDANDO_OBSERVACOES'
  | 'CONFIRMACAO'
  | 'SALVANDO'
  | 'FINALIZADO';

export interface RegistrationWizardData {
  name?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  sessionPrice?: number;
  cpf?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  nameConfirmed?: boolean;
}

export interface InProgressState {
  type: string;
  flow?: string;
  step?: string;
  data?: any;
  startedAt?: number;
  lastInteraction?: number;
}

export interface ClaraQueryResult {
  text: string;
  pendingAction?: ClaraPendingAction;
  executeImmediately?: {
    type: ClaraActionType;
    payload: any;
  };
  nextInProgressState?: InProgressState | null;
}

export interface ClaraQueryContext {
  lastTopic?: 'agenda' | 'patient' | 'finance' | 'clinical' | 'general';
  targetDate?: string;
  targetPatientId?: string;
  targetPatientName?: string;
  matchedSessions?: Session[];
}
