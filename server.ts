import 'dotenv/config';
import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendSessionConfirmationEmail
} from './src/services/emailService.js';
import { emailAuditDb } from './src/services/emailAuditDb.js';
import { processResendWebhook } from './src/services/webhookService.js';
import { logger } from './src/utils/logger.js';

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

  // API Route: Copiloto do Consultório (Chat & Administrative Assistant: Clara)
  app.post('/api/ai/copilot', async (req, res) => {
    try {
      const { prompt, context } = req.body;
      const ai = getGenAI();

      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: `Contexto do consultório do psicólogo:
${JSON.stringify(context || {}, null, 2)}

Pergunta do Psicólogo: ${prompt}`,
            config: {
              systemInstruction: `Você é a Clara, a assistente virtual inteligente oficial do Sessão Certa, uma plataforma de gestão clínica criada para auxiliar psicólogos na organização da rotina profissional.

Sua missão é ajudar psicólogos a trabalharem de forma mais organizada, eficiente e segura, reduzindo tarefas administrativas e permitindo que eles dediquem mais tempo ao cuidado dos pacientes.

PRINCÍPIO FUNDAMENTAL - DADOS REAIS & ZERO ALUCINAÇÃO:
- Você NUNCA deve inventar números, estatísticas, sessões ou nomes de pacientes.
- Se o usuário perguntar sobre consultas, faturamento, pacientes, inadimplência ou prontuários, você DEVE utilizar EXCLUSIVAMENTE os dados reais fornecidos no objeto JSON do contexto.
- Se uma informação não for encontrada no contexto ou se a contagem for 0, informe com total clareza e transparência que não há registros ou que o valor é 0.
- Nunca estimar. Nunca gerar dados aleatórios.

IDENTIDADE DA CLARA:
- Nome: Clara (representa clareza, organização, confiança e simplicidade).
- Personalidade: Inteligente, organizada, profissional mas acolhedora, gentil, empática, objetiva, eficiente e confiável. Nunca deve parecer fria ou robótica. Você se comunica como uma assistente profissional de alto nível, semelhante a uma secretária clínica inteligente.

FORMA DE COMUNICAÇÃO:
- Responda saudações do dia a dia (ex: "Bom dia", "Obrigado", "Boa noite", "Valeu") de forma simpática, breve e natural.
- Use linguagem clara e profissional.
- Seja breve quando a pergunta for simples e pontual.
- Seja detalhada quando o usuário precisar de orientação sobre agenda, pacientes ou prontuários.
- Mantenha um tom humano, sereno e muito respeitoso.

FUNÇÕES DA CLARA DENTRO DO SESSÃO CERTA:
- Agenda: consultar horários, organizar sessões do dia/semana, identificar horários vagos, próximas consultas.
- Pacientes: número de ativos/inativos, localização de cadastros, histórico de atendimentos, aniversariantes.
- Financeiro: faturamento do mês/ano, pendências de pagamento, relatórios de inadimplência.
- Prontuários: contagem de evoluções, resumo de sessões registradas pelo psicólogo.

LIMITES IMPORTANTES (SEGURANÇA ÉTICA):
Você NÃO é uma psicóloga e NÃO realiza atendimento psicológico.
Você nunca deve diagnosticar pacientes ou dar orientações clínicas.
Quando alguém solicitar uma avaliação psicológica ou orientação clínica, responda categoricamente:
"Eu posso ajudar com organização e informações administrativas dentro do Sessão Certa, mas avaliações psicológicas e decisões clínicas devem ser realizadas pelo psicólogo responsável."`,
            },
          });

          if (response && response.text) {
            return res.json({ text: response.text });
          }
        } catch (_err) {
          // Gemini API external access unavailable or key restricted; fall back gracefully to Clara's local intelligence
        }
      }

      // When Gemini API Key is not configured or fails, signal fallback so client-side ClaraEngine handles precise prompt query
      const lowerPrompt = (prompt || '').toLowerCase();
      if (lowerPrompt.includes('diagnost') || lowerPrompt.includes('sintoma') || lowerPrompt.includes('laudo') || lowerPrompt.includes('tratamento')) {
        return res.json({
          text: `Eu posso ajudar com organização e informações administrativas dentro do Sessão Certa, mas avaliações psicológicas e decisões clínicas devem ser realizadas pelo psicólogo responsável.`
        });
      }

      return res.json({ isFallback: true });
    } catch (error: any) {
      console.warn('Alerta no Copilot AI (Clara):', error?.message || error);
      return res.json({ isFallback: true });
    }
  });

  // API Route: Gerador Inteligente de Mensagens WhatsApp
  app.post('/api/ai/message-generator', async (req, res) => {
    try {
      const { patientName, date, time, topic, tone = 'amigavel' } = req.body;
      const ai = getGenAI();

      if (ai) {
        try {
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

          if (response && response.text) {
            return res.json({ message: response.text });
          }
        } catch (_err) {
          // Fallback to local template
        }
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
        try {
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

          if (response && response.text) {
            return res.json({ briefing: response.text });
          }
        } catch (_err) {
          // Fallback to local briefing
        }
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

      logger.info('AUTH', `[DIAGNÓSTICO ROTA] Chamada em /api/auth/send-verification-email`, {
        email,
        hasVerificationCode: !!verificationCode,
        hasResendApiKey: !!process.env.RESEND_API_KEY,
      });

      if (!email || !verificationCode) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes (email, verificationCode).' });
      }

      const result = await sendVerificationEmail(email, name || 'Profissional', verificationCode);

      if (result.success) {
        logger.audit('AUTH', `[DIAGNÓSTICO ROTA] E-mail de verificação despachado com sucesso`, { email, provider: result.provider, messageId: result.messageId });
      } else {
        logger.error('AUTH', `[DIAGNÓSTICO ROTA] Falha ao enviar e-mail de verificação`, { email, error: result.error, provider: result.provider });
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
      logger.error('AUTH', '[DIAGNÓSTICO ROTA] Exceção crítica na rota de e-mail de verificação', { error: error.message });
      res.status(500).json({ error: 'Erro ao processar envio de e-mail', details: error.message });
    }
  });

  // API Route: Envio de E-mail de Boas-Vindas
  app.post('/api/auth/send-welcome-email', async (req, res) => {
    try {
      const { email, name, loginUrl } = req.body;

      logger.info('AUTH', `[DIAGNÓSTICO ROTA] Chamada em /api/auth/send-welcome-email`, {
        email,
        hasResendApiKey: !!process.env.RESEND_API_KEY,
      });

      if (!email) {
        return res.status(400).json({ error: 'Campo e-mail é obrigatório.' });
      }

      const result = await sendWelcomeEmail(email, name || 'Profissional', loginUrl);

      if (result.success) {
        logger.audit('AUTH', `[DIAGNÓSTICO ROTA] E-mail de boas-vindas despachado com sucesso para ${email}`, { messageId: result.messageId });
      } else {
        logger.error('AUTH', `[DIAGNÓSTICO ROTA] Falha no e-mail de boas-vindas para ${email}`, { error: result.error });
      }

      return res.json({
        success: result.success,
        messageId: result.messageId,
        provider: result.provider,
        error: result.error || null
      });
    } catch (error: any) {
      logger.error('AUTH', '[DIAGNÓSTICO ROTA] Erro na rota de e-mail de boas-vindas', { error: error.message });
      res.status(500).json({ error: 'Erro ao enviar e-mail de boas-vindas', details: error.message });
    }
  });

  // API Route: Envio de Recuperação de Senha
  app.post('/api/auth/send-password-reset', async (req, res) => {
    try {
      const { email, name, resetToken, resetUrl } = req.body;

      logger.info('AUTH', `[DIAGNÓSTICO ROTA] Chamada em /api/auth/send-password-reset`, {
        email,
        hasResetToken: !!resetToken,
        hasResendApiKey: !!process.env.RESEND_API_KEY,
      });

      if (!email || !resetToken) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes (email, resetToken).' });
      }

      const result = await sendPasswordResetEmail(email, name || 'Profissional', resetToken, resetUrl);

      if (result.success) {
        logger.audit('AUTH', `[DIAGNÓSTICO ROTA] E-mail de recuperação de senha enviado com sucesso para ${email}`, { messageId: result.messageId });
      } else {
        logger.error('AUTH', `[DIAGNÓSTICO ROTA] Falha na recuperação de senha para ${email}`, { error: result.error });
      }

      return res.json({
        success: result.success,
        messageId: result.messageId,
        provider: result.provider,
        error: result.error || null
      });
    } catch (error: any) {
      logger.error('AUTH', '[DIAGNÓSTICO ROTA] Erro na rota de recuperação de senha', { error: error.message });
      res.status(500).json({ error: 'Erro ao enviar e-mail de redefinição de senha', details: error.message });
    }
  });

  // API Route: Envio de Confirmação de Alteração de Senha
  app.post('/api/auth/send-password-changed', async (req, res) => {
    try {
      const { email, name, ipAddress } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Campo e-mail é obrigatório.' });
      }

      const reqIp = ipAddress || req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      const result = await sendPasswordChangedEmail(email, name || 'Profissional', String(reqIp));

      if (result.success) {
        logger.audit('AUTH', `E-mail de aviso de alteração de senha enviado para ${email}`);
      }

      return res.json({
        success: result.success,
        messageId: result.messageId,
        provider: result.provider,
        error: result.error || null
      });
    } catch (error: any) {
      logger.error('AUTH', 'Erro na rota de aviso de alteração de senha', { error: error.message });
      res.status(500).json({ error: 'Erro ao enviar e-mail de aviso de alteração de senha', details: error.message });
    }
  });

  // API Route: Envio de Confirmação de Consulta
  app.post('/api/sessions/send-confirmation-email', async (req, res) => {
    try {
      const {
        to,
        patientName,
        psychologistName,
        date,
        time,
        type,
        videoUrl,
        clinicAddress,
        price,
        notes
      } = req.body;

      if (!to || !patientName || !date || !time) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes (to, patientName, date, time).' });
      }

      const result = await sendSessionConfirmationEmail({
        to,
        patientName,
        psychologistName: psychologistName || 'Dra. Fernanda',
        date,
        time,
        type: type || 'online',
        videoUrl,
        clinicAddress,
        price,
        notes
      });

      if (result.success) {
        logger.audit('SESSIONS', `E-mail de confirmação de consulta enviado para ${to}`, { date, time });
      }

      return res.json({
        success: result.success,
        messageId: result.messageId,
        provider: result.provider,
        error: result.error || null
      });
    } catch (error: any) {
      logger.error('SESSIONS', 'Erro na rota de confirmação de consulta por e-mail', { error: error.message });
      res.status(500).json({ error: 'Erro ao enviar e-mail de confirmação de consulta', details: error.message });
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

export default app;
export { app };

// In standalone development or Cloud Run mode (non-Vercel environment)
if (!process.env.VERCEL) {
  async function startStandaloneServer() {
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

  startStandaloneServer();
}
