import { Session } from '../types';
import { ClaraQueryResult } from './types';

export class FinancialFlow {
  /**
   * Formats BRL currency
   */
  public static formatCurrency(val: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  }

  /**
   * Handles financial stats and queries
   */
  public static handleFinancialQuery(sessions: Session[]): ClaraQueryResult {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentYearMonth = todayStr.substring(0, 7);

    const receivedToday = sessions
      .filter(s => s.date === todayStr && s.paymentStatus === 'pago')
      .reduce((acc, s) => acc + (s.price || 0), 0);

    const receivedMonth = sessions
      .filter(s => s.date.startsWith(currentYearMonth) && s.paymentStatus === 'pago')
      .reduce((acc, s) => acc + (s.price || 0), 0);

    const pendingSessions = sessions.filter(s => s.paymentStatus === 'pendente');
    const pendingRevenue = pendingSessions.reduce((acc, s) => acc + (s.price || 0), 0);

    const overdueSessions = pendingSessions.filter(s => s.status === 'realizada');
    const overdueRevenue = overdueSessions.reduce((acc, s) => acc + (s.price || 0), 0);

    const nextExpected = pendingSessions.find(s => s.status === 'agendada' || s.status === 'confirmada');

    let recommendationBlock = '';
    if (overdueSessions.length > 0) {
      const target = overdueSessions[0];
      recommendationBlock = `\n\n----------------------------------------\n💡 **Ação Recomendada Clara**:\n**${target.patientName}** possui sessão realizada pendente de **${FinancialFlow.formatCurrency(target.price)}**.\n\n[Enviar Cobrança WhatsApp]  [Marcar como Pago]`;
    }

    return {
      text: [
        `📊 **Painel Financeiro do Consultório**`,
        `----------------------------------------`,
        `📈 **Recebido Hoje**: ${FinancialFlow.formatCurrency(receivedToday)}`,
        `📈 **Recebido no Mês**: ${FinancialFlow.formatCurrency(receivedMonth)}`,
        `⏳ **A Receber (Pendentes)**: ${FinancialFlow.formatCurrency(pendingRevenue)}`,
        `⚠️ **Cobranças Atrasadas**: ${overdueSessions.length} sessão(ões) (${FinancialFlow.formatCurrency(overdueRevenue)})`,
        nextExpected ? `💳 **Próximo Pagamento Esperado**: ${nextExpected.patientName} (${FinancialFlow.formatCurrency(nextExpected.price)})` : `💳 **Próximo Pagamento Esperado**: Sem cobranças futuras agendadas`
      ].join('\n') + recommendationBlock
    };
  }
}
