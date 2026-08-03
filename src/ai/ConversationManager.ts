import { IntentClassifier } from './IntentClassifier';
import { EntityExtractor } from './EntityExtractor';
import { PromptManager } from './PromptManager';
import { PatientRegistrationFlow } from './PatientRegistrationFlow';
import { AppointmentFlow } from './AppointmentFlow';
import { FinancialFlow } from './FinancialFlow';
import { WorkflowRegistry } from './WorkflowRegistry';
import { ClaraQueryResult, InProgressState, RegistrationWizardData } from './types';
import { Patient, Session, PsychologistProfile } from '../types';

export class ConversationManager {
  /**
   * Main entry for processing incoming user prompts through the AI layer
   */
  public static processPrompt(
    rawPrompt: string,
    inProgressState: InProgressState | null | undefined,
    patients: Patient[],
    sessions: Session[],
    profile: PsychologistProfile
  ): ClaraQueryResult {
    const lowerPrompt = rawPrompt.toLowerCase().trim();

    // ----------------------------------------------------
    // 1. ACTIVE STATE MACHINE ROUTING (In-Progress State)
    // ----------------------------------------------------
    if (inProgressState && inProgressState.type && inProgressState.type !== 'IDLE') {
      return ConversationManager.handleActiveState(
        rawPrompt,
        inProgressState,
        patients,
        sessions,
        profile
      );
    }

    // ----------------------------------------------------
    // 2. INTENT CLASSIFICATION
    // ----------------------------------------------------
    const classified = IntentClassifier.classifyIntent(rawPrompt, Boolean(inProgressState));
    const intent = classified.intent;

    // ----------------------------------------------------
    // 3. DISPATCH BY INTENT
    // ----------------------------------------------------
    switch (intent) {
      case 'CUMPRIMENTAR':
        return {
          text: PromptManager.getGreeting(),
          nextInProgressState: null
        };

      case 'AGRADECER':
        return {
          text: PromptManager.getThanksResponse(),
          nextInProgressState: null
        };

      case 'CADASTRAR_PACIENTE': {
        const extracted = EntityExtractor.extractEntities(rawPrompt);
        const data: RegistrationWizardData = {
          name: extracted.name,
          phone: extracted.phone,
          email: extracted.email,
          city: extracted.city,
          state: extracted.state,
          sessionPrice: extracted.sessionPrice,
          cpf: extracted.cpf,
          emergencyContact: extracted.emergencyContact,
          notes: extracted.notes
        };

        if (!data.name || data.name.length < 2) {
          return {
            text: `Com certeza! Sou a Clara e vou conduzir o cadastro do paciente. 😊\n\nPor favor, informe o **nome completo** do paciente para começarmos:`,
            nextInProgressState: { type: 'add_patient_wizard', step: 'awaiting_name', data: {} }
          };
        }

        // If name extracted has lower confidence (1 word), confirm first
        if (extracted.confidence.name < 0.7 && data.name.trim().split(' ').length < 2) {
          return {
            text: PromptManager.buildNameConfirmationPrompt(data.name),
            nextInProgressState: {
              type: 'add_patient_wizard',
              step: 'awaiting_name_confirmation',
              data
            }
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

      case 'CRIAR_CONSULTA':
        return AppointmentFlow.handleCreateAppointment(rawPrompt, patients, sessions, profile);

      case 'REAGENDAR_CONSULTA':
        return AppointmentFlow.handleRescheduleAppointment(rawPrompt, sessions, patients);

      case 'CANCELAR_CONSULTA':
        return AppointmentFlow.handleCancelAppointment(rawPrompt, sessions, patients);

      case 'CONSULTAR_AGENDA':
        return AppointmentFlow.handleLookupAgenda(sessions);

      case 'CONSULTAR_FINANCEIRO':
        return FinancialFlow.handleFinancialQuery(sessions);

      case 'CONSULTAR_PACIENTES': {
        if (patients.length === 0) {
          return {
            text: `👥 **Lista de Pacientes**\n\nVocê ainda não possui pacientes cadastrados. Deseja cadastrar o primeiro paciente agora?`
          };
        }
        const patientList = patients
          .map(p => `- 👤 **${p.name}** (${p.phone || 'Sem fone'}) - ${p.city ? `${p.city}/${p.state || ''}` : 'Sem cidade'}`)
          .join('\n');
        return {
          text: `👥 **Seus Pacientes Cadastrados (${patients.length})**\n\n${patientList}\n\nVocê pode me pedir para abrir o prontuário de qualquer um deles!`
        };
      }

      case 'CONSULTAR_PRONTUARIOS': {
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

      case 'EDITAR_PACIENTE': {
        const matches = patients.filter(p => lowerPrompt.includes(p.name.toLowerCase()));
        const matchedP = matches.length === 1 ? matches[0] : patients.find(p => lowerPrompt.includes(p.name.split(' ')[0].toLowerCase()));

        if (!matchedP) {
          return {
            text: `Qual é o paciente que você deseja alterar? Por favor informe o nome do paciente:`,
            nextInProgressState: { type: 'AGUARDANDO_PACIENTE_EDICAO' }
          };
        }

        const extracted = EntityExtractor.extractEntities(rawPrompt);
        const updates: any = {};
        if (extracted.phone) updates.phone = extracted.phone;
        if (extracted.email) updates.email = extracted.email;
        if (extracted.sessionPrice) updates.sessionPrice = extracted.sessionPrice;
        if (extracted.city) updates.city = extracted.city;
        if (extracted.state) updates.state = extracted.state;

        if (Object.keys(updates).length === 0) {
          return {
            text: `Qual informação você deseja atualizar no cadastro de **${matchedP.name}**?\n*(ex: "Alterar telefone de ${matchedP.name} para (11) 99999-8888" ou "Mudar valor da sessão para 250")*`,
            nextInProgressState: {
              type: 'AGUARDANDO_NOVO_VALOR',
              data: { patientId: matchedP.id, patientName: matchedP.name }
            }
          };
        }

        return {
          text: `✏️ **Dados do paciente ${matchedP.name} atualizados com sucesso!**\n\nAs alterações já foram salvas e registradas na auditoria.`,
          executeImmediately: {
            type: 'edit_patient',
            payload: { id: matchedP.id, updates }
          },
          nextInProgressState: null
        };
      }

      case 'ARQUIVAR_PACIENTE': {
        const matchedP = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()) || lowerPrompt.includes(p.name.split(' ')[0].toLowerCase()));
        if (!matchedP) {
          return {
            text: `Qual paciente você deseja arquivar? Por favor informe o nome do paciente:`,
            nextInProgressState: { type: 'AGUARDANDO_PACIENTE_ARQUIVAR' }
          };
        }

        return {
          text: `📦 **Arquivamento de Paciente**\n\nDeseja confirmar o arquivamento de **${matchedP.name}**?\n\n*O paciente será movido para a aba de arquivados e deixará de aparecer entre os ativos. Todos os prontuários e históricos serão 100% preservados.*`,
          pendingAction: {
            id: `arch_${matchedP.id}`,
            type: 'archive_patient',
            title: `Arquivar paciente ${matchedP.name}`,
            description: `Mover ${matchedP.name} para a lista de pacientes arquivados.`,
            patientId: matchedP.id,
            patientName: matchedP.name
          },
          nextInProgressState: {
            type: 'AGUARDANDO_CONFIRMACAO_ARQUIVAR',
            data: { patientId: matchedP.id, patientName: matchedP.name }
          }
        };
      }

      case 'DAR_ALTA_PACIENTE': {
        const matchedP = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()) || lowerPrompt.includes(p.name.split(' ')[0].toLowerCase()));
        if (!matchedP) {
          return {
            text: `Para qual paciente você deseja registrar a alta terapêutica? Por favor informe o nome:`,
            nextInProgressState: { type: 'AGUARDANDO_PACIENTE_ALTA' }
          };
        }

        return {
          text: `🎓 **Alta Terapêutica**\n\nDeseja confirmar o registro de Alta Terapêutica para **${matchedP.name}**?\n\n*Isso sinalizará o encerramento do ciclo terapêutico preservando todo o histórico de sessões e evoluções no sistema.*`,
          pendingAction: {
            id: `disch_${matchedP.id}`,
            type: 'discharge_patient',
            title: `Dar Alta Terapêutica a ${matchedP.name}`,
            description: `Registrar conclusão do tratamento para ${matchedP.name}.`,
            patientId: matchedP.id,
            patientName: matchedP.name
          },
          nextInProgressState: {
            type: 'AGUARDANDO_CONFIRMACAO_ALTA',
            data: { patientId: matchedP.id, patientName: matchedP.name }
          }
        };
      }

      case 'REATIVAR_PACIENTE': {
        const matchedP = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()) || lowerPrompt.includes(p.name.split(' ')[0].toLowerCase()));
        if (!matchedP) {
          return {
            text: `Qual paciente você deseja reativar? Por favor informe o nome do paciente:`,
            nextInProgressState: { type: 'AGUARDANDO_PACIENTE_EDICAO' }
          };
        }

        return {
          text: `🟢 **Reativação de Paciente**\n\nPaciente **${matchedP.name}** reativado(a) com sucesso! Voltará a ser exibido(a) na lista de pacientes ativos.`,
          executeImmediately: {
            type: 'edit_patient',
            payload: { id: matchedP.id, updates: { status: 'ativo' } }
          },
          nextInProgressState: null
        };
      }

      case 'EXCLUIR_PACIENTE': {
        const matchedP = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()) || lowerPrompt.includes(p.name.split(' ')[0].toLowerCase()));
        if (!matchedP) {
          return {
            text: `Qual paciente você deseja remover do sistema? Por favor informe o nome do paciente:`,
            nextInProgressState: {
              type: 'AGUARDANDO_PACIENTE_EXCLUSAO',
              startedAt: Date.now(),
              lastInteraction: Date.now()
            }
          };
        }

        return {
          text: `⚠️ **Exclusão Permanente**\n\nVocê está prestes a excluir permanentemente:\n\n👤 **${matchedP.name}**\n\nEsta ação removerá definitivamente:\n• Cadastro do paciente\n• Prontuários\n• Evoluções clínicas\n• Consultas\n• Histórico financeiro\n• Agendamentos\n• Arquivos relacionados\n\nEsta ação **NÃO** poderá ser desfeita.\n\n💡 **Recomendação:**\nCaso queira apenas retirar o paciente da lista de ativos, utilize a opção **Arquivar**, preservando todo o histórico.\n\nPara confirmar a exclusão permanente, digite exatamente:\n**EXCLUIR ${matchedP.name.toUpperCase()}**`,
          nextInProgressState: {
            type: 'AGUARDANDO_CONFIRMACAO_EXCLUSAO',
            data: { patientId: matchedP.id, patientName: matchedP.name },
            startedAt: Date.now(),
            lastInteraction: Date.now()
          }
        };
      }

      case 'CONVERSAR_NORMALMENTE':
      default: {
        // Clinical / general Q&A responses
        if (lowerPrompt.includes('falta') || lowerPrompt.includes('falta de compar') || lowerPrompt.includes('desmarcou em cima')) {
          return {
            text: `💡 **Orientação Clara:** Quando o paciente falta sem aviso prévio ou desmarca de última hora, é recomendado registrar a falta na ficha do paciente e manter o valor cobrado conforme seu contrato terapêutico/acordo inicial.`
          };
        }

        if (lowerPrompt.includes('reajuste') || lowerPrompt.includes('aumentar o valor') || lowerPrompt.includes('cobrar mais')) {
          return {
            text: `💡 **Orientação Clara:** O reajuste do valor de sessão é comum anualmente. Recomenda-se avisar com 30 dias de antecedência para alinhar as expectativas com o paciente.`
          };
        }

        return {
          text: `Entendi! Como sua assistente do consultório, posso te ajudar a **cadastrar pacientes**, **agendar ou remarcar consultas**, **consultar seu financeiro** e **abrir prontuários**. Como deseja prosseguir?`
        };
      }
    }
  }

  /**
   * Active state machine router.
   * Ensures that when a conversation state is active, the prompt is processed directly
   * as the response for that state WITHOUT re-running intent classification.
   */
  public static handleActiveState(
    rawPrompt: string,
    inProgressState: InProgressState,
    patients: Patient[],
    sessions: Session[],
    profile: PsychologistProfile
  ): ClaraQueryResult {
    const lowerPrompt = rawPrompt.toLowerCase().trim();
    const type = inProgressState.type;
    const now = Date.now();
    const fifteenMinutesMs = 15 * 60 * 1000;

    // 1. Global cancel check (all keywords specified in requirement)
    const isCancelKeyword =
      lowerPrompt === 'cancelar' || lowerPrompt === 'parar' || lowerPrompt === 'esquecer' ||
      lowerPrompt === 'voltar' || lowerPrompt === 'começar novamente' || lowerPrompt === 'comecar novamente' ||
      lowerPrompt === 'encerrar' || lowerPrompt === 'desistir' || lowerPrompt === 'sair' ||
      lowerPrompt === 'reiniciar';

    if (isCancelKeyword) {
      return {
        text: `❌ **Operação cancelada.** O fluxo foi interrompido e a conversa voltou ao estado inicial. Como posso te ajudar agora?`,
        nextInProgressState: null // Reset to IDLE
      };
    }

    // 2. Timeout Check (15 minutes of inactivity)
    if (inProgressState.lastInteraction && (now - inProgressState.lastInteraction > fifteenMinutesMs)) {
      if (type === 'TIMEOUT_INTERRUPTED') {
        if (
          lowerPrompt === 'sim' || lowerPrompt === 's' || lowerPrompt.includes('continuar') || lowerPrompt === '1'
        ) {
          const restoredType = inProgressState.data?.previousType || 'IDLE';
          inProgressState = {
            ...inProgressState,
            type: restoredType,
            lastInteraction: now
          };
        } else {
          return {
            text: `Entendido! Cancelei o fluxo anterior. Como posso te ajudar agora?`,
            nextInProgressState: null // IDLE
          };
        }
      } else {
        return {
          text: `⏱️ **Percebi que nossa conversa ficou interrompida.** Deseja continuar de onde paramos ou iniciar uma nova tarefa?\n\n*(Responda **continuar** para prosseguir de onde paramos ou **nova tarefa / cancelar** para reiniciar)*`,
          nextInProgressState: {
            type: 'TIMEOUT_INTERRUPTED',
            data: { previousType: type, previousData: inProgressState.data },
            startedAt: inProgressState.startedAt || now,
            lastInteraction: now
          }
        };
      }
    }

    // 3. Operational Workflow Engine states
    if (type === 'WORKFLOW_AGENDAMENTO' || type === 'AGENDANDO_CONSULTA') {
      return WorkflowRegistry.handleAgendamentoWorkflow(
        rawPrompt,
        inProgressState.data,
        patients,
        sessions,
        profile
      );
    }

    if (type === 'WORKFLOW_PAGAMENTO' || type === 'REGISTRANDO_PAGAMENTO') {
      return WorkflowRegistry.handlePagamentoWorkflow(
        rawPrompt,
        inProgressState.data,
        patients,
        sessions
      );
    }

    if (type === 'WORKFLOW_EVOLUCAO' || type === 'REGISTRANDO_EVOLUCAO' || type === 'CRIANDO_PRONTUARIO') {
      return WorkflowRegistry.handleEvolucaoWorkflow(
        rawPrompt,
        inProgressState.data,
        patients,
        sessions
      );
    }

    if (type === 'WORKFLOW_REAGENDAMENTO' || type === 'REMARCANDO_CONSULTA') {
      return WorkflowRegistry.handleReagendamentoWorkflow(
        rawPrompt,
        inProgressState.data,
        patients,
        sessions
      );
    }

    if (type === 'WORKFLOW_CANCELAMENTO' || type === 'CANCELANDO_CONSULTA') {
      return WorkflowRegistry.handleCancelamentoWorkflow(
        rawPrompt,
        inProgressState.data,
        patients,
        sessions
      );
    }

    if (type === 'WORKFLOW_EXCLUSAO_PACIENTE' || type === 'EXCLUINDO_PACIENTE') {
      return WorkflowRegistry.handleExclusaoPacienteWorkflow(
        rawPrompt,
        inProgressState.data,
        patients
      );
    }

    // 4. Patient Registration Wizard states
    if (
      type === 'add_patient_wizard' ||
      type === 'CADASTRANDO_PACIENTE' ||
      type === 'AGUARDANDO_NOME_PACIENTE' ||
      type === 'AGUARDANDO_TELEFONE' ||
      type === 'AGUARDANDO_EMAIL' ||
      type === 'AGUARDANDO_CPF' ||
      type === 'AGUARDANDO_CONTATO_EMERGENCIA' ||
      type === 'AGUARDANDO_OBSERVACOES' ||
      type === 'AGUARDANDO_CONFIRMACAO'
    ) {
      return PatientRegistrationFlow.handleWizardInput(rawPrompt, inProgressState);
    }

    // 5a. Post scheduling options & sub-states (POS_AGENDAMENTO)
    if (type === 'POS_AGENDAMENTO') {
      const patientName = inProgressState.data?.patientName || 'o paciente';
      const patientId = inProgressState.data?.patientId;
      const sessionPrice = inProgressState.data?.sessionPrice || 150;

      // Option 1: Abrir prontuário
      if (
        lowerPrompt === '1' || lowerPrompt === '1️⃣' ||
        lowerPrompt.includes('prontuário') || lowerPrompt.includes('prontuario') ||
        lowerPrompt.includes('abrir') || lowerPrompt.includes('ficha')
      ) {
        return {
          text: `📂 **Abrindo o prontuário de ${patientName}...**\n\nVocê foi direcionado para a ficha clínica com todo o histórico de sessões e evoluções.\n\nO que gostaria de fazer a seguir?\n\n1️⃣ 📂 **Abrir prontuário**\n2️⃣ 📝 **Registrar evolução clínica**\n3️⃣ 📧 **Enviar confirmação ao paciente**\n4️⃣ 📋 **Voltar para Agenda**\n5️⃣ 📅 **Agendar próxima consulta**`,
          executeImmediately: {
            type: 'open_prontuario',
            payload: { patientName }
          },
          nextInProgressState: {
            type: 'POS_AGENDAMENTO',
            data: inProgressState.data
          }
        };
      }

      // Option 2: Registrar evolução clínica
      if (
        lowerPrompt === '2' || lowerPrompt === '2️⃣' ||
        lowerPrompt.includes('evolução') || lowerPrompt.includes('evolucao') ||
        lowerPrompt.includes('anotação') || lowerPrompt.includes('anotacao')
      ) {
        const matchedP = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
        return WorkflowRegistry.handleEvolucaoWorkflow(
          rawPrompt,
          {
            patientId: matchedP?.id || patientId,
            patientName
          },
          patients,
          sessions
        );
      }

      // Option 3: Enviar confirmação ao paciente
      if (
        lowerPrompt === '3' || lowerPrompt === '3️⃣' ||
        lowerPrompt.includes('confirmação') || lowerPrompt.includes('confirmacao') ||
        lowerPrompt.includes('enviar') || lowerPrompt.includes('email') || lowerPrompt.includes('e-mail')
      ) {
        const matchedP = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
        const patientEmail = matchedP?.email || '';
        return {
          text: `📧 **Confirmação enviada com sucesso para ${patientName}!**\n\nOs detalhes da consulta agendada foram encaminhados.\n\nO que gostaria de fazer a seguir?\n\n1️⃣ 📂 **Abrir prontuário**\n2️⃣ 📝 **Registrar evolução clínica**\n3️⃣ 📧 **Enviar confirmação ao paciente**\n4️⃣ 📋 **Voltar para Agenda**\n5️⃣ 📅 **Agendar próxima consulta**`,
          executeImmediately: {
            type: 'send_email',
            payload: { email: patientEmail, patientName }
          },
          nextInProgressState: {
            type: 'POS_AGENDAMENTO',
            data: inProgressState.data
          }
        };
      }

      // Option 4: Voltar para Agenda
      if (
        lowerPrompt === '4' || lowerPrompt === '4️⃣' ||
        lowerPrompt.includes('voltar') || lowerPrompt.includes('agenda')
      ) {
        return {
          text: `📋 **Retornando à Agenda.**\n\nSua visão geral de compromissos e horários foi atualizada. Como posso te ajudar agora?`,
          executeImmediately: {
            type: 'open_schedule',
            payload: {}
          },
          nextInProgressState: null // IDLE
        };
      }

      // Option 5: Agendar próxima consulta
      if (
        lowerPrompt === '5' || lowerPrompt === '5️⃣' ||
        lowerPrompt.includes('próxima') || lowerPrompt.includes('proxima') ||
        lowerPrompt.includes('agendar') || lowerPrompt.includes('retorno')
      ) {
        const matchedP = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
        return WorkflowRegistry.handleAgendamentoWorkflow(
          rawPrompt,
          {
            patientId: matchedP?.id || patientId,
            patientName,
            defaultPrice: sessionPrice || matchedP?.sessionPrice
          },
          patients,
          sessions,
          profile
        );
      }

      // Negative / cancel / finish
      if (
        lowerPrompt === 'nao' || lowerPrompt === 'não' || lowerPrompt === 'n' ||
        lowerPrompt.includes('não obrigado') || lowerPrompt.includes('nao obrigado') ||
        lowerPrompt.includes('só isso') || lowerPrompt.includes('so isso') ||
        lowerPrompt.includes('nada mais') || lowerPrompt.includes('finalizar')
      ) {
        return {
          text: `Perfeito! O agendamento está concluído. Como posso te ajudar agora?`,
          nextInProgressState: null
        };
      }
    }

    // 5b. Post registration options & sub-states (POS_CADASTRO)
    if (type === 'post_registration_options' || type === 'POS_CADASTRO' || type === 'open_prontuario_after_add') {
      const patientName = inProgressState.data?.patientName || 'o paciente';
      const patientPhone = inProgressState.data?.patientPhone || '';
      const patientEmail = inProgressState.data?.patientEmail || '';
      const sessionPrice = inProgressState.data?.sessionPrice || 150;

      // Option 1: Agendar primeira consulta
      if (
        lowerPrompt === '1' || lowerPrompt === '1️⃣' ||
        lowerPrompt.includes('agendar primeira') || lowerPrompt.includes('primeira consulta') ||
        lowerPrompt.includes('marcar consulta') || (lowerPrompt.includes('agendar') && !lowerPrompt.includes('retorno')) ||
        lowerPrompt.includes('1ª consulta')
      ) {
        const matchedP = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
        return WorkflowRegistry.handleAgendamentoWorkflow(
          rawPrompt,
          {
            patientId: matchedP?.id,
            patientName,
            defaultPrice: sessionPrice || matchedP?.sessionPrice
          },
          patients,
          sessions,
          profile
        );
      }

      // Option 2: Abrir prontuário
      if (
        lowerPrompt === '2' || lowerPrompt === '2️⃣' ||
        lowerPrompt.includes('prontuário') || lowerPrompt.includes('prontuario') ||
        (lowerPrompt.includes('abrir') && !lowerPrompt.includes('lista')) ||
        lowerPrompt.includes('ficha')
      ) {
        return {
          text: `📂 **Abrindo o prontuário de ${patientName}...**\n\nVocê foi direcionado para a ficha clínica com todo o histórico de sessões e evoluções.\n\nDeseja realizar mais alguma ação com **${patientName}**?\n\n1️⃣ 📅 **Agendar primeira consulta**\n2️⃣ 📂 **Abrir prontuário**\n3️⃣ 📝 **Registrar evolução clínica**\n4️⃣ 💰 **Registrar pagamento**\n5️⃣ 📆 **Agendar retorno**\n6️⃣ 📧 **Enviar e-mail de boas-vindas**\n7️⃣ 📋 **Voltar para a lista de pacientes**`,
          executeImmediately: {
            type: 'open_prontuario',
            payload: { patientName }
          },
          nextInProgressState: {
            type: 'POS_CADASTRO',
            data: inProgressState.data
          }
        };
      }

      // Option 3: Registrar evolução clínica
      if (
        lowerPrompt === '3' || lowerPrompt === '3️⃣' ||
        lowerPrompt.includes('evolução') || lowerPrompt.includes('evolucao') ||
        lowerPrompt.includes('anotação') || lowerPrompt.includes('anotacao')
      ) {
        const matchedP = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
        return WorkflowRegistry.handleEvolucaoWorkflow(
          rawPrompt,
          {
            patientId: matchedP?.id,
            patientName
          },
          patients,
          sessions
        );
      }

      // Option 4: Registrar pagamento
      if (
        lowerPrompt === '4' || lowerPrompt === '4️⃣' ||
        lowerPrompt.includes('pagamento') || lowerPrompt.includes('registrar pagamento') ||
        lowerPrompt.includes('financeiro') || lowerPrompt.includes('cobrar')
      ) {
        const matchedP = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
        return WorkflowRegistry.handlePagamentoWorkflow(
          rawPrompt,
          {
            patientId: matchedP?.id,
            patientName,
            defaultPrice: sessionPrice || matchedP?.sessionPrice
          },
          patients,
          sessions
        );
      }

      // Option 5: Agendar retorno
      if (
        lowerPrompt === '5' || lowerPrompt === '5️⃣' ||
        lowerPrompt.includes('retorno') || lowerPrompt.includes('agendar retorno')
      ) {
        const matchedP = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
        return WorkflowRegistry.handleAgendamentoWorkflow(
          rawPrompt,
          {
            patientId: matchedP?.id,
            patientName,
            defaultPrice: sessionPrice || matchedP?.sessionPrice
          },
          patients,
          sessions,
          profile
        );
      }

      // Option 6: Enviar e-mail de boas-vindas
      if (
        lowerPrompt === '6' || lowerPrompt === '6️⃣' ||
        lowerPrompt.includes('email') || lowerPrompt.includes('e-mail') ||
        lowerPrompt.includes('boas-vindas') || lowerPrompt.includes('boas vindas')
      ) {
        if (patientEmail && patientEmail.trim().length > 3) {
          return {
            text: `📧 **E-mail de boas-vindas enviado com sucesso para ${patientEmail}!**\n\nO paciente **${patientName}** recebeu a mensagem oficial de boas-vindas do consultório via Resend.\n\nDeseja realizar mais alguma ação com **${patientName}**?\n\n1️⃣ 📅 **Agendar primeira consulta**\n2️⃣ 📂 **Abrir prontuário**\n3️⃣ 📝 **Registrar evolução clínica**\n4️⃣ 💰 **Registrar pagamento**\n5️⃣ 📆 **Agendar retorno**\n6️⃣ 📧 **Enviar e-mail de boas-vindas**\n7️⃣ 📋 **Voltar para a lista de pacientes**`,
            executeImmediately: {
              type: 'send_email',
              payload: { email: patientEmail, patientName }
            },
            nextInProgressState: {
              type: 'POS_CADASTRO',
              data: inProgressState.data
            }
          };
        } else {
          return {
            text: `Para enviar o e-mail de boas-vindas, por favor informe o **e-mail** de **${patientName}**:`,
            nextInProgressState: {
              type: 'AGUARDANDO_EMAIL_ENVIAR_BOAS_VINDAS',
              data: inProgressState.data
            }
          };
        }
      }

      // Option 7: Voltar para a lista
      if (
        lowerPrompt === '7' || lowerPrompt === '7️⃣' ||
        lowerPrompt.includes('voltar') || lowerPrompt.includes('lista') ||
        lowerPrompt.includes('mostrar pacientes')
      ) {
        return {
          text: `📋 **Retornando à lista de pacientes.**\n\nDirecionando você para a visualização da lista completa de pacientes. Como posso te ajudar agora?`,
          executeImmediately: {
            type: 'open_patients_list',
            payload: {}
          },
          nextInProgressState: null // IDLE / MENU_PRINCIPAL
        };
      }

      // Negative/Finish response -> Return to MENU_PRINCIPAL
      if (
        lowerPrompt === 'nao' || lowerPrompt === 'não' || lowerPrompt === 'n' ||
        lowerPrompt.includes('não obrigado') || lowerPrompt.includes('nao obrigado') ||
        lowerPrompt.includes('só isso') || lowerPrompt.includes('so isso') ||
        lowerPrompt.includes('nada mais') || lowerPrompt.includes('finalizar') ||
        lowerPrompt.includes('encerrar')
      ) {
        return {
          text: `Perfeito! O cadastro e registros de **${patientName}** estão preservados com segurança. Como posso te ajudar agora?`,
          nextInProgressState: null // Return to MENU_PRINCIPAL
        };
      }

      // Unlisted fallback: Enviar mensagem de WhatsApp (if explicitly requested)
      if (
        lowerPrompt === '8' || lowerPrompt === '8️⃣' ||
        lowerPrompt.includes('whatsapp') || lowerPrompt.includes('zap') ||
        lowerPrompt.includes('mensagem de whatsapp')
      ) {
        if (patientPhone && patientPhone.trim().length > 5) {
          const cleanPhone = patientPhone.replace(/\D/g, '');
          const welcomeMsg = `Olá ${patientName}, seja bem-vindo(a) ao consultório! Estou à disposição para dúvidas e agendamentos.`;
          const waLink = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(welcomeMsg)}`;

          return {
            text: `📱 **Mensagem de boas-vindas de WhatsApp gerada para ${patientName}!**\n\nClique no link abaixo para abrir a conversa no WhatsApp:\n👉 [**Abrir conversa com ${patientName} no WhatsApp**](${waLink})\n\nDeseja realizar mais alguma ação com **${patientName}**?\n\n1️⃣ 📅 **Agendar primeira consulta**\n2️⃣ 📂 **Abrir prontuário**\n3️⃣ 📝 **Registrar evolução clínica**\n4️⃣ 💰 **Registrar pagamento**\n5️⃣ 📋 **Voltar para a lista de pacientes**`,
            executeImmediately: {
              type: 'send_whatsapp',
              payload: { patientName, phone: patientPhone }
            },
            nextInProgressState: {
              type: 'post_registration_options',
              data: inProgressState.data
            }
          };
        } else {
          return {
            text: `Por favor, informe o número de **WhatsApp** de **${patientName}** (com DDD):`,
            nextInProgressState: {
              type: 'AGUARDANDO_WHATSAPP_BOAS_VINDAS',
              data: inProgressState.data
            }
          };
        }
      }

      return {
        text: `**O que posso fazer neste momento para ${patientName}:**\n\n1️⃣ 📅 **Agendar primeira consulta**\n2️⃣ 📂 **Abrir prontuário**\n3️⃣ 📝 **Registrar evolução clínica**\n4️⃣ 💰 **Registrar pagamento**\n5️⃣ 📆 **Agendar retorno**\n6️⃣ 📧 **Enviar e-mail de boas-vindas**\n7️⃣ 📋 **Voltar para a lista de pacientes**\n\n👉 *Você pode responder com o número da opção, clicar no botão correspondente ou simplesmente dizer o que deseja fazer.*`,
        nextInProgressState: inProgressState
      };
    }

    // Sub-state: AGUARDANDO_VALOR_PAGAMENTO
    if (type === 'AGUARDANDO_VALOR_PAGAMENTO') {
      const patientName = inProgressState.data?.patientName || 'o paciente';
      const sessionPrice = inProgressState.data?.sessionPrice || 150;

      let amount = sessionPrice;
      if (lowerPrompt !== 'confirmar' && lowerPrompt !== 'ok' && lowerPrompt !== 'sim' && lowerPrompt !== 's') {
        const numMatch = rawPrompt.match(/\d+(?:[.,]\d{1,2})?/);
        if (numMatch) {
          amount = parseFloat(numMatch[0].replace(',', '.'));
        }
      }

      return {
        text: `💰 **Pagamento de R$ ${amount.toFixed(2).replace('.', ',')} registrado com sucesso para ${patientName}!**\n\nO lançamento financeiro foi gravado no histórico do paciente.\n\nDeseja realizar mais alguma ação com **${patientName}**?\n\n1️⃣ 📂 **Abrir prontuário**\n2️⃣ 📅 **Agendar primeira consulta**\n3️⃣ 📝 **Registrar evolução clínica**\n4️⃣ 📋 **Voltar para a lista de pacientes**`,
        executeImmediately: {
          type: 'mark_paid',
          payload: { patientName, amount }
        },
        nextInProgressState: {
          type: 'post_registration_options',
          data: inProgressState.data
        }
      };
    }

    // Sub-state: AGUARDANDO_TEXTO_EVOLUCAO
    if (type === 'AGUARDANDO_TEXTO_EVOLUCAO') {
      const patientName = inProgressState.data?.patientName || 'o paciente';

      return {
        text: `📝 **Evolução clínica registrada com sucesso para ${patientName}!**\n\nA anotação foi anexada ao prontuário do paciente.\n\nDeseja realizar mais alguma ação com **${patientName}**?\n\n1️⃣ 📂 **Abrir prontuário**\n2️⃣ 📅 **Agendar primeira consulta**\n3️⃣ 💰 **Registrar pagamento**\n4️⃣ 📋 **Voltar para a lista de pacientes**`,
        executeImmediately: {
          type: 'create_clinical_note',
          payload: { patientName, notes: rawPrompt.trim() }
        },
        nextInProgressState: {
          type: 'post_registration_options',
          data: inProgressState.data
        }
      };
    }

    // Sub-state: AGUARDANDO_EMAIL_ENVIAR_BOAS_VINDAS
    if (type === 'AGUARDANDO_EMAIL_ENVIAR_BOAS_VINDAS') {
      const patientName = inProgressState.data?.patientName || 'o paciente';
      const email = rawPrompt.trim().toLowerCase();

      if (!EntityExtractor.validateEmail(email)) {
        return {
          text: `O e-mail (*"${rawPrompt}"*) não é válido. Por favor digite um e-mail válido (ex: **paciente@email.com**) ou digite **cancelar**:`,
          nextInProgressState: inProgressState
        };
      }

      const updatedData = { ...inProgressState.data, patientEmail: email };

      return {
        text: `📧 **E-mail de boas-vindas enviado com sucesso para ${email}!**\n\nO cadastro de **${patientName}** foi atualizado com este e-mail.\n\nDeseja realizar mais alguma ação com **${patientName}**?\n\n1️⃣ 📂 **Abrir prontuário**\n2️⃣ 📅 **Agendar primeira consulta**\n3️⃣ 💰 **Registrar pagamento**\n4️⃣ 📋 **Voltar para a lista de pacientes**`,
        executeImmediately: {
          type: 'send_email',
          payload: { email, patientName }
        },
        nextInProgressState: {
          type: 'post_registration_options',
          data: updatedData
        }
      };
    }

    // Sub-state: AGUARDANDO_WHATSAPP_BOAS_VINDAS
    if (type === 'AGUARDANDO_WHATSAPP_BOAS_VINDAS') {
      const patientName = inProgressState.data?.patientName || 'o paciente';
      const phoneRes = EntityExtractor.validateAndFormatPhone(rawPrompt);

      if (!phoneRes.isValid) {
        return {
          text: `O número (*"${rawPrompt}"*) não é válido. Informe o telefone com DDD (ex: **(11) 99999-8888**) ou digite **cancelar**:`,
          nextInProgressState: inProgressState
        };
      }

      const cleanPhone = phoneRes.formatted.replace(/\D/g, '');
      const welcomeMsg = `Olá ${patientName}, seja bem-vindo(a) ao consultório! Estou à disposição para dúvidas e agendamentos.`;
      const waLink = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(welcomeMsg)}`;
      const updatedData = { ...inProgressState.data, patientPhone: phoneRes.formatted };

      return {
        text: `📱 **Mensagem de WhatsApp gerada para ${patientName}!**\n\nClique para abrir:\n👉 [**Abrir conversa no WhatsApp**](${waLink})\n\nDeseja realizar mais alguma ação com **${patientName}**?\n\n1️⃣ 📂 **Abrir prontuário**\n2️⃣ 📅 **Agendar primeira consulta**\n3️⃣ 💰 **Registrar pagamento**\n4️⃣ 📋 **Voltar para a lista de pacientes**`,
        executeImmediately: {
          type: 'send_whatsapp',
          payload: { patientName, phone: phoneRes.formatted }
        },
        nextInProgressState: {
          type: 'post_registration_options',
          data: updatedData
        }
      };
    }

    // 5. State: AGUARDANDO_PACIENTE_EXCLUSAO
    if (type === 'AGUARDANDO_PACIENTE_EXCLUSAO') {
      const matchedP = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()) || lowerPrompt.includes(p.name.split(' ')[0].toLowerCase())) ||
                       patients.find(p => p.name.toLowerCase().includes(lowerPrompt));

      if (!matchedP) {
        return {
          text: `Não encontrei nenhum paciente cadastrado com o nome **"${rawPrompt}"**.\n\nPor favor, informe o nome exato do paciente que deseja remover (ou digite **cancelar**):`,
          nextInProgressState: { type: 'AGUARDANDO_PACIENTE_EXCLUSAO' }
        };
      }

      return {
        text: `⚠️ **Exclusão Permanente**\n\nVocê está prestes a excluir permanentemente:\n\n👤 **${matchedP.name}**\n\nEsta ação removerá definitivamente:\n• Cadastro do paciente\n• Prontuários\n• Evoluções clínicas\n• Consultas\n• Histórico financeiro\n• Agendamentos\n• Arquivos relacionados\n\nEsta ação **NÃO** poderá ser desfeita.\n\n💡 **Recomendação:**\nCaso queira apenas retirar o paciente da lista de ativos, utilize a opção **Arquivar**, preservando todo o histórico.\n\nPara confirmar a exclusão permanente, digite exatamente:\n**EXCLUIR ${matchedP.name.toUpperCase()}**`,
        nextInProgressState: {
          type: 'AGUARDANDO_CONFIRMACAO_EXCLUSAO',
          data: { patientId: matchedP.id, patientName: matchedP.name }
        }
      };
    }

    // 6. State: AGUARDANDO_TIPO_EXCLUSAO
    if (type === 'AGUARDANDO_TIPO_EXCLUSAO') {
      const patientId = inProgressState.data?.patientId;
      const patientName = inProgressState.data?.patientName || 'o paciente';

      // 1. Arquivar
      if (
        lowerPrompt === '1' || lowerPrompt === '1️⃣' || lowerPrompt.includes('arquivar') || lowerPrompt.includes('box')
      ) {
        return {
          text: `📦 **Arquivamento de Paciente**\n\nO paciente **${patientName}** será movido para os arquivados e deixará de aparecer na lista de ativos, mantendo todo o histórico seguro.\n\nConfirmar o arquivamento de **${patientName}**? *(Sim / Não)*`,
          nextInProgressState: {
            type: 'AGUARDANDO_CONFIRMACAO_ARQUIVAR',
            data: { patientId, patientName }
          }
        };
      }

      // 2. Dar Alta
      if (
        lowerPrompt === '2' || lowerPrompt === '2️⃣' || lowerPrompt.includes('alta') || lowerPrompt.includes('concluir')
      ) {
        return {
          text: `🎓 **Alta Terapêutica**\n\nDeseja registrar Alta Terapêutica para **${patientName}**?\n\n*Isso sinalizará o encerramento do tratamento com preservação total de fichas e prontuários.* *(Sim / Não)*`,
          nextInProgressState: {
            type: 'AGUARDANDO_CONFIRMACAO_ALTA',
            data: { patientId, patientName }
          }
        };
      }

      // 3. Excluir permanentemente
      if (
        lowerPrompt === '3' || lowerPrompt === '3️⃣' || lowerPrompt.includes('excluir') || lowerPrompt.includes('remover') || lowerPrompt.includes('permanentemente')
      ) {
        return {
          text: `⚠️ **Exclusão Permanente**\n\nVocê está prestes a excluir permanentemente:\n\n👤 **${patientName}**\n\nEsta ação removerá definitivamente:\n• Cadastro do paciente\n• Prontuários\n• Evoluções clínicas\n• Consultas\n• Histórico financeiro\n• Agendamentos\n• Arquivos relacionados\n\nEsta ação **NÃO** poderá ser desfeita.\n\n💡 **Recomendação:**\nCaso queira apenas retirar o paciente da lista de ativos, utilize a opção **Arquivar**, preservando todo o histórico.\n\nPara confirmar a exclusão permanente, digite exatamente:\n**EXCLUIR ${patientName.toUpperCase()}**`,
          nextInProgressState: {
            type: 'AGUARDANDO_CONFIRMACAO_EXCLUSAO',
            data: { patientId, patientName }
          }
        };
      }

      return {
        text: `Opção não reconhecida. Para **${patientName}**, por favor responda:\n\n1️⃣ **Arquivar**\n2️⃣ **Dar Alta**\n3️⃣ **Excluir Permanentemente**\n\nou digite **cancelar**.`,
        nextInProgressState: inProgressState
      };
    }

    // 7. State: AGUARDANDO_CONFIRMACAO_EXCLUSAO
    if (type === 'AGUARDANDO_CONFIRMACAO_EXCLUSAO') {
      const patientId = inProgressState.data?.patientId;
      const patientName = inProgressState.data?.patientName || 'o paciente';

      // Normalize strings for exact comparison
      const normalizeForComp = (str: string) => {
        return str
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase()
          .replace(/[^\w\s]/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const requiredConfirmation = normalizeForComp(`EXCLUIR ${patientName}`);
      const userTyped = normalizeForComp(rawPrompt);

      // Explicit cancellation keywords
      if (
        lowerPrompt === 'cancelar' || lowerPrompt === 'parar' || lowerPrompt === 'desistir' ||
        lowerPrompt === 'sair' || lowerPrompt === 'voltar' || lowerPrompt === 'não' || lowerPrompt === 'nao'
      ) {
        return {
          text: `❌ **Exclusão cancelada.** O cadastro e prontuário de **${patientName}** permanecem mantidos no sistema. ${PromptManager.getRandomFollowUp()}`,
          nextInProgressState: null // IDLE
        };
      }

      // Exact confirmation match
      if (userTyped === requiredConfirmation) {
        return {
          text: `🗑️ **Paciente ${patientName} excluído com sucesso.**\n\nTodos os registros vinculados foram removidos.\nDashboard atualizado.\nHistórico registrado.\n\nDeseja realizar outra tarefa?`,
          executeImmediately: {
            type: 'delete_patient',
            payload: { id: patientId, patientName }
          },
          nextInProgressState: null // IDLE
        };
      }

      // If user typed anything else (Sim, Confirmar, Ok, or misspelled name) -> REJECT
      return {
        text: `A confirmação digitada não corresponde ao paciente selecionado.\n\nPara confirmar a exclusão permanente de **${patientName}**, você deve digitar exatamente:\n**EXCLUIR ${patientName.toUpperCase()}**\n\n*(ou digite **cancelar** para desistir)*`,
        nextInProgressState: inProgressState // Stay in AGUARDANDO_CONFIRMACAO_EXCLUSAO
      };
    }

    // 6. State: AGUARDANDO_PACIENTE_EDICAO
    if (type === 'AGUARDANDO_PACIENTE_EDICAO') {
      const matchedP = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()) || lowerPrompt.includes(p.name.split(' ')[0].toLowerCase())) ||
                       patients.find(p => p.name.toLowerCase().includes(lowerPrompt));

      if (!matchedP) {
        return {
          text: `Não encontrei nenhum paciente com o nome **"${rawPrompt}"**.\n\nPor favor, informe o nome correto do paciente que deseja alterar (ou digite **cancelar**):`,
          nextInProgressState: { type: 'AGUARDANDO_PACIENTE_EDICAO' }
        };
      }

      const extracted = EntityExtractor.extractEntities(rawPrompt);
      const updates: any = {};
      if (extracted.phone) updates.phone = extracted.phone;
      if (extracted.email) updates.email = extracted.email;
      if (extracted.sessionPrice) updates.sessionPrice = extracted.sessionPrice;
      if (extracted.city) updates.city = extracted.city;
      if (extracted.state) updates.state = extracted.state;

      if (Object.keys(updates).length > 0) {
        return {
          text: `✏️ **Dados do paciente ${matchedP.name} atualizados com sucesso!**\n\nAs alterações já foram salvas na ficha do paciente. ${PromptManager.getRandomFollowUp()}`,
          executeImmediately: {
            type: 'edit_patient',
            payload: { id: matchedP.id, updates }
          },
          nextInProgressState: null // IDLE
        };
      }

      return {
        text: `Qual informação você deseja atualizar no cadastro de **${matchedP.name}**?\n*(ex: "Telefone (11) 98888-7777", "Valor da sessão R$ 200", "E-mail novo@email.com" ou "Cidade São Paulo")*`,
        nextInProgressState: {
          type: 'AGUARDANDO_NOVO_VALOR',
          data: { patientId: matchedP.id, patientName: matchedP.name }
        }
      };
    }

    // 7. State: AGUARDANDO_NOVO_VALOR
    if (type === 'AGUARDANDO_NOVO_VALOR') {
      const patientId = inProgressState.data?.patientId;
      const patientName = inProgressState.data?.patientName || 'paciente';

      const extracted = EntityExtractor.extractEntities(rawPrompt);
      const updates: any = {};
      if (extracted.phone) updates.phone = extracted.phone;
      if (extracted.email) updates.email = extracted.email;
      if (extracted.sessionPrice) updates.sessionPrice = extracted.sessionPrice;
      if (extracted.city) updates.city = extracted.city;
      if (extracted.state) updates.state = extracted.state;

      if (Object.keys(updates).length === 0) {
        if (EntityExtractor.validateEmail(rawPrompt)) {
          updates.email = rawPrompt.trim().toLowerCase();
        } else {
          const phoneRes = EntityExtractor.validateAndFormatPhone(rawPrompt);
          if (phoneRes.isValid) {
            updates.phone = phoneRes.formatted;
          } else {
            const numMatch = rawPrompt.match(/\d+(?:[.,]\d{1,2})?/);
            if (numMatch && (rawPrompt.includes('r$') || rawPrompt.includes('valor') || rawPrompt.includes('preco') || rawPrompt.includes('preço') || !isNaN(Number(rawPrompt.trim())))) {
              updates.sessionPrice = parseFloat(numMatch[0].replace(',', '.'));
            } else if (rawPrompt.length >= 2) {
              updates.city = EntityExtractor.formatSmartCapitalization(rawPrompt);
            }
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        return {
          text: `✏️ **Cadastro de ${patientName} atualizado com sucesso!**\n\nAs alterações já foram salvas e registradas no sistema. ${PromptManager.getRandomFollowUp()}`,
          executeImmediately: {
            type: 'edit_patient',
            payload: { id: patientId, updates }
          },
          nextInProgressState: null // IDLE
        };
      }

      return {
        text: `Não entendi qual dado atualizar em **${patientName}**.\n\nPor favor, digite o novo valor (ex: **(11) 98888-7777**, **200**, **email@servidor.com** ou **São Paulo**) ou digite **cancelar**:`,
        nextInProgressState: inProgressState
      };
    }

    // 8. State: AGUARDANDO_PACIENTE_ARQUIVAR
    if (type === 'AGUARDANDO_PACIENTE_ARQUIVAR') {
      const matchedP = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()) || lowerPrompt.includes(p.name.split(' ')[0].toLowerCase())) ||
                       patients.find(p => p.name.toLowerCase().includes(lowerPrompt));

      if (!matchedP) {
        return {
          text: `Não encontrei nenhum paciente com o nome **"${rawPrompt}"**.\n\nPor favor, informe o nome do paciente que deseja arquivar (ou digite **cancelar**):`,
          nextInProgressState: { type: 'AGUARDANDO_PACIENTE_ARQUIVAR' }
        };
      }

      return {
        text: `📦 **Arquivamento de Paciente**\n\nDeseja confirmar o arquivamento de **${matchedP.name}**?\n\n*O paciente será movido para a aba de arquivados e deixará de aparecer entre os ativos. Todos os prontuários e históricos serão 100% preservados.*`,
        pendingAction: {
          id: `arch_${matchedP.id}`,
          type: 'archive_patient',
          title: `Arquivar paciente ${matchedP.name}`,
          description: `Mover ${matchedP.name} para a lista de pacientes arquivados.`,
          patientId: matchedP.id,
          patientName: matchedP.name
        },
        nextInProgressState: {
          type: 'AGUARDANDO_CONFIRMACAO_ARQUIVAR',
          data: { patientId: matchedP.id, patientName: matchedP.name }
        }
      };
    }

    // 9. State: AGUARDANDO_CONFIRMACAO_ARQUIVAR
    if (type === 'AGUARDANDO_CONFIRMACAO_ARQUIVAR') {
      const patientId = inProgressState.data?.patientId;
      const patientName = inProgressState.data?.patientName || 'paciente';

      const isAffirmative =
        lowerPrompt === 'sim' || lowerPrompt === 's' || lowerPrompt === '1' ||
        lowerPrompt.includes('confirmar') || lowerPrompt.includes('arquivar');

      if (isAffirmative) {
        return {
          text: `📦 **Paciente ${patientName} arquivado(a) com sucesso!**\n\nFoi movido(a) para os arquivados com todo o histórico seguro. ${PromptManager.getRandomFollowUp()}`,
          executeImmediately: {
            type: 'edit_patient',
            payload: { id: patientId, updates: { status: 'arquivado' } }
          },
          nextInProgressState: null // IDLE
        };
      } else {
        return {
          text: `❌ **Arquivamento cancelado.** O paciente **${patientName}** permanece na lista de ativos.`,
          nextInProgressState: null // IDLE
        };
      }
    }

    // 10. State: AGUARDANDO_PACIENTE_ALTA
    if (type === 'AGUARDANDO_PACIENTE_ALTA') {
      const matchedP = patients.find(p => lowerPrompt.includes(p.name.toLowerCase()) || lowerPrompt.includes(p.name.split(' ')[0].toLowerCase())) ||
                       patients.find(p => p.name.toLowerCase().includes(lowerPrompt));

      if (!matchedP) {
        return {
          text: `Não encontrei nenhum paciente com o nome **"${rawPrompt}"**.\n\nPor favor, informe o nome do paciente para alta terapêutica (ou digite **cancelar**):`,
          nextInProgressState: { type: 'AGUARDANDO_PACIENTE_ALTA' }
        };
      }

      return {
        text: `🎓 **Alta Terapêutica**\n\nDeseja confirmar o registro de Alta Terapêutica para **${matchedP.name}**?\n\n*Isso sinalizará o encerramento do ciclo terapêutico preservando todo o histórico de sessões e evoluções.*`,
        pendingAction: {
          id: `disch_${matchedP.id}`,
          type: 'discharge_patient',
          title: `Dar Alta Terapêutica a ${matchedP.name}`,
          description: `Registrar conclusão do tratamento para ${matchedP.name}.`,
          patientId: matchedP.id,
          patientName: matchedP.name
        },
        nextInProgressState: {
          type: 'AGUARDANDO_CONFIRMACAO_ALTA',
          data: { patientId: matchedP.id, patientName: matchedP.name }
        }
      };
    }

    // 11. State: AGUARDANDO_CONFIRMACAO_ALTA
    if (type === 'AGUARDANDO_CONFIRMACAO_ALTA') {
      const patientId = inProgressState.data?.patientId;
      const patientName = inProgressState.data?.patientName || 'paciente';

      const isAffirmative =
        lowerPrompt === 'sim' || lowerPrompt === 's' || lowerPrompt === '1' ||
        lowerPrompt.includes('confirmar') || lowerPrompt.includes('alta');

      if (isAffirmative) {
        return {
          text: `🎓 **Alta Terapêutica registrada com sucesso para ${patientName}!**\n\nO ciclo foi finalizado mantendo o prontuário no arquivo. ${PromptManager.getRandomFollowUp()}`,
          executeImmediately: {
            type: 'edit_patient',
            payload: { id: patientId, updates: { status: 'alta' } }
          },
          nextInProgressState: null // IDLE
        };
      } else {
        return {
          text: `❌ **Alta cancelada.** O paciente **${patientName}** permanece em atendimento ativo.`,
          nextInProgressState: null // IDLE
        };
      }
    }

    // 12. State: AGUARDANDO_AGENDAMENTO / AGUARDANDO_PACIENTE_AGENDAMENTO / create_appointment / AGUARDANDO_DATA_HORA_AGENDAMENTO
    if (
      type === 'AGUARDANDO_AGENDAMENTO' ||
      type === 'AGUARDANDO_PACIENTE_AGENDAMENTO' ||
      type === 'create_appointment' ||
      type === 'AGUARDANDO_DATA_HORA_AGENDAMENTO'
    ) {
      return WorkflowRegistry.handleAgendamentoWorkflow(
        rawPrompt,
        inProgressState.data || {},
        patients,
        sessions,
        profile
      );
    }

    // Fallback reset to IDLE if unhandled active state
    return {
      text: `Continuando atendimento... Como posso te ajudar?`,
      nextInProgressState: null
    };
  }
}
