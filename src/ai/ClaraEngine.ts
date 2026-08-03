import {
  Patient,
  Session,
  PsychologistProfile,
  ClaraPendingAction,
  ClaraActionType,
  ClaraProactiveInsight
} from '../types';

import {
  ClaraQueryContext,
  ClaraQueryResult,
  InProgressState,
  RegistrationWizardData,
  ExtractedEntities
} from './types';

import { EntityExtractor } from './EntityExtractor';
import { IntentClassifier } from './IntentClassifier';
import { PromptManager } from './PromptManager';
import { PatientRegistrationFlow } from './PatientRegistrationFlow';
import { AppointmentFlow } from './AppointmentFlow';
import { FinancialFlow } from './FinancialFlow';
import { ConversationManager } from './ConversationManager';

export class ClaraEngine {
  private static lastContext: ClaraQueryContext = {};

  /**
   * Helper to format BRL currency
   */
  public static formatCurrency(val: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  }

  /**
   * Helper date calculations
   */
  public static getDateHelpers() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const hh = String(today.getHours()).padStart(2, '0');
    const mm = String(today.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    return {
      todayStr,
      tomorrowStr,
      yesterdayStr,
      timeStr,
      currentYearMonth
    };
  }

  /**
   * Valid Brazilian states list re-export
   */
  public static validBrazilianStates = EntityExtractor.validBrazilianStates;

  /**
   * City-State lookup re-export
   */
  public static cityStateLookup = EntityExtractor.cityStateLookup;

  /**
   * Negative / Skip response check
   */
  public static isNegativeOrSkipResponse(input: string): boolean {
    return EntityExtractor.isNegativeOrSkipResponse(input);
  }

  /**
   * Validate & Format Phone number
   */
  public static validateAndFormatPhone(raw: string): { isValid: boolean; formatted: string } {
    return EntityExtractor.validateAndFormatPhone(raw);
  }

  /**
   * Validate & Format Email
   */
  public static validateEmail(raw: string): boolean {
    return EntityExtractor.validateEmail(raw);
  }

  /**
   * Validate & Format CPF
   */
  public static validateAndFormatCPF(raw: string): { isValid: boolean; formatted: string } {
    return EntityExtractor.validateAndFormatCPF(raw);
  }

  /**
   * Location extractor
   */
  public static extractLocationFromPrompt(raw: string): { city?: string; state?: string; matchedText?: string } {
    const extracted = EntityExtractor.extractEntities(raw);
    return {
      city: extracted.city,
      state: extracted.state,
      matchedText: extracted.city ? `${extracted.city}${extracted.state ? ` - ${extracted.state}` : ''}` : undefined
    };
  }

  /**
   * Extract clean patient name from raw prompt
   */
  public static extractCleanPatientName(input: string): string {
    const extracted = EntityExtractor.extractEntities(input);
    return extracted.name || '';
  }

  /**
   * Multi-entity extraction engine
   */
  public static extractEntitiesFromPrompt(raw: string): {
    name?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    sessionPrice?: number;
    cpf?: string;
    emergencyContact?: string;
    notes?: string;
  } {
    return EntityExtractor.extractEntities(raw);
  }

  /**
   * Get Next Wizard Step helper
   */
  public static getNextPatientWizardStep(data: RegistrationWizardData): { step: string; promptText: string } {
    return PatientRegistrationFlow.getNextStep(data);
  }

  /**
   * Core NLU prompt processor
   */
  public static processUserPrompt(
    rawPrompt: string,
    patients: Patient[],
    sessions: Session[],
    profile: PsychologistProfile,
    inProgressState?: InProgressState | null
  ): ClaraQueryResult {
    return ConversationManager.processPrompt(
      rawPrompt,
      inProgressState,
      patients,
      sessions,
      profile
    );
  }

  /**
   * Process query alias for Copilot Widget
   */
  public static processQuery(
    rawPrompt: string,
    patients: Patient[],
    sessions: Session[],
    profile: PsychologistProfile,
    chatHistory?: any[],
    inProgressState?: InProgressState | null
  ): ClaraQueryResult {
    return this.processUserPrompt(rawPrompt, patients, sessions, profile, inProgressState);
  }

  /**
   * Generates Morning Briefing
   */
  public static generateMorningBriefing(
    patients: Patient[],
    sessions: Session[],
    profile: PsychologistProfile
  ) {
    const { todayStr, timeStr, currentYearMonth } = this.getDateHelpers();
    const practitionerName = profile.name ? profile.name.split(' ')[0] : 'Dra.';

    const todaySessions = sessions
      .filter((s) => s.date === todayStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const confirmedCount = todaySessions.filter((s) => s.status === 'confirmada' || s.status === 'realizada').length;
    const firstSessionTime = todaySessions.length > 0 ? todaySessions[0].startTime : undefined;

    const pendingEvolutions = sessions.filter(
      (s) => s.status === 'realizada' && (!s.clinicalNotes || s.clinicalNotes.trim().length === 0)
    );

    const pendingPayments = sessions.filter(
      (s) => s.status === 'realizada' && s.paymentStatus === 'pendente'
    );

    const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const patientsWithoutReturn = patients.filter((p) => {
      if (p.status !== 'ativo') return false;
      const pSessions = sessions.filter(
        (s) => (s.patientId === p.id || s.patientName.toLowerCase() === p.name.toLowerCase()) && s.date >= thirtyDaysAgoStr
      );
      return pSessions.length === 0;
    });

    const monthlyRevenuePaid = sessions
      .filter((s) => s.date.startsWith(currentYearMonth) && s.paymentStatus === 'pago')
      .reduce((acc, s) => acc + s.price, 0);

    let summaryText = `👋 **Bom dia, ${practitionerName}!**\n\n`;

    if (todaySessions.length > 0) {
      summaryText += `Hoje você possui **${todaySessions.length} consulta(s)**, sendo **${confirmedCount} confirmada(s)**. `;
      summaryText += `Seu primeiro atendimento é às **${firstSessionTime}**.\n\n`;
    } else {
      summaryText += `Hoje sua agenda está **livre de consultas agendadas**. Um ótimo momento para planejar atendimentos e organizar a gestão clínica!\n\n`;
    }

    if (pendingEvolutions.length > 0) {
      summaryText += `📝 **Prontuários:** Há ${pendingEvolutions.length} consulta(s) encerrada(s) que ainda aguardam o preenchimento da evolução clínica.\n`;
    }

    if (pendingPayments.length > 0) {
      const pendingTotal = pendingPayments.reduce((acc, s) => acc + s.price, 0);
      summaryText += `💰 **Financeiro:** Você possui ${pendingPayments.length} consulta(s) realizada(s) aguardando pagamento (${this.formatCurrency(pendingTotal)}).\n`;
    }

    if (patientsWithoutReturn.length > 0) {
      summaryText += `👥 **Relacionamento:** ${patientsWithoutReturn.length} paciente(s) ativo(s) não realizam sessões há mais de 30 dias (${patientsWithoutReturn.slice(0, 2).map((p) => p.name.split(' ')[0]).join(', ')}).\n`;
    }

    summaryText += `\n📈 **Faturamento do Mês:** ${this.formatCurrency(monthlyRevenuePaid)} recebidos de atendimentos concluídos.`;

    return {
      greeting: `Bom dia, ${practitionerName}!`,
      summaryText,
      todayCount: todaySessions.length,
      firstSessionTime,
      confirmedCount,
      pendingEvolutionsCount: pendingEvolutions.length,
      pendingPaymentsCount: pendingPayments.length,
      patientsWithoutReturnCount: patientsWithoutReturn.length,
      monthlyRevenuePaid,
    };
  }

  /**
   * Generates Proactive Insights
   */
  public static generateProactiveInsights(
    patients: Patient[],
    sessions: Session[],
    profile: PsychologistProfile
  ): ClaraProactiveInsight[] {
    const { todayStr, tomorrowStr, currentYearMonth } = this.getDateHelpers();
    const insights: ClaraProactiveInsight[] = [];

    const todaySessions = sessions
      .filter(s => s.date === todayStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (todaySessions.length > 0) {
      const confirmedCount = todaySessions.filter(s => s.status === 'confirmada' || s.status === 'realizada').length;
      const firstSess = todaySessions[0];
      insights.push({
        id: 'ins-agenda-today',
        category: 'agenda',
        title: 'Agenda do Dia Organizada',
        description: `Hoje você possui ${todaySessions.length} consulta(s) agendada(s) (${confirmedCount} confirmadas). A primeira sessão será às ${firstSess.startTime} com ${firstSess.patientName}.`,
        badgeText: 'Agenda de Hoje',
        badgeColor: 'emerald',
        actionLabel: 'Ver Detalhes da Agenda',
        actionPrompt: 'Clara, quais pacientes tenho hoje?'
      });
    } else {
      insights.push({
        id: 'ins-agenda-free',
        category: 'agenda',
        title: 'Agenda Livre para Hoje',
        description: `Sua agenda de hoje está sem consultas agendadas. Um bom momento para organizar prontuários ou revisar metas do consultório.`,
        badgeText: 'Dia Livre',
        badgeColor: 'sky',
        actionLabel: 'Conferir Horários Vagos',
        actionPrompt: 'Tenho horários livres hoje?'
      });
    }

    const pendingEvolutions = sessions.filter(
      (s) => s.status === 'realizada' && (!s.clinicalNotes || s.clinicalNotes.trim().length === 0)
    );
    if (pendingEvolutions.length > 0) {
      const firstPending = pendingEvolutions[0];
      insights.push({
        id: 'ins-clinical-pending',
        category: 'agenda',
        title: 'Prontuários Pendentes de Registro',
        description: `Existem ${pendingEvolutions.length} consulta(s) realizada(s) sem evolução salva, incluindo a sessão de ${firstPending.patientName} (${firstPending.date.split('-').reverse().join('/')}).`,
        badgeText: 'Prontuários',
        badgeColor: 'purple',
        actionLabel: 'Ver Prontuários',
        actionPrompt: 'Quais prontuários estão pendentes de preenchimento?'
      });
    }

    const pendingPaymentSessions = sessions.filter(s => s.status === 'realizada' && s.paymentStatus === 'pendente');
    if (pendingPaymentSessions.length > 0) {
      const totalPending = pendingPaymentSessions.reduce((acc, s) => acc + s.price, 0);
      insights.push({
        id: 'ins-finance-pending',
        category: 'finance',
        title: 'Atendimentos com Pagamento Pendente',
        description: `Identifiquei ${pendingPaymentSessions.length} consulta(s) realizada(s) aguardando pagamento, totalizando ${this.formatCurrency(totalPending)}.`,
        badgeText: 'Inadimplência',
        badgeColor: 'amber',
        actionLabel: 'Ver Quem Não Pagou',
        actionPrompt: 'Quem ainda não pagou?'
      });
    }

    const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const patientsWithoutReturn = patients.filter((p) => {
      if (p.status !== 'ativo') return false;
      const pSessions = sessions.filter(
        (s) => (s.patientId === p.id || s.patientName.toLowerCase() === p.name.toLowerCase()) && s.date >= thirtyDaysAgoStr
      );
      return pSessions.length === 0;
    });

    if (patientsWithoutReturn.length > 0) {
      const targetP = patientsWithoutReturn[0];
      insights.push({
        id: 'ins-patient-return',
        category: 'opportunity',
        title: 'Pacientes sem Retorno Há +30 Dias',
        description: `${patientsWithoutReturn.length} paciente(s) ativo(s) como ${targetP.name} não agendam uma sessão há mais de 30 dias. Que tal enviar uma mensagem de acompanhamento?`,
        badgeText: 'Retenção de Pacientes',
        badgeColor: 'amber',
        actionLabel: 'Redigir Lembrete',
        actionPrompt: `Quando foi a última consulta da ${targetP.name.split(' ')[0]}?`
      });
    }

    const tomorrowSessions = sessions.filter(s => s.date === tomorrowStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo');
    if (tomorrowSessions.length < 5) {
      const freeSlotCount = Math.max(0, 6 - tomorrowSessions.length);
      insights.push({
        id: 'ins-opportunity-tomorrow',
        category: 'opportunity',
        title: 'Oportunidade na Agenda de Amanhã',
        description: `Você possui cerca de ${freeSlotCount} horário(s) vago(s) amanhã. Que tal disponibilizar um horário de encaixe para sua lista de espera?`,
        badgeText: 'Grade Comercial',
        badgeColor: 'purple',
        actionLabel: 'Ver Agenda de Amanhã',
        actionPrompt: 'Quantas consultas tenho amanhã?'
      });
    }

    const currentMonthPaid = sessions
      .filter(s => s.date.startsWith(currentYearMonth) && s.paymentStatus === 'pago')
      .reduce((acc, s) => acc + s.price, 0);

    insights.push({
      id: 'ins-performance-month',
      category: 'performance',
      title: 'Desempenho Financeiro do Mês',
      description: `Seu faturamento recebido neste mês é de ${this.formatCurrency(currentMonthPaid)} com ${patients.filter(p => p.status === 'ativo').length} pacientes ativos.`,
      badgeText: 'Resultado do Mês',
      badgeColor: 'emerald',
      actionLabel: 'Resumo do Mês',
      actionPrompt: 'Quanto faturei este mês?'
    });

    return insights;
  }
}
