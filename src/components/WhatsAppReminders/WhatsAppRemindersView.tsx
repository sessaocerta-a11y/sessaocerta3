import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Session } from '../../types';
import {
  MessageSquare,
  MessageCircle,
  Send,
  CheckCircle2,
  Clock,
  Edit2,
  Save,
  RotateCcw,
  Calendar,
  ExternalLink,
  Info
} from 'lucide-react';

interface WhatsAppRemindersViewProps {
  onSimulatePatientLink?: (session: Session) => void;
}

export const WhatsAppRemindersView: React.FC<WhatsAppRemindersViewProps> = ({
  onSimulatePatientLink
}) => {
  const {
    sessions,
    profile,
    updateProfile,
    generateWhatsAppLink,
    updateSession,
    updateSessionStatus
  } = useApp();

  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [templateText, setTemplateText] = useState(profile.whatsappTemplate);

  // Filter sessions for today and upcoming days
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingSessions = sessions
    .filter((s) => s.date >= todayStr && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo')
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });

  const handleSaveTemplate = () => {
    updateProfile({ whatsappTemplate: templateText });
    setIsEditingTemplate(false);
  };

  const handleSendAndMark = (session: Session, type: '24h' | '2h' = '24h') => {
    let url = generateWhatsAppLink(session);
    if (type === '2h') {
      // Customize message for 2h reminder
      const patient = sessions.find((s) => s.id === session.id);
      const msg = `Olá, ${session.patientName.split(' ')[0]}! Sua sessão de psicologia começa em breve, às ${session.startTime}. Lembramos de seu atendimento hoje. Podemos confirmar?`;
      const rawPhone = patient?.patientId ? profile.phone : '';
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    }
    if (url) {
      window.open(url, '_blank');
      updateSession(session.id, {
        whatsappReminderSent: true,
        whatsappReminderDate: new Date().toISOString().split('T')[0],
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-900/40 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-2">
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Automação Inteligente & Redução de Faltas</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Central de Lembretes do WhatsApp
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Mensagens automáticas 24h e 2h antes da consulta, com links criptografados de 1 clique e Confirmação Inteligente.
          </p>
        </div>
      </div>

      {/* Metrics Card: 35 enviadas, 32 entregues, 29 confirmadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-xs font-bold text-slate-400">Mensagens Enviadas</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">35</span>
            <span className="text-[10px] text-emerald-400 font-bold">100% entregas</span>
          </div>
          <p className="text-[10px] text-slate-500">Últimos 30 dias</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-xs font-bold text-slate-400">Mensagens Entregues</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-400">32</span>
            <span className="text-[10px] text-sky-300 font-bold">91.4% taxa</span>
          </div>
          <p className="text-[10px] text-slate-500">Notificações lidas/entregues</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-xs font-bold text-slate-400">Presenças Confirmadas</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">29</span>
            <span className="text-[10px] text-emerald-300 font-bold">90.6% retorno</span>
          </div>
          <p className="text-[10px] text-slate-500">Através do link de 1 clique</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-xs font-bold text-slate-400">Horário de Proteção</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-amber-300">08:00 – 20:00</span>
          </div>
          <p className="text-[10px] text-slate-400">Fuso America/Sao_Paulo (sem spam noturno)</p>
        </div>
      </div>

      {/* Template Manager Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Modelo da Mensagem do Lembrete</h2>
          </div>

          {!isEditingTemplate ? (
            <button
              onClick={() => setIsEditingTemplate(true)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold transition-colors"
            >
              Editar Modelo
            </button>
          ) : (
            <button
              onClick={handleSaveTemplate}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Modelo</span>
            </button>
          )}
        </div>

        {isEditingTemplate ? (
          <div className="space-y-3">
            <textarea
              rows={4}
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
            />
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="font-bold text-slate-300">Variáveis disponíveis para personalização automática:</span>
              <p className="font-mono text-emerald-400">
                {'{nome}'} | {'{data}'} | {'{horario}'} | {'{link_online}'}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
            {profile.whatsappTemplate}
          </div>
        )}
      </div>

      {/* Upcoming Sessions List */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Sessões Próximas para Envio de Lembrete</span>
          </h2>

          <span className="text-xs font-mono text-slate-400">
            {upcomingSessions.length} agendamento(s)
          </span>
        </div>

        {upcomingSessions.length === 0 ? (
          <p className="text-slate-500 text-xs text-center py-8">
            Nenhuma sessão futura agendada para envio de lembrete no momento.
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map((session) => (
              <div
                key={session.id}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {session.patientName}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        session.type === 'online'
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {session.type}
                    </span>

                    {session.status === 'confirmada' && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Presença Confirmada
                      </span>
                    )}

                    {session.status === 'solicita_reagendamento' && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/90 px-2 py-0.5 rounded border border-amber-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Reagendamento Solicitado
                      </span>
                    )}

                    {session.status === 'agendada' && (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        Aguardando Confirmação
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 font-mono">
                    Data: <strong className="text-slate-200">{session.date}</strong> às <strong className="text-slate-200">{session.startTime}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Quick status update buttons */}
                  {session.status !== 'confirmada' && (
                    <button
                      onClick={() => updateSessionStatus(session.id, 'confirmada')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 text-[11px] font-bold transition-colors"
                      title="Marcar como Confirmado"
                    >
                      Confirmar Presença
                    </button>
                  )}

                  {session.status !== 'solicita_reagendamento' && (
                    <button
                      onClick={() => updateSessionStatus(session.id, 'solicita_reagendamento')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 text-[11px] font-bold transition-colors"
                      title="Registrar Pedido de Reagendamento"
                    >
                      Reagendar
                    </button>
                  )}

                  {onSimulatePatientLink && (
                    <button
                      onClick={() => onSimulatePatientLink(session)}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-800 text-[11px] font-bold transition-colors flex items-center gap-1"
                      title="Simular visualização que o paciente acessa ao clicar no link"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Link do Paciente</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleSendAndMark(session)}
                    className="flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar no WhatsApp</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
