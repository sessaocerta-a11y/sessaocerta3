import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Zap,
  MessageCircle,
  Calendar,
  CreditCard,
  Mail,
  Smartphone,
  Bot,
  Radio,
  Share2,
  CheckCircle2,
  AlertCircle,
  Settings,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Copy,
  Sparkles,
  Sliders,
  Bell,
  Lock
} from 'lucide-react';

interface IntegrationItem {
  id: string;
  name: string;
  category: 'Comunicação' | 'Calendário' | 'Financeiro' | 'Automação & IA' | 'Notificações';
  description: string;
  icon: any;
  status: 'conectado' | 'ativo' | 'pendente' | 'configurar';
  badgeColor: string;
  lastSync?: string;
  details: string;
}

export const SessaoCertaConnectView: React.FC = () => {
  const { addToast, profile } = useApp();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('https://api.sessaocerta.com.br/v1/webhooks/psychologist_12983');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const [integrations, setIntegrations] = useState<IntegrationItem[]>([
    {
      id: 'whatsapp',
      name: 'WhatsApp Business API',
      category: 'Comunicação',
      description: 'Envio automático de lembretes, confirmações de presença e reagendamentos em tempo real.',
      icon: MessageCircle,
      status: 'conectado',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      lastSync: 'Há 2 minutos',
      details: 'Número conectado: ' + (profile.phone || '+55 (11) 99887-6655') + ' • Respostas automáticas de confirmação ativadas.',
    },
    {
      id: 'gcal',
      name: 'Google Calendar Sync',
      category: 'Calendário',
      description: 'Sincronização bidirecional das sessões agendadas para evitar conflitos de horários no seu dia a dia.',
      icon: Calendar,
      status: 'conectado',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      lastSync: 'Há 5 minutos',
      details: 'Sincronizado com: ' + (profile.email || 'dra.fernanda@sessaocerta.com.br') + ' • Calendário "Sessão Certa - Consultório".',
    },
    {
      id: 'gemini',
      name: 'IA Copiloto & Gemini 3.6 Flash',
      category: 'Automação & IA',
      description: 'Assistente administrativo inteligente no dashboard para briefing diário, sugestões e geração de mensagens.',
      icon: Bot,
      status: 'ativo',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      lastSync: 'Em tempo real',
      details: 'Modelo ativo: Google Gemini 3.6 Flash • Regras de LGPD e anonimização de dados pré-aplicadas.',
    },
    {
      id: 'pix',
      name: 'Gateway de Pagamentos & Pix Automático',
      category: 'Financeiro',
      description: 'Geração de cobranças via QR Code Pix e cartão com baixa automática do status de pagamento da sessão.',
      icon: CreditCard,
      status: 'ativo',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      lastSync: 'Ativo',
      details: 'Chave Pix cadastrada: ' + (profile.pixKey || '11998876655') + ' • Recebimento direto na conta do psicólogo.',
    },
    {
      id: 'apple_cal',
      name: 'Apple iCal / iOS Calendar',
      category: 'Calendário',
      description: 'Integração nativa para sincronização com o aplicativo Calendário no iPhone, iPad e Mac.',
      icon: Calendar,
      status: 'pendente',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      details: 'Pronto para sincronizar via feed iCal seguro. Requer autorização de dispositivo Apple.',
    },
    {
      id: 'outlook',
      name: 'Microsoft Outlook Calendar',
      category: 'Calendário',
      description: 'Sincronização com o ecossistema Microsoft 365 e Outlook para profissionais corporativos.',
      icon: Calendar,
      status: 'configurar',
      badgeColor: 'bg-slate-800 text-slate-400 border-slate-700',
      details: 'Conecte sua conta Microsoft para importar e exportar eventos automaticamente.',
    },
    {
      id: 'email_sms',
      name: 'Notificações por E-mail & SMS',
      category: 'Notificações',
      description: 'Canal alternativo de envio de lembretes e confirmações para pacientes que não utilizam WhatsApp.',
      icon: Mail,
      status: 'ativo',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      lastSync: 'Ativo',
      details: 'Remetente: notificacoes@sessaocerta.com.br • Taxa de entrega de 99.4%.',
    },
    {
      id: 'webhooks',
      name: 'Webhooks & Automações (Zapier / Make / n8n)',
      category: 'Automação & IA',
      description: 'Envio de eventos em tempo real (ex: paciente.criado, sessao.confirmada) para ferramentas externas.',
      icon: Radio,
      status: 'ativo',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      lastSync: 'Aguardando gatilhos',
      details: 'Endpoint ativo para eventos da clínica e integração com planilhas ou sistemas de prontuário externo.',
    },
  ]);

  const handleTestIntegration = (item: IntegrationItem) => {
    setTestingId(item.id);
    setTimeout(() => {
      setTestingId(null);
      addToast(`Teste da integração "${item.name}" executado com sucesso! Comunicação OK.`, 'success');
    }, 1200);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    addToast('URL do Webhook copiada para a área de transferência!');
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner Top Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-purple-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -top-10 -right-10 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-950/60">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Sessão Certa Connect</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Central de Integrações
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Conecte seu consultório às melhores ferramentas de comunicação, calendários, cobranças e IA.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-xs text-slate-400">Integrações Ativas</div>
            <div className="text-lg font-extrabold text-emerald-400 font-mono">5 / 8</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-xs text-slate-400">Status do Sistema</div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              100% Operacional
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((item) => {
          const IconComponent = item.icon;
          const isTesting = testingId === item.id;

          return (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-purple-400 shrink-0">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-white">{item.name}</h3>
                      <span className="text-[10px] text-slate-400">{item.category}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${item.badgeColor} uppercase tracking-wider shrink-0`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div className="text-slate-200 font-medium">{item.details}</div>
                  {item.lastSync && (
                    <div className="text-[10px] text-slate-500 font-mono">
                      Sincronização: {item.lastSync}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleTestIntegration(item)}
                  disabled={isTesting}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center gap-1.5"
                >
                  {isTesting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>{isTesting ? 'Testando...' : 'Testar Conexão'}</span>
                </button>

                <button
                  onClick={() => addToast(`Configurações de ${item.name} atualizadas!`, 'info')}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition-all flex items-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5 text-purple-400" />
                  <span>Configurar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Webhooks & API Developer Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-extrabold text-white">Endpoint de Webhook Público & Automações</h3>
          </div>
          <span className="text-[10px] font-mono bg-sky-500/10 text-sky-300 px-2.5 py-1 rounded-full border border-sky-500/20 font-bold">
            JSON Event-Driven
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Sua conta possui um endpoint seguro de Webhook habilitado para integrar o Sessão Certa com ferramentas de automação como Zapier, Make (Integromat), n8n ou seu próprio CRM.
        </p>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400">Sua URL do Webhook do Consultório:</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-purple-300 focus:outline-none"
            />
            <button
              onClick={handleCopyWebhook}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shrink-0"
            >
              {copiedWebhook ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedWebhook ? 'Copiado!' : 'Copiar URL'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
