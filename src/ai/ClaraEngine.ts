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
   * Generates Smart Personalized Greeting based on local time, real DB state & 30+ phrase library
   */
  public static generateSmartGreeting(
    patients: Patient[],
    sessions: Session[],
    profile: PsychologistProfile
  ): {
    greeting: string;
    summaryText: string;
    pendingEvolutionsCount?: number;
    pendingPaymentsCount?: number;
    patientsWithoutReturnCount?: number;
  } {
    const { todayStr } = this.getDateHelpers();

    // 1. Time-based salutation
    const hour = new Date().getHours();
    const rawName = profile?.name ? profile.name.trim() : 'Fernanda';
    let salutationName = rawName;

    if (!rawName.startsWith('Dr.') && !rawName.startsWith('Dra.') && !rawName.startsWith('Dr(a).')) {
      const firstName = rawName.split(' ')[0];
      const isFemale = firstName.endsWith('a') || firstName.endsWith('is') || firstName.endsWith('e');
      salutationName = `${isFemale ? 'Dra.' : 'Dr.'} ${firstName}`;
    } else {
      salutationName = rawName.split(' ').slice(0, 2).join(' ');
    }

    let timeHeader = '';
    if (hour >= 5 && hour < 12) {
      timeHeader = `Bom dia, ${salutationName}! ☀️`;
    } else if (hour >= 12 && hour < 18) {
      timeHeader = `Boa tarde, ${salutationName}! 😊`;
    } else {
      timeHeader = `Boa noite, ${salutationName}! 🌸`;
    }

    // 2. Phrase library (32 variations) with non-repeat consecutive selection
    const GREETING_PHRASES = [
      "Espero que seu dia de atendimentos seja tranquilo. 🌿",
      "Já dei uma olhada na agenda e tenho algumas sugestões para você. ✨",
      "Estou pronta para ajudar sempre que precisar. 💼",
      "Vamos organizar seu consultório juntos? 🤝",
      "Que bom ter você por aqui novamente! 😊",
      "Estou à disposição para organizar seus atendimentos e prontuários. 📋",
      "Tudo pronto para começarmos um excelente dia de clínica? 🚀",
      "Se precisar de algum encaixe ou confirmação, é só me avisar. 📅",
      "Acompanhando cada detalhe para que seu foco fique nos pacientes. 🧠",
      "Pronta para otimizar sua rotina e manter seu faturamento em dia. 💳",
      "Desejo uma jornada leve e muito produtiva hoje. 🌺",
      "Sua secretária virtual atenta a todos os prazos e retornos. ⏰",
      "Que seu dia seja repleto de escuta empática e bons resultados! 💬",
      "Com tudo sob controle por aqui para você trabalhar com tranquilidade. 🧘‍♀️",
      "A qualquer momento, basta me pedir qualquer informação do consultório. 🔍",
      "Organização e eficiência ao alcance de um clique. Vamos em frente! 🌟",
      "Estou monitorando os lembretes e confirmações das consultas de hoje. 📲",
      "Sempre ao seu lado para simplificar a gestão do seu consultório. 🛋️",
      "Sua agenda e finanças estão atualizadas. Como posso ser útil agora? 📊",
      "Tenho tudo mapeado por aqui para facilitar o seu dia a dia. 📝",
      "Pronta para ajudar com prontuários, recibos ou novos agendamentos. 💡",
      "Um dia produtivo começa com planejamento. Estou aqui para o que precisar! ☀️",
      "A gestão da sua clínica está em boas mãos. Desejo ótimos atendimentos! 🌿",
      "Pode contar comigo para manter seus atendimentos 100% organizados. 🩺",
      "Notificações e relatórios prontos para quando você precisar consultar. 📂",
      "Acompanhando seus pacientes e mantendo a rotina impecável. 👑",
      "Sempre pronta para antecipar suas necessidades e economizar seu tempo. ⚡",
      "Sua tranquilidade é nossa prioridade. Vamos aos atendimentos! 🌈",
      "De olho nos horários livres e cobranças para otimizar seu consultório. 💰",
      "Seja bem-vindo(a) à sua central de gestão clínica inteligente! 🔮",
      "Apoio completo para o seu bem-estar e o de seus pacientes. 🕊️",
      "Mais um dia para transformar vidas com a psicologia. Conte comigo! 💖"
    ];

    let lastIdx = Number(localStorage.getItem('clara_last_greeting_index') || '-1');
    let newIdx = Math.floor(Math.random() * GREETING_PHRASES.length);
    if (newIdx === lastIdx) {
      newIdx = (newIdx + 1) % GREETING_PHRASES.length;
    }
    try {
      localStorage.setItem('clara_last_greeting_index', String(newIdx));
    } catch (e) {
      // Ignore storage errors in restricted contexts
    }
    const closingPhrase = GREETING_PHRASES[newIdx];

    // 3. Onboarding Case: 0 Patients
    if (patients.length === 0) {
      const summaryText = `${timeHeader}\n\n🎉 **Seja bem-vindo(a) ao Sessão Certa!**\n\nEu sou a **Clara**, sua assistente virtual inteligente e secretária clínica. Estarei ao seu lado durante todo o dia para ajudar na gestão do consultório.\n\nComo seu consultório ainda não possui pacientes cadastrados, minha recomendação inicial é cadastrar seu primeiro paciente para habilitar agendamentos, finanças e prontuários.\n\n[Cadastrar Primeiro Paciente]`;
      return {
        greeting: timeHeader,
        summaryText,
        pendingEvolutionsCount: 0,
        pendingPaymentsCount: 0,
        patientsWithoutReturnCount: 0,
      };
    }

    // 4. Real DB Data Gathering
    const todaySessions = sessions
      .filter((s) => s.date === todayStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

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

    // Special Situation A: Appointment starting in < 30 minutes
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const upcomingSessionUnder30 = todaySessions.find((s) => {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const sMin = sh * 60 + sm;
      const diff = sMin - nowMinutes;
      return diff >= 0 && diff <= 30;
    });

    // Special Situation B: Birthday Today
    const mmddToday = todayStr.substring(5);
    const birthdayPatients = patients.filter((p) => p.birthDate && p.birthDate.substring(5) === mmddToday);

    // 5. Build Body Blocks
    const alertBlocks: string[] = [];

    if (upcomingSessionUnder30) {
      const pName = upcomingSessionUnder30.patientName;
      alertBlocks.push(`⏰ **Próximo Atendimento:** Sua consulta com **${pName}** começa às **${upcomingSessionUnder30.startTime}**. Deseja abrir o prontuário antes do atendimento?\n[Abrir Prontuário de ${pName.split(' ')[0]}]`);
    }

    if (birthdayPatients.length > 0) {
      const bP = birthdayPatients[0];
      alertBlocks.push(`🎂 **Aniversário Hoje:** Hoje é aniversário de **${bP.name}**! 🎉 Deseja enviar uma mensagem de felicitações?\n[Mandar Parabéns WhatsApp]`);
    }

    const statusLines: string[] = [];

    if (todaySessions.length > 0) {
      const confirmedCount = todaySessions.filter((s) => s.status === 'confirmada' || s.status === 'realizada').length;
      statusLines.push(`📅 **${todaySessions.length} consulta(s) agendada(s)** (${confirmedCount} confirmada(s))`);
    } else {
      if (patientsWithoutReturn.length > 0) {
        statusLines.push(`📅 **Agenda de hoje livre de consultas.** Que tal aproveitar para entrar em contato com pacientes sem retorno?`);
      } else {
        statusLines.push(`📅 **Agenda de hoje livre de consultas.** Ótimo momento para organizar prontuários ou realizar novos encaixes.`);
      }
    }

    if (pendingPayments.length > 0) {
      const totalPend = pendingPayments.reduce((acc, s) => acc + s.price, 0);
      statusLines.push(`💰 **${pendingPayments.length} pagamento(s) pendente(s)** (${this.formatCurrency(totalPend)})`);
    }

    if (pendingEvolutions.length > 0) {
      statusLines.push(`📝 **${pendingEvolutions.length} prontuário(s) aguardando evolução**`);
    }

    const summaryBlock = `**Hoje você possui:**\n${statusLines.map(l => `• ${l}`).join('\n')}`;

    // Action Chips
    const actionChips: string[] = [];
    if (pendingEvolutions.length > 0) actionChips.push('[Ver Prontuários Pendentes]');
    if (pendingPayments.length > 0) actionChips.push('[Ver Pagamentos Pendentes]');
    if (todaySessions.length > 0) actionChips.push('[Ver Agenda de Hoje]');
    if (patientsWithoutReturn.length > 0 && todaySessions.length === 0) actionChips.push('[Lista de Retornos]');

    const actionChipsStr = actionChips.length > 0 ? `\n\n${actionChips.join('  ')}` : '';

    const fullMessageText = `${timeHeader}\n\n${alertBlocks.length > 0 ? alertBlocks.join('\n\n') + '\n\n' : ''}${summaryBlock}\n\n${closingPhrase}${actionChipsStr}`;

    return {
      greeting: timeHeader,
      summaryText: fullMessageText,
      pendingEvolutionsCount: pendingEvolutions.length,
      pendingPaymentsCount: pendingPayments.length,
      patientsWithoutReturnCount: patientsWithoutReturn.length,
    };
  }

  /**
   * Generates Morning Briefing
   */
  public static generateMorningBriefing(
    patients: Patient[],
    sessions: Session[],
    profile: PsychologistProfile
  ) {
    const smart = this.generateSmartGreeting(patients, sessions, profile);
    const { todayStr } = this.getDateHelpers();
    const todaySessions = sessions.filter((s) => s.date === todayStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo');

    return {
      greeting: smart.greeting,
      summaryText: smart.summaryText,
      todayCount: todaySessions.length,
      pendingEvolutionsCount: smart.pendingEvolutionsCount,
      pendingPaymentsCount: smart.pendingPaymentsCount,
      patientsWithoutReturnCount: smart.patientsWithoutReturnCount,
    };
  }

  /**
   * Generates Proactive Insights (Clara Insight Engine V2)
   */
  public static generateProactiveInsights(
    patients: Patient[],
    sessions: Session[],
    profile: PsychologistProfile
  ): ClaraProactiveInsight[] {
    const { todayStr, tomorrowStr, currentYearMonth } = this.getDateHelpers();
    const insights: ClaraProactiveInsight[] = [];

    // 0. 🌟 ONBOARDING: Brand new clinic with 0 patients
    if (patients.length === 0) {
      insights.push({
        id: 'ins-onboarding-welcome',
        category: 'opportunity',
        priority: 'critical',
        title: '🎉 Bem-vindo ao Sessão Certa!',
        description: 'Seu consultório ainda não possui pacientes cadastrados. Para começar a agendar consultas, controlar pagamentos e preencher prontuários, cadastre seu primeiro paciente.',
        badgeText: 'Onboarding Inicial',
        badgeColor: 'emerald',
        actionLabel: 'Cadastrar Primeiro Paciente',
        actionId: 'CREATE_PATIENT',
        actionPrompt: 'Quero cadastrar um novo paciente',
        systemTab: 'patients',
        actionType: 'open_patients_tab'
      });
      return insights;
    }

    // 1. 🔴 CRITICAL: Pending Clinical Evolutions / Medical Notes
    const pendingEvolutions = sessions.filter(
      (s) => s.status === 'realizada' && (!s.clinicalNotes || s.clinicalNotes.trim().length === 0)
    );
    if (pendingEvolutions.length > 0) {
      const firstPending = pendingEvolutions[0];
      insights.push({
        id: 'ins-clinical-pending',
        category: 'prontuario',
        priority: 'critical',
        title: '🔴 Prontuários Pendentes de Evolução',
        description: `Existem ${pendingEvolutions.length} consulta(s) realizada(s) sem evolução salva, incluindo a sessão de ${firstPending.patientName} (${firstPending.date.split('-').reverse().join('/')}).`,
        badgeText: 'Prontuários Atrasados',
        badgeColor: 'rose',
        actionLabel: 'Abrir Prontuários',
        actionId: 'CHECK_UNFINISHED_RECORDS',
        actionPrompt: 'Quais prontuários estão pendentes de preenchimento?',
        systemTab: 'patients',
        actionType: 'open_prontuario',
        actionPayload: { patientName: firstPending.patientName }
      });
    }

    // 2. 🔴 CRITICAL: Pending Payments / Overdue Collections
    const pendingPaymentSessions = sessions.filter(
      (s) => s.status === 'realizada' && s.paymentStatus === 'pendente'
    );
    if (pendingPaymentSessions.length > 0) {
      const totalPending = pendingPaymentSessions.reduce((acc, s) => acc + s.price, 0);
      const firstUnpaid = pendingPaymentSessions[0];
      insights.push({
        id: 'ins-finance-pending',
        category: 'finance',
        priority: 'critical',
        title: '🔴 Pagamentos Pendentes / Vencidos',
        description: `Identifiquei ${pendingPaymentSessions.length} consulta(s) realizada(s) aguardando pagamento, totalizando ${this.formatCurrency(totalPending)}.`,
        badgeText: 'Inadimplência',
        badgeColor: 'amber',
        actionLabel: 'Abrir Financeiro',
        actionId: 'CHECK_PENDING_PAYMENTS',
        actionPrompt: 'Quem ainda não pagou?',
        systemTab: 'finance',
        actionType: 'mark_paid',
        actionPayload: { sessionId: firstUnpaid.id, patientName: firstUnpaid.patientName }
      });
    }

    // 3. 🔴 CRITICAL: Sessions Awaiting Confirmation / Reschedule
    const unconfirmedSessions = sessions.filter(
      (s) => (s.date === todayStr || s.date === tomorrowStr) && (s.status === 'agendada' || s.status === 'solicita_reagendamento')
    );
    if (unconfirmedSessions.length > 0) {
      const targetSession = unconfirmedSessions[0];
      insights.push({
        id: 'ins-unconfirmed-sessions',
        category: 'confirmation',
        priority: 'critical',
        title: '🔴 Consultas Aguardando Confirmação',
        description: `Há ${unconfirmedSessions.length} consulta(s) pendente(s) de confirmação para hoje/amanhã (${targetSession.patientName} às ${targetSession.startTime}).`,
        badgeText: 'Aprovação Pendente',
        badgeColor: 'rose',
        actionLabel: 'Ver Agenda para Confirmar',
        actionId: 'CONFIRM_SESSION',
        actionPrompt: 'Quais consultas precisam de confirmação?',
        systemTab: 'schedule',
        actionType: 'confirm_session',
        actionPayload: { sessionId: targetSession.id, patientName: targetSession.patientName }
      });
    }

    // 4. 🟠 IMPORTANT: Patients without return for +30 / +45 days
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
        priority: 'important',
        title: '🟠 Pacientes Sem Retorno (+30 Dias)',
        description: `${patientsWithoutReturn.length} paciente(s) ativo(s) como ${targetP.name} não agendam sessões há mais de 30 dias. Recomendamos contato de acompanhamento.`,
        badgeText: 'Retenção Clínica',
        badgeColor: 'amber',
        actionLabel: 'Entrar em Contato',
        actionId: 'OPEN_WAITING_LIST',
        actionPrompt: `Quando foi a última consulta de ${targetP.name.split(' ')[0]}?`,
        systemTab: 'patients',
        actionType: 'send_whatsapp',
        actionPayload: { patientName: targetP.name, phone: targetP.phone }
      });
    }

    // 5. 🟠 IMPORTANT: Low Bookings / Empty Slots for Tomorrow
    const tomorrowSessions = sessions.filter(s => s.date === tomorrowStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo');
    if (tomorrowSessions.length < 5) {
      const freeSlotCount = Math.max(0, 6 - tomorrowSessions.length);
      insights.push({
        id: 'ins-opportunity-tomorrow',
        category: 'opportunity',
        priority: 'important',
        title: '🟠 Oportunidade na Agenda de Amanhã',
        description: `Você possui cerca de ${freeSlotCount} horário(s) vago(s) amanhã. Ótimo momento para encaixar lista de espera ou enviar lembretes.`,
        badgeText: 'Agenda Vazia',
        badgeColor: 'purple',
        actionLabel: 'Abrir Agenda de Amanhã',
        actionId: 'OPEN_AGENDA_TOMORROW',
        actionPrompt: 'Quantas consultas tenho amanhã?',
        systemTab: 'schedule',
        actionType: 'open_schedule'
      });
    }

    // 6. 🟡 ATTENTION: Birthdays Today
    const mmddToday = todayStr.substring(5); // MM-DD
    const birthdayPatients = patients.filter(p => p.birthDate && p.birthDate.substring(5) === mmddToday);
    if (birthdayPatients.length > 0) {
      const bPatient = birthdayPatients[0];
      insights.push({
        id: 'ins-birthday-today',
        category: 'birthday',
        priority: 'attention',
        title: '🟡 Aniversariante do Dia',
        description: `Hoje é aniversário de ${bPatient.name}! Envie uma mensagem carinhosa de parabéns.`,
        badgeText: 'Aniversário',
        badgeColor: 'yellow',
        actionLabel: 'Enviar Parabéns',
        actionId: 'CHECK_BIRTHDAYS',
        actionPrompt: `Mandar mensagem de parabéns para ${bPatient.name}`,
        systemTab: 'patients',
        actionType: 'send_whatsapp',
        actionPayload: { patientName: bPatient.name, phone: bPatient.phone }
      });
    }

    // 7. 🟡 ATTENTION: Free slots today
    const todaySessions = sessions
      .filter(s => s.date === todayStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (todaySessions.length === 0) {
      insights.push({
        id: 'ins-agenda-free',
        category: 'agenda',
        priority: 'attention',
        title: '🟡 Agenda Livre para Hoje',
        description: `Sua agenda de hoje está sem consultas agendadas. Um bom momento para organizar prontuários ou revisar metas do consultório.`,
        badgeText: 'Dia Livre',
        badgeColor: 'sky',
        actionLabel: 'Conferir Horários Vagos',
        actionId: 'CHECK_FREE_SLOTS',
        actionPrompt: 'Tenho horários livres hoje?',
        systemTab: 'schedule',
        actionType: 'open_schedule'
      });
    } else {
      const confirmedCount = todaySessions.filter(s => s.status === 'confirmada' || s.status === 'realizada').length;
      const firstSess = todaySessions[0];
      insights.push({
        id: 'ins-agenda-today',
        category: 'agenda',
        priority: 'suggestion',
        title: '🟢 Agenda de Hoje Organizada',
        description: `Hoje você possui ${todaySessions.length} consulta(s) agendada(s) (${confirmedCount} confirmadas). A primeira sessão é às ${firstSess.startTime} com ${firstSess.patientName}.`,
        badgeText: 'Agenda do Dia',
        badgeColor: 'emerald',
        actionLabel: 'Ver Agenda Completa',
        actionId: 'OPEN_SCHEDULE',
        actionPrompt: 'Clara, quais pacientes tenho hoje?',
        systemTab: 'schedule',
        actionType: 'open_schedule'
      });
    }

    // 8. 🟢 SUGGESTIONS: Monthly Performance & Revenue Goal Progress
    const currentMonthPaid = sessions
      .filter(s => s.date.startsWith(currentYearMonth) && s.paymentStatus === 'pago')
      .reduce((acc, s) => acc + s.price, 0);

    insights.push({
      id: 'ins-performance-month',
      category: 'performance',
      priority: 'suggestion',
      title: '🟢 Desempenho Financeiro do Mês',
      description: `Seu faturamento recebido neste mês é de ${this.formatCurrency(currentMonthPaid)} com ${patients.filter(p => p.status === 'ativo').length} pacientes ativos.`,
      badgeText: 'Faturamento Mês',
      badgeColor: 'emerald',
      actionLabel: 'Abrir Financeiro',
      actionId: 'CHECK_MONTH_REVENUE',
      actionPrompt: 'Quanto faturei este mês?',
      systemTab: 'finance'
    });

    // Sort insights strictly by priority: critical -> important -> attention -> suggestion
    const priorityOrder: Record<string, number> = {
      critical: 0,
      important: 1,
      attention: 2,
      suggestion: 3
    };

    return insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Action Dispatcher — Directly executes proactive or UI actions without NLP / Text classification / Fallback
   */
  public static dispatchAction(
    actionId: string,
    payload: any,
    patients: Patient[],
    sessions: Session[],
    profile: PsychologistProfile
  ): ClaraQueryResult {
    switch (actionId) {
      case 'CHECK_MONTH_REVENUE':
      case 'OPEN_FINANCIAL':
        return FinancialFlow.handleFinancialQuery(sessions);

      case 'CHECK_PENDING_PAYMENTS': {
        const pendingPaymentSessions = sessions.filter(
          (s) => s.status === 'realizada' && s.paymentStatus === 'pendente'
        );
        if (pendingPaymentSessions.length === 0) {
          return {
            text: `✅ **Pagamentos em Dia**\n\nTodas as consultas realizadas já estão com o pagamento registrado como pago. Parabéns pela gestão!`,
          };
        }
        const totalPending = pendingPaymentSessions.reduce((acc, s) => acc + s.price, 0);
        const firstUnpaid = pendingPaymentSessions[0];
        const list = pendingPaymentSessions
          .map(
            (s) =>
              `- 👤 **${s.patientName}** | ${s.date.split('-').reverse().join('/')} às ${s.startTime} | **${this.formatCurrency(s.price)}**`
          )
          .join('\n');
        return {
          text: `💰 **Cobranças Pendentes (${pendingPaymentSessions.length})**\n\n${list}\n\n**Total a receber**: ${this.formatCurrency(totalPending)}\n\n👉 **Ação Recomendada Clara**:\n**${firstUnpaid.patientName}** possui sessão de **${this.formatCurrency(firstUnpaid.price)}** pendente.\n\n[Enviar Cobrança WhatsApp]  [Marcar como Pago]`,
        };
      }

      case 'CHECK_FREE_SLOTS': {
        const { todayStr } = this.getDateHelpers();
        const formattedDate = todayStr.split('-').reverse().join('/');
        const todaySessions = sessions.filter(
          (s) => s.date === todayStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo'
        );

        const allSlots = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
        const occupied = todaySessions.map((s) => s.startTime);
        const freeSlots = allSlots.filter((slot) => !occupied.includes(slot));

        const chips = freeSlots.length > 0
          ? freeSlots.map((s) => `[${s}]`).join(' ')
          : 'Nenhum horário vago restante para hoje.';

        return {
          text: `📅 **Hoje — ${formattedDate}**\n\n🟢 **Consultas agendadas**: ${todaySessions.length}\n🟡 **Horários livres**: ${freeSlots.length}\n\n**Horários livres para hoje:**\n${chips}\n\n**Selecione uma opção de ação:**\n[Agendar Paciente]  [Criar Encaixe]  [Chamar Lista de Espera]`,
        };
      }

      case 'OPEN_AGENDA_TOMORROW': {
        const { tomorrowStr } = this.getDateHelpers();
        const formattedDate = tomorrowStr.split('-').reverse().join('/');
        const tomorrowSessions = sessions.filter(
          (s) => s.date === tomorrowStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo'
        );

        const confirmedCount = tomorrowSessions.filter(s => s.status === 'confirmada' || s.status === 'realizada').length;
        const allSlots = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
        const occupied = tomorrowSessions.map((s) => s.startTime);
        const freeSlots = allSlots.filter((slot) => !occupied.includes(slot));

        const chips = freeSlots.length > 0
          ? freeSlots.map((s) => `[${s}]`).join(' ')
          : 'Todos os horários de amanhã já estão preenchidos!';

        return {
          text: `📅 **Amanhã — ${formattedDate}**\n\n✅ **Consultas confirmadas**: ${confirmedCount}\n🟡 **Horários livres**: ${freeSlots.length}\n\n**Horários disponíveis para agendamento:**\n${chips}\n\n💡 **Sugestão Inteligente Clara**:\nEstes horários podem ser utilizados para encaixes ou retornos da lista de espera.\n\n[Agendar Paciente Amanhã]  [Enviar Lembrete aos Pacientes]`,
        };
      }

      case 'OPEN_SCHEDULE':
        return AppointmentFlow.handleLookupAgenda(sessions);

      case 'CHECK_UNFINISHED_RECORDS':
      case 'OPEN_PATIENT_RECORD': {
        const pendingEvolutions = sessions.filter(
          (s) => s.status === 'realizada' && (!s.clinicalNotes || s.clinicalNotes.trim().length === 0)
        );
        if (pendingEvolutions.length === 0) {
          return {
            text: `📝 **Prontuários Atualizados**\n\nTodas as sessões concluídas possuem evolução clínica salva. Excelente organização!`,
          };
        }
        const list = pendingEvolutions
          .map((s) => `- 👤 **${s.patientName}** — Sessão de ${s.date.split('-').reverse().join('/')} às ${s.startTime}`)
          .join('\n');
        const firstPending = pendingEvolutions[0];
        return {
          text: `📋 **Prontuários Pendentes de Evolução (${pendingEvolutions.length})**\n\n${list}\n\n💡 Exemplo: **${firstPending.patientName}** está sem evolução registrada.\n\nRedirecionando para a ficha do paciente...`,
          executeImmediately: {
            type: 'open_prontuario',
            payload: { patientName: firstPending.patientName }
          }
        };
      }

      case 'CHECK_BIRTHDAYS': {
        const { todayStr } = this.getDateHelpers();
        const mmddToday = todayStr.substring(5);
        const birthdayPatients = patients.filter((p) => p.birthDate && p.birthDate.substring(5) === mmddToday);
        if (birthdayPatients.length === 0) {
          return {
            text: `🎉 **Aniversariantes do Dia**\n\nNenhum paciente cadastrado faz aniversário hoje.`,
          };
        }
        const bP = birthdayPatients[0];
        return {
          text: `🎂 **Aniversariante do Dia: ${bP.name}!**\n\nTelefone: ${bP.phone || 'Não informado'}.\n\nRedirecionando para o envio de mensagem de parabéns via WhatsApp.`,
          executeImmediately: {
            type: 'send_whatsapp',
            payload: { patientName: bP.name, phone: bP.phone }
          }
        };
      }

      case 'OPEN_WAITING_LIST': {
        const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const patientsWithoutReturn = patients.filter((p) => {
          if (p.status !== 'ativo') return false;
          const pSessions = sessions.filter(
            (s) => (s.patientId === p.id || s.patientName.toLowerCase() === p.name.toLowerCase()) && s.date >= thirtyDaysAgoStr
          );
          return pSessions.length === 0;
        });
        if (patientsWithoutReturn.length === 0) {
          return {
            text: `👥 **Lista de Retornos**\n\nTodos os seus pacientes ativos realizaram atendimento nos últimos 30 dias!`,
          };
        }
        const targetP = patientsWithoutReturn[0];
        const list = patientsWithoutReturn
          .map((p) => `- 👤 **${p.name}** (${p.phone || 'Sem telefone'})`)
          .join('\n');
        return {
          text: `👥 **Pacientes sem Retorno Há +30 Dias (${patientsWithoutReturn.length})**\n\n${list}\n\n💡 **Sugestão Clara**: **${targetP.name}** está sem atendimento há mais de 30 dias. Deseja enviar uma mensagem de acompanhamento via WhatsApp?`,
        };
      }

      case 'CONFIRM_SESSION': {
        const { todayStr, tomorrowStr } = this.getDateHelpers();
        const unconfirmed = sessions.filter(
          (s) => (s.date === todayStr || s.date === tomorrowStr) && (s.status === 'agendada' || s.status === 'solicita_reagendamento')
        );
        if (unconfirmed.length === 0) {
          return {
            text: `✅ **Agenda Confirmada**\n\nNão há consultas pendentes de confirmação para hoje ou amanhã.`,
          };
        }
        const target = unconfirmed[0];
        return {
          text: `📅 **Aguardando Confirmação**\n\nConsulta de **${target.patientName}** em ${target.date.split('-').reverse().join('/')} às ${target.startTime}.\nStatus: ${target.status === 'solicita_reagendamento' ? 'Solicita reagendamento' : 'Agendada'}.`,
          executeImmediately: {
            type: 'confirm_session',
            payload: { sessionId: target.id, patientName: target.patientName }
          }
        };
      }

      case 'CREATE_PATIENT': {
        return {
          text: `➕ **Cadastro de Paciente**\n\nRedirecionando para a aba de pacientes e abrindo o formulário de cadastro.\n\nPreencha os dados para habilitar agendamentos e acompanhamento clínico.`,
          executeImmediately: {
            type: 'open_patients_tab',
            payload: {}
          }
        };
      }

      default:
        return {
          text: `✨ **Ação Processada**\n\nAção executada com sucesso.`,
        };
    }
  }
}
