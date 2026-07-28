# Sessão Certa - Plataforma Completa de Gestão para Psicólogos e Terapeutas

Este é o repositório completo e pronto para produção do **Sessão Certa**. O projeto inclui **Frontend (React 19 + Tailwind CSS)**, **Backend (Express Node.js em TypeScript)**, **Integração com Resend (E-mails Transacionais com Fallback)**, **Sistema de Logs e Auditoria** e **Integração com a API Gemini AI**.

---

## 🛠️ Como Exportar o Código Fonte no Google AI Studio

Você pode baixar todo este código diretamente do Google AI Studio a qualquer momento:
1. No canto superior da interface do **AI Studio**, clique no menu de **Opções / Configurações (ícone de engrenagem ou menu de três pontos)**.
2. Selecione **Export to ZIP** (para baixar todo o código fonte compactado para o seu computador) ou **Export to GitHub** (para criar/atualizar um repositório no seu GitHub pessoal/da empresa).

---

## 🏗️ Estrutura do Projeto

- `/server.ts`: Servidor Node.js Express de produção com suporte a SSR, APIs de logs, auditoria de e-mails, webhooks e Gemini API.
- `/src/App.tsx`: Ponto de entrada do aplicativo React, rotas e estados de navegação.
- `/src/components/`: Componentes modulares (Admin, Agendamentos, Prontuários, Gestão Financeira, Pacientes, Módulo IA, etc.).
- `/src/services/emailService.ts`: Módulo de despacho de e-mails de verificação via Resend API e SMTP/Nodemailer.
- `/src/services/emailAuditDb.ts`: Banco de dados e motor de auditoria de disparos de e-mail.
- `/src/services/webhookService.ts`: Processador de Webhooks do Resend para confirmações de entrega (`delivered`) e falhas (`failed`/`bounced`).
- `/src/utils/logger.ts`: Sistema de logs centralizado para auditoria e monitoramento de falhas em produção.
- `/Dockerfile`: Configuração Docker multi-stage otimizada para implantação em qualquer nuvem.
- `/.env.example`: Modelo de variáveis de ambiente do sistema.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js**: Versão 18 ou 20+
- **npm** ou **bun**

### Passo a Passo

1. Instale as dependências:
```bash
npm install
```

2. Crie o arquivo `.env` com base no `.env.example`:
```bash
cp .env.example .env
```

3. Preencha suas chaves no `.env` (Resend API Key, Gemini API Key, etc.):
```env
GEMINI_API_KEY="sua_chave_gemini_aqui"
RESEND_API_KEY="re_sua_chave_resend_aqui"
```

4. Execute o ambiente de desenvolvimento:
```bash
npm run dev
```
Acesse `http://localhost:3000` no seu navegador.

5. Gerar Build de Produção e Rodar Localmente:
```bash
npm run build
npm start
```

---

## ☁️ Como Hospedar em Outros Provedores

### Opção 1: Render / Railway / Fly.io (Recomendado)
1. Crie uma nova conta no **Render.com** ou **Railway.app**.
2. Conecte o seu repositório do **GitHub**.
3. Defina o comando de build como `npm run build` e o comando de inicialização como `npm start`.
4. Em **Environment Variables**, adicione as variáveis presentes no seu `.env` (`GEMINI_API_KEY`, `RESEND_API_KEY`, `NODE_ENV=production`).
5. A porta padrão do servidor é `3000` (definida pela variável `PORT`).

### Opção 2: Docker (AWS, Google Cloud Run, DigitalOcean, VPS)
1. Faça o build da imagem Docker:
```bash
docker build -t sessao-certa .
```
2. Execute o container:
```bash
docker run -p 3000:3000 -e GEMINI_API_KEY="sua_chave" -e RESEND_API_KEY="sua_chave" sessao-certa
```

---

## 📧 Configuração do Resend para E-mails Transacionais
Para receber webhooks do Resend no seu servidor hospedado:
1. Acesse o painel do **Resend** (https://resend.com/webhooks).
2. Adicione um novo Webhook apontando para: `https://seu-dominio.com/api/webhooks/resend`.
3. Selecione os eventos `email.sent`, `email.delivered`, `email.failed`, `email.bounced`.
