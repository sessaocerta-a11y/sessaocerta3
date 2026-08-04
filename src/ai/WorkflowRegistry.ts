import { Patient, Session, PsychologistProfile } from '../types';
import { ClaraQueryResult, InProgressState } from './types';
import { EntityExtractor } from './EntityExtractor';
import { PromptManager } from './PromptManager';

export interface WorkflowDefinition {
  id: string;
  name: string;
  requiredFields: string[];
  optionalFields: string[];
}

export class WorkflowRegistry {
  /**
   * Helper: Format YYYY-MM-DD to DD/MM/YYYY
   */
  public static formatDateBR(dateStr: string): string {
    if (!dateStr) return '';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  /**
   * Helper: Get today's date string YYYY-MM-DD
   */
  public static getTodayDateString(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Helper: Parse Portuguese date strings (hoje, amanhã, próxima terça, DD/MM/AAAA)
   */
  public static parsePortugueseDate(input: string): { dateStr: string; rawMatched: string; isPast: boolean } {
    const lower = input.toLowerCase().trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let targetDate = new Date(today);
    let rawMatched = '';

    if (lower.includes('hoje')) {
      rawMatched = 'hoje';
    } else if (lower.includes('amanhã') || lower.includes('amanha')) {
      targetDate.setDate(targetDate.getDate() + 1);
      rawMatched = 'amanhã';
    } else {
      // Regex for DD/MM or DD/MM/YYYY
      const dateMatch = input.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10) - 1;
        let year = dateMatch[3] ? parseInt(dateMatch[3], 10) : today.getFullYear();
        if (year < 100) year += 2000;
        targetDate = new Date(year, month, day, 0, 0, 0, 0);
        rawMatched = dateMatch[0];
      } else {
        // Weekday matching: segunda, terça, quarta, quinta, sexta, sábado, domingo
        const weekdays = ['domingo', 'segunda', 'terça', 'terca', 'quarta', 'quinta', 'sexta', 'sábado', 'sabado'];
        const foundDay = weekdays.findIndex(w => lower.includes(w));
        if (foundDay !== -1) {
          const targetDayIndex = foundDay === 0 ? 0 : (foundDay === 1 ? 1 : (foundDay <= 3 ? foundDay : (foundDay <= 5 ? foundDay - 1 : (foundDay <= 7 ? foundDay - 2 : foundDay - 3))));
          const currentDayIndex = today.getDay();
          let daysToAdd = (targetDayIndex - currentDayIndex + 7) % 7;
          if (daysToAdd === 0) daysToAdd = 7; // Next occurrence
          targetDate.setDate(targetDate.getDate() + daysToAdd);
          rawMatched = weekdays[foundDay];
        } else {
          return { dateStr: '', rawMatched: '', isPast: false };
        }
      }
    }

    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const todayStr = WorkflowRegistry.getTodayDateString();
    const isPast = dateStr < todayStr;

    return { dateStr, rawMatched, isPast };
  }

  /**
   * Helper: Parse Time string (HH:MM)
   */
  public static parseTime(input: string): string {
    if (!input) return '';
    // Remove date strings (e.g. DD/MM/YYYY or DD/MM) so date numbers like 15/08 don't match as HH:MM
    const cleanInput = input.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, '').trim();

    // 1. Explicit colon: 14:30, 09:00, 9:00
    const colonMatch = cleanInput.match(/\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\b/);
    if (colonMatch) {
      const hh = String(parseInt(colonMatch[1], 10)).padStart(2, '0');
      const mm = String(parseInt(colonMatch[2], 10)).padStart(2, '0');
      return `${hh}:${mm}`;
    }

    // 2. Time with h, hs, horas: 15h, 15h30, 9h, 14hs, 14 horas
    const hMatch = cleanInput.match(/\b([0-1]?[0-9]|2[0-3])\s*(?:h|hs|horas)\s*([0-5][0-9])?\b/i);
    if (hMatch) {
      const hh = String(parseInt(hMatch[1], 10)).padStart(2, '0');
      const mm = hMatch[2] ? String(parseInt(hMatch[2], 10)).padStart(2, '0') : '00';
      return `${hh}:${mm}`;
    }

    // 3. Time preceded by 'às' or 'as': às 15, as 9
    const asMatch = cleanInput.match(/\b(?:às|as)\s*([0-1]?[0-9]|2[0-3])\b/i);
    if (asMatch) {
      const hh = String(parseInt(asMatch[1], 10)).padStart(2, '0');
      return `${hh}:00`;
    }

    return '';
  }

  /**
   * Helper: Calculate session end time (HH:MM) given start time and duration
   */
  public static calculateEndTime(startTime: string, durationMinutes: number = 50): string {
    if (!startTime || !startTime.includes(':')) return '';
    const [h, m] = startTime.split(':').map(Number);
    const total = h * 60 + m + (durationMinutes || 50);
    const endH = String(Math.floor(total / 60) % 24).padStart(2, '0');
    const endM = String(total % 60).padStart(2, '0');
    return `${endH}:${endM}`;
  }

  /**
   * Helper: Get available time slots for a given date by checking conflicts against agenda
   */
  public static getAvailableTimeSlots(sessions: Session[], dateStr: string, excludeSessionId?: string): string[] {
    const candidateSlots = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
    return candidateSlots.filter(slot => !WorkflowRegistry.findConflictingSession(sessions, dateStr, slot, excludeSessionId));
  }

  /**
   * Helper: Check for overlapping sessions in agenda
   */
  public static findConflictingSession(
    sessions: Session[],
    date: string,
    time: string,
    excludeSessionId?: string
  ): Session | null {
    if (!sessions || sessions.length === 0 || !date || !time) return null;

    const [reqH, reqM] = time.split(':').map(Number);
    const reqStartMin = reqH * 60 + reqM;
    const reqEndMin = reqStartMin + 50; // Default 50 min window check

    for (const s of sessions) {
      if (s.id === excludeSessionId || s.status.startsWith('cancelada')) continue;
      if (s.date === date && s.startTime) {
        const [sH, sM] = s.startTime.split(':').map(Number);
        const sStartMin = sH * 60 + sM;
        const sDuration = s.durationMinutes || 50;
        const sEndMin = sStartMin + sDuration;

        // Overlap check
        if (reqStartMin < sEndMin && reqEndMin > sStartMin) {
          return s;
        }
      }
    }
    return null;
  }

  /**
   * Helper: Match patient from query string
   */
  public static findMatchingPatient(
    patients: Patient[],
    query: string
  ): { patient: Patient | null; multipleMatches: Patient[] } {
    if (!query || query.trim().length === 0 || !patients || patients.length === 0) {
      return { patient: null, multipleMatches: [] };
    }

    const lowerQuery = query.toLowerCase().trim();

    // 1. Exact full name match
    const exact = patients.find(p => p.name.toLowerCase() === lowerQuery);
    if (exact) return { patient: exact, multipleMatches: [exact] };

    // 2. Substring matches
    const matches = patients.filter(p => p.name.toLowerCase().includes(lowerQuery) || lowerQuery.includes(p.name.toLowerCase()));

    if (matches.length === 1) {
      return { patient: matches[0], multipleMatches: matches };
    } else if (matches.length > 1) {
      return { patient: null, multipleMatches: matches };
    }

    // 3. First name matches
    const firstNameMatches = patients.filter(p => {
      const firstName = p.name.trim().split(' ')[0].toLowerCase();
      return firstName === lowerQuery || lowerQuery.includes(firstName);
    });

    if (firstNameMatches.length === 1) {
      return { patient: firstNameMatches[0], multipleMatches: firstNameMatches };
    } else if (firstNameMatches.length > 1) {
      return { patient: null, multipleMatches: firstNameMatches };
    }

    return { patient: null, multipleMatches: [] };
  }

  // =========================================================================
  // WORKFLOW 1: AGENDAMENTO DE CONSULTA
  // =========================================================================

  public static handleAgendamentoWorkflow(
    rawPrompt: string,
    stateData: any,
    patients: Patient[],
    sessions: Session[],
    profile: PsychologistProfile
  ): ClaraQueryResult {
    const data = { ...stateData };
    const lower = rawPrompt.toLowerCase().trim();

    // Stage 1: Identify Patient
    if (!data.patientName) {
      const matchResult = WorkflowRegistry.findMatchingPatient(patients, rawPrompt);
      if (matchResult.patient) {
        data.patientName = matchResult.patient.name;
        data.patientId = matchResult.patient.id;
        if (matchResult.patient.sessionPrice) {
          data.defaultPrice = matchResult.patient.sessionPrice;
        }
      } else if (matchResult.multipleMatches.length > 1) {
        const namesList = matchResult.multipleMatches.map(p => `• **${p.name}**`).join('\n');
        return {
          text: `Encontrei mais de um paciente com esse nome. Qual deles você deseja agendar?\n\n${namesList}\n\n*(Por favor digite o nome completo)*`,
          nextInProgressState: { type: 'WORKFLOW_AGENDAMENTO', data }
        };
      } else if (rawPrompt.length >= 2 && !lower.includes('agendar') && !lower.includes('consulta')) {
        // User typed a custom patient name not yet in system
        data.patientName = EntityExtractor.formatSmartCapitalization(rawPrompt);
      } else {
        if (patients.length === 0) {
          return {
            text: `📋 **Nenhum Paciente Cadastrado**\n\nIdentifiquei que seu consultório ainda não possui pacientes cadastrados.\n\nPara agendar uma consulta, primeiro precisamos cadastrar o seu primeiro paciente.\n\nDeseja fazer isso agora?\n\n[Cadastrar Novo Paciente]  [Cancelar]`,
          };
        }

        const pList = patients.map(p => `• **${p.name}**`).join('\n');

        return {
          text: `🗓️ **Agendamento de Consulta**\n\nQual é o **paciente** para quem deseja agendar a consulta?\n\n**Pacientes em seu consultório:**\n${pList}`,
          nextInProgressState: { type: 'WORKFLOW_AGENDAMENTO', data }
        };
      }
    }

    // Stage 2: Identify Date
    if (!data.date) {
      const parsedDate = WorkflowRegistry.parsePortugueseDate(rawPrompt);
      if (parsedDate.dateStr) {
        if (parsedDate.isPast) {
          return {
            text: `⚠️ A data **${WorkflowRegistry.formatDateBR(parsedDate.dateStr)}** já passou. Por favor, informe uma data de hoje em diante para a consulta de **${data.patientName}**:`,
            nextInProgressState: { type: 'WORKFLOW_AGENDAMENTO', data }
          };
        }
        data.date = parsedDate.dateStr;
        const parsedTimeFromDatePrompt = WorkflowRegistry.parseTime(rawPrompt);
        if (parsedTimeFromDatePrompt) {
          data.time = parsedTimeFromDatePrompt;
        }
      } else {
        return {
          text: `Para qual **data** você gostaria de agendar a consulta de **${data.patientName}**?\n*(ex: **15/08/2026**, **amanhã** ou **próxima terça**)*`,
          nextInProgressState: { type: 'WORKFLOW_AGENDAMENTO', data }
        };
      }
    }

    // Stage 3: Identify Time & Check Agenda
    if (!data.time) {
      const availableSlots = WorkflowRegistry.getAvailableTimeSlots(sessions, data.date);
      const numSelection = parseInt(lower.replace(/\D/g, ''), 10);

      if (
        numSelection >= 1 &&
        numSelection <= availableSlots.length &&
        (lower.length <= 3 || lower.includes('opcao') || lower.includes('opção') || lower.includes('horario') || lower.includes('horário'))
      ) {
        data.time = availableSlots[numSelection - 1];
      } else {
        const parsedTime = WorkflowRegistry.parseTime(rawPrompt);
        if (parsedTime) {
          // Conflict check
          const conflict = WorkflowRegistry.findConflictingSession(sessions, data.date, parsedTime);
          if (conflict) {
            return {
              text: `⚠️ **Conflito de Horário**: Já existe uma consulta agendada com **${conflict.patientName}** no dia **${WorkflowRegistry.formatDateBR(data.date)}** às **${parsedTime}**.\n\nPor favor, escolha outro horário livre para a consulta de **${data.patientName}**:`,
              nextInProgressState: { type: 'WORKFLOW_AGENDAMENTO', data }
            };
          }
          data.time = parsedTime;
        }
      }

      if (!data.time) {
        const slotsFormatted = availableSlots.length > 0
          ? availableSlots.map((slot, idx) => `${idx + 1}️⃣ **${slot}**`).join('\n')
          : '*(Nenhum horário padrão vago encontrado nesta data)*';

        return {
          text: `🟣 **Agendamento de Consulta**\n\nPara **${WorkflowRegistry.formatDateBR(data.date)}**, consultei sua agenda e encontrei os seguintes horários livres:\n\n${slotsFormatted}\n\n👉 *Caso prefira outro horário, basta digitá-lo. Verificarei automaticamente se existe disponibilidade.*`,
          nextInProgressState: { type: 'WORKFLOW_AGENDAMENTO', data }
        };
      }
    }

    // Stage 4: Duration
    if (!data.durationMinutes) {
      if (lower === '1' || lower.includes('30')) data.durationMinutes = 30;
      else if (lower === '2' || lower.includes('45')) data.durationMinutes = 45;
      else if (lower === '3' || lower.includes('50')) data.durationMinutes = 50;
      else if (lower === '4' || lower.includes('60') || lower.includes('1 hora')) data.durationMinutes = 60;
      else if (lower === '5' || lower.includes('90')) data.durationMinutes = 90;
      else if (lower === '6' || lower.includes('120') || lower.includes('2 hora')) data.durationMinutes = 120;
      else {
        return {
          text: `🟣 **Agendamento de Consulta**\n\nQuanto tempo costuma durar essa sessão com **${data.patientName}**?\n\n1️⃣ **30 minutos**\n2️⃣ **45 minutos**\n3️⃣ **50 minutos**\n4️⃣ **60 minutos (1 hora)**\n5️⃣ **90 minutos**\n6️⃣ **120 minutos**\n\n*(Responda com o número da opção ou informe a duração em minutos)*`,
          nextInProgressState: { type: 'WORKFLOW_AGENDAMENTO', data }
        };
      }
    }

    // Stage 5: Modality
    if (!data.modality) {
      if (lower === '1' || lower.includes('presencial')) data.modality = 'presencial';
      else if (lower === '2' || lower.includes('online') || lower.includes('remoto')) data.modality = 'online';
      else {
        return {
          text: `🟣 **Agendamento de Consulta**\n\nEssa consulta com **${data.patientName}** será online ou presencial?\n\n1️⃣ 🏢 **Presencial**\n2️⃣ 💻 **Online**`,
          nextInProgressState: { type: 'WORKFLOW_AGENDAMENTO', data }
        };
      }
    }

    // Stage 6: Value / Session Price
    if (data.price === undefined) {
      const defaultVal = data.defaultPrice || profile?.sessionDefaultPrice || 150;
      if (lower === 'sim' || lower === 's' || lower === '1' || lower === 'usar padrao' || lower === 'usar padrão') {
        data.price = defaultVal;
      } else {
        const numMatch = rawPrompt.match(/\d+(?:[.,]\d{1,2})?/);
        if (numMatch && !lower.includes('agendar')) {
          data.price = parseFloat(numMatch[0].replace(',', '.'));
        } else {
          return {
            text: `🟣 **Agendamento de Consulta**\n\nEncontrei um valor padrão de R$ ${defaultVal},00 para este paciente. Vou utilizá-lo como padrão. Caso deseje alterar, basta informar o novo valor.\n\n*(Responda **sim** para confirmar R$ ${defaultVal},00 ou informe o novo valor desejado)*`,
            nextInProgressState: { type: 'WORKFLOW_AGENDAMENTO', data }
          };
        }
      }
    }

    // Stage 7: Payment Status
    if (!data.paymentStatus) {
      if (lower === '1' || lower.includes('pendente')) data.paymentStatus = 'pendente';
      else if (lower === '2' || lower.includes('pago') || lower.includes('paga')) data.paymentStatus = 'pago';
      else {
        return {
          text: `🟣 **Agendamento de Consulta**\n\nQual o status inicial do pagamento da consulta de **${data.patientName}**?\n\n1️⃣ ⏳ **Pendente**\n2️⃣ ✅ **Pago**`,
          nextInProgressState: { type: 'WORKFLOW_AGENDAMENTO', data }
        };
      }
    }

    // Stage 8: Recurrence
    if (!data.recurrence) {
      if (lower === '1' || lower.includes('avulso') || lower.includes('avulsa') || lower.includes('apenas esta')) data.recurrence = 'avulso';
      else if (lower === '2' || lower.includes('2 semanas') || lower.includes('quinzenal')) data.recurrence = '2_semanas';
      else if (lower === '3' || lower.includes('4 semanas') || lower.includes('mensal')) data.recurrence = '4_semanas';
      else if (lower === '4' || lower.includes('8 semanas')) data.recurrence = '8_semanas';
      else {
        return {
          text: `🟣 **Agendamento de Consulta**\n\nEsta consulta será um atendimento avulso ou possui frequência regular?\n\n1️⃣ 📌 **Avulso** (Apenas esta consulta)\n2️⃣ 🔁 **A cada 2 semanas** (Quinzenal)\n3️⃣ 🔁 **A cada 4 semanas** (Mensal)\n4️⃣ 🔁 **A cada 8 semanas**`,
          nextInProgressState: { type: 'WORKFLOW_AGENDAMENTO', data }
        };
      }
    }

    // Stage 9: Summary & Explicit Confirmation
    if (!data.confirmed) {
      const isAffirmative = lower === 'sim' || lower === 's' || lower === '1' || lower === 'confirmar' || lower === 'pode' || lower === 'ok';
      if (isAffirmative) {
        data.confirmed = true;
      } else {
        const endTime = WorkflowRegistry.calculateEndTime(data.time, data.durationMinutes);
        const timeLabel = endTime ? `${data.time} às ${endTime}` : data.time;
        const recurrenceLabel =
          data.recurrence === '2_semanas' ? 'A cada 2 semanas' :
          data.recurrence === '4_semanas' ? 'A cada 4 semanas' :
          data.recurrence === '8_semanas' ? 'A cada 8 semanas' : 'Avulso';

        return {
          text: [
            `🟣 **Agendamento de Consulta**`,
            ``,
            `📋 **Resumo do Agendamento**`,
            `----------------------------------------`,
            `• 👤 **Paciente**: **${data.patientName}**`,
            `• 📅 **Data**: **${WorkflowRegistry.formatDateBR(data.date)}**`,
            `• ⏰ **Horário**: **${timeLabel}**`,
            `• ⏱️ **Duração**: **${data.durationMinutes} minutos**`,
            `• 💻 **Modalidade**: **${data.modality === 'online' ? 'Online' : 'Presencial'}**`,
            `• 💰 **Valor**: **R$ ${data.price},00**`,
            `• 💳 **Pagamento**: **${data.paymentStatus === 'pago' ? 'Pago' : 'Pendente'}**`,
            `• 🔁 **Repetição**: **${recurrenceLabel}**`,
            `----------------------------------------`,
            ``,
            `👉 **Posso confirmar o agendamento?** *(Responda **sim** para confirmar ou **cancelar** para descartar)*`
          ].join('\n'),
          nextInProgressState: { type: 'WORKFLOW_AGENDAMENTO', data }
        };
      }
    }

    // Stage 10: Execution
    const endTime = WorkflowRegistry.calculateEndTime(data.time, data.durationMinutes);
    const timeLabel = endTime ? `${data.time} às ${endTime}` : data.time;

    return {
      text: [
        `✅ **Consulta agendada com sucesso!**`,
        `A agenda foi atualizada.`,
        `O Dashboard foi sincronizado.`,
        `O histórico do paciente foi atualizado.`,
        ``,
        `O que você gostaria de fazer agora?`,
        ``,
        `1️⃣ 📂 **Abrir prontuário**`,
        `2️⃣ 📝 **Registrar evolução clínica**`,
        `3️⃣ 📧 **Enviar confirmação ao paciente**`,
        `4️⃣ 📋 **Voltar para Agenda**`,
        `5️⃣ 📅 **Agendar próxima consulta**`
      ].join('\n'),
      executeImmediately: {
        type: 'create_session',
        payload: {
          patientName: data.patientName,
          date: data.date,
          time: data.time,
          endTime: endTime,
          durationMinutes: data.durationMinutes || 50,
          type: data.modality || 'presencial',
          status: 'agendada',
          price: data.price || 150,
          paymentStatus: data.paymentStatus || 'pendente'
        }
      },
      nextInProgressState: {
        type: 'POS_AGENDAMENTO',
        data: {
          patientName: data.patientName,
          patientId: data.patientId,
          sessionPrice: data.price
        }
      }
    };
  }

  // =========================================================================
  // WORKFLOW 2: REGISTRAR PAGAMENTO
  // =========================================================================

  public static handlePagamentoWorkflow(
    rawPrompt: string,
    stateData: any,
    patients: Patient[],
    sessions: Session[]
  ): ClaraQueryResult {
    const data = { ...stateData };
    const lower = rawPrompt.toLowerCase().trim();

    // 1. Patient
    if (!data.patientName) {
      const matchResult = WorkflowRegistry.findMatchingPatient(patients, rawPrompt);
      if (matchResult.patient) {
        data.patientName = matchResult.patient.name;
        data.patientId = matchResult.patient.id;
        if (matchResult.patient.sessionPrice) data.defaultPrice = matchResult.patient.sessionPrice;
      } else if (rawPrompt.length >= 2 && !lower.includes('pagamento') && !lower.includes('registrar')) {
        data.patientName = EntityExtractor.formatSmartCapitalization(rawPrompt);
      } else {
        const pList = patients.length > 0 ? patients.map(p => `• **${p.name}**`).join('\n') : '';
        return {
          text: `🔵 **Registro Financeiro**\n\nPara qual **paciente** deseja registrar o pagamento?\n\n${pList}`,
          nextInProgressState: { type: 'WORKFLOW_PAGAMENTO', data }
        };
      }
    }

    // 2. Amount
    if (data.amount === undefined) {
      const defaultVal = data.defaultPrice || 150;
      if (lower === 'sim' || lower === 's' || lower === '1' || lower === 'usar padrao') {
        data.amount = defaultVal;
      } else {
        const numMatch = rawPrompt.match(/\d+(?:[.,]\d{1,2})?/);
        if (numMatch && !lower.includes('registrar') && !lower.includes('pagamento')) {
          data.amount = parseFloat(numMatch[0].replace(',', '.'));
        } else {
          return {
            text: `🔵 **Registro Financeiro**\n\nEncontrei o valor padrão de R$ ${defaultVal},00 para **${data.patientName}**.\n\nVou utilizá-lo como padrão. Caso deseje alterar, basta informar o novo valor.\n*(Responda **sim** para R$ ${defaultVal},00 ou digite o valor desejado)*`,
            nextInProgressState: { type: 'WORKFLOW_PAGAMENTO', data }
          };
        }
      }
    }

    // 3. Payment Method
    if (!data.paymentMethod) {
      if (lower === '1' || lower.includes('pix')) data.paymentMethod = 'Pix';
      else if (lower === '2' || lower.includes('crédito') || lower.includes('credito')) data.paymentMethod = 'Cartão de Crédito';
      else if (lower === '3' || lower.includes('débito') || lower.includes('debito')) data.paymentMethod = 'Cartão de Débito';
      else if (lower === '4' || lower.includes('dinheiro') || lower.includes('espécie')) data.paymentMethod = 'Dinheiro';
      else if (lower === '5' || lower.includes('transferência') || lower.includes('transferencia') || lower.includes('ted')) data.paymentMethod = 'Transferência Bancária';
      else {
        return {
          text: `🔵 **Registro Financeiro**\n\nQual foi a **forma de pagamento** realizada por **${data.patientName}**?\n\n1️⃣ **Pix**\n2️⃣ **Cartão de Crédito**\n3️⃣ **Cartão de Débito**\n4️⃣ **Dinheiro**\n5️⃣ **Transferência Bancária**`,
          nextInProgressState: { type: 'WORKFLOW_PAGAMENTO', data }
        };
      }
    }

    // 4. Payment Date
    if (!data.paymentDate) {
      if (lower === 'hoje' || lower === '1' || lower === 'sim' || lower === 's') {
        data.paymentDate = WorkflowRegistry.getTodayDateString();
      } else {
        const parsedDate = WorkflowRegistry.parsePortugueseDate(rawPrompt);
        if (parsedDate.dateStr) {
          data.paymentDate = parsedDate.dateStr;
        } else {
          return {
            text: `🔵 **Registro Financeiro**\n\nQual foi a **data do pagamento**?\n*(Digite **hoje** para utilizar a data de hoje ou informe a data DD/MM/AAAA)*`,
            nextInProgressState: { type: 'WORKFLOW_PAGAMENTO', data }
          };
        }
      }
    }

    // 5. Summary & Confirmation
    if (!data.confirmed) {
      const isAffirmative = lower === 'sim' || lower === 's' || lower === '1' || lower === 'confirmar' || lower === 'pode';
      if (isAffirmative) {
        data.confirmed = true;
      } else {
        return {
          text: [
            `🔵 **Registro Financeiro**`,
            ``,
            `📋 **Resumo do Pagamento**`,
            `----------------------------------------`,
            `• 👤 **Paciente**: **${data.patientName}**`,
            `• 💰 **Valor**: **R$ ${data.amount.toFixed(2).replace('.', ',')}**`,
            `• 💳 **Forma**: **${data.paymentMethod}**`,
            `• 📅 **Data**: **${WorkflowRegistry.formatDateBR(data.paymentDate)}**`,
            `----------------------------------------`,
            ``,
            `👉 **Posso registrar este pagamento no sistema?** *(Responda **sim** para confirmar ou **cancelar** para descartar)*`
          ].join('\n'),
          nextInProgressState: { type: 'WORKFLOW_PAGAMENTO', data }
        };
      }
    }

    // 6. Execution
    return {
      text: `✅ **Pagamento de R$ ${data.amount.toFixed(2).replace('.', ',')} registrado com sucesso para ${data.patientName}!**\n\nO lançamento financeiro foi gravado no histórico. Como posso te ajudar agora?`,
      executeImmediately: {
        type: 'mark_paid',
        payload: {
          patientName: data.patientName,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          date: data.paymentDate
        }
      },
      nextInProgressState: null // IDLE
    };
  }

  // =========================================================================
  // WORKFLOW 3: REGISTRAR EVOLUÇÃO CLÍNICA / PRONTUÁRIO
  // =========================================================================

  public static handleEvolucaoWorkflow(
    rawPrompt: string,
    stateData: any,
    patients: Patient[],
    sessions: Session[]
  ): ClaraQueryResult {
    const data = { ...stateData };
    const lower = rawPrompt.toLowerCase().trim();

    // 1. Patient
    if (!data.patientName) {
      const matchResult = WorkflowRegistry.findMatchingPatient(patients, rawPrompt);
      if (matchResult.patient) {
        data.patientName = matchResult.patient.name;
        data.patientId = matchResult.patient.id;
      } else if (rawPrompt.length >= 2 && !lower.includes('evolução') && !lower.includes('evolucao') && !lower.includes('anotação')) {
        data.patientName = EntityExtractor.formatSmartCapitalization(rawPrompt);
      } else {
        const pList = patients.length > 0 ? patients.map(p => `• **${p.name}**`).join('\n') : '';
        return {
          text: `🟠 **Prontuário & Evolução**\n\nPara qual **paciente** deseja registrar a evolução clínica?\n\n${pList}`,
          nextInProgressState: { type: 'WORKFLOW_EVOLUCAO', data }
        };
      }
    }

    // 2. Clinical Text
    if (!data.evolutionText) {
      if (rawPrompt.length >= 5 && !lower.includes('evolução') && !lower.includes('evolucao') && !lower.includes('registrar')) {
        data.evolutionText = rawPrompt.trim();
      } else {
        return {
          text: `🟠 **Prontuário & Evolução**\n\nPor favor, digite o **texto da evolução clínica** para o prontuário de **${data.patientName}**:`,
          nextInProgressState: { type: 'WORKFLOW_EVOLUCAO', data }
        };
      }
    }

    // 3. Summary & Confirmation
    if (!data.confirmed) {
      const isAffirmative = lower === 'sim' || lower === 's' || lower === '1' || lower === 'confirmar' || lower === 'salvar';
      if (isAffirmative) {
        data.confirmed = true;
      } else {
        return {
          text: [
            `🟠 **Prontuário & Evolução**`,
            ``,
            `📋 **Resumo da Evolução Clínica**`,
            `----------------------------------------`,
            `• 👤 **Paciente**: **${data.patientName}**`,
            `• 📝 **Texto**: "${data.evolutionText}"`,
            `----------------------------------------`,
            ``,
            `👉 **Posso salvar esta evolução no prontuário de ${data.patientName}?** *(Responda **sim** para salvar ou **cancelar**)*`
          ].join('\n'),
          nextInProgressState: { type: 'WORKFLOW_EVOLUCAO', data }
        };
      }
    }

    // 4. Execution
    return {
      text: `📝 **Evolução clínica registrada com sucesso para ${data.patientName}!**\n\nA anotação foi gravada com segurança no prontuário do paciente.`,
      executeImmediately: {
        type: 'create_clinical_note',
        payload: {
          patientName: data.patientName,
          notes: data.evolutionText
        }
      },
      nextInProgressState: null // IDLE
    };
  }

  // =========================================================================
  // WORKFLOW 4: REMARCAR / REAGENDAR CONSULTA
  // =========================================================================

  public static handleReagendamentoWorkflow(
    rawPrompt: string,
    stateData: any,
    patients: Patient[],
    sessions: Session[]
  ): ClaraQueryResult {
    const data = { ...stateData };
    const lower = rawPrompt.toLowerCase().trim();

    // 1. Patient
    if (!data.patientName) {
      const matchResult = WorkflowRegistry.findMatchingPatient(patients, rawPrompt);
      if (matchResult.patient) {
        data.patientName = matchResult.patient.name;
        data.patientId = matchResult.patient.id;
      } else {
        const pList = patients.length > 0 ? patients.map(p => `• **${p.name}**`).join('\n') : '';
        return {
          text: `🔄 **Remarcar Consulta**\n\nQual paciente deseja remarcar a consulta?\n\n${pList}`,
          nextInProgressState: { type: 'WORKFLOW_REAGENDAMENTO', data }
        };
      }
    }

    // 2. Select Session if multiple active sessions exist for patient
    if (!data.sessionId) {
      const patientSessions = sessions.filter(
        s => s.patientName.toLowerCase().includes(data.patientName.toLowerCase()) && !s.status.startsWith('cancelada')
      );
      if (patientSessions.length === 1) {
        data.sessionId = patientSessions[0].id;
        data.oldDate = patientSessions[0].date;
        data.oldTime = patientSessions[0].startTime;
      } else if (patientSessions.length > 1) {
        if (lower.startsWith('opcao') || lower.startsWith('opção') || /^[1-9]$/.test(lower)) {
          const idx = parseInt(lower.replace(/\D/g, ''), 10) - 1;
          if (idx >= 0 && idx < patientSessions.length) {
            data.sessionId = patientSessions[idx].id;
            data.oldDate = patientSessions[idx].date;
            data.oldTime = patientSessions[idx].startTime;
          }
        }
        if (!data.sessionId) {
          const sessList = patientSessions
            .map((s, i) => `${i + 1}️⃣ Dia **${WorkflowRegistry.formatDateBR(s.date)}** às **${s.startTime}**`)
            .join('\n');
          return {
            text: `Encontrei mais de uma consulta agendada para **${data.patientName}**. Qual deseja remarcar?\n\n${sessList}\n\n*(Responda com o número da opção)*`,
            nextInProgressState: { type: 'WORKFLOW_REAGENDAMENTO', data }
          };
        }
      } else {
        // Assume default target or new session slot
        data.sessionId = 'latest';
      }
    }

    // 3. New Date
    if (!data.newDate) {
      const parsedDate = WorkflowRegistry.parsePortugueseDate(rawPrompt);
      if (parsedDate.dateStr) {
        if (parsedDate.isPast) {
          return {
            text: `⚠️ A data **${WorkflowRegistry.formatDateBR(parsedDate.dateStr)}** já passou. Por favor informe uma nova data de hoje em diante para **${data.patientName}**:`,
            nextInProgressState: { type: 'WORKFLOW_REAGENDAMENTO', data }
          };
        }
        data.newDate = parsedDate.dateStr;
      } else {
        return {
          text: `Qual a **nova data** para a consulta de **${data.patientName}**?\n*(ex: **20/08/2026**, **amanhã** ou **próxima quinta**)*`,
          nextInProgressState: { type: 'WORKFLOW_REAGENDAMENTO', data }
        };
      }
    }

    // 4. New Time & Conflict Check
    if (!data.newTime) {
      const parsedTime = WorkflowRegistry.parseTime(rawPrompt);
      if (parsedTime) {
        const conflict = WorkflowRegistry.findConflictingSession(sessions, data.newDate, parsedTime, data.sessionId);
        if (conflict) {
          return {
            text: `⚠️ **Conflito de Horário**: Já existe uma consulta agendada com **${conflict.patientName}** no dia **${WorkflowRegistry.formatDateBR(data.newDate)}** às **${parsedTime}**.\n\nPor favor, informe outro horário para a consulta de **${data.patientName}**:`,
            nextInProgressState: { type: 'WORKFLOW_REAGENDAMENTO', data }
          };
        }
        data.newTime = parsedTime;
      } else {
        return {
          text: `Qual o **novo horário** da consulta de **${data.patientName}** no dia **${WorkflowRegistry.formatDateBR(data.newDate)}**?\n*(ex: **15:00**, **10:30** ou **16h**)*`,
          nextInProgressState: { type: 'WORKFLOW_REAGENDAMENTO', data }
        };
      }
    }

    // 5. Summary & Confirmation
    if (!data.confirmed) {
      const isAffirmative = lower === 'sim' || lower === 's' || lower === '1' || lower === 'confirmar' || lower === 'pode';
      if (isAffirmative) {
        data.confirmed = true;
      } else {
        return {
          text: [
            `🔄 **Resumo do Reagendamento**`,
            `----------------------------------------`,
            `• 👤 **Paciente**: **${data.patientName}**`,
            `• 📅 **Nova Data**: **${WorkflowRegistry.formatDateBR(data.newDate)}**`,
            `• ⏰ **Novo Horário**: **${data.newTime}**`,
            `----------------------------------------`,
            ``,
            `👉 **Posso confirmar o reagendamento?** *(Responda **sim** para confirmar ou **cancelar** para descartar)*`
          ].join('\n'),
          nextInProgressState: { type: 'WORKFLOW_REAGENDAMENTO', data }
        };
      }
    }

    // 6. Execution
    return {
      text: `✅ **Consulta de ${data.patientName} reagendada com sucesso!**\n\n- 📅 Nova Data: **${WorkflowRegistry.formatDateBR(data.newDate)}**\n- ⏰ Novo Horário: **${data.newTime}**\n\nAgenda e compromissos atualizados.`,
      executeImmediately: {
        type: 'reschedule_session',
        payload: {
          sessionId: data.sessionId,
          patientName: data.patientName,
          newDate: data.newDate,
          newTime: data.newTime
        }
      },
      nextInProgressState: null // IDLE
    };
  }

  // =========================================================================
  // WORKFLOW 5: CANCELAR CONSULTA
  // =========================================================================

  public static handleCancelamentoWorkflow(
    rawPrompt: string,
    stateData: any,
    patients: Patient[],
    sessions: Session[]
  ): ClaraQueryResult {
    const data = { ...stateData };
    const lower = rawPrompt.toLowerCase().trim();

    // 1. Patient
    if (!data.patientName) {
      const matchResult = WorkflowRegistry.findMatchingPatient(patients, rawPrompt);
      if (matchResult.patient) {
        data.patientName = matchResult.patient.name;
        data.patientId = matchResult.patient.id;
      } else {
        const pList = patients.length > 0 ? patients.map(p => `• **${p.name}**`).join('\n') : '';
        return {
          text: `🚫 **Cancelar Consulta**\n\nQual paciente deseja cancelar a consulta?\n\n${pList}`,
          nextInProgressState: { type: 'WORKFLOW_CANCELAMENTO', data }
        };
      }
    }

    // 2. Target Session
    if (!data.sessionId) {
      const patientSessions = sessions.filter(
        s => s.patientName.toLowerCase().includes(data.patientName.toLowerCase()) && !s.status.startsWith('cancelada')
      );
      if (patientSessions.length === 1) {
        data.sessionId = patientSessions[0].id;
        data.sessionDate = patientSessions[0].date;
        data.sessionTime = patientSessions[0].startTime;
      } else if (patientSessions.length > 1) {
        if (lower.startsWith('opcao') || lower.startsWith('opção') || /^[1-9]$/.test(lower)) {
          const idx = parseInt(lower.replace(/\D/g, ''), 10) - 1;
          if (idx >= 0 && idx < patientSessions.length) {
            data.sessionId = patientSessions[idx].id;
            data.sessionDate = patientSessions[idx].date;
            data.sessionTime = patientSessions[idx].startTime;
          }
        }
        if (!data.sessionId) {
          const sessList = patientSessions
            .map((s, i) => `${i + 1}️⃣ Consulta do dia **${WorkflowRegistry.formatDateBR(s.date)}** às **${s.startTime}**`)
            .join('\n');
          return {
            text: `Encontrei mais de uma consulta ativa para **${data.patientName}**. Qual você deseja cancelar?\n\n${sessList}\n\n*(Responda com o número da opção)*`,
            nextInProgressState: { type: 'WORKFLOW_CANCELAMENTO', data }
          };
        }
      } else {
        return {
          text: `Não encontrei nenhuma consulta ativa agendada para **${data.patientName}**.`
        };
      }
    }

    // 3. Cancel Reason
    if (data.reason === undefined) {
      if (EntityExtractor.isNegativeOrSkipResponse(rawPrompt) || lower === 'sim' || lower === 'cancelar') {
        data.reason = 'Não informado';
      } else if (rawPrompt.length >= 3 && !lower.includes('cancelar consulta')) {
        data.reason = rawPrompt.trim();
      } else {
        return {
          text: `Qual o **motivo do cancelamento** da consulta de **${data.patientName}**?\n*(ex: **Desistência**, **Imprevisto pessoal** ou digite **pular**)*`,
          nextInProgressState: { type: 'WORKFLOW_CANCELAMENTO', data }
        };
      }
    }

    // 4. Summary & Confirmation
    if (!data.confirmed) {
      const isAffirmative = lower === 'sim' || lower === 's' || lower === '1' || lower === 'confirmar' || lower === 'pode';
      if (isAffirmative) {
        data.confirmed = true;
      } else {
        return {
          text: [
            `🚫 **Resumo do Cancelamento**`,
            `----------------------------------------`,
            `• 👤 **Paciente**: **${data.patientName}**`,
            `• 📅 **Consulta**: **${WorkflowRegistry.formatDateBR(data.sessionDate)} às ${data.sessionTime}**`,
            `• 📝 **Motivo**: **${data.reason}**`,
            `----------------------------------------`,
            ``,
            `👉 **Tem certeza que deseja cancelar esta consulta?** *(Responda **sim** para confirmar o cancelamento ou **cancelar** para desistir)*`
          ].join('\n'),
          nextInProgressState: { type: 'WORKFLOW_CANCELAMENTO', data }
        };
      }
    }

    // 5. Execution
    return {
      text: `✅ **Consulta de ${data.patientName} cancelada com sucesso.**\n\nO horário no dia **${WorkflowRegistry.formatDateBR(data.sessionDate)}** foi liberado na sua agenda.`,
      executeImmediately: {
        type: 'cancel_session',
        payload: {
          sessionId: data.sessionId,
          patientName: data.patientName
        }
      },
      nextInProgressState: null // IDLE
    };
  }

  // =========================================================================
  // WORKFLOW 6: EXCLUIR PACIENTE
  // =========================================================================

  public static handleExclusaoPacienteWorkflow(
    rawPrompt: string,
    stateData: any,
    patients: Patient[]
  ): ClaraQueryResult {
    const data = { ...stateData };
    const lower = rawPrompt.toLowerCase().trim();

    // 1. Patient
    if (!data.patientName) {
      const matchResult = WorkflowRegistry.findMatchingPatient(patients, rawPrompt);
      if (matchResult.patient) {
        data.patientName = matchResult.patient.name;
        data.patientId = matchResult.patient.id;
      } else {
        const pList = patients.length > 0 ? patients.map(p => `• **${p.name}**`).join('\n') : '';
        return {
          text: `⚠️ **Exclusão de Paciente**\n\nQual paciente deseja remover do sistema?\n\n${pList}`,
          nextInProgressState: { type: 'WORKFLOW_EXCLUSAO_PACIENTE', data }
        };
      }
    }

    // 2. Strict Confirmation Check
    const normalizeForComp = (str: string) => {
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const requiredConfirmation = normalizeForComp(`EXCLUIR ${data.patientName}`);
    const userTyped = normalizeForComp(rawPrompt);

    // Explicit cancel keywords
    if (
      lower === 'cancelar' || lower === 'parar' || lower === 'desistir' ||
      lower === 'sair' || lower === 'voltar' || lower === 'não' || lower === 'nao'
    ) {
      return {
        text: `❌ **Exclusão cancelada.** O paciente **${data.patientName}** continua mantido no sistema.`,
        nextInProgressState: null // IDLE
      };
    }

    if (userTyped === requiredConfirmation) {
      return {
        text: `🗑️ **Paciente ${data.patientName} excluído com sucesso.**\n\nTodos os registros e prontuários vinculados foram permanentemente removidos.`,
        executeImmediately: {
          type: 'delete_patient',
          payload: { id: data.patientId, patientName: data.patientName }
        },
        nextInProgressState: null // IDLE
      };
    }

    return {
      text: [
        `⚠️ **Exclusão Permanente**`,
        ``,
        `Você está prestes a excluir permanentemente:`,
        `👤 **${data.patientName}**`,
        ``,
        `Esta ação removerá definitivamente:`,
        `• Cadastro do paciente`,
        `• Prontuários e evoluções clínicas`,
        `• Consultas e agendamentos`,
        `• Histórico financeiro`,
        ``,
        `Para confirmar a exclusão permanente, digite exatamente:`,
        `**EXCLUIR ${data.patientName.toUpperCase()}**`,
        ``,
        `*(ou digite **cancelar** para desistir)*`
      ].join('\n'),
      nextInProgressState: { type: 'WORKFLOW_EXCLUSAO_PACIENTE', data }
    };
  }
}
