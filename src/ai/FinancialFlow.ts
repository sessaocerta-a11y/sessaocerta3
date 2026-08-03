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
    const totalRevenue = sessions.reduce((acc, s) => acc + (s.price || 0), 0);
    const paidRevenue = sessions
      .filter(s => s.paymentStatus === 'pago')
      .reduce((acc, s) => acc + (s.price || 0), 0);
    const pendingRevenue = sessions
      .filter(s => s.paymentStatus === 'pendente')
      .reduce((acc, s) => acc + (s.price || 0), 0);

    const paidCount = sessions.filter(s => s.paymentStatus === 'pago').length;
    const pendingCount = sessions.filter(s => s.paymentStatus === 'pendente').length;

    return {
      text: [
        `📊 **Resumo Financeiro do Consultório**`,
        `----------------------------------------`,
        `💰 **Faturamento Total**: ${FinancialFlow.formatCurrency(totalRevenue)}`,
        `✅ **Recebido (${paidCount} sessões)**: ${FinancialFlow.formatCurrency(paidRevenue)}`,
        `⏳ **Pendente (${pendingCount} sessões)**: ${FinancialFlow.formatCurrency(pendingRevenue)}`,
        `----------------------------------------`,
        `Deseja que eu te ajude a enviar lembretes de cobrança para os pagamentos pendentes?`
      ].join('\n')
    };
  }
}
