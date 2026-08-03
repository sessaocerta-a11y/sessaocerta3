import { EntityExtractor } from './EntityExtractor';
import { PromptManager } from './PromptManager';
import { ClaraQueryResult, RegistrationWizardData, InProgressState } from './types';

export class PatientRegistrationFlow {
  /**
   * Evaluates the next wizard step based on available data
   */
  public static getNextStep(data: RegistrationWizardData): { step: string; promptText: string } {
    const header = PromptManager.buildPartialInfoNotice(data);
    const firstName = data.name ? data.name.trim().split(' ')[0] : 'paciente';

    // 1. Name check
    if (!data.name || data.name.length < 2) {
      return {
        step: 'awaiting_name',
        promptText: `${header}Por favor, me informe o **nome completo** do paciente para iniciar o cadastro:`
      };
    }

    // 1b. Name Confirmation check if name has single word & not confirmed
    if (!data.nameConfirmed && data.name.trim().split(' ').length < 2) {
      return {
        step: 'awaiting_name_confirmation',
        promptText: PromptManager.buildNameConfirmationPrompt(data.name)
      };
    }

    // 2. Phone check (undefined means not asked yet)
    if (data.phone === undefined) {
      return {
        step: 'awaiting_phone',
        promptText: `${header}Qual é o **número de telefone** (com DDD) de **${data.name}**?\n*(ou digite **pular** se preferir não informar)*`
      };
    }

    // 3. Email check
    if (data.email === undefined) {
      return {
        step: 'awaiting_email',
        promptText: `${header}Qual é o **e-mail** de contato de **${firstName}**?\n*(ou digite **pular**)*`
      };
    }

    // 4. Location check
    if (data.city === undefined && data.state === undefined) {
      return {
        step: 'awaiting_location',
        promptText: `${header}Qual é a **Cidade e Estado** de residência de **${data.name}**?\n*(ex: **São José dos Campos - SP** ou digite **pular**)*`
      };
    }

    // 5. Session Price check
    if (data.sessionPrice === undefined) {
      return {
        step: 'awaiting_price',
        promptText: `${header}Qual será o **valor da sessão** para **${firstName}**?\n*(ex: **180** ou digite **pular** para o padrão de R$ 150,00)*`
      };
    }

    // 6. CPF check
    if (data.cpf === undefined) {
      return {
        step: 'awaiting_cpf',
        promptText: `${header}Deseja registrar o **CPF** de **${firstName}**?\n*(opcional - informe os 11 dígitos ou digite **pular**)*`
      };
    }

    // 7. Emergency Contact check
    if (data.emergencyContact === undefined) {
      return {
        step: 'awaiting_emergency',
        promptText: `${header}Deseja registrar um **contato de emergência** (Nome e Telefone)?\n*(ex: **Pai 12982314172** ou digite **pular**)*`
      };
    }

    // 8. Notes check
    if (data.notes === undefined) {
      return {
        step: 'awaiting_notes',
        promptText: `${header}Deseja adicionar **observações iniciais / anamnese** para **${firstName}**?\n*(opcional - ou digite **pular**)*`
      };
    }

    // 9. Full Confirmation
    return {
      step: 'awaiting_confirmation',
      promptText: PromptManager.buildPatientSummary(data)
    };
  }

  /**
   * Classifies user intent at the final confirmation step
   */
  public static classifyConfirmationIntent(input: string): 'positive' | 'cancel' | 'edit' {
    if (!input) return 'edit';
    const lower = input.toLowerCase().trim();

    // 1. Explicit cancellation
    if (
      lower === 'cancelar' || lower === 'cancelar cadastro' || lower === 'descartar' ||
      lower === 'desistir' || lower === 'apagar tudo' || lower === 'cancelar tudo'
    ) {
      return 'cancel';
    }

    // 2. Explicit Edit/Correction intents
    if (
      lower === 'editar' || lower === 'corrigir' || lower === 'alterar' ||
      lower === 'mudar' || lower === 'voltar' || lower === 'ajustar' ||
      lower === 'ainda não' || lower === 'ainda nao' || lower === 'não' || lower === 'nao'
    ) {
      return 'edit';
    }

    // 3. Positive Confirmation exacts
    const positiveExacts = [
      'sim', 's', 'confirmar', 'confirmar cadastro', 'sim, confirmar cadastro',
      'pode confirmar', 'pode salvar', 'salvar', 'prosseguir', 'ok', 'certo',
      'confirmado', 'isso mesmo', 'perfeito', 'pode cadastrar', 'cadastrar',
      'esta correto', 'está correto', 'correto', 'pode ir', 'pode prosseguir',
      'pode gravar', 'gravar', 'tudo certo', 'pode enviar', 'fechar cadastro',
      'com certeza', 'sim pode salvar', 'sim pode cadastrar', 'pode sim'
    ];

    if (positiveExacts.includes(lower)) {
      return 'positive';
    }

    // 4. Pattern check: contains positive keyword and no negative word
    const hasNegativeWord = /\b(não|nao|cancelar|editar|mudar|corrigir|alterar|voltar|errado|errada)\b/i.test(lower);
    if (!hasNegativeWord) {
      if (
        lower.includes('sim') ||
        lower.includes('confirm') ||
        lower.includes('salv') ||
        lower.includes('cadastr') ||
        lower.includes('prossegu') ||
        lower.includes('perfeit') ||
        lower.includes('certo') ||
        lower.includes('correto') ||
        lower.includes('isso mesmo') ||
        lower.includes('ok') ||
        lower.includes('gravar')
      ) {
        return 'positive';
      }
    }

    return 'edit';
  }

  public static mapStateToStep(stateType: string): string {
    switch (stateType) {
      case 'AGUARDANDO_NOME_PACIENTE': return 'awaiting_name';
      case 'AGUARDANDO_TELEFONE': return 'awaiting_phone';
      case 'AGUARDANDO_EMAIL': return 'awaiting_email';
      case 'AGUARDANDO_CPF': return 'awaiting_cpf';
      case 'AGUARDANDO_CONTATO_EMERGENCIA': return 'awaiting_emergency';
      case 'AGUARDANDO_OBSERVACOES': return 'awaiting_notes';
      case 'AGUARDANDO_CONFIRMACAO': return 'awaiting_confirmation';
      default: return 'awaiting_name';
    }
  }

  /**
   * Processes input inside the patient registration state machine
   */
  public static handleWizardInput(
    rawPrompt: string,
    inProgressState: InProgressState
  ): ClaraQueryResult {
    const lowerPrompt = rawPrompt.toLowerCase().trim();
    let step = inProgressState.step;
    if (!step && inProgressState.type && inProgressState.type.startsWith('AGUARDANDO_')) {
      step = PatientRegistrationFlow.mapStateToStep(inProgressState.type);
    }
    if (!step) step = 'awaiting_name';

    const data: RegistrationWizardData = { ...inProgressState.data };
    const isSkip = EntityExtractor.isNegativeOrSkipResponse(rawPrompt);

    // Opportunistically extract any additional fields provided in current response
    if (!isSkip) {
      const extraExtracted = EntityExtractor.extractEntities(rawPrompt);
      if (extraExtracted.phone && data.phone === undefined) data.phone = extraExtracted.phone;
      if (extraExtracted.email && data.email === undefined) data.email = extraExtracted.email;
      if (extraExtracted.cpf && data.cpf === undefined) data.cpf = extraExtracted.cpf;
      if (extraExtracted.city && data.city === undefined) {
        data.city = EntityExtractor.formatSmartCapitalization(extraExtracted.city);
      }
      if (extraExtracted.state && data.state === undefined) data.state = extraExtracted.state;
      if (extraExtracted.sessionPrice !== undefined && data.sessionPrice === undefined) data.sessionPrice = extraExtracted.sessionPrice;
    }

    // Step 1: awaiting_name
    if (step === 'awaiting_name') {
      const extracted = EntityExtractor.extractEntities(rawPrompt);
      const nameVal = extracted.name || rawPrompt.trim();

      if (!nameVal || nameVal.length < 2) {
        return {
          text: `Por favor, me informe o **nome completo** do paciente para podermos continuar:`,
          nextInProgressState: { type: 'add_patient_wizard', step: 'awaiting_name', data }
        };
      }

      data.name = EntityExtractor.formatSmartCapitalization(nameVal);

      // Check name confidence
      if (extracted.confidence.name < 0.7 && nameVal.split(' ').length < 2) {
        return {
          text: PromptManager.buildNameConfirmationPrompt(data.name),
          nextInProgressState: { type: 'add_patient_wizard', step: 'awaiting_name_confirmation', data }
        };
      } else {
        data.nameConfirmed = true;
      }

      const next = PatientRegistrationFlow.getNextStep(data);
      return {
        text: next.promptText,
        nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
      };
    }

    // Step 1b: awaiting_name_confirmation
    if (step === 'awaiting_name_confirmation') {
      if (
        lowerPrompt === 'sim' || lowerPrompt === 's' || lowerPrompt === 'correto' ||
        lowerPrompt === 'está correto' || lowerPrompt === 'esta correto' || lowerPrompt === 'ok'
      ) {
        data.nameConfirmed = true;
      } else if (isSkip) {
        data.nameConfirmed = true;
      } else {
        // User typed full name or correction
        const extracted = EntityExtractor.extractEntities(rawPrompt);
        const nameVal = extracted.name || rawPrompt.trim();
        data.name = EntityExtractor.formatSmartCapitalization(nameVal);
        data.nameConfirmed = true;
      }

      const next = PatientRegistrationFlow.getNextStep(data);
      return {
        text: next.promptText,
        nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
      };
    }

    // Step 2: awaiting_phone
    if (step === 'awaiting_phone') {
      if (isSkip) {
        data.phone = '';
      } else if (data.phone === undefined) {
        const phoneRes = EntityExtractor.validateAndFormatPhone(rawPrompt);
        if (!phoneRes.isValid) {
          return {
            text: `O número de telefone (*"${rawPrompt}"*) não parece válido.\n\nPor favor, informe no formato **(12) 99999-9999** ou digite **pular** para continuar:`,
            nextInProgressState: { type: 'add_patient_wizard', step: 'awaiting_phone', data }
          };
        }
        data.phone = phoneRes.formatted;
      }

      const next = PatientRegistrationFlow.getNextStep(data);
      return {
        text: next.promptText,
        nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
      };
    }

    // Step 3: awaiting_email
    if (step === 'awaiting_email') {
      if (isSkip) {
        data.email = '';
      } else if (data.email === undefined) {
        if (!EntityExtractor.validateEmail(rawPrompt)) {
          return {
            text: `O e-mail informado (*"${rawPrompt}"*) não parece ser um e-mail válido.\n\nPor favor, digite no formato **nome@exemplo.com** ou digite **pular** para avançar:`,
            nextInProgressState: { type: 'add_patient_wizard', step: 'awaiting_email', data }
          };
        }
        data.email = rawPrompt.trim().toLowerCase();
      }

      const next = PatientRegistrationFlow.getNextStep(data);
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
      } else if (data.city === undefined && data.state === undefined) {
        const extracted = EntityExtractor.extractEntities(rawPrompt);
        if (extracted.city) {
          data.city = EntityExtractor.formatSmartCapitalization(extracted.city);
          data.state = extracted.state || '';
        } else if (rawPrompt.includes('-') || rawPrompt.includes(',')) {
          const parts = rawPrompt.split(/[\-,]/);
          data.city = EntityExtractor.formatSmartCapitalization(parts[0]);
          data.state = parts[1] ? parts[1].trim().toUpperCase() : '';
        } else {
          data.city = EntityExtractor.formatSmartCapitalization(rawPrompt);
          const lookupUF = EntityExtractor.cityStateLookup[data.city.toLowerCase()];
          if (lookupUF) data.state = lookupUF;
        }
      }

      const next = PatientRegistrationFlow.getNextStep(data);
      return {
        text: next.promptText,
        nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
      };
    }

    // Step 5: awaiting_price
    if (step === 'awaiting_price') {
      if (isSkip) {
        data.sessionPrice = 150;
      } else if (data.sessionPrice === undefined) {
        const numMatch = rawPrompt.match(/\d+(?:[.,]\d{1,2})?/);
        data.sessionPrice = numMatch ? parseFloat(numMatch[0].replace(',', '.')) : 150;
      }

      const next = PatientRegistrationFlow.getNextStep(data);
      return {
        text: next.promptText,
        nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
      };
    }

    // Step 6: awaiting_cpf
    if (step === 'awaiting_cpf') {
      if (isSkip) {
        data.cpf = '';
      } else if (data.cpf === undefined) {
        const cpfRes = EntityExtractor.validateAndFormatCPF(rawPrompt);
        if (!cpfRes.isValid) {
          return {
            text: `O CPF informado (*"${rawPrompt}"*) não possui 11 dígitos válidos.\n\nPor favor, digite os **11 dígitos do CPF** ou digite **pular** para continuar:`,
            nextInProgressState: { type: 'add_patient_wizard', step: 'awaiting_cpf', data }
          };
        }
        data.cpf = cpfRes.formatted;
      }

      const next = PatientRegistrationFlow.getNextStep(data);
      return {
        text: next.promptText,
        nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
      };
    }

    // Step 7: awaiting_emergency
    if (step === 'awaiting_emergency') {
      if (isSkip) {
        data.emergencyContact = '';
        data.emergencyContactName = 'Não informado';
        data.emergencyContactPhone = 'Não informado';
      } else if (data.emergencyContact === undefined) {
        const details = EntityExtractor.parseEmergencyContactDetails(rawPrompt);
        data.emergencyContactName = details.name;
        data.emergencyContactPhone = details.phone;
        data.emergencyContact = details.name !== 'Não informado' && details.phone !== 'Não informado'
          ? `${details.name} - ${details.phone}`
          : (details.phone !== 'Não informado' ? details.phone : details.name);
      }

      const next = PatientRegistrationFlow.getNextStep(data);
      return {
        text: next.promptText,
        nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
      };
    }

    // Step 8: awaiting_notes
    if (step === 'awaiting_notes') {
      if (isSkip) {
        data.notes = '';
      } else if (data.notes === undefined) {
        data.notes = rawPrompt.trim();
      }

      const next = PatientRegistrationFlow.getNextStep(data);
      return {
        text: next.promptText,
        nextInProgressState: { type: 'add_patient_wizard', step: next.step, data }
      };
    }

    // Step 9: awaiting_confirmation
    if (step === 'awaiting_confirmation') {
      const confirmIntent = PatientRegistrationFlow.classifyConfirmationIntent(rawPrompt);

      if (confirmIntent === 'positive') {
        const finalPrice = data.sessionPrice !== undefined ? data.sessionPrice : 150;

        const successText = [
          `🎉 **Paciente registrado com sucesso!**`,
          ``,
          `**${data.name}** agora faz parte do seu consultório.`,
          ``,
          `💡 *Percebi que este paciente ainda não possui nenhuma consulta agendada. A maioria dos psicólogos agenda a primeira sessão logo após o registro. Deseja fazer isso agora?*`,
          ``,
          `**O que posso fazer neste momento:**`,
          `1️⃣ 📅 **Agendar primeira consulta**`,
          `2️⃣ 📂 **Abrir prontuário**`,
          `3️⃣ 📝 **Registrar evolução clínica**`,
          `4️⃣ 💰 **Registrar pagamento**`,
          `5️⃣ 📆 **Agendar retorno**`,
          `6️⃣ 📧 **Enviar e-mail de boas-vindas**`,
          `7️⃣ 📋 **Voltar para a lista de pacientes**`,
          ``,
          `👉 *Você pode responder com o número da opção, clicar no botão correspondente ou simplesmente dizer o que deseja fazer.*`
        ].join('\n');

        return {
          text: successText,
          executeImmediately: {
            type: 'add_patient',
            payload: {
              name: data.name,
              phone: data.phone || '',
              email: data.email || '',
              city: data.city || '',
              state: data.state || '',
              sessionPrice: finalPrice,
              cpf: data.cpf || '',
              emergencyContact: data.emergencyContact || '',
              notes: data.notes || '',
              status: 'active'
            }
          },
          nextInProgressState: {
            type: 'post_registration_options',
            data: {
              patientName: data.name,
              patientPhone: data.phone || '',
              patientEmail: data.email || '',
              patientCity: data.city || '',
              sessionPrice: finalPrice,
              cpf: data.cpf || ''
            }
          }
        };
      } else if (confirmIntent === 'cancel') {
        return {
          text: `Entendido! Cadastro de **${data.name || 'paciente'}** cancelado. ${PromptManager.getRandomFollowUp()}`,
          nextInProgressState: null
        };
      } else {
        // Edit / Correction intent
        let updatedAny = false;
        const extraExtracted = EntityExtractor.extractEntities(rawPrompt);

        if (extraExtracted.phone) {
          data.phone = extraExtracted.phone;
          updatedAny = true;
        }
        if (extraExtracted.email) {
          data.email = extraExtracted.email;
          updatedAny = true;
        }
        if (extraExtracted.sessionPrice !== undefined) {
          data.sessionPrice = extraExtracted.sessionPrice;
          updatedAny = true;
        }
        if (extraExtracted.cpf) {
          data.cpf = extraExtracted.cpf;
          updatedAny = true;
        }
        if (extraExtracted.city) {
          data.city = EntityExtractor.formatSmartCapitalization(extraExtracted.city);
          data.state = extraExtracted.state || data.state;
          updatedAny = true;
        }

        // Emergency contact check in edit prompt
        if (rawPrompt.toLowerCase().includes('emerg')) {
          const details = EntityExtractor.parseEmergencyContactDetails(rawPrompt);
          data.emergencyContactName = details.name;
          data.emergencyContactPhone = details.phone;
          data.emergencyContact = details.name !== 'Não informado' && details.phone !== 'Não informado'
            ? `${details.name} - ${details.phone}`
            : (details.phone !== 'Não informado' ? details.phone : details.name);
          updatedAny = true;
        }

        if (updatedAny) {
          return {
            text: `✅ **Informação atualizada!** Confira o novo resumo de **${data.name}**:\n\n` + PromptManager.buildPatientSummary(data),
            nextInProgressState: { type: 'add_patient_wizard', step: 'awaiting_confirmation', data }
          };
        }

        return {
          text: `Entendido! O que você gostaria de alterar no cadastro de **${data.name}**?\n\n- Para alterar o **telefone**: informe o novo número\n- Para alterar o **e-mail**: informe o novo e-mail\n- Para alterar o **valor**: informe o novo valor da sessão\n- Para alterar a **cidade**: informe a nova cidade\n- Para alterar o **contato de emergência**: informe o nome e telefone\n\n*(ou responda **confirmar** para salvar os dados atuais)*`,
          nextInProgressState: { type: 'add_patient_wizard', step: 'awaiting_confirmation', data }
        };
      }
    }

    return {
      text: PromptManager.getRandomFollowUp(),
      nextInProgressState: null
    };
  }
}
