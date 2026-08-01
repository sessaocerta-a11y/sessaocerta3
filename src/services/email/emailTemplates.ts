import {
  WelcomeEmailOptions,
  VerificationEmailOptions,
  PasswordResetOptions,
  PasswordChangedOptions,
  SessionConfirmationOptions,
  RenderedEmailTemplate,
} from './types';

const APP_URL = process.env.APP_URL || 'https://sessaocerta.shop';
const LOGO_URL = `${APP_URL}/icon.png`;

/**
 * Common Base HTML Wrapper providing Sessão Certa brand aesthetic
 */
function renderBaseTemplate(title: string, bodyContent: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    /* Reset styles */
    body, p, h1, h2, h3, h4, div, span, a { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #090d16;
      color: #f8fafc;
      margin: 0;
      padding: 28px 12px;
      -webkit-font-smoothing: antialiased;
    }
    .email-container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    }
    .header {
      background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);
      padding: 32px 24px;
      text-align: center;
      border-bottom: 1px solid #065f46;
    }
    .brand-logo-container {
      margin-bottom: 10px;
      display: inline-block;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
      margin-top: 4px;
    }
    .brand-tagline {
      font-size: 11px;
      color: #a7f3d0;
      margin-top: 6px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content-body {
      padding: 36px 32px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 16px;
    }
    .paragraph {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.65;
      margin-bottom: 20px;
    }
    .highlight-box {
      background-color: #020617;
      border: 1px solid #1e293b;
      border-left: 4px solid #10b981;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .btn-primary {
      display: inline-block;
      background-color: #10b981;
      color: #ffffff !important;
      font-weight: 700;
      font-size: 14px;
      padding: 14px 28px;
      border-radius: 12px;
      text-decoration: none !important;
      text-align: center;
      margin: 20px 0;
      box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
      transition: background-color 0.2s;
    }
    .btn-primary:hover {
      background-color: #059669;
    }
    .info-grid {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .info-grid td {
      padding: 10px 14px;
      border-bottom: 1px solid #1e293b;
      font-size: 13px;
    }
    .info-label {
      color: #64748b;
      font-weight: 600;
      width: 35%;
    }
    .info-value {
      color: #f1f5f9;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      padding: 24px 20px;
      background-color: #020617;
      border-top: 1px solid #1e293b;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    .footer-link {
      color: #10b981;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div style="text-align: center; margin: 0 auto;">
        <a href="${APP_URL}" target="_blank" style="text-decoration: none; display: inline-block;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; text-align: center;">
            <tr>
              <td style="vertical-align: middle; padding-right: 14px;">
                <!-- Official S Ribbon Emblem -->
                <svg width="54" height="54" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;">
                  <defs>
                    <linearGradient id="scBlueGradEmail" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#3B82F6" />
                      <stop offset="50%" stop-color="#2563EB" />
                      <stop offset="100%" stop-color="#1D4ED8" />
                    </linearGradient>
                    <linearGradient id="scGreenGradEmail" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#34D399" />
                      <stop offset="50%" stop-color="#10B981" />
                      <stop offset="100%" stop-color="#059669" />
                    </linearGradient>
                  </defs>
                  <path d="M 75 22 C 50 22 26 30 26 50 C 26 62 36 72 50 82 L 62 90 C 72 96 82 98 82 90 C 82 82 72 74 62 66 C 50 56 42 48 42 38 C 42 30 54 28 68 28 C 76 28 85 30 85 22 Z" fill="url(#scBlueGradEmail)" />
                  <circle cx="48" cy="38" r="9" fill="url(#scBlueGradEmail)" />
                  <path d="M 45 98 C 70 98 94 90 94 70 C 94 58 84 48 70 38 L 58 30 C 48 24 38 22 38 30 C 38 38 48 46 58 54 C 70 64 78 72 78 82 C 78 90 66 92 52 92 C 44 92 35 90 35 98 Z" fill="url(#scGreenGradEmail)" />
                  <circle cx="72" cy="82" r="9" fill="url(#scGreenGradEmail)" />
                  <path d="M 50 59 L 57 66 L 70 51" stroke="#34D399" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </td>
              <td style="vertical-align: middle; text-align: left;">
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 28px; line-height: 1.05; letter-spacing: -0.5px;">
                  <span style="color: #ffffff; font-weight: 800; display: block;">Sessão</span>
                  <span style="color: #34d399; font-weight: 900; display: block;">Certa</span>
                </div>
              </td>
            </tr>
          </table>

          <!-- Official Tagline Dividers & Text -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 14px;">
            <tr>
              <td style="border-bottom: 1px solid #047857; width: 20px;"></td>
              <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 10px; font-weight: 600; color: #a7f3d0; text-transform: uppercase; letter-spacing: 0.8px; padding: 0 10px; text-align: center; white-space: nowrap;">
                Tecnologia que organiza o cuidado humano
              </td>
              <td style="border-bottom: 1px solid #047857; width: 20px;"></td>
            </tr>
          </table>
        </a>
      </div>
    </div>

    <div class="content-body">
      ${bodyContent}

      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 13px; color: #94a3b8; line-height: 1.5;">
        Atenciosamente,<br>
        <strong style="color: #f8fafc;">Equipe Sessão Certa</strong><br>
        <span style="color: #10b981; font-style: italic; font-size: 12px;">Tecnologia que organiza o cuidado humano.</span>
      </div>
    </div>

    <div class="footer">
      Enviado por <strong>Sessão Certa</strong> • <a href="${APP_URL}" class="footer-link">sessaocerta.shop</a><br>
      © ${new Date().getFullYear()} Sessão Certa. Todos os direitos reservados.<br>
      <span style="font-size: 11px; color: #475569;">E-mail transacional do sistema — não responda a esta mensagem.</span>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 1. Template: Boas-vindas
 */
export function getWelcomeEmailTemplate(opts: WelcomeEmailOptions): RenderedEmailTemplate {
  const loginUrl = opts.loginUrl || `${APP_URL}/login`;
  const subject = 'Bem-vindo ao Sessão Certa';

  const html = renderBaseTemplate(
    subject,
    `
    <div class="greeting">Seja muito bem-vindo(a), ${opts.name}!</div>
    <p class="paragraph">
      É um enorme prazer ter você no <strong>Sessão Certa</strong>. Nossa missão é simplificar a gestão do seu consultório de psicologia, para que você focar no que mais importa: o atendimento e o cuidado com seus pacientes.
    </p>

    <div class="highlight-box">
      <strong style="color: #10b981; font-size: 15px; display: block; margin-bottom: 8px;">🚀 O que você encontra na plataforma:</strong>
      <ul style="color: #cbd5e1; font-size: 13px; line-height: 1.8; margin-left: 18px; padding-left: 0;">
        <li>Agendamento rápido de consultas e prontuários organizados</li>
        <li>Notificações e confirmações automáticas por e-mail e WhatsApp</li>
        <li>Controle financeiro com relatórios claros e acompanhamento de honorários</li>
        <li>Apoio com Copilot de inteligência clínica para síntese de sessões</li>
      </ul>
    </div>

    <p class="paragraph">
      Sua conta está pronta para ser utilizada. Clique no botão abaixo para acessar o sistema:
    </p>

    <div style="text-align: center;">
      <a href="${loginUrl}" class="btn-primary" target="_blank">Acessar Minha Conta no Sessão Certa</a>
    </div>

    <p class="paragraph" style="font-size: 12px; color: #64748b; text-align: center;">
      Se o botão não funcionar, copie e cole este link no seu navegador:<br>
      <a href="${loginUrl}" style="color: #10b981; word-break: break-all;">${loginUrl}</a>
    </p>
    `
  );

  const text = `
Seja muito bem-vindo(a), ${opts.name}!

Obrigado por criar sua conta no Sessão Certa.
Plataforma completa de gestão inteligente para consultórios de psicologia.

Acesse o sistema agora em: ${loginUrl}

Equipe Sessão Certa
sessaocerta.shop
  `.trim();

  return { subject, html, text };
}

/**
 * 2. Template: Verificação de E-mail
 */
export function getVerificationEmailTemplate(opts: VerificationEmailOptions): RenderedEmailTemplate {
  const expiresIn = opts.expiresInMinutes || 15;
  const verificationUrl = opts.verificationUrl || `${APP_URL}/verify?code=${opts.code}&email=${encodeURIComponent(opts.to)}`;
  const subject = 'Confirme seu e-mail • Sessão Certa';

  const html = renderBaseTemplate(
    subject,
    `
    <div class="greeting">Olá, ${opts.name}!</div>
    <p class="paragraph">
      Recebemos sua solicitação de cadastro no <strong>Sessão Certa</strong>. Para concluir a ativação da sua conta com segurança, confirme seu e-mail.
    </p>

    <div style="background-color: #020617; border: 2px dashed #10b981; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #34d399; font-weight: 800; margin-bottom: 8px;">
        Seu Código de Verificação
      </div>
      <div style="font-size: 38px; font-weight: 900; color: #10b981; font-family: monospace; letter-spacing: 8px; margin: 6px 0;">
        ${opts.code}
      </div>
      <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
        ⏱️ Este código expira em ${expiresIn} minutos.
      </div>
    </div>

    <p class="paragraph">
      Você também pode clicar no botão abaixo para confirmar diretamente:
    </p>

    <div style="text-align: center;">
      <a href="${verificationUrl}" class="btn-primary" target="_blank">Confirmar Meu E-mail</a>
    </div>

    <p class="paragraph" style="font-size: 12px; color: #64748b; margin-top: 16px;">
      Caso você não tenha solicitado esta conta, por favor ignore esta mensagem.
    </p>
    `
  );

  const text = `
Olá, ${opts.name}!

Seu código de verificação para o Sessão Certa é: ${opts.code}
Este código expira em ${expiresIn} minutos.

Ou acesse o link de confirmação: ${verificationUrl}

Equipe Sessão Certa
  `.trim();

  return { subject, html, text };
}

/**
 * 3. Template: Recuperação de Senha
 */
export function getPasswordResetEmailTemplate(opts: PasswordResetOptions): RenderedEmailTemplate {
  const expiresIn = opts.expiresInMinutes || 30;
  const resetUrl = opts.resetUrl || `${APP_URL}/reset-password?token=${opts.resetToken}&email=${encodeURIComponent(opts.to)}`;
  const subject = 'Redefinição de senha • Sessão Certa';

  const html = renderBaseTemplate(
    subject,
    `
    <div class="greeting">Olá, ${opts.name}!</div>
    <p class="paragraph">
      Recebemos um pedido para redefinir a senha do seu acesso ao <strong>Sessão Certa</strong>.
    </p>

    <p class="paragraph">
      Para escolher uma nova senha com segurança, clique no botão abaixo:
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" class="btn-primary" target="_blank">Redefinir Minha Senha</a>
    </div>

    <div class="highlight-box">
      <strong style="color: #f59e0b; font-size: 13px; display: block; margin-bottom: 4px;">⚠️ Aviso de Segurança:</strong>
      <p style="color: #cbd5e1; font-size: 12px; line-height: 1.5;">
        Este link é de uso único e expira em <strong>${expiresIn} minutos</strong>.<br>
        Se você não solicitou a alteração de senha, nenhuma ação é necessária e sua senha atual continuará segura.
      </p>
    </div>

    <p class="paragraph" style="font-size: 11px; color: #64748b; text-align: center;">
      Link direto para redefinição:<br>
      <a href="${resetUrl}" style="color: #10b981; word-break: break-all;">${resetUrl}</a>
    </p>
    `
  );

  const text = `
Olá, ${opts.name}!

Solicitação de redefinição de senha para sua conta no Sessão Certa.
Acesse o link a seguir para redefinir sua senha: ${resetUrl}

Este link expira em ${expiresIn} minutos.
Se não foi você quem solicitou, apenas ignore esta mensagem.

Equipe Sessão Certa
  `.trim();

  return { subject, html, text };
}

/**
 * 4. Template: Alteração de Senha
 */
export function getPasswordChangedEmailTemplate(opts: PasswordChangedOptions): RenderedEmailTemplate {
  const now = opts.changedAt || new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const ip = opts.ipAddress || 'Não registrado';
  const subject = 'Senha alterada com sucesso • Sessão Certa';

  const html = renderBaseTemplate(
    subject,
    `
    <div class="greeting">Olá, ${opts.name}!</div>
    <p class="paragraph">
      Confirmamos que a senha da sua conta no <strong>Sessão Certa</strong> foi alterada recentemente com sucesso.
    </p>

    <table class="info-grid">
      <tr>
        <td class="info-label">Data e Hora:</td>
        <td class="info-value">${now}</td>
      </tr>
      <tr>
        <td class="info-label">Endereço IP:</td>
        <td class="info-value">${ip}</td>
      </tr>
      <tr>
        <td class="info-label">Status:</td>
        <td class="info-value" style="color: #10b981;">Concluído com Segurança</td>
      </tr>
    </table>

    <div style="background-color: #450a0a; border: 1px solid #7f1d1d; border-radius: 12px; padding: 18px; margin: 24px 0;">
      <strong style="color: #f87171; font-size: 13px; display: block; margin-bottom: 6px;">🚨 Não reconhece esta alteração?</strong>
      <p style="color: #fca5a5; font-size: 12px; line-height: 1.5;">
        Se você não realizou esta mudança, sua conta pode ter sido comprometida. Entre em contato imediatamente com o suporte através do e-mail <a href="mailto:suporte@sessaocerta.shop" style="color: #ffffff; underline">suporte@sessaocerta.shop</a> ou redefina sua senha imediatamente no sistema.
      </p>
    </div>
    `
  );

  const text = `
Olá, ${opts.name}!

Sua senha no Sessão Certa foi alterada com sucesso.
Data e Hora: ${now}
IP: ${ip}

Caso não tenha sido você, entre em contato imediatamente com suporte@sessaocerta.shop.

Equipe Sessão Certa
  `.trim();

  return { subject, html, text };
}

/**
 * 5. Template: Confirmação de Consulta
 */
export function getSessionConfirmationEmailTemplate(opts: SessionConfirmationOptions): RenderedEmailTemplate {
  const modalityLabel = opts.type === 'online' ? '💻 Online (Videochamada)' : '🏥 Presencial no Consultório';
  const subject = `Sua consulta está agendada • Sessão Certa`;

  const html = renderBaseTemplate(
    subject,
    `
    <div class="greeting">Olá, ${opts.patientName}!</div>
    <p class="paragraph">
      Sua consulta de psicologia está confirmada. Confira abaixo os detalhes do agendamento:
    </p>

    <table class="info-grid">
      <tr>
        <td class="info-label">Paciente:</td>
        <td class="info-value">${opts.patientName}</td>
      </tr>
      <tr>
        <td class="info-label">Psicólogo(a):</td>
        <td class="info-value">${opts.psychologistName}</td>
      </tr>
      <tr>
        <td class="info-label">Data:</td>
        <td class="info-value" style="color: #10b981; font-size: 15px;">${opts.date}</td>
      </tr>
      <tr>
        <td class="info-label">Horário:</td>
        <td class="info-value" style="color: #10b981; font-size: 15px;">${opts.time}</td>
      </tr>
      <tr>
        <td class="info-label">Modalidade:</td>
        <td class="info-value">${modalityLabel}</td>
      </tr>
      ${opts.price ? `
      <tr>
        <td class="info-label">Valor:</td>
        <td class="info-value">R$ ${opts.price.toFixed(2)}</td>
      </tr>
      ` : ''}
    </table>

    ${opts.type === 'online' && opts.videoUrl ? `
    <div style="background-color: #020617; border: 1px solid #0284c7; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
      <div style="font-size: 12px; color: #38bdf8; font-weight: 700; margin-bottom: 8px;">
        🎥 Sala Virtual da Consulta
      </div>
      <a href="${opts.videoUrl}" class="btn-primary" style="background-color: #0284c7; margin: 8px 0 0 0;" target="_blank">
        Acessar Sala do Google Meet / Videochamada
      </a>
      <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
        Acesse com alguns minutos de antecedência no horário marcado.
      </div>
    </div>
    ` : ''}

    ${opts.type === 'presencial' && opts.clinicAddress ? `
    <div class="highlight-box">
      <strong style="color: #10b981; font-size: 13px; display: block; margin-bottom: 4px;">📍 Endereço do Consultório:</strong>
      <p style="color: #f1f5f9; font-size: 13px;">${opts.clinicAddress}</p>
    </div>
    ` : ''}

    ${opts.notes ? `
    <p class="paragraph" style="font-style: italic; background-color: #020617; padding: 14px; border-radius: 8px; color: #cbd5e1;">
      " ${opts.notes} "
    </p>
    ` : ''}

    <p class="paragraph" style="margin-top: 24px; font-size: 13px;">
      Caso precise desmarcar ou alterar o seu horário, por favor entre em contato com antecedência com seu psicólogo(a).
    </p>
    `
  );

  const text = `
Olá, ${opts.patientName}!
Sua consulta está agendada.

Data: ${opts.date}
Hora: ${opts.time}
Psicólogo: ${opts.psychologistName}
Modalidade: ${opts.type}
${opts.videoUrl ? `Link de acesso: ${opts.videoUrl}` : ''}
${opts.clinicAddress ? `Endereço: ${opts.clinicAddress}` : ''}

Caso precise alterar seu horário entre em contato com seu profissional.

Equipe Sessão Certa
sessaocerta.shop
  `.trim();

  return { subject, html, text };
}
