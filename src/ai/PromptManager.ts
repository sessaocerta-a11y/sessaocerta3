import { RegistrationWizardData } from './types';
import { EntityExtractor } from './EntityExtractor';

export class PromptManager {
  /**
   * Returns a random polite affirmation phrase to keep responses varied and natural.
   */
  public static getRandomAffirmation(): string {
    const options = [
      'Perfeito!',
      'Ótimo!',
      'Claro!',
      'Sem problemas!',
      'Tudo certo!',
      'Excelente!',
      'Entendido!',
      'Pode deixar!'
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Returns a natural follow-up question for conversation continuity.
   */
  public static getRandomFollowUp(): string {
    const options = [
      'Posso ajudar em mais alguma coisa?',
      'Há mais alguma tarefa que deseja realizar?',
      'Posso ajudar com outro paciente ou consulta?'
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Generates a warm, natural greeting according to time or message
   */
  public static getGreeting(): string {
    const hour = new Date().getHours();
    let timeGreeting = 'Olá';
    if (hour >= 5 && hour < 12) timeGreeting = 'Bom dia';
    else if (hour >= 12 && hour < 18) timeGreeting = 'Boa tarde';
    else if (hour >= 18) timeGreeting = 'Boa noite';

    return `${timeGreeting}! Sou a **Clara**, sua assistente inteligente do consultório. 😊 Como posso te ajudar agora?`;
  }

  /**
   * Generates a polite thank-you response
   */
  public static getThanksResponse(): string {
    return `De nada! É um prazer ajudar. Se precisar de mais alguma coisa no consultório, estou sempre por aqui! ✨`;
  }

  /**
   * Builds the formatted patient registration summary box according to specification
   */
  public static buildPatientSummary(data: RegistrationWizardData): string {
    const nameStr = `👤 **${data.name || 'Não informado'}**`;
    const locStr = `📍 ${data.city ? `${data.city}${data.state ? ` - ${data.state}` : ''}` : 'Não informada'}`;
    const phoneStr = `📞 ${data.phone ? data.phone : 'Não informado'}`;
    const emailStr = `✉️ ${data.email ? data.email : 'Não informado'}`;
    const cpfStr = `🪪 ${data.cpf ? data.cpf : 'Não informado'}`;
    const priceVal = data.sessionPrice !== undefined && data.sessionPrice !== null
      ? `R$ ${Number(data.sessionPrice).toFixed(2).replace('.', ',')}`
      : 'R$ 150,00';
    const priceStr = `💰 Sessão: ${priceVal}`;

    const emergency = EntityExtractor.parseEmergencyContactDetails(
      data.emergencyContact || `${data.emergencyContactName || ''} ${data.emergencyContactPhone || ''}`
    );
    const emergencyName = data.emergencyContactName || emergency.name;
    const emergencyPhone = data.emergencyContactPhone || emergency.phone;

    const notesStr = data.notes && data.notes.trim() ? data.notes : 'Nenhuma';

    return [
      `══════════════════════════════`,
      ``,
      `📋 **Resumo do Cadastro**`,
      ``,
      nameStr,
      ``,
      locStr,
      ``,
      phoneStr,
      ``,
      emailStr,
      ``,
      cpfStr,
      ``,
      priceStr,
      ``,
      `🚨 **Contato de Emergência**`,
      ``,
      `**Nome:**`,
      `${emergencyName}`,
      ``,
      `**Telefone:**`,
      `${emergencyPhone}`,
      ``,
      `📝 **Observações**`,
      `${notesStr}`,
      ``,
      `══════════════════════════════`,
      ``,
      `Deseja **confirmar este cadastro**?`
    ].join('\n');
  }

  /**
   * Natural conversational header when info was partially identified
   */
  public static buildPartialInfoNotice(data: RegistrationWizardData): string {
    const identified: string[] = [];

    if (data.name) identified.push(`👤 **${data.name}**`);
    if (data.city || data.state) {
      identified.push(`📍 **${data.city || ''}${data.state ? (data.city ? ' - ' : '') + data.state : ''}**`);
    }
    if (data.phone) identified.push(`📞 **${data.phone}**`);
    if (data.email) identified.push(`✉️ **${data.email}**`);
    if (data.sessionPrice !== undefined && data.sessionPrice !== null && data.sessionPrice !== 0) {
      identified.push(`💰 **R$ ${Number(data.sessionPrice).toFixed(2).replace('.', ',')}**`);
    }
    if (data.cpf) identified.push(`🪪 **CPF: ${data.cpf}**`);
    if (data.emergencyContact) {
      const emergency = EntityExtractor.parseEmergencyContactDetails(data.emergencyContact);
      identified.push(`🚨 **Emergência: ${emergency.name} (${emergency.phone})**`);
    }
    if (data.notes) identified.push(`📝 **Obs: ${data.notes}**`);

    const affirmation = PromptManager.getRandomAffirmation();

    if (identified.length > 0) {
      return `${affirmation} Já consegui identificar estas informações:\n\n${identified.join('\n')}\n\n`;
    }

    return `${affirmation} Sou a Clara e vou conduzir o cadastro com você de forma bem rápida e organizada. 😊\n\n`;
  }

  /**
   * Confirmation prompt for name if confidence was low or single word
   */
  public static buildNameConfirmationPrompt(name: string): string {
    return `Identifiquei o nome **"${name}"**.\n\nEstá correto ou deseja informar o nome completo? *(ex: responda **sim** ou digite o **nome completo**)*`;
  }
}
