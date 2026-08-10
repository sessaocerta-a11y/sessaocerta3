import { logger } from '../utils/logger.js';

export interface WhatsAppContactProfile {
  name?: string;
}

export interface WhatsAppContact {
  profile?: WhatsAppContactProfile;
  wa_id?: string;
}

export interface WhatsAppMediaObject {
  id?: string;
  mime_type?: string;
  sha256?: string;
  caption?: string;
  filename?: string;
  voice?: boolean;
}

export interface WhatsAppLocationObject {
  latitude?: number;
  longitude?: number;
  name?: string;
  address?: string;
}

export interface WhatsAppInteractiveObject {
  type?: string;
  button_reply?: { id?: string; title?: string };
  list_reply?: { id?: string; title?: string; description?: string };
}

export interface WhatsAppButtonObject {
  payload?: string;
  text?: string;
}

export interface WhatsAppMessage {
  from?: string;
  id?: string;
  timestamp?: string | number;
  type?: 'text' | 'interactive' | 'button' | 'image' | 'audio' | 'document' | 'location' | 'contacts' | 'reaction' | 'sticker' | 'unknown' | string;
  text?: { body?: string };
  interactive?: WhatsAppInteractiveObject;
  button?: WhatsAppButtonObject;
  image?: WhatsAppMediaObject;
  audio?: WhatsAppMediaObject;
  document?: WhatsAppMediaObject;
  location?: WhatsAppLocationObject;
  contacts?: any[];
  [key: string]: any;
}

export interface WhatsAppStatus {
  id?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed' | string;
  timestamp?: string | number;
  recipient_id?: string;
  errors?: any[];
  pricing?: any;
  conversation?: any;
}

export interface WhatsAppValue {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
  [key: string]: any;
}

export interface WhatsAppChange {
  value?: WhatsAppValue;
  field?: string;
}

export interface WhatsAppEntry {
  id?: string;
  changes?: WhatsAppChange[];
}

export interface WhatsAppWebhookPayload {
  object?: string;
  entry?: WhatsAppEntry[];
  [key: string]: any;
}

export interface WhatsAppProcessResult {
  success: boolean;
  messagesProcessed: number;
  statusesProcessed: number;
  messageDetails: Array<{
    id?: string;
    from?: string;
    senderName?: string;
    type?: string;
    body?: string;
    timestamp?: string;
  }>;
}

/**
 * Auxiliar para formatar número de telefone com o prefixo '+' se não contiver
 */
function formatPhoneNumber(phone?: string): string {
  if (!phone) return 'Não informado';
  const clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) return clean;
  return `+${clean}`;
}

/**
 * Auxiliar para converter o timestamp da Meta (segundos unix) em Data legível
 */
function formatTimestamp(ts?: string | number): string {
  if (!ts) return new Date().toISOString();
  const num = Number(ts);
  if (isNaN(num) || num <= 0) return String(ts);
  try {
    return new Date(num * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ` (${num})`;
  } catch {
    return new Date(num * 1000).toISOString();
  }
}

/**
 * Processa um evento recebido da Meta WhatsApp Cloud API
 */
export function processWhatsAppWebhook(payload: WhatsAppWebhookPayload): WhatsAppProcessResult {
  const result: WhatsAppProcessResult = {
    success: true,
    messagesProcessed: 0,
    statusesProcessed: 0,
    messageDetails: []
  };

  try {
    if (!payload || typeof payload !== 'object') {
      logger.warn('WHATSAPP', '[WhatsApp Webhook] Payload inválido ou vazio recebido');
      return result;
    }

    // Verificar se o evento é do tipo whatsapp_business_account ou similar
    if (payload.object && payload.object !== 'whatsapp_business_account') {
      logger.info('WHATSAPP', `[WhatsApp Webhook] Evento ignorado (object: '${payload.object}')`);
      return result;
    }

    const entries = Array.isArray(payload.entry) ? payload.entry : [];

    if (entries.length === 0) {
      logger.info('WHATSAPP', '[WhatsApp Webhook] Recebido evento sem entradas (entry vazio/desconhecido)');
      return result;
    }

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        // 1. Mapeamento de Contatos (Nome e ID)
        const contactsMap = new Map<string, string>();
        if (Array.isArray(value.contacts)) {
          for (const contact of value.contacts) {
            if (contact?.wa_id) {
              const name = contact.profile?.name || 'Não informado';
              contactsMap.set(contact.wa_id, name);
            }
          }
        }

        // 2. Processamento de Mensagens Recebidas de Usuários
        if (Array.isArray(value.messages) && value.messages.length > 0) {
          for (const msg of value.messages) {
            result.messagesProcessed++;

            const rawFrom = msg.from || '';
            const formattedFrom = formatPhoneNumber(rawFrom);
            const senderName = contactsMap.get(rawFrom) || 'Nome não informado';
            const messageId = msg.id || 'sem_id';
            const messageType = msg.type || 'unknown';
            const formattedTime = formatTimestamp(msg.timestamp);

            let contentSummary = '';

            // Extração baseada no tipo de mensagem
            switch (messageType) {
              case 'text':
                contentSummary = msg.text?.body || '[Texto sem conteúdo]';
                break;

              case 'interactive': {
                const replyType = msg.interactive?.type;
                if (replyType === 'button_reply') {
                  contentSummary = `[Botão Selecionado] ID: ${msg.interactive?.button_reply?.id || ''} | Título: "${msg.interactive?.button_reply?.title || ''}"`;
                } else if (replyType === 'list_reply') {
                  contentSummary = `[Lista Selecionada] ID: ${msg.interactive?.list_reply?.id || ''} | Título: "${msg.interactive?.list_reply?.title || ''}"`;
                } else {
                  contentSummary = `[Interativo: ${replyType || 'desconhecido'}]`;
                }
                break;
              }

              case 'button':
                contentSummary = `[Resposta de Botão] Texto: "${msg.button?.text || ''}" | Payload: "${msg.button?.payload || ''}"`;
                break;

              case 'image':
                contentSummary = `[Imagem] ID Mídia: ${msg.image?.id || 'N/A'} | Legenda: "${msg.image?.caption || 'Sem legenda'}" | Mime: ${msg.image?.mime_type || 'N/A'}`;
                break;

              case 'audio':
                contentSummary = `[Áudio/Voz] ID Mídia: ${msg.audio?.id || 'N/A'} | Voz: ${msg.audio?.voice ? 'Sim' : 'Não'} | Mime: ${msg.audio?.mime_type || 'N/A'}`;
                break;

              case 'document':
                contentSummary = `[Documento] Nome: "${msg.document?.filename || 'Sem nome'}" | ID Mídia: ${msg.document?.id || 'N/A'} | Legenda: "${msg.document?.caption || ''}"`;
                break;

              case 'location':
                contentSummary = `[Localização] Lat: ${msg.location?.latitude || 'N/A'}, Long: ${msg.location?.longitude || 'N/A'}${msg.location?.name ? ` | Nome: "${msg.location.name}"` : ''}`;
                break;

              case 'contacts':
                contentSummary = `[Contatos Compartilhados] Quantidade: ${Array.isArray(msg.contacts) ? msg.contacts.length : 0}`;
                break;

              default:
                contentSummary = `[Tipo '${messageType}'] ${JSON.stringify(msg[messageType] || msg)}`;
                break;
            }

            // Registro estruturado e formatado conforme especificação
            const logFormatted = `
[WHATSAPP RECEBIDO]
Remetente: ${formattedFrom}
Nome: ${senderName}
Tipo: ${messageType}
Mensagem: ${contentSummary}
ID: ${messageId}
Timestamp: ${formattedTime}
`.trim();

            // Imprimir no console oficial para visibilidade imediata nos logs da Vercel
            console.log(logFormatted);

            // Log de auditoria da aplicação
            logger.info('WHATSAPP', `[WHATSAPP RECEBIDO] Mensagem de ${formattedFrom} (${senderName})`, {
              remetente: formattedFrom,
              rawFrom,
              nome: senderName,
              tipo: messageType,
              mensagem: contentSummary,
              id: messageId,
              timestamp: formattedTime,
              rawMsg: msg
            });

            result.messageDetails.push({
              id: messageId,
              from: formattedFrom,
              senderName,
              type: messageType,
              body: contentSummary,
              timestamp: formattedTime
            });
          }
        }

        // 3. Processamento de Atualizações de Status de Mensagens Enviadas (Sent/Delivered/Read/Failed)
        if (Array.isArray(value.statuses) && value.statuses.length > 0) {
          for (const status of value.statuses) {
            result.statusesProcessed++;

            const statusId = status.id || 'sem_id';
            const statusState = status.status || 'desconhecido';
            const recipient = formatPhoneNumber(status.recipient_id);
            const formattedTime = formatTimestamp(status.timestamp);

            const statusFormatted = `
[WHATSAPP ATUALIZAÇÃO DE STATUS]
ID: ${statusId}
Status: ${statusState}
Destinatário: ${recipient}
Timestamp: ${formattedTime}
`.trim();

            console.log(statusFormatted);

            logger.info('WHATSAPP', `[WHATSAPP STATUS] Mensagem ${statusId} -> ${statusState}`, {
              statusId,
              status: statusState,
              destinatario: recipient,
              timestamp: formattedTime,
              errors: status.errors || null
            });
          }
        }
      }
    }

    // Se o evento for um teste sem mensagens ou status
    if (result.messagesProcessed === 0 && result.statusesProcessed === 0) {
      logger.info('WHATSAPP', '[WhatsApp Webhook] Evento de teste ou notificação recebida sem mensagens/status', {
        object: payload.object
      });
    }

  } catch (error: any) {
    logger.error('WHATSAPP', 'Erro ao processar conteúdo do webhook do WhatsApp', {
      error: error?.message || String(error),
      stack: error?.stack
    });
  }

  return result;
}
