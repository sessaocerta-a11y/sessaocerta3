import {
  Patient,
  Session,
  PsychologistProfile,
  ClaraChatMessage,
  ClaraPendingAction,
  ClaraActionType,
  ClaraProactiveInsight
} from '../types';

export interface ClaraQueryContext {
  lastTopic?: 'agenda' | 'patient' | 'finance' | 'clinical' | 'general';
  targetDate?: string;
  targetPatientId?: string;
  targetPatientName?: string;
  matchedSessions?: Session[];
}

export interface ClaraQueryResult {
  text: string;
  pendingAction?: ClaraPendingAction;
  executeImmediately?: {
    type: ClaraActionType;
    payload: any;
  };
  nextInProgressState?: {
    type: string;
    step?: string;
    data?: any;
  };
}

export class ClaraEngine {
  private static lastContext: ClaraQueryContext = {};

  /**
   * Helper to format values as BRL currency
   */
  public static formatCurrency(val: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  }

  /**
   * Extract clean patient name from raw user input without command prefix words
   * e.g. "Cadastre um paciente chamado João." -> "João"
   * "Adicionar a paciente Maria da Silva" -> "Maria da Silva"
   */
  public static extractCleanPatientName(input: string): string {
    if (!input) return '';

    let text = input.trim();

    // 1. Remove polite greetings & common chat openers
    text = text.replace(/^(?:por favor,?|clara,?|olá,?|oi,?|bom dia,?|boa tarde,?|boa noite,?)\s*/i, '');

    // 2. Remove standard conversational request prefixes
    text = text.replace(/^(?:gostaria de|quero|preciso|pode|favor|me ajude a|ajude a)\s+(?:de\s+)?/i, '');

    // 3. Remove action verbs (cadastrar, cadastre, adicionar, adicione, incluir, inclua, criar, crie, novo, nova)
    text = text.replace(/^(?:cadastr(?:ar|e)?|adicionar|adicione|inclu(?:ir|a)|criar|crie|novo|nova)\s+/i, '');

    // 4. Remove target recipient phrases (para mim, para o, para a)
    text = text.replace(/^(?:para mim|para o|para a)\s+/i, '');

    // 5. Remove articles and "paciente" keywords (o, a, um, uma, paciente, pacientes)
    text = text.replace(/^(?:um|uma|o|a|os|as)?\s*(?:paciente|pacientes)?\s*/i, '');

    // 6. Remove naming clauses (chamado, chamada, de nome, com o nome, com nome, nome:?)
    text = text.replace(/^(?:chamad[oa]|de nome|com o nome|com nome|nome:?)\s*/i, '');

    // 7. Remove any residual leading articles (o, a, um, uma)
    text = text.replace(/^(?:um|uma|o|a|os|as)\s+/i, '');

    // 8. Remove trailing chat expressions
    text = text.replace(/\s+(?:por favor|clara)\.?$/i, '');

    // 9. Clean up residual command words anywhere in the string if left over
    text = text
      .replace(/\b(?:cadastrar|cadastre|adicionar|adicione|incluir|inclua|criar|crie|novo|nova|paciente|pacientes|chamado|chamada)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // 10. Strip leading and trailing punctuation (e.g. '.', ',', '!', '?', ':', ';', '-')
    text = text.replace(/^[.,:;!\?\-\s]+|[.,:;!\?\-\s]+$/g, '').trim();

    // Capitalize properly if lowercased (e.g. "mário arruda" -> "Mário Arruda")
    if (text && text === text.toLowerCase()) {
      text = text.split(' ').map(w => {
        if (['de', 'da', 'do', 'dos', 'das', 'e'].includes(w.toLowerCase())) return w.toLowerCase();
        return w.charAt(0).toUpperCase() + w.slice(1);
      }).join(' ');
    }

    return text;
  }

  public static validateAndFormatPhone(input: string): { isValid: boolean; formatted: string } {
    const digits = input.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 13) {
      return { isValid: false, formatted: input.trim() };
    }
    let formatted = input.trim();
    if (digits.length === 11) {
      formatted = `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    } else if (digits.length === 10) {
      formatted = `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    }
    return { isValid: true, formatted };
  }

  public static validateEmail(input: string): boolean {
    return /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(input.trim());
  }

  public static validateAndFormatCPF(input: string): { isValid: boolean; formatted: string } {
    const digits = input.replace(/\D/g, '');
    if (digits.length !== 11) {
      return { isValid: false, formatted: input.trim() };
    }
    const formatted = `${digits.substring(0, 3)}.${digits.substring(3, 6)}.${digits.substring(6, 9)}-${digits.substring(9)}`;
    return { isValid: true, formatted };
  }

  public static cityStateLookup: Record<string, string> = {
    'rio de janeiro': 'RJ',
    'são paulo': 'SP',
    'sao paulo': 'SP',
    'campinas': 'SP',
    'curitiba': 'PR',
    'belo horizonte': 'MG',
    'salvador': 'BA',
    'brasília': 'DF',
    'brasilia': 'DF',
    'fortaleza': 'CE',
    'recife': 'PE',
    'porto alegre': 'RS',
    'florianópolis': 'SC',
    'florianopolis': 'SC',
    'manaus': 'AM',
    'belém': 'PA',
    'belem': 'PA',
    'goiânia': 'GO',
    'goiania': 'GO',
    'vitória': 'ES',
    'vitoria': 'ES',
    'santos': 'SP',
    'niterói': 'RJ',
    'niteroi': 'RJ',
    'são josé dos campos': 'SP',
    'sao jose dos campos': 'SP',
    'ribeirão preto': 'SP',
    'ribeirao preto': 'SP',
    'sorocaba': 'SP',
    'uberlândia': 'MG',
    'uberlandia': 'MG',
    'londrina': 'PR',
    'maringá': 'PR',
    'maringa': 'PR',
    'joinville': 'SC',
    'juiz de fora': 'MG',
    'osasco': 'SP',
    'santo andré': 'SP',
    'santo andre': 'SP',
    'são bernardo do campo': 'SP'
  };

  /**
   * Multi-entity extraction engine
   */
  public static extractEntitiesFromPrompt(input: string): {
    name?: string;
    phone?: string;
    email?: string;
    cpf?: string;
    city?: string;
    state?: string;
    sessionPrice?: number;
    emergencyContact?: string;
    notes?: string;
  } {
    const result: any = {};
    if (!input || !input.trim()) return result;

    const raw = input.trim();

    // 1. Phone extraction
    const phoneMatch = raw.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
    if (phoneMatch) {
      const pRes = ClaraEngine.validateAndFormatPhone(phoneMatch[0]);
      if (pRes.isValid) result.phone = pRes.formatted;
    }

    // 2. Email extraction
    const emailMatch = raw.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    if (emailMatch && ClaraEngine.validateEmail(emailMatch[0])) {
      result.email = emailMatch[0];
    }

    // 3. CPF extraction
    const cpfMatch = raw.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/);
    if (cpfMatch) {
      const cRes = ClaraEngine.validateAndFormatCPF(cpfMatch[0]);
      if (cRes.isValid) result.cpf = cRes.formatted;
    }

    // 4. City and State extraction
    const locationPattern = /(?:mora em|reside em|de|do|da|dos|das|em|cidade:?)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)(?:\s*[\-,\/]\s*([A-Za-z]{2}))?(?:\.|\,|$|\b(?:telefone|email|sessão|sessao|valor|cpf))/i;
    const locMatch = raw.match(locationPattern);
    if (locMatch) {
      const potentialCity = locMatch[1].trim();
      const potentialUF = locMatch[2] ? locMatch[2].toUpperCase() : '';

      const stopwords = ['um', 'uma', 'paciente', 'mim', 'nome', 'telefone', 'email', 'sessao', 'sessão', 'valor', 'cpf', 'chamado', 'chamada', 'novo', 'nova'];
      if (!stopwords.includes(potentialCity.toLowerCase())) {
        // Format city
        result.city = potentialCity.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        if (potentialUF && potentialUF.length === 2) {
          result.state = potentialUF;
        } else {
          const lookupUF = ClaraEngine.cityStateLookup[result.city.toLowerCase()];
          if (lookupUF) result.state = lookupUF;
        }
      }
    }

    // 5. Session price extraction
    const priceMatch = raw.match(/(?:sessã|sessao|valor|preco|preço|r\$)\s*:?\s*(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)|(\d+)\s*reais/i);
    if (priceMatch) {
      const valStr = priceMatch[1] || priceMatch[2];
      if (valStr) {
        result.sessionPrice = parseFloat(valStr.replace(',', '.'));
      }
    }

    // 6. Name extraction
    let nameSegment = raw;
    const cutMatch = raw.match(/^([^.!\n;]+?)(?=\.|\!|\n|\;|\bmora em\b|\btelefone\b|\bemail\b|\bsessã\b|\bsessao\b|\bvalor\b|\bcpf\b)/i);
    if (cutMatch && cutMatch[1]) {
      nameSegment = cutMatch[1];
    }
    const cleanName = ClaraEngine.extractCleanPatientName(nameSegment);
    if (cleanName && cleanName.length >= 2 && !cleanName.toLowerCase().includes('http')) {
      result.name = cleanName;
    }

    return result;
  }

  public static getNextPatientWizardStep(data: any): { step: string; promptText: string } {
    const identified: string[] = [];
    if (data.name) identified.push(`👤 **${data.name}**`);
    if (data.city || data.state) identified.push(`📍 **${data.city || ''}${data.state ? (data.city ? ' - ' : '') + data.state : ''}**`);
    if (data.phone) identified.push(`📞 **${data.phone}**`);
    if (data.email) identified.push(`✉️ **${data.email}**`);
    if (data.sessionPrice) identified.push(`💰 **R$ ${Number(data.sessionPrice).toFixed(2).replace('.', ',')}**`);
    if (data.cpf) identified.push(`🪪 **CPF: ${data.cpf}**`);
    if (data.emergencyContact) identified.push(`🚨 **Emergência: ${data.emergencyContact}**`);
    if (data.notes) identified.push(`📝 **Obs: ${data.notes}**`);

    const header = identified.length > 0 
      ? `Com certeza! Já identifiquei as seguintes informações:\n\n${identified.join('\n')}\n\n`
      : `Com certeza! Sou a Clara e vou conduzir o cadastro. 😊\n\n`;

    if (!data.phone) {
      return {
        step: 'awaiting_phone',
        promptText: `${header}Por favor, informe o **número de telefone** (com DDD) de **${data.name}**:\n*(ou digite **pular**)*`
      };
    }

    if (!data.email) {
      return {
        step: 'awaiting_email',
        promptText: `${header}Qual é o **e-mail** de **${data.name}**?\n*(ou digite **pular**)*`
      };
    }

    if (!data.city && !data.state) {
      return {
        step: 'awaiting_location',
        promptText: `${header}Qual é a **Cidade / Estado** de residencia de **${data.name}**?\n*(ex: **Rio de Janeiro - RJ** ou digite **pular**)*`
      };
    }

    if (!data.sessionPrice) {
      return {
        step: 'awaiting_price',
        promptText: `${header}Qual é o **valor da sessão** para **${data.name}**?\n*(ex: **180** ou digite **pular** para R$ 150,00)*`
      };
    }

    if (!data.cpf) {
      return {
        step: 'awaiting_cpf',
        promptText: `${header}Deseja registrar o **CPF** de **${data.name}**?\n*(opcional - informe os 11 dígitos ou digite **pular**)*`
      };
    }

    if (!data.emergencyContact) {
      return {
        step: 'awaiting_emergency',
        promptText: `${header}Deseja registrar um **contato de emergência** (Nome / Telefone)?\n*(opcional - ou digite **pular**)*`
      };
    }

    if (!data.notes) {
      return {
        step: 'awaiting_notes',
        promptText: `${header}Deseja adicionar **observações iniciais / anamnese** para **${data.name}**?\n*(opcional - ou digite **pular**)*`
      };
    }

    const priceFormatted = `R$ ${Number(data.sessionPrice || 150).toFixed(2).replace('.', ',')}`;
    const locStr = data.city || data.state ? `${data.city || ''}${data.state ? (data.city ? ' - ' : '') + data.state : ''}` : '*(Não informada)*';

    return {
      step: 'awaiting_confirmation',
      promptText: `📋 **Resumo para Conferência dos Dados**\n\n- 👤 **Nome:** ${data.name}\n- 📍 **Localidade:** ${locStr}\n- 📞 **Telefone:** ${data.phone || '*(Não informado)*'}\n- ✉️ **E-mail:** ${data.email || '*(Não informado)*'}\n- 💰 **Valor da Sessão:** ${priceFormatted}\n- 🪪 **CPF:** ${data.cpf || '*(Não informado)*'}\n${data.emergencyContact ? `- 🚨 **Emergência:** ${data.emergencyContact}\n` : ''}${data.notes ? `- 📝 **Observações:** ${data.notes}\n` : ''}- 🟢 **Status:** Ativo em Terapia\n\n**Deseja confirmar o cadastro de ${data.name} com os dados acima?**\n*(Responda **Sim** para salvar no banco de dados ou **Cancelar** para descartar)*`
    };
  }

  /**
   * Get date strings
   */
  public static getDateHelpers() {
    const todayObj = new Date();
    const todayStr = todayObj.toISOString().split('T')[0];

    const tomorrowObj = new Date(todayObj);
    tomorrowObj.setDate(todayObj.getDate() + 1);
    const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

    const yesterdayObj = new Date(todayObj);
    yesterdayObj.setDate(todayObj.getDate() - 1);
    const yesterdayStr = yesterdayObj.toISOString().split('T')[0];

    const currentHour = todayObj.getHours();
    const currentMinute = todayObj.getMinutes();
    const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    const currentYearMonth = todayStr.substring(0, 7); // YYYY-MM
    const currentYear = todayStr.substring(0, 4); // YYYY

    return {
      todayObj,
      todayStr,
      tomorrowStr,
      yesterdayStr,
      timeStr,
      currentYearMonth,
      currentYear,
      currentHour
    };
  }

  /**
   * Main entrypoint to process a message locally with 100% database accuracy
   */
  public static processQuery(
    prompt: string,
    patients: Patient[],
    sessions: Session[],
    profile: PsychologistProfile,
    conversationHistory: ClaraChatMessage[] = [],
    inProgressState?: { type: string; step?: string; data?: any } | null
  ): ClaraQueryResult {
    const rawPrompt = prompt.trim();
    const lowerPrompt = rawPrompt.toLowerCase();
    const { todayStr, tomorrowStr, timeStr, currentYearMonth, currentYear } = this.getDateHelpers();

    // ----------------------------------------------------
    // 0. MULTI-TURN IN-PROGRESS ACTION CONTINUATION
    // ----------------------------------------------------
    if (inProgressState && inProgressState.type) {
      const type = inProgressState.type;
      const data = inProgressState.data || {};

      // Continuing Add Patient Wizard Flow
      if (type === 'add_patient_wizard' || type === 'add_patient') {
        const step = inProgressState.step || 'awaiting_phone';
        const data = { ...inProgressState.data };
        const isSkip = lowerPrompt.includes('pular') || lowerPrompt === 'não' || lowerPrompt === 'nao' || lowerPrompt.includes('sem') || lowerPrompt === '-' || lowerPrompt.includes('passar') || lowerPrompt.includes('depois');

        // Opportunistic entity extraction from current user input
        const extraExtracted = ClaraEngine.extractEntitiesFromPrompt(rawPrompt);
        if (extraExtracted.phone && !data.phone) data.phone = extraExtracted.phone;
        if (extraExtracted.email && !data.email) data.email = extraExtracted.email;
        if (extraExtracted.cpf && !data.cpf) data.cpf = extraExtracted.cpf;
        if (extraExtracted.city && !data.city) data.city = extraExtracted.city;
        if (extraExtracted.state && !data.state) data.state = extraExtracted.state;
        if (extraExtracted.sessionPrice && !data.sessionPrice) data.sessionPrice = extraExtracted.sessionPrice;

        // Step 1: awaiting_name
        if (step === 'awaiting_name') {
          const cleanName = ClaraEngine.extractCleanPatientName(rawPrompt);
          if (!cleanName || cleanName.length < 2) {
            return {
              text: `Com certeza! Sou a Clara e vou conduzir o cadastro. 😊\n\nPor favor, informe o **nome completo** do paciente para começarmos:`,
              nextInProgressState: { type: 'add_patient_wizard', step: 'awaiting_name', data }
            };
          }
          data.name = cleanName;
          const next = ClaraEngine.getNextPatientWizardStep(data);
          return {
            text: next.promptText,
            nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
          };
        }

        // Step 2: awaiting_phone
        if (step === 'awaiting_phone') {
          if (isSkip) {
            data.phone = '';
          } else if (!data.phone) {
            const phoneRes = ClaraEngine.validateAndFormatPhone(rawPrompt);
            if (!phoneRes.isValid) {
              return {
                text: ` O telefone informado (*"${rawPrompt}"*) não é válido.\n\nPor favor, digite com DDD (ex: **(11) 99999-8888**) ou digite **pular** se não possuir no momento.`,
                nextInProgressState: { type: 'add_patient_wizard', step: 'awaiting_phone', data }
              };
            }
            data.phone = phoneRes.formatted;
          }
          const next = ClaraEngine.getNextPatientWizardStep(data);
          return {
            text: next.promptText,
            nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
          };
        }

        // Step 3: awaiting_email
        if (step === 'awaiting_email') {
          if (isSkip) {
            data.email = '';
          } else if (!data.email) {
            if (!ClaraEngine.validateEmail(rawPrompt)) {
              return {
                text: ` O e-mail informado (*"${rawPrompt}"*) não parece ser um e-mail válido.\n\nPor favor, digite no formato **nome@exemplo.com** ou digite **pular** para avançar.`,
                nextInProgressState: { type: 'add_patient_wizard', step: 'awaiting_email', data }
              };
            }
            data.email = rawPrompt.trim();
          }
          const next = ClaraEngine.getNextPatientWizardStep(data);
          return {
            text: next.promptText,
            nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
          };
        }

        // Step 4: awaiting_location
        if (step === 'awaiting_location') {
          if (isSkip) {
            data.city = '';
            data.state = '';
          } else if (!data.city && !data.state) {
            const locPattern = /(?:mora em|reside em|em|cidade:?)\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)(?:\s*[\-,\/]\s*([A-Za-z]{2}))?$/i;
            const match = rawPrompt.match(locPattern);
            if (match) {
              data.city = match[1].trim();
              if (match[2]) data.state = match[2].toUpperCase();
            } else if (rawPrompt.includes('-') || rawPrompt.includes(',')) {
              const parts = rawPrompt.split(/[\-,]/);
              data.city = parts[0].trim();
              if (parts[1] && parts[1].trim().length === 2) data.state = parts[1].trim().toUpperCase();
            } else {
              data.city = rawPrompt.trim();
            }
            if (data.city && !data.state) {
              const lookupUF = ClaraEngine.cityStateLookup[data.city.toLowerCase()];
              if (lookupUF) data.state = lookupUF;
            }
          }
          const next = ClaraEngine.getNextPatientWizardStep(data);
          return {
            text: next.promptText,
            nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
          };
        }

        // Step 5: awaiting_price
        if (step === 'awaiting_price') {
          if (isSkip) {
            data.sessionPrice = 150;
          } else if (!data.sessionPrice) {
            const numMatch = rawPrompt.match(/\d+(?:[.,]\d{1,2})?/);
            data.sessionPrice = numMatch ? parseFloat(numMatch[0].replace(',', '.')) : 150;
          }
          const next = ClaraEngine.getNextPatientWizardStep(data);
          return {
            text: next.promptText,
            nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
          };
        }

        // Step 6: awaiting_cpf
        if (step === 'awaiting_cpf') {
          if (isSkip) {
            data.cpf = '';
          } else if (!data.cpf) {
            const cpfRes = ClaraEngine.validateAndFormatCPF(rawPrompt);
            if (!cpfRes.isValid) {
              return {
                text: ` O CPF informado (*"${rawPrompt}"*) precisa conter 11 dígitos.\n\nPor favor, digite o CPF completo (ex: **123.456.789-00**) ou digite **pular** se preferir não informar agora.`,
                nextInProgressState: { type: 'add_patient_wizard', step: 'awaiting_cpf', data }
              };
            }
            data.cpf = cpfRes.formatted;
          }
          const next = ClaraEngine.getNextPatientWizardStep(data);
          return {
            text: next.promptText,
            nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
          };
        }

        // Step 7: awaiting_emergency
        if (step === 'awaiting_emergency') {
          if (isSkip) {
            data.emergencyContact = '';
          } else if (!data.emergencyContact) {
            data.emergencyContact = rawPrompt.trim();
          }
          const next = ClaraEngine.getNextPatientWizardStep(data);
          return {
            text: next.promptText,
            nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
          };
        }

        // Step 8: awaiting_notes
        if (step === 'awaiting_notes') {
          if (isSkip) {
            data.notes = '';
          } else if (!data.notes) {
            data.notes = rawPrompt.trim();
          }
          const next = ClaraEngine.getNextPatientWizardStep(data);
          return {
            text: next.promptText,
            nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
          };
        }

        // Step 9: awaiting_confirmation
        if (step === 'awaiting_confirmation') {
          const isConfirmed = lowerPrompt.includes('sim') || lowerPrompt.includes('confirm') || lowerPrompt.includes('pode') || lowerPrompt.includes('salvar') || lowerPrompt === 'ok' || lowerPrompt.includes('certo');
          const isCancelled = lowerPrompt.includes('não') || lowerPrompt.includes('nao') || lowerPrompt.includes('cancel') || lowerPrompt.includes('descart');

          if (isConfirmed) {
            const priceFormatted = `R$ ${Number(data.sessionPrice || 150).toFixed(2).replace('.', ',')}`;
            const finalPhone = data.phone || '(11) 99999-0000';
            const finalEmail = data.email || `${data.name.toLowerCase().replace(/\s+/g, '')}@email.com`;
            const locStr = data.city || data.state ? `${data.city || ''}${data.state ? (data.city ? ' - ' : '') + data.state : ''}` : 'Não informada';

            return {
              text: `✅ **Paciente ${data.name} cadastrado com sucesso!**\n\nOs dados foram gravados com segurança no banco de dados do consultório:\n- 👤 **Nome:** ${data.name}\n- 📍 **Localidade:** ${locStr}\n- 📞 **Telefone:** ${data.phone || finalPhone}\n- ✉️ **E-mail:** ${data.email || finalEmail}\n- 💰 **Sessão:** ${priceFormatted}\n- 🟢 **Status:** Ativo em Terapia\n\n📁 **Deseja abrir o prontuário de ${data.name} agora?**`,
              executeImmediately: {
                type: 'add_patient',
                payload: {
                  name: data.name,
                  phone: finalPhone,
                  email: finalEmail,
                  cpf: data.cpf || '',
                  city: data.city || '',
                  state: data.state || '',
                  country: 'Brasil',
                  sessionPrice: data.sessionPrice || 150,
                  notes: data.notes || '',
                  emergencyContact: data.emergencyContact || ''
                }
              },
              nextInProgressState: {
                type: 'open_prontuario_after_add',
                step: 'awaiting_open',
                data: { patientName: data.name }
              }
            };
          } else if (isCancelled) {
            return {
              text: ` ❌ **Cadastro do paciente ${data.name} cancelado.** Nenhuma informação foi gravada no banco de dados.`
            };
          } else {
            return {
              text: `Por favor, responda **Sim** para confirmar e salvar o cadastro de **${data.name}** ou **Cancelar** para descartar.`,
              nextInProgressState: { type: 'add_patient_wizard', step: 'awaiting_confirmation', data }
            };
          }
        }
      }

      // Continuing Post-Save Open Prontuário Prompt
      if (type === 'open_prontuario_after_add') {
        const patientName = data.patientName || 'Paciente';
        const isYes = lowerPrompt.includes('sim') || lowerPrompt.includes('abrir') || lowerPrompt.includes('quero') || lowerPrompt.includes('pode') || lowerPrompt === 'ok' || lowerPrompt.includes('ver');

        if (isYes) {
          return {
            text: `📂 **Abrindo o prontuário de ${patientName}...**`,
            executeImmediately: {
              type: 'open_prontuario',
              payload: { patientName }
            }
          };
        } else {
          return {
            text: `Perfeito! O cadastro de **${patientName}** está salvo. Você pode acessar a ficha dele(a) na aba **Pacientes** quando desejar.`
          };
        }
      }

      // Continuing Create Session
      if (type === 'create_session') {
        const patientName = data.patientName || 'Paciente';
        let targetDate = todayStr;
        if (lowerPrompt.includes('amanhã') || lowerPrompt.includes('amanha')) targetDate = tomorrowStr;

        let targetTime = '14:00';
        const timeMatch = rawPrompt.match(/(\d{1,2})[h:]?(\d{2})?/i);
        if (timeMatch) {
          const hh = String(timeMatch[1]).padStart(2, '0');
          const mm = timeMatch[2] ? String(timeMatch[2]).padStart(2, '0') : '00';
          targetTime = `${hh}:${mm}`;
        }

        return {
          text: `✅ **Consulta agendada com sucesso!**\n\n- 👤 Paciente: **${patientName}**\n- 📅 Data: ${targetDate.split('-').reverse().join('/')}\n- ⏰ Horário: ${targetTime}\n- 🟢 Status: Agendada`,
          executeImmediately: {
            type: 'create_session',
            payload: {
              patientName,
              date: targetDate,
              startTime: targetTime,
              endTime: targetTime
            }
          }
        };
      }

      // Continuing Create Clinical Note
      if (type === 'create_clinical_note') {
        const patientName = data.patientName || 'Paciente';
        const notes = rawPrompt;

        const matchedS = sessions.find(s => s.patientName.toLowerCase().includes(patientName.toLowerCase()));

        return {
          text: `✅ **Evolução clínica registrada com sucesso no prontuário de ${patientName}!**\n\n📝 *Anotação gravada:* "${notes.length > 80 ? notes.substring(0, 80) + '...' : notes}"`,
          executeImmediately: {
            type: 'create_clinical_note',
            payload: {
              sessionId: matchedS?.id,
              patientName,
              notes
            }
          }
        };
      }

      // Continuing Reschedule Session
      if (type === 'reschedule_session') {
        const patientName = data.patientName || 'Paciente';
        let targetDate = tomorrowStr;
        if (lowerPrompt.includes('hoje')) targetDate = todayStr;

        let targetTime = '15:00';
        const timeMatch = rawPrompt.match(/(\d{1,2})[h:]?(\d{2})?/i);
        if (timeMatch) {
          const hh = String(timeMatch[1]).padStart(2, '0');
          const mm = timeMatch[2] ? String(timeMatch[2]).padStart(2, '0') : '00';
          targetTime = `${hh}:${mm}`;
        }

        const matchedS = sessions.find(s => s.patientName.toLowerCase().includes(patientName.toLowerCase()));

        return {
          text: `✅ **Consulta de ${patientName} reagendada com sucesso!**\n\n- 📅 Nova Data: ${targetDate.split('-').reverse().join('/')}\n- ⏰ Novo Horário: ${targetTime}`,
          executeImmediately: {
            type: 'reschedule_session',
            payload: {
              sessionId: matchedS?.id,
              patientName,
              newDate: targetDate,
              newTime: targetTime
            }
          }
        };
      }
    }

    // ----------------------------------------------------
    // 1. ACTION INTENTS WITH REAL SYSTEM EXECUTION
    // ----------------------------------------------------
    // Action 1: Cadastrar Paciente (Inicia o fluxo conversacional com extração inteligente)
    if (lowerPrompt.includes('cadastr') || lowerPrompt.includes('adicionar paciente') || lowerPrompt.includes('novo paciente') || lowerPrompt.includes('criar paciente') || lowerPrompt.includes('inclu')) {
      const data = ClaraEngine.extractEntitiesFromPrompt(rawPrompt);

      if (!data.name || data.name.length < 2) {
        return {
          text: `Com certeza! Sou a Clara e vou conduzir o cadastro do novo paciente. 😊\n\nPor favor, informe o **nome completo** para começarmos:`,
          nextInProgressState: { type: 'add_patient_wizard', step: 'awaiting_name', data: {} }
        };
      }

      const next = ClaraEngine.getNextPatientWizardStep(data);
      return {
        text: next.promptText,
        nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
      };
    }

    // Action 1b: Abrir Prontuário do Paciente
    if (lowerPrompt.includes('abrir prontuário') || lowerPrompt.includes('abrir prontuario') || lowerPrompt.includes('ver prontuário') || lowerPrompt.includes('ver prontuario') || lowerPrompt.includes('abrir ficha') || (lowerPrompt.includes('abrir') && lowerPrompt.includes('prontuário'))) {
      const matchedP = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()));
      const targetName = matchedP ? matchedP.name : (patients.length > 0 ? patients[patients.length - 1].name : '');

      return {
        text: `📂 **Abrindo o prontuário de ${targetName || 'paciente'}...**\n\nVocê foi redirecionado para a ficha clínica do paciente com todo o histórico de sessões e evoluções.`,
        executeImmediately: {
          type: 'open_prontuario',
          payload: { patientName: targetName }
        }
      };
    }

    // Action 2: Editar Paciente
    if (lowerPrompt.includes('editar paciente') || lowerPrompt.includes('alterar paciente') || lowerPrompt.includes('mudar telefone') || lowerPrompt.includes('mudar email') || lowerPrompt.includes('mudar e-mail') || lowerPrompt.includes('atualizar paciente')) {
      const matchedP = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()));
      if (!matchedP) {
        return {
          text: `Qual é o paciente que você deseja alterar? Por favor informe o nome completo.`
        };
      }

      const phoneMatch = rawPrompt.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
      const emailMatch = rawPrompt.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);

      const updates: any = {};
      if (phoneMatch) updates.phone = phoneMatch[0];
      if (emailMatch) updates.email = emailMatch[0];

      if (Object.keys(updates).length === 0) {
        return {
          text: `Qual informação você deseja atualizar no cadastro de **${matchedP.name}**? (ex: telefone, e-mail ou valor da consulta)`
        };
      }

      return {
        text: `✅ **Paciente ${matchedP.name} atualizado com sucesso.** Os novos dados já constam no banco de dados.`,
        executeImmediately: {
          type: 'edit_patient',
          payload: { id: matchedP.id, updates }
        }
      };
    }

    // Action 3: Excluir Paciente
    if (lowerPrompt.includes('excluir paciente') || lowerPrompt.includes('remover paciente') || lowerPrompt.includes('deletar paciente') || lowerPrompt.includes('apagar paciente')) {
      const matchedP = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()));
      if (!matchedP) {
        return {
          text: `Qual paciente você deseja remover do sistema? Por favor informe o nome do paciente.`
        };
      }

      return {
        text: `✅ **Paciente ${matchedP.name} excluído com sucesso.** O cadastro e registros foram removidos do sistema.`,
        executeImmediately: {
          type: 'delete_patient',
          payload: { id: matchedP.id }
        }
      };
    }

    // Action 4: Criar Consulta
    if (lowerPrompt.includes('agendar consulta') || lowerPrompt.includes('criar consulta') || lowerPrompt.includes('marcar consulta') || lowerPrompt.includes('nova consulta') || lowerPrompt.includes('agendar sessão') || lowerPrompt.includes('agendar sessao')) {
      const matchedP = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()));
      const pName = matchedP ? matchedP.name : (rawPrompt.match(/para (?:o|a)?\s*([A-Za-zÀ-ÖØ-öø-ÿ]+)/i)?.[1] || '');

      let date = todayStr;
      if (lowerPrompt.includes('amanhã') || lowerPrompt.includes('amanha')) date = tomorrowStr;

      let time = '';
      const timeMatch = rawPrompt.match(/(\d{1,2})[h:]?(\d{2})?/i);
      if (timeMatch) {
        const hh = String(timeMatch[1]).padStart(2, '0');
        const mm = timeMatch[2] ? String(timeMatch[2]).padStart(2, '0') : '00';
        time = `${hh}:${mm}`;
      }

      if (!pName) {
        return {
          text: `Para qual paciente você deseja agendar a consulta?`
        };
      }

      if (!time && !lowerPrompt.includes('amanhã') && !lowerPrompt.includes('hoje')) {
        return {
          text: `Claro! Para qual data e horário você deseja agendar a consulta de **${pName}**?`,
          nextInProgressState: { type: 'create_session', step: 'awaiting_datetime', data: { patientName: pName } }
        };
      }

      const finalTime = time || '14:00';

      return {
        text: `✅ **Consulta de ${pName} criada com sucesso para ${date.split('-').reverse().join('/')} às ${finalTime}.**`,
        executeImmediately: {
          type: 'create_session',
          payload: {
            patientName: pName,
            date,
            startTime: finalTime,
            endTime: finalTime
          }
        }
      };
    }

    // Action 5: Reagendar Consulta
    if (lowerPrompt.includes('reagendar') || lowerPrompt.includes('mudar horário') || lowerPrompt.includes('mudar horar') || lowerPrompt.includes('trocar horário')) {
      const matchedP = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()));
      const pName = matchedP ? matchedP.name : 'Paciente';
      const matchedS = sessions.find(s => matchedP ? (s.patientId === matchedP.id || s.patientName === matchedP.name) : lowerPrompt.includes(s.patientName.toLowerCase()));

      let newDate = tomorrowStr;
      if (lowerPrompt.includes('hoje')) newDate = todayStr;

      let newTime = '';
      const timeMatch = rawPrompt.match(/(\d{1,2})[h:]?(\d{2})?/i);
      if (timeMatch) {
        const hh = String(timeMatch[1]).padStart(2, '0');
        const mm = timeMatch[2] ? String(timeMatch[2]).padStart(2, '0') : '00';
        newTime = `${hh}:${mm}`;
      }

      if (!newTime) {
        return {
          text: `Para qual nova data e horário você gostaria de reagendar a consulta de **${pName}**?`,
          nextInProgressState: { type: 'reschedule_session', step: 'awaiting_datetime', data: { patientName: pName, sessionId: matchedS?.id } }
        };
      }

      return {
        text: `✅ **Consulta de ${pName} reagendada com sucesso para ${newDate.split('-').reverse().join('/')} às ${newTime}.**`,
        executeImmediately: {
          type: 'reschedule_session',
          payload: {
            sessionId: matchedS?.id,
            patientName: pName,
            newDate,
            newTime
          }
        }
      };
    }

    // Action 6: Cancelar Consulta
    if (lowerPrompt.includes('cancelar consulta') || lowerPrompt.includes('desmarcar consulta') || lowerPrompt.includes('cancelar sessão')) {
      const matchedPatient = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()));
      const targetSession = sessions.find(s => 
        (s.date >= todayStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo') &&
        (matchedPatient ? (s.patientId === matchedPatient.id || s.patientName === matchedPatient.name) : true)
      );

      if (targetSession) {
        return {
          text: `✅ **Consulta de ${targetSession.patientName} cancelada com sucesso no sistema.**`,
          executeImmediately: {
            type: 'cancel_session',
            payload: { sessionId: targetSession.id, patientName: targetSession.patientName }
          }
        };
      } else {
        return {
          text: `Não encontrei nenhuma consulta agendada pendente com esse nome para cancelar.`
        };
      }
    }

    // Action 7: Criar Prontuário / Registrar Evolução
    if (lowerPrompt.includes('criar prontuário') || lowerPrompt.includes('criar prontuario') || lowerPrompt.includes('registrar evolução') || lowerPrompt.includes('registrar evolucao') || lowerPrompt.includes('salvar evolução')) {
      const matchedP = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()));
      const pName = matchedP ? matchedP.name : 'Paciente';

      let notes = '';
      if (rawPrompt.includes(':')) {
        notes = rawPrompt.split(':')[1].trim();
      }

      if (!notes) {
        return {
          text: `Claro. Qual é a anotação/evolução clínica que você deseja registrar no prontuário de **${pName}**?`,
          nextInProgressState: { type: 'create_clinical_note', step: 'awaiting_notes', data: { patientName: pName } }
        };
      }

      const matchedS = sessions.find(s => matchedP ? (s.patientId === matchedP.id || s.patientName === matchedP.name) : lowerPrompt.includes(s.patientName.toLowerCase()));

      return {
        text: `✅ **Prontuário/Evolução clínica de ${pName} registrado com sucesso.**`,
        executeImmediately: {
          type: 'create_clinical_note',
          payload: {
            sessionId: matchedS?.id,
            patientName: pName,
            notes
          }
        }
      };
    }

    // Action 8: Enviar E-mail
    if (lowerPrompt.includes('enviar email') || lowerPrompt.includes('enviar e-mail') || lowerPrompt.includes('mande um email')) {
      const matchedP = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()));
      const pName = matchedP ? matchedP.name : 'Paciente';
      const email = matchedP?.email || 'paciente@email.com';

      return {
        text: `✅ **E-mail enviado com sucesso para ${pName} (${email}).**`,
        executeImmediately: {
          type: 'send_email',
          payload: { email, patientName: pName }
        }
      };
    }

    // Action 9: Enviar WhatsApp
    if (lowerPrompt.includes('enviar whatsapp') || lowerPrompt.includes('mandar mensagem no whatsapp') || lowerPrompt.includes('enviar zap') || lowerPrompt.includes('mandar whatsapp')) {
      const matchedP = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()));
      const pName = matchedP ? matchedP.name : 'Paciente';

      return {
        text: `✅ **Mensagem enviada / WhatsApp iniciado para ${pName} com sucesso.**`,
        executeImmediately: {
          type: 'send_whatsapp',
          payload: { patientName: pName }
        }
      };
    }

    // ----------------------------------------------------
    // 2. CHIT-CHAT & SOCIAL GREETINGS (Conversação Natural)
    // ----------------------------------------------------
    if (lowerPrompt === 'bom dia' || lowerPrompt.startsWith('bom dia')) {
      const practitionerName = profile.name ? profile.name.split(' ')[0] : 'Dra.';
      return {
        text: `Bom dia, ${practitionerName}! 🌸\n\nComo posso ajudar você e seu consultório hoje? Estou aqui para consultar sua agenda, pacientes, finanças e prontuários.`
      };
    }

    if (lowerPrompt === 'boa tarde' || lowerPrompt.startsWith('boa tarde')) {
      return {
        text: `Boa tarde! ☕\n\nSeus atendimentos estão organizados no sistema. Como posso te auxiliar neste momento?`
      };
    }

    if (lowerPrompt === 'boa noite' || lowerPrompt.startsWith('boa noite')) {
      return {
        text: `Boa noite! 🌙\n\nEspero que tenha tido um excelente dia de atendimentos. Precisa checar sua agenda de amanhã ou alguma pendência financeira?`
      };
    }

    if (lowerPrompt.includes('obrigad') || lowerPrompt.includes('valeu') || lowerPrompt === 'obrigado!') {
      return {
        text: `Foi um prazer ajudar! 😊 Conte comigo sempre que precisar organizar sua rotina no Sessão Certa.`
      };
    }

    if (lowerPrompt.includes('você é incrível') || lowerPrompt.includes('voce e incrível') || lowerPrompt.includes('voce e incrivel')) {
      return {
        text: `Muito obrigada pelo carinho! 💖 Fico muito feliz em facilitar a gestão do seu consultório.`
      };
    }

    if (lowerPrompt.includes('até amanhã') || lowerPrompt.includes('ate amanha') || lowerPrompt.includes('tchau')) {
      return {
        text: `Até amanhã! Tenha um excelente descanso. 🌸`
      };
    }

    if (lowerPrompt.includes('quem é você') || lowerPrompt.includes('quem e voce') || lowerPrompt.includes('o que você faz')) {
      return {
        text: `Eu sou a **Clara**, assistente virtual inteligente e secretária oficial do Sessão Certa.\n\nEu leio em tempo real os dados reais do seu consultório (agenda, pacientes, finanças e prontuários) para te dar respostas exatas e ajudar na sua produtividade clínica, sem nunca inventar informações.`
      };
    }

    // ----------------------------------------------------
    // 2. CONVERSATION MEMORY (Acompanhamento do Assunto)
    // ----------------------------------------------------
    if (
      (lowerPrompt.includes('quem é a primeira') || lowerPrompt.includes('qual é a primeira') || lowerPrompt.includes('quem é o primeiro')) &&
      this.lastContext.matchedSessions &&
      this.lastContext.matchedSessions.length > 0
    ) {
      const firstSess = this.lastContext.matchedSessions[0];
      const targetLabel = this.lastContext.targetDate === tomorrowStr ? 'amanhã' : 'do dia selecionado';
      return {
        text: `A primeira consulta de ${targetLabel} é com **${firstSess.patientName}** às **${firstSess.startTime}** (${firstSess.type === 'online' ? 'Online' : 'Presencial'}).`
      };
    }

    // ----------------------------------------------------
    // 3. ACTION INTENT DETECTION (Cancelar / Confirmar / Pagar / Reagendar)
    // ----------------------------------------------------
    // Cancel Session Action Intent
    if (lowerPrompt.includes('cancelar consulta') || lowerPrompt.includes('desmarcar consulta')) {
      const matchedPatient = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()));
      const targetSession = sessions.find(s => 
        (s.date >= todayStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo') &&
        (matchedPatient ? (s.patientId === matchedPatient.id || s.patientName === matchedPatient.name) : true)
      );

      if (targetSession) {
        return {
          text: `Entendi. Para sua segurança, confirme a ação abaixo para cancelar a consulta no sistema:`,
          pendingAction: {
            id: `act-cancel-${Date.now()}`,
            type: 'cancel_session',
            title: 'Cancelar Consulta',
            description: `Cancelar consulta de ${targetSession.patientName} agendada para ${targetSession.date.split('-').reverse().join('/')} às ${targetSession.startTime}.`,
            sessionId: targetSession.id,
            patientName: targetSession.patientName,
            date: targetSession.date,
            time: targetSession.startTime
          }
        };
      } else {
        return {
          text: `Não encontrei nenhuma consulta futura pendente com esse nome para cancelar. Por favor, verifique o nome do paciente.`
        };
      }
    }

    // Mark Payment Paid Action Intent
    if (lowerPrompt.includes('marcar como pag') || lowerPrompt.includes('confirmar pagamento') || lowerPrompt.includes('dar baixa no pagamento')) {
      const matchedPatient = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()));
      const pendingPaymentSession = sessions.find(s => 
        s.paymentStatus === 'pendente' &&
        (matchedPatient ? (s.patientId === matchedPatient.id || s.patientName === matchedPatient.name) : true)
      );

      if (pendingPaymentSession) {
        return {
          text: `Encontrei a consulta pendente de pagamento. Por favor, confirme o recebimento para atualizar o financeiro:`,
          pendingAction: {
            id: `act-pay-${Date.now()}`,
            type: 'mark_paid',
            title: 'Confirmar Recebimento de Pagamento',
            description: `Marcar pagamento de ${this.formatCurrency(pendingPaymentSession.price)} referente à consulta de ${pendingPaymentSession.patientName} (${pendingPaymentSession.date.split('-').reverse().join('/')}) como PAGO.`,
            sessionId: pendingPaymentSession.id,
            patientName: pendingPaymentSession.patientName,
            amount: pendingPaymentSession.price,
            date: pendingPaymentSession.date
          }
        };
      } else {
        return {
          text: `Não encontrei nenhuma consulta com pagamento pendente para o filtro informado.`
        };
      }
    }

    // ----------------------------------------------------
    // 4. AGENDA & HORÁRIOS QUERIES
    // ----------------------------------------------------
    // Today's Agenda
    if (lowerPrompt.includes('hoje') && (lowerPrompt.includes('consulta') || lowerPrompt.includes('sessã') || lowerPrompt.includes('sessao') || lowerPrompt.includes('agenda') || lowerPrompt.includes('paciente'))) {
      const todaySessions = sessions
        .filter(s => s.date === todayStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo')
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      this.lastContext = {
        lastTopic: 'agenda',
        targetDate: todayStr,
        matchedSessions: todaySessions
      };

      if (todaySessions.length === 0) {
        return {
          text: `Você **não possui consultas agendadas para hoje** (${todayStr.split('-').reverse().join('/')}).\n\nSua agenda do dia está totalmente livre.`
        };
      }

      const confirmedCount = todaySessions.filter(s => s.status === 'confirmada' || s.status === 'realizada').length;
      const pendingCount = todaySessions.filter(s => s.status === 'agendada').length;

      let responseText = `Hoje você possui **${todaySessions.length} consulta(s)** agendada(s) (${confirmedCount} confirmada(s), ${pendingCount} aguardando resposta):\n\n`;
      todaySessions.forEach((s, idx) => {
        const statusBadge = s.status === 'confirmada' ? '✅ Confirmada' : s.status === 'realizada' ? '✔️ Concluída' : '⏳ Agendada';
        responseText += `${idx + 1}. **${s.startTime}** - ${s.patientName} (${s.type === 'online' ? 'Online' : 'Presencial'}) | ${statusBadge}\n`;
      });

      return { text: responseText };
    }

    // Tomorrow's Agenda
    if (lowerPrompt.includes('amanhã') || lowerPrompt.includes('amanha')) {
      const tomorrowSessions = sessions
        .filter(s => s.date === tomorrowStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo')
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      this.lastContext = {
        lastTopic: 'agenda',
        targetDate: tomorrowStr,
        matchedSessions: tomorrowSessions
      };

      if (tomorrowSessions.length === 0) {
        return {
          text: `Você **não possui consultas agendadas para amanhã** (${tomorrowStr.split('-').reverse().join('/')}). Seus horários estão vagos.`
        };
      }

      let responseText = `Para amanhã (${tomorrowStr.split('-').reverse().join('/')}), você possui **${tomorrowSessions.length} consulta(s)**:\n\n`;
      tomorrowSessions.forEach((s, idx) => {
        const statusBadge = s.status === 'confirmada' ? '✅ Confirmada' : '⏳ Agendada';
        responseText += `${idx + 1}. **${s.startTime}** - ${s.patientName} (${s.type === 'online' ? 'Online' : 'Presencial'}) | ${statusBadge}\n`;
      });

      return { text: responseText };
    }

    // Next Patient / Next Consultation
    if (lowerPrompt.includes('próximo paciente') || lowerPrompt.includes('proximo paciente') || lowerPrompt.includes('próxima consulta') || lowerPrompt.includes('proxima consulta')) {
      const upcomingToday = sessions
        .filter(s => s.date === todayStr && s.startTime >= timeStr && s.status !== 'realizada' && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo')
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      if (upcomingToday.length > 0) {
        const next = upcomingToday[0];
        return {
          text: `Seu próximo paciente hoje é **${next.patientName}**, agendado para às **${next.startTime}** (${next.type === 'online' ? 'Atendimento Online' : 'Atendimento Presencial'}).\n\nStatus da sessão: **${next.status === 'confirmada' ? 'Confirmada' : 'Agendada'}**.`
        };
      }

      // Check future days
      const futureSessions = sessions
        .filter(s => s.date > todayStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo')
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

      if (futureSessions.length > 0) {
        const next = futureSessions[0];
        return {
          text: `Não há mais consultas pendentes para hoje. Sua próxima consulta agendada no sistema é com **${next.patientName}** no dia **${next.date.split('-').reverse().join('/')}** às **${next.startTime}**.`
        };
      }

      return {
        text: `Você não possui próximas consultas agendadas no momento.`
      };
    }

    // Free slots query
    if (lowerPrompt.includes('horário livre') || lowerPrompt.includes('horario livre') || lowerPrompt.includes('vago') || lowerPrompt.includes('horário vago')) {
      const todaySessions = sessions.filter(s => s.date === todayStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo');
      const bookedTimes = todaySessions.map(s => s.startTime);
      const standardSlots = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
      const freeSlots = standardSlots.filter(t => !bookedTimes.includes(t));

      return {
        text: `Com base na sua grade comercial de hoje, você possui **${freeSlots.length} horários vagos**: ${freeSlots.join(', ')}.\n\n💡 *Dica:* Você pode agendar novos pacientes ou encaixar retornos Nesses horários.`
      };
    }

    // ----------------------------------------------------
    // 5. PACIENTES QUERIES
    // ----------------------------------------------------
    // Patients without return (> 30 days)
    if (lowerPrompt.includes('sem retorno') || lowerPrompt.includes('30 dias') || lowerPrompt.includes('não retornam') || lowerPrompt.includes('nao retornam')) {
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
          text: `✨ Todos os seus pacientes ativos realizaram ou agendaram consultas nos últimos 30 dias! Não há pacientes sem retorno recente.`
        };
      }

      let text = `👥 **Pacientes ativos sem consulta há mais de 30 dias (${patientsWithoutReturn.length}):**\n\n`;
      patientsWithoutReturn.forEach((p, idx) => {
        const pSessions = sessions
          .filter((s) => (s.patientId === p.id || s.patientName.toLowerCase() === p.name.toLowerCase()) && s.status === 'realizada')
          .sort((a, b) => b.date.localeCompare(a.date));
        const lastDate = pSessions.length > 0 ? pSessions[0].date.split('-').reverse().join('/') : 'Nenhuma sessão anterior';
        text += `${idx + 1}. **${p.name}** | Última sessão em: ${lastDate}\n`;
      });
      text += `\n💡 *Sugestão:* Se desejar, posso ajudar a redigir uma mensagem amigável de acompanhamento pelo WhatsApp.`;
      return { text };
    }

    // Active / Total Patients Count
    if (lowerPrompt.includes('paciente') && (lowerPrompt.includes('quantos') || lowerPrompt.includes('total') || lowerPrompt.includes('ativo') || lowerPrompt.includes('inativo') || lowerPrompt.includes('lista'))) {
      const activePats = patients.filter(p => p.status === 'ativo');
      const pausedPats = patients.filter(p => p.status === 'pausa');
      const dischargedPats = patients.filter(p => p.status === 'alta');

      return {
        text: `Atualmente você possui **${patients.length} pacientes cadastrados** no total:\n- 🟢 **${activePats.length} Ativos** em acompanhamento regular\n- ⏸️ **${pausedPats.length} Em Pausa**\n- 🎓 **${dischargedPats.length} Com Alta**\n\nNomes dos ativos: ${activePats.map(p => p.name).join(', ') || 'Nenhum'}.`
      };
    }

    // Specific Patient Query (e.g., "Quando foi a última consulta da Maria?")
    if (lowerPrompt.includes('última consulta') || lowerPrompt.includes('ultima consulta') || lowerPrompt.includes('quando foi a consulta')) {
      const matchedPatient = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()));
      
      if (matchedPatient) {
        const patientSessions = sessions
          .filter(s => (s.patientId === matchedPatient.id || s.patientName.toLowerCase() === matchedPatient.name.toLowerCase()) && s.status === 'realizada')
          .sort((a, b) => b.date.localeCompare(a.date));

        if (patientSessions.length > 0) {
          const lastSess = patientSessions[0];
          return {
            text: `A última consulta realizada com **${matchedPatient.name}** foi em **${lastSess.date.split('-').reverse().join('/')}** às **${lastSess.startTime}**.\n\nProntuário/Evolução: *"${lastSess.clinicalNotes ? lastSess.clinicalNotes.substring(0, 120) + '...' : 'Sem anotações registradas'}"*`
          };
        } else {
          return {
            text: `O paciente **${matchedPatient.name}** está cadastrado, mas ainda não possui consultas concluídas registradas no histórico.`
          };
        }
      } else {
        return {
          text: `Não consegui identificar o nome do paciente na sua pergunta. Por favor, especifique o nome completo ou primeiro nome cadastrado.`
        };
      }
    }

    // Aniversariantes
    if (lowerPrompt.includes('aniversár') || lowerPrompt.includes('aniversar')) {
      const currentMonthNum = new Date().getMonth() + 1;
      const bdayPatients = patients.filter(p => {
        if (!p.birthDate) return false;
        const bMonth = parseInt(p.birthDate.split('-')[1] || '0', 10);
        return bMonth === currentMonthNum;
      });

      if (bdayPatients.length > 0) {
        let bdayText = `🎂 **Pacientes que fazem aniversário este mês (${currentMonthNum}):**\n\n`;
        bdayPatients.forEach(p => {
          const formattedBday = p.birthDate.split('-').reverse().slice(0, 2).join('/');
          bdayText += `- **${p.name}**: ${formattedBday}\n`;
        });
        return { text: bdayText };
      } else {
        return {
          text: `Não há pacientes cadastrados fazendo aniversário neste mês.`
        };
      }
    }

    // ----------------------------------------------------
    // 6. FINANCIAL & COBRANÇA QUERIES
    // ----------------------------------------------------
    if (lowerPrompt.includes('faturei') || lowerPrompt.includes('faturamento') || lowerPrompt.includes('quanto ganhei') || lowerPrompt.includes('receita') || lowerPrompt.includes('financeiro')) {
      const currentMonthSessions = sessions.filter(s => s.date.startsWith(currentYearMonth) && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo');
      const paidThisMonth = currentMonthSessions
        .filter(s => s.paymentStatus === 'pago')
        .reduce((acc, s) => acc + (s.price || 0), 0);

      const pendingThisMonth = currentMonthSessions
        .filter(s => s.paymentStatus === 'pendente')
        .reduce((acc, s) => acc + (s.price || 0), 0);

      return {
        text: `📊 **Balanço Financeiro do Mês Atual (${currentYearMonth.split('-').reverse().join('/')}):**\n\n` +
          `- 💰 **Faturamento Realizado (Pago):** ${this.formatCurrency(paidThisMonth)}\n` +
          `- ⏳ **Valores Pendentes a Receber:** ${this.formatCurrency(pendingThisMonth)}\n` +
          `- 📦 **Total Previsto do Mês:** ${this.formatCurrency(paidThisMonth + pendingThisMonth)}\n\n` +
          `Estes números utilizam rigorosamente os registros do seu sistema.`
      };
    }

    // Who hasn't paid? (Inadimplência)
    if (lowerPrompt.includes('quem ainda não pagou') || lowerPrompt.includes('quem nao pagou') || lowerPrompt.includes('pagamento pendente') || lowerPrompt.includes('inadimplen')) {
      const pendingSessions = sessions.filter(s => s.paymentStatus === 'pendente' && s.status === 'realizada');

      if (pendingSessions.length === 0) {
        return {
          text: `✨ **Excelente notícia!** Não há atendimentos concluídos com pagamento pendente no seu consultório neste momento.`
        };
      }

      const totalPendingAmount = pendingSessions.reduce((acc, s) => acc + s.price, 0);
      let pendingText = `💸 **Atenção:** Você possui **${pendingSessions.length} consulta(s) realizada(s)** com pagamento pendente, somando **${this.formatCurrency(totalPendingAmount)}**:\n\n`;

      pendingSessions.forEach((s, idx) => {
        pendingText += `${idx + 1}. **${s.patientName}**: ${this.formatCurrency(s.price)} (Sessão de ${s.date.split('-').reverse().join('/')})\n`;
      });

      pendingText += `\n💡 *Dica:* Se desejar, posso ajudar a solicitar a baixa do pagamento ou enviar lembretes.`;
      return { text: pendingText };
    }

    // ----------------------------------------------------
    // 7. PRONTUÁRIOS & CLINICAL EVOLUTION QUERIES
    // ----------------------------------------------------
    if (lowerPrompt.includes('prontuário') || lowerPrompt.includes('prontuario') || lowerPrompt.includes('evoluçã') || lowerPrompt.includes('evolucao') || lowerPrompt.includes('resumo das sessões')) {
      // Pending evolutions check
      if (lowerPrompt.includes('pendente') || lowerPrompt.includes('faltando') || lowerPrompt.includes('sem preenchimento') || lowerPrompt.includes('não preenchido') || lowerPrompt.includes('nao preenchido')) {
        const pendingEvolutions = sessions.filter(
          (s) => s.status === 'realizada' && (!s.clinicalNotes || s.clinicalNotes.trim().length === 0)
        );

        if (pendingEvolutions.length === 0) {
          return {
            text: `✨ **Parabéns!** Todas as suas consultas realizadas possuem prontuário e evolução clínica registrados no sistema.`
          };
        }

        let pendingText = `📝 **Atenção:** Você possui **${pendingEvolutions.length} consulta(s) encerrada(s)** sem evolução registrada:\n\n`;
        pendingEvolutions.forEach((s, idx) => {
          pendingText += `${idx + 1}. **${s.patientName}** - Sessão de ${s.date.split('-').reverse().join('/')} às ${s.startTime}\n`;
        });
        pendingText += `\n💡 *Dica:* Registrar o prontuário logo após o atendimento garante a segurança clínica e o cumprimento das normas do CRP.`;
        return { text: pendingText };
      }

      const matchedPatient = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()));

      if (matchedPatient) {
        const patientEvolutions = sessions
          .filter(s => (s.patientId === matchedPatient.id || s.patientName.toLowerCase() === matchedPatient.name.toLowerCase()) && s.clinicalNotes)
          .sort((a, b) => b.date.localeCompare(a.date));

        if (patientEvolutions.length > 0) {
          let summaryText = `📋 **Resumo de Prontuário para ${matchedPatient.name}:**\n\nTotal de evoluções registradas: **${patientEvolutions.length}**.\n\n**Última anotação (${patientEvolutions[0].date.split('-').reverse().join('/')}):**\n"${patientEvolutions[0].clinicalNotes}"`;
          return { text: summaryText };
        } else {
          return {
            text: `O paciente **${matchedPatient.name}** não possui anotações de prontuário gravadas nas sessões.`
          };
        }
      }

      const totalNotesCount = sessions.filter(s => s.clinicalNotes && s.clinicalNotes.trim().length > 0).length;
      const pendingCount = sessions.filter(s => s.status === 'realizada' && (!s.clinicalNotes || s.clinicalNotes.trim().length === 0)).length;
      return {
        text: `Você possui **${totalNotesCount} prontuários registrados** e **${pendingCount} pendentes de evolução** no sistema.\n\nPara consultar o histórico de um paciente, me pergunte por exemplo: *"Resumo das sessões da Maria"* ou *"Quais prontuários estão pendentes?"*.`
      };
    }

    // ----------------------------------------------------
    // 8. DEFAULT TRANSPARENT FALLBACK
    // ----------------------------------------------------
    const practitionerName = profile.name ? profile.name.split(' ')[0] : 'Dra.';
    return {
      text: `Olá, ${practitionerName}! Sou a Clara e estou conectada diretamente aos dados reais do seu consultório.\n\n` +
        `Entendi sua mensagem, mas ainda não encontrei essa informação específica nos seus registros. Tente me perguntar sobre:\n` +
        `- *"Quantas consultas tenho amanhã?"*\n` +
        `- *"Quem é meu próximo paciente?"*\n` +
        `- *"Quanto faturei este mês?"*\n` +
        `- *"Quem ainda não pagou?"*\n` +
        `- *"Quantos pacientes ativos tenho?"*`
    };
  }

  /**
   * Generates a comprehensive Morning Briefing (Resumo Matinal da Clara)
   * based 100% on real database records.
   */
  public static generateMorningBriefing(
    patients: Patient[],
    sessions: Session[],
    profile: PsychologistProfile
  ): {
    greeting: string;
    summaryText: string;
    todayCount: number;
    firstSessionTime?: string;
    confirmedCount: number;
    pendingEvolutionsCount: number;
    pendingPaymentsCount: number;
    patientsWithoutReturnCount: number;
    monthlyRevenuePaid: number;
  } {
    const { todayStr, timeStr, currentYearMonth } = this.getDateHelpers();
    const practitionerName = profile.name ? profile.name.split(' ')[0] : 'Dra.';

    // Today's sessions
    const todaySessions = sessions
      .filter((s) => s.date === todayStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const confirmedCount = todaySessions.filter((s) => s.status === 'confirmada' || s.status === 'realizada').length;
    const firstSessionTime = todaySessions.length > 0 ? todaySessions[0].startTime : undefined;

    // Pending evolutions (sessions in the past with empty clinicalNotes)
    const pendingEvolutions = sessions.filter(
      (s) => s.status === 'realizada' && (!s.clinicalNotes || s.clinicalNotes.trim().length === 0)
    );

    // Pending payments
    const pendingPayments = sessions.filter(
      (s) => s.status === 'realizada' && s.paymentStatus === 'pendente'
    );

    // Patients without return (> 30 days)
    const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const patientsWithoutReturn = patients.filter((p) => {
      if (p.status !== 'ativo') return false;
      const pSessions = sessions.filter(
        (s) => (s.patientId === p.id || s.patientName.toLowerCase() === p.name.toLowerCase()) && s.date >= thirtyDaysAgoStr
      );
      return pSessions.length === 0;
    });

    // Monthly revenue
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
   * Generates 4-6 proactive insights based strictly on real database analytics
   */
  public static generateProactiveInsights(
    patients: Patient[],
    sessions: Session[],
    profile: PsychologistProfile
  ): ClaraProactiveInsight[] {
    const { todayStr, tomorrowStr, currentYearMonth } = this.getDateHelpers();
    const insights: ClaraProactiveInsight[] = [];

    // 1. Morning Agenda Insight
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

    // 2. Unwritten Clinical Notes / Prontuários Pendentes
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

    // 3. Financial Overdue Insight
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

    // 4. Patients Without Return (> 30 days)
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

    // 5. Tomorrow Slots Opportunity
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

    // 6. Monthly Revenue Performance
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
