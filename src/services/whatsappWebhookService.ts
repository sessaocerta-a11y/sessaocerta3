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
 * Envia uma mensagem de texto via WhatsApp Cloud API oficial da Meta
 */
export async function sendWhatsAppTextMessage(toPhone: string, textBody: string): Promise<boolean> {
  const currentStage = 'envio_resposta_automatica';
  try {
    const debugStart = '[WHATSAPP DEBUG] Iniciando envio da resposta automática';
    console.log(debugStart);
    logger.info('WHATSAPP', debugStart);

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;

    const hasPhoneId = Boolean(phoneNumberId);
    const hasToken = Boolean(accessToken);

    const debugVars = `[WHATSAPP DEBUG] Variáveis de envio verificadas (PHONE_NUMBER_ID configurado: ${hasPhoneId}, ACCESS_TOKEN configurado: ${hasToken})`;
    console.log(debugVars);
    logger.info('WHATSAPP', debugVars, {
      phoneNumberIdConfigured: hasPhoneId,
      accessTokenConfigured: hasToken
    });

    const cleanRecipient = toPhone.replace(/\D/g, '');
    const formattedRecipient = cleanRecipient.startsWith('+') ? cleanRecipient : `+${cleanRecipient}`;

    if (!phoneNumberId || !accessToken) {
      const errorDetails = 'Variáveis de ambiente WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_ACCESS_TOKEN / WHATSAPP_API_TOKEN não estão configuradas.';
      const errorLog = `
[WHATSAPP ENVIO ERRO]
Destinatário: ${formattedRecipient}
Erro: ${errorDetails}
`.trim();
      console.error(errorLog);
      logger.error('WHATSAPP', errorLog, {
        destinatario: formattedRecipient,
        erro: errorDetails
      });
      return false;
    }

    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: cleanRecipient,
      type: 'text',
      text: {
        body: textBody
      }
    };

    const debugCall = '[WHATSAPP DEBUG] Chamando Meta Graph API';
    console.log(debugCall);
    logger.info('WHATSAPP', debugCall, { recipient: cleanRecipient });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json().catch(() => ({}));

    // Copia segura da resposta sem expor tokens ou segredos
    const safeResponseData = JSON.parse(JSON.stringify(responseData));

    const isSuccess = response.ok && !responseData.error;
    const debugResp = `[WHATSAPP DEBUG] Resposta recebida da Meta Graph API (HTTP Status: ${response.status}, Sucesso: ${isSuccess})`;
    console.log(debugResp);
    logger.info('WHATSAPP', debugResp, {
      status: response.status,
      success: isSuccess,
      responseBody: safeResponseData
    });

    if (isSuccess) {
      const successLog = `
[WHATSAPP ENVIO]
Destinatário: ${formattedRecipient}
Mensagem: ${textBody}
Status: enviado
`.trim();
      console.log(successLog);
      logger.info('WHATSAPP', successLog, {
        destinatario: formattedRecipient,
        status: 'enviado',
        messageId: responseData?.messages?.[0]?.id
      });
      return true;
    } else {
      const errorMessage = responseData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
      const errorLog = `
[WHATSAPP ENVIO ERRO]
Destinatário: ${formattedRecipient}
Erro: ${errorMessage}
`.trim();
      console.error(errorLog);
      logger.error('WHATSAPP', errorLog, {
        destinatario: formattedRecipient,
        erro: errorMessage,
        code: responseData?.error?.code
      });
      return false;
    }
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    const debugErrLog = `
[WHATSAPP DEBUG ERROR]
Etapa: ${currentStage}
Erro: ${errorMessage}
`.trim();
    console.error(debugErrLog);
    logger.error('WHATSAPP', debugErrLog, { error: errorMessage });

    const errorLog = `
[WHATSAPP ENVIO ERRO]
Destinatário: ${toPhone}
Erro: ${errorMessage}
`.trim();
    console.error(errorLog);
    logger.error('WHATSAPP', errorLog, {
      destinatario: toPhone,
      erro: errorMessage
    });
    return false;
  }
}

/**
 * Processa um evento recebido da Meta WhatsApp Cloud API
 */
export async function processWhatsAppWebhook(payload: WhatsAppWebhookPayload): Promise<WhatsAppProcessResult> {
  let currentStage = 'iniciando_processamento_payload';

  const result: WhatsAppProcessResult = {
    success: true,
    messagesProcessed: 0,
    statusesProcessed: 0,
    messageDetails: []
  };

  try {
    const debugStart = '[WHATSAPP DEBUG] Iniciando processamento do payload';
    console.log(debugStart);
    logger.info('WHATSAPP', debugStart);

    if (!payload || typeof payload !== 'object') {
      logger.warn('WHATSAPP', '[WhatsApp Webhook] Payload inválido ou vazio recebido');
      return result;
    }

    // Verificar se o evento é do tipo whatsapp_business_account ou similar
    if (payload.object && payload.object !== 'whatsapp_business_account') {
      logger.info('WHATSAPP', `[WhatsApp Webhook] Evento ignorado (object: '${payload.object}')`);
      return result;
    }

    currentStage = 'verificando_entries';
    const entries = Array.isArray(payload.entry) ? payload.entry : [];

    if (entries.length === 0) {
      logger.info('WHATSAPP', '[WhatsApp Webhook] Recebido evento sem entradas (entry vazio/desconhecido)');
      return result;
    }

    for (let entryIdx = 0; entryIdx < entries.length; entryIdx++) {
      const entry = entries[entryIdx];
      currentStage = `processando_entry_${entryIdx}`;

      const debugEntry = `[WHATSAPP DEBUG] Entry encontrado (${entryIdx + 1}/${entries.length})`;
      console.log(debugEntry);
      logger.info('WHATSAPP', debugEntry);

      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      if (changes.length === 0) {
        logger.info('WHATSAPP', `[WhatsApp Webhook] Entry ${entryIdx} não possui mudanças (changes)`);
        continue;
      }

      for (let changeIdx = 0; changeIdx < changes.length; changeIdx++) {
        const change = changes[changeIdx];
        currentStage = `processando_change_${entryIdx}_${changeIdx}`;

        const debugChange = `[WHATSAPP DEBUG] Change encontrado (${changeIdx + 1}/${changes.length}, field: ${change?.field || 'desconhecido'})`;
        console.log(debugChange);
        logger.info('WHATSAPP', debugChange);

        const value = change?.value;
        if (!value) {
          logger.info('WHATSAPP', `[WhatsApp Webhook] Change ${changeIdx} sem objeto value`);
          continue;
        }

        currentStage = `processando_value_${entryIdx}_${changeIdx}`;
        const debugValue = '[WHATSAPP DEBUG] Value encontrado';
        console.log(debugValue);
        logger.info('WHATSAPP', debugValue);

        // Informações estruturais e seguras do value
        const hasMessages = Array.isArray(value.messages);
        const messagesCount = hasMessages ? value.messages!.length : 0;
        const hasContacts = Array.isArray(value.contacts);
        const contactsCount = hasContacts ? value.contacts!.length : 0;
        const hasStatuses = Array.isArray(value.statuses);
        const statusesCount = hasStatuses ? value.statuses!.length : 0;

        const debugValueContent = `[WHATSAPP DEBUG] Conteúdo do value (messages existe: ${hasMessages}, quantidade: ${messagesCount}; contacts existe: ${hasContacts}, quantidade: ${contactsCount}; statuses existe: ${hasStatuses}, quantidade: ${statusesCount})`;
        console.log(debugValueContent);
        logger.info('WHATSAPP', debugValueContent, {
          hasMessages,
          messagesCount,
          hasContacts,
          contactsCount,
          hasStatuses,
          statusesCount
        });

        // 1. Mapeamento de Contatos (Nome e ID)
        const contactsMap = new Map<string, string>();
        if (hasContacts) {
          for (const contact of value.contacts!) {
            if (contact?.wa_id) {
              const name = contact.profile?.name || 'Não informado';
              contactsMap.set(contact.wa_id, name);
            }
          }
        }

        // 2. Processamento de Mensagens Recebidas de Usuários
        if (hasMessages && messagesCount > 0) {
          currentStage = 'processando_messages';
          const debugMsgsFound = `[WHATSAPP DEBUG] Messages encontrados (${messagesCount} mensagem(ns))`;
          console.log(debugMsgsFound);
          logger.info('WHATSAPP', debugMsgsFound);

          for (let msgIdx = 0; msgIdx < value.messages!.length; msgIdx++) {
            const msg = value.messages![msgIdx];
            currentStage = `processando_mensagem_individual_${msgIdx}`;

            const debugMsgInd = `[WHATSAPP DEBUG] Processando mensagem individual (${msgIdx + 1}/${messagesCount})`;
            console.log(debugMsgInd);
            logger.info('WHATSAPP', debugMsgInd);

            result.messagesProcessed++;

            const rawFrom = msg.from || '';
            const formattedFrom = formatPhoneNumber(rawFrom);
            const senderName = contactsMap.get(rawFrom) || 'Nome não informado';
            const messageId = msg.id || 'sem_id';
            const messageType = msg.type || 'unknown';
            const formattedTime = formatTimestamp(msg.timestamp);

            const debugType = `[WHATSAPP DEBUG] Tipo da mensagem: ${messageType}`;
            console.log(debugType);
            logger.info('WHATSAPP', debugType);

            const debugFrom = `[WHATSAPP DEBUG] Remetente identificado: ${rawFrom || 'Não informado'}`;
            console.log(debugFrom);
            logger.info('WHATSAPP', debugFrom);

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

            // Registro estruturado e formatado conforme especificação de diagnóstico
            const logFormatted = `
===== WHATSAPP RECEBIDO =====
Remetente: ${rawFrom || 'Não informado'}
Nome: ${senderName}
Tipo: ${messageType}
Mensagem: ${contentSummary}
ID: ${messageId}
Timestamp: ${formattedTime}
=============================
`.trim();

            // Imprimir no console oficial para visibilidade imediata nos logs da Vercel
            console.log(logFormatted);

            // Log de auditoria da aplicação na categoria WHATSAPP
            logger.info('WHATSAPP', logFormatted, {
              remetente: rawFrom,
              nome: senderName,
              tipo: messageType,
              mensagem: contentSummary,
              id: messageId,
              timestamp: formattedTime
            });

            result.messageDetails.push({
              id: messageId,
              from: rawFrom || formattedFrom,
              senderName,
              type: messageType,
              body: contentSummary,
              timestamp: formattedTime
            });

            // Resposta automática EXCLUSIVAMENTE para mensagens de texto recebidas
            if (messageType === 'text') {
              const debugTxtId = '[WHATSAPP DEBUG] Mensagem de texto identificada';
              console.log(debugTxtId);
              logger.info('WHATSAPP', debugTxtId);

              if (rawFrom) {
                currentStage = 'enviando_resposta_automatica';
                const autoReplyText = "Olá, Breno! 👋\nRecebi sua mensagem. O Sessão Certa está funcionando!";
                await sendWhatsAppTextMessage(rawFrom, autoReplyText);
              } else {
                logger.warn('WHATSAPP', '[WHATSAPP DEBUG] Remetente (from) ausente; não foi possível enviar resposta automática.');
              }
            }
          }
        }

        // 3. Processamento de Atualizações de Status de Mensagens Enviadas (Sent/Delivered/Read/Failed)
        if (hasStatuses && statusesCount > 0) {
          currentStage = 'processando_statuses';
          for (const status of value.statuses!) {
            result.statusesProcessed++;

            const statusId = status.id || 'sem_id';
            const statusState = status.status || 'desconhecido';
            const recipientId = status.recipient_id || formatPhoneNumber(status.recipient_id);
            const formattedTime = formatTimestamp(status.timestamp);

            const statusFormatted = `
===== WHATSAPP STATUS =====
ID: ${statusId}
Status: ${statusState}
Destinatário: ${recipientId}
Timestamp: ${formattedTime}
============================
`.trim();

            console.log(statusFormatted);

            logger.info('WHATSAPP', statusFormatted, {
              statusId,
              status: statusState,
              destinatario: recipientId,
              timestamp: formattedTime,
              errors: status.errors || null
            });
          }
        }
      }
    }

    currentStage = 'finalizacao_processamento';

    // Se o evento for um teste sem mensagens ou status
    if (result.messagesProcessed === 0 && result.statusesProcessed === 0) {
      logger.info('WHATSAPP', '[WhatsApp Webhook] Evento de teste ou notificação recebida sem mensagens/status', {
        object: payload.object
      });
    }

    // Logs de conclusão de diagnóstico do payload
    const debugFinish = '[WHATSAPP DEBUG] Processamento finalizado';
    console.log(debugFinish);
    logger.info('WHATSAPP', debugFinish);

    const processedMsg = '[WHATSAPP] Payload recebido e processado com sucesso.';
    console.log(processedMsg);
    logger.info('WHATSAPP', processedMsg);

  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const debugErrLog = `
[WHATSAPP DEBUG ERROR]
Etapa: ${currentStage}
Erro: ${errorMessage}
`.trim();
    console.error(debugErrLog);
    logger.error('WHATSAPP', debugErrLog, {
      etapa: currentStage,
      error: errorMessage,
      stack: error?.stack
    });
  }

  return result;
}
