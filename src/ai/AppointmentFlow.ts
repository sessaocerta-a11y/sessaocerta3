import { Session, Patient, PsychologistProfile } from '../types';
import { ClaraQueryResult } from './types';
import { PromptManager } from './PromptManager';
import { WorkflowRegistry } from './WorkflowRegistry';

export class AppointmentFlow {
  /**
   * Helper to parse portuguese relative dates (amanhã, hoje, quinta-feira, etc.)
   */
  public static parsePortugueseDate(prompt: string): string {
    const parsed = WorkflowRegistry.parsePortugueseDate(prompt);
    if (parsed.dateStr) return parsed.dateStr;

    // Default to tomorrow if not specified
    const today = new Date();
    const nextDay = new Date(today);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split('T')[0];
  }

  /**
   * Handle create session / appointment intent via WorkflowRegistry
   */
  public static handleCreateAppointment(
    rawPrompt: string,
    patients: Patient[],
    sessions: Session[] = [],
    profile?: PsychologistProfile
  ): ClaraQueryResult {
    // Pre-extract patient name if present in prompt
    const lower = rawPrompt.toLowerCase();
    const matchedPatient = patients.find(p => lower.includes(p.name.toLowerCase()));

    const initData: any = {};
    if (matchedPatient) {
      initData.patientName = matchedPatient.name;
      initData.patientId = matchedPatient.id;
      if (matchedPatient.sessionPrice) {
        initData.defaultPrice = matchedPatient.sessionPrice;
      }
    }

    // Pre-extract date if explicit in prompt
    const dateParsed = WorkflowRegistry.parsePortugueseDate(rawPrompt);
    if (dateParsed.dateStr && !dateParsed.isPast) {
      initData.date = dateParsed.dateStr;
    }

    // Pre-extract time if explicit in prompt
    const timeParsed = WorkflowRegistry.parseTime(rawPrompt);
    if (timeParsed) {
      initData.time = timeParsed;
    }

    return WorkflowRegistry.handleAgendamentoWorkflow(
      rawPrompt,
      initData,
      patients,
      sessions,
      profile || {
        id: 'prof_default',
        name: 'Psicólogo(a)',
        email: 'contato@sessaocerta.com.br',
        crp: 'CRP 00/0000',
        specialty: 'Psicologia Clínica',
        phone: '',
        sessionDefaultPrice: 150,
        sessionDefaultDuration: 50,
        whatsappTemplate: ''
      }
    );
  }

  /**
   * Handle reschedule appointment intent via WorkflowRegistry
   */
  public static handleRescheduleAppointment(
    rawPrompt: string,
    sessions: Session[],
    patients: Patient[]
  ): ClaraQueryResult {
    const lower = rawPrompt.toLowerCase();
    const matchedPatient = patients.find(p => lower.includes(p.name.toLowerCase()));

    const initData: any = {};
    if (matchedPatient) {
      initData.patientName = matchedPatient.name;
      initData.patientId = matchedPatient.id;
    }

    const dateParsed = WorkflowRegistry.parsePortugueseDate(rawPrompt);
    if (dateParsed.dateStr && !dateParsed.isPast) {
      initData.newDate = dateParsed.dateStr;
    }

    const timeParsed = WorkflowRegistry.parseTime(rawPrompt);
    if (timeParsed) {
      initData.newTime = timeParsed;
    }

    return WorkflowRegistry.handleReagendamentoWorkflow(
      rawPrompt,
      initData,
      patients,
      sessions
    );
  }

  /**
   * Handle cancel appointment intent via WorkflowRegistry
   */
  public static handleCancelAppointment(
    rawPrompt: string,
    sessions: Session[],
    patients: Patient[]
  ): ClaraQueryResult {
    const lower = rawPrompt.toLowerCase();
    const matchedPatient = patients.find(p => lower.includes(p.name.toLowerCase()));

    const initData: any = {};
    if (matchedPatient) {
      initData.patientName = matchedPatient.name;
      initData.patientId = matchedPatient.id;
    }

    return WorkflowRegistry.handleCancelamentoWorkflow(
      rawPrompt,
      initData,
      patients,
      sessions
    );
  }

  /**
   * Handle agenda / consultations lookup
   */
  public static handleLookupAgenda(
    sessions: Session[]
  ): ClaraQueryResult {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.date === todayStr);

    if (todaySessions.length === 0) {
      return {
        text: `📅 **Agenda do Dia**\n\nVocê não possui consultas agendadas para hoje. Gostaria de marcar uma nova consulta?`
      };
    }

    const listStr = todaySessions
      .map(s => `- ⏰ **${s.startTime}** - ${s.patientName} (${s.type === 'online' ? '💻 Online' : '🏢 Presencial'})`)
      .join('\n');

    return {
      text: `📅 **Agenda de Hoje (${todaySessions.length} consulta${todaySessions.length > 1 ? 's' : ''})**\n\n${listStr}\n\n${PromptManager.getRandomFollowUp()}`
    };
  }
}
