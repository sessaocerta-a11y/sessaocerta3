import { ClaraIntentType } from './types';

export interface ClassifiedIntent {
  intent: ClaraIntentType;
  confidence: number;
}

export class IntentClassifier {
  /**
   * Classifies user prompt into distinct intent types
   */
  public static classifyIntent(prompt: string, hasActiveWizard?: boolean): ClassifiedIntent {
    if (!prompt) {
      return { intent: 'CONVERSAR_NORMALMENTE', confidence: 0.5 };
    }

    const lower = prompt.toLowerCase().trim();

    // If an active wizard state is present, natural conversation or skip responses should be kept in context
    if (hasActiveWizard) {
      // Checked by wizard flow first
    }

    // 1. Greetings
    if (
      lower === 'olá' || lower === 'ola' || lower === 'oi' || lower === 'bom dia' ||
      lower === 'boa tarde' || lower === 'boa noite' || lower.startsWith('olá clara') ||
      lower.startsWith('oi clara') || lower === 'tudo bem' || lower === 'tudo bem?'
    ) {
      return { intent: 'CUMPRIMENTAR', confidence: 0.95 };
    }

    // 2. Thanks
    if (
      lower.includes('obrigado') || lower.includes('obrigada') || lower.includes('valeu') ||
      lower.includes('agradeço') || lower.includes('muito obrigado')
    ) {
      return { intent: 'AGRADECER', confidence: 0.95 };
    }

    // 3. Cadastrar Paciente
    if (
      lower.includes('cadastr') || lower.includes('adicionar paciente') ||
      lower.includes('novo paciente') || lower.includes('criar paciente') ||
      lower.includes('incluir paciente') || lower.includes('registrar paciente') ||
      lower.includes('inclua paciente') || lower.includes('adicione paciente')
    ) {
      return { intent: 'CADASTRAR_PACIENTE', confidence: 0.95 };
    }

    // 4. Editar Paciente
    if (
      lower.includes('editar paciente') || lower.includes('alterar paciente') ||
      lower.includes('mudar telefone') || lower.includes('mudar email') ||
      lower.includes('mudar e-mail') || lower.includes('atualizar paciente') ||
      lower.includes('modificar paciente') || lower.includes('edite o telefone') ||
      lower.includes('troque o telefone') || lower.includes('mudar o valor') ||
      lower.includes('altere o valor') || lower.includes('mude o valor') ||
      lower.includes('atualize o e-mail') || lower.includes('edite a cidade') ||
      lower.includes('atualize o contato de emergência')
    ) {
      return { intent: 'EDITAR_PACIENTE', confidence: 0.9 };
    }

    // 4.1 Arquivar Paciente
    if (
      lower.includes('arquivar') || lower.includes('arquive') ||
      lower.includes('remover da lista de ativos') || lower.includes('colocar em arquivo')
    ) {
      return { intent: 'ARQUIVAR_PACIENTE', confidence: 0.95 };
    }

    // 4.2 Dar Alta Terapêutica
    if (
      lower.includes('dar alta') || lower.includes('dê alta') ||
      lower.includes('marcar alta') || lower.includes('alta terapêutica') ||
      lower.includes('alta para')
    ) {
      return { intent: 'DAR_ALTA_PACIENTE', confidence: 0.95 };
    }

    // 4.3 Reativar Paciente
    if (
      lower.includes('reativar') || lower.includes('reative') ||
      lower.includes('voltar para ativos')
    ) {
      return { intent: 'REATIVAR_PACIENTE', confidence: 0.95 };
    }

    // 5. Excluir Paciente
    if (
      lower.includes('excluir paciente') || lower.includes('remover paciente') ||
      lower.includes('deletar paciente') || lower.includes('apagar paciente') ||
      lower.startsWith('excluir ') || lower.startsWith('deletar ') ||
      lower.includes('excluir permanentemente') || lower.includes('exclua definitivamente')
    ) {
      return { intent: 'EXCLUIR_PACIENTE', confidence: 0.9 };
    }

    // 6. Criar Consulta
    if (
      lower.includes('agendar') || lower.includes('marcar consulta') ||
      lower.includes('nova consulta') || lower.includes('criar consulta') ||
      lower.includes('agende') || lower.includes('marque')
    ) {
      return { intent: 'CRIAR_CONSULTA', confidence: 0.9 };
    }

    // 7. Reagendar Consulta
    if (
      lower.includes('reagendar') || lower.includes('remarcar') ||
      lower.includes('mudar consulta') || lower.includes('alterar horario') ||
      lower.includes('alterar horário')
    ) {
      return { intent: 'REAGENDAR_CONSULTA', confidence: 0.9 };
    }

    // 8. Cancelar Consulta
    if (
      lower.includes('cancelar consulta') || lower.includes('desmarcar') ||
      lower.includes('cancelar sessão') || lower.includes('cancelar sessao')
    ) {
      return { intent: 'CANCELAR_CONSULTA', confidence: 0.9 };
    }

    // 9. Consultar Agenda
    if (
      lower.includes('agenda') || lower.includes('consultas de hoje') ||
      lower.includes('minha agenda') || lower.includes('horarios') ||
      lower.includes('horários') || lower.includes('proximas consultas')
    ) {
      return { intent: 'CONSULTAR_AGENDA', confidence: 0.85 };
    }

    // 10. Consultar Pacientes
    if (
      lower.includes('listar pacientes') || lower.includes('meus pacientes') ||
      lower.includes('quais pacientes') || lower.includes('buscar paciente') ||
      lower.includes('procurar paciente')
    ) {
      return { intent: 'CONSULTAR_PACIENTES', confidence: 0.85 };
    }

    // 11. Consultar Financeiro
    if (
      lower.includes('faturamento') || lower.includes('faturei') || lower.includes('faturar') ||
      lower.includes('financeiro') || lower.includes('quanto recebi') || lower.includes('quanto faturei') ||
      lower.includes('quanto ganhei') || lower.includes('pagamentos') || lower.includes('pendentes') ||
      lower.includes('pendencias') || lower.includes('receita') || lower.includes('lucro') ||
      lower.includes('saldo') || lower.includes('valor faturado')
    ) {
      return { intent: 'CONSULTAR_FINANCEIRO', confidence: 0.9 };
    }

    // 12. Consultar Prontuários
    if (
      lower.includes('prontuário') || lower.includes('prontuario') ||
      lower.includes('ficha') || lower.includes('evolução') ||
      lower.includes('evolucao') || lower.includes('historico') ||
      lower.includes('histórico')
    ) {
      return { intent: 'CONSULTAR_PRONTUARIOS', confidence: 0.85 };
    }

    // Fallback: Conversa Normal
    return { intent: 'CONVERSAR_NORMALMENTE', confidence: 0.6 };
  }
}
