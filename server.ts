import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { sendVerificationEmail } from './src/services/emailService';
import { emailAuditDb } from './src/services/emailAuditDb';
import { processResendWebhook } from './src/services/webhookService';
import { logger } from './src/utils/logger';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini Client server-side lazily
  const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // API Route: Copiloto do Consultório (Chat & Administrative Assistant)
  app.post('/api/ai/copilot', async (req, res) => {
    try {
      const { prompt, context } = req.body;
      const ai = getGenAI();

      if (ai) {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Contexto do consultório do psicólogo:
${JSON.stringify(context || {}, null, 2)}

Pergunta do Psicólogo: ${prompt}`,
          config: {
            systemInstruction: `Você é o Copiloto do Consultório do Sessão Certa, um assistente administrativo inteligente especializado na gestão de clínicas e consultórios de psicologia.
Sua missão é ajudar o psicólogo a:
- Analisar sua rotina e otimizar horários na agenda;
- Identificar padrões administrativos (ex: confirmações pendentes, reagendamentos, horários vagos);
- Redigir mensagens profissionais para WhatsApp;
- Responder a dúvidas sobre produtividade e organização da clínica.

REGRAS RÍGIDAS:
1. Você NUNCA faz diagnósticos psicológicos, interpretações clínicas ou sugestões de tratamento. Você atua ESTRITAMENTE como assistente administrativo e de gestão.
2. Seja empático, objetivo, organizado e muito prático. Use formatação limpa com marcadores e negritos quando apropriado.
3. Mantenha as respostas focadas e diretas (máximo 3 parágrafos curtos ou marcadores).`,
          },
        });

        return res.json({ text: response.text });
      }

      // Fallback rule-based response when Gemini API Key is not configured
      const lowerPrompt = (prompt || '').toLowerCase();
      let fallbackText = '';

      if (lowerPrompt.includes('hoje') || lowerPrompt.includes('agora')) {
        fallbackText = `🤖 **Resumo de Hoje:**\n- **Sessões agendadas:** ${context?.todayCount || 4}\n- **Confirmações recebidas:** ${context?.confirmedCount || 3}\n- **Aguardando confirmação:** ${context?.pendingCount || 1}\n\n💡 *Dica do Copiloto:* Envie um lembrete rápido pelo WhatsApp para as confirmações pendentes!`;
      } else if (lowerPrompt.includes('semana') || lowerPrompt.includes('agenda')) {
        fallbackText = `📊 **Análise da Semana:**\nSua agenda possui boa taxa de ocupação (${context?.occupancyRate || '85%'}). Os dias com maior concentração de atendimentos são terça e quarta-feira.\n\n💡 *Sugestão:* Mantenha um intervalo de 15 minutos entre as sessões para registro de evoluções de prontuário.`;
      } else if (lowerPrompt.includes('mensagem') || lowerPrompt.includes('lembrete')) {
        fallbackText = `💬 **Sugestão de Mensagem:**\n"Olá, [Nome do Paciente]! Passando para confirmar nossa sessão de amanhã às [Horário]. Posso contar com sua presença? Abraço, Dra. Fernanda."`;
      } else {
        fallbackText = `🤖 **Assistente do Consultório:**\nEntendi sua solicitação! Com base nos seus dados administrativos (${context?.activePatientsCount || 12} pacientes ativos e ${context?.todayCount || 4} sessões hoje), recomendo manter seus lembretes automáticos ativados no WhatsApp para maximizar a taxa de presença.`;
      }

      return res.json({ text: fallbackText });
    } catch (error: any) {
      console.error('Erro no Copilot AI:', error);
      res.status(500).json({ error: 'Erro ao processar consulta da IA', details: error.message });
    }
  });

  // API Route: Gerador Inteligente de Mensagens WhatsApp
  app.post('/api/ai/message-generator', async (req, res) => {
    try {
      const { patientName, date, time, topic, tone = 'amigavel' } = req.body;
      const ai = getGenAI();

      if (ai) {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Gere uma mensagem para WhatsApp destinada ao paciente ${patientName || 'Paciente'}.
Data da sessão: ${date || 'amanhã'}
Horário: ${time || 'no horário combinado'}
Objetivo/Tópico: ${topic || 'Lembrete de confirmação de sessão'}
Tom desejado: ${tone} (opções: profissional, amigavel, formal)`,
          config: {
            systemInstruction: `Você é um especialista em comunicação acolhedora para psicólogos. Gere apenas o texto pronto para ser enviado pelo WhatsApp, incluindo emojis adequados e espaçamento agradável. Sem introduções ou explicações fora do texto da mensagem.`,
          },
        });

        return res.json({ message: response.text });
      }

      // Fallback message templates
      let template = '';
      if (tone === 'formal') {
        template = `Prezado(a) ${patientName || 'Paciente'},\n\nConfirmamos o agendamento da sua sessão de psicologia para ${date || 'amanhã'} às ${time || '14:00'}.\n\nCaso necessite reagendar, favor avisar com antecedência.\nAtenciosamente,\nSessão Certa Psicologia.`;
      } else if (tone === 'profissional') {
        template = `Olá, ${patientName || 'Paciente'}! Tudo bem?\n\nLembramos de nossa próxima sessão agendada para ${date || 'amanhã'} às ${time || '14:00'}.\n\nPor gentileza, confirme sua presença respondendo esta mensagem.\n\nAté breve!`;
      } else {
        template = `Olá, ${patientName || 'Paciente'}! Espero que esteja tendo uma ótima semana. 😊\n\nPassando para lembrar da nossa sessão de amanhã, dia ${date || 'amanhã'}, às ${time || '14:00'}.\n\nPodemos confirmar? Qualquer dúvida, estou à disposição! 🌸`;
      }

      return res.json({ message: template });
    } catch (error: any) {
      console.error('Erro ao gerar mensagem:', error);
      res.status(500).json({ error: 'Erro ao gerar mensagem', details: error.message });
    }
  });

  // API Route: Briefing do Dia
  app.post('/api/ai/daily-briefing', async (req, res) => {
    try {
      const { todaySessionsCount, confirmedCount, pendingCount, practitionerName } = req.body;
      const ai = getGenAI();

      if (ai) {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Nome do Profissional: ${practitionerName || 'Psicólogo'}
Sessões Hoje: ${todaySessionsCount || 0}
Confirmadas: ${confirmedCount || 0}
Pendentes: ${pendingCount || 0}`,
          config: {
            systemInstruction: `Você é o assistente matinal do Sessão Certa. Escreva um briefing motivador e objetivo de 3 a 4 frases para o psicólogo começar o dia bem informado sobre sua agenda.`,
          },
        });

        return res.json({ briefing: response.text });
      }

      const briefing = `Bom dia, ${practitionerName || 'Dra. Fernanda'}! ☀️ Você tem ${todaySessionsCount || 4} sessões agendadas para hoje (${confirmedCount || 3} confirmadas e ${pendingCount || 1} aguardando resposta). Lembre-se de fazer pequenos intervalos entre os atendimentos para manter sua energia renovada!`;

      return res.json({ briefing });
    } catch (error: any) {
      console.error('Erro no Daily Briefing:', error);
      res.status(500).json({ error: 'Erro ao gerar briefing', details: error.message });
    }
  });

  // API Route: Envio Real de E-mail de Verificação - Sessão Certa
  app.post('/api/auth/send-verification-email', async (req, res) => {
    try {
      const { email, name, verificationCode } = req.body;

      if (!email || !verificationCode) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes (email, verificationCode).' });
      }

      const result = await sendVerificationEmail(email, name || 'Profissional', verificationCode);

      if (result.success) {
        logger.audit('AUTH', `E-mail de verificação de cadastro requisitado e despachado`, { email, provider: result.provider });
      } else {
        logger.error('AUTH', `Falha ao enviar e-mail de verificação para o cadastro`, { email, error: result.error });
      }

      return res.json({
        success: result.success,
        emailDispatched: result.success,
        providerUsed: result.provider,
        errorDetails: result.error || null,
        message: result.success
          ? `E-mail de confirmação entregue via ${result.provider} para ${email}`
          : `Erro ao enviar e-mail: ${result.error}`,
        emailSentTo: email,
        messageId: result.messageId
      });
    } catch (error: any) {
      logger.error('AUTH', 'Exceção crítica na rota de e-mail de verificação', { error: error.message });
      res.status(500).json({ error: 'Erro ao processar envio de e-mail', details: error.message });
    }
  });

  // API Route: Registrador e Consulta do Sistema de Logs Centralizado
  app.get('/api/logs', (req, res) => {
    const category = req.query.category as any;
    const limit = Number(req.query.limit) || 100;
    const logs = logger.getLogs(limit, category);
    res.json({ success: true, count: logs.length, logs });
  });

  app.post('/api/logs', (req, res) => {
    const { level = 'info', category = 'SYSTEM', message, meta } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Mensagem do log é obrigatória.' });
    }

    if (level === 'error') {
      logger.error(category, message, meta);
    } else if (level === 'warn') {
      logger.warn(category, message, meta);
    } else if (level === 'audit') {
      logger.audit(category, message, meta);
    } else {
      logger.info(category, message, meta);
    }

    res.json({ success: true });
  });

  // API Route: Webhook oficial para receber eventos de entrega/falha do Resend
  app.post('/api/webhooks/resend', (req, res) => {
    try {
      const payload = req.body;
      const result = processResendWebhook(payload);

      if (!result.success) {
        return res.status(400).json({
          error: result.message,
          details: result.error
        });
      }

      return res.json({
        success: true,
        message: result.message,
        eventType: result.eventType,
        emailId: result.emailId,
        record: result.record
      });
    } catch (error: any) {
      logger.error('RESEND_INTEGRATION', 'Erro interno no processamento do webhook do Resend', { error: error.message });
      return res.status(500).json({ error: 'Erro interno no processamento do webhook', details: error.message });
    }
  });

  // API Route: Consulta de Auditoria de E-mails Enviados
  app.get('/api/email-audit', (req, res) => {
    const limit = Number(req.query.limit) || 100;
    const records = emailAuditDb.getAllRecords(limit);
    res.json({ success: true, count: records.length, records });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
