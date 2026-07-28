import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Bot,
  TrendingUp,
  AlertTriangle,
  Clock,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Zap,
  MessageCircle,
  HelpCircle,
  BarChart2,
  ShieldAlert,
  Wand2,
  Lightbulb
} from 'lucide-react';
import { AiMessageGeneratorModal } from './AiMessageGeneratorModal';

interface ConsultorioIntelligenceCardProps {
  onGoToSchedule?: () => void;
  onGoToReminders?: () => void;
}

export const ConsultorioIntelligenceCard: React.FC<ConsultorioIntelligenceCardProps> = ({
  onGoToSchedule,
  onGoToReminders,
}) => {
  const { profile, patients, sessions, addToast } = useApp();
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [selectedPatientForMsg, setSelectedPatientForMsg] = useState({
    name: '',
    date: '',
    time: '',
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter((s) => s.date === todayStr);
  const confirmedToday = todaySessions.filter((s) => s.status === 'confirmada').length;
  const pendingToday = todaySessions.filter((s) => s.status === 'agendada').length;

  // Identify next session
  const currentHour = new Date().getHours();
  const currentMin = new Date().getMinutes();
  const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
  const nextSession = todaySessions.find(
    (s) => s.startTime >= currentTimeStr && s.status !== 'realizada'
  ) || todaySessions[0];

  // Patients with high risk of missing (administrative signal: pending confirmation within <24h or history of rescheduling)
  const attentionSessions = sessions.filter(
    (s) => (s.status === 'agendada' || s.status === 'solicita_reagendamento') && s.date >= todayStr
  );

  const handleOpenMessageModal = (patientName?: string, date?: string, time?: string) => {
    setSelectedPatientForMsg({
      name: patientName || '',
      date: date || 'amanhã',
      time: time || '14:00',
    });
    setIsMsgModalOpen(true);
  };

  return (
    <div className="p-6 rounded-3xl bg-slate-900 border border-purple-500/30 shadow-xl space-y-6 relative overflow-hidden">
      {/* Glow background accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-950/60">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-white tracking-tight">
                Assistente Inteligente & Inteligência do Consultório
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                Capítulo 21 IA
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Análise administrativa da sua rotina e sugestões de otimização em tempo real.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenMessageModal()}
          className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-2 shrink-0"
        >
          <Wand2 className="w-4 h-4 text-purple-400" />
          <span>Gerar Mensagem IA</span>
        </button>
      </div>

      {/* 1. ASSISTENTE INTELIGENTE DO DIA */}
      <div className="p-5 rounded-2xl bg-slate-950/80 border border-purple-900/40 space-y-3 relative z-10">
        <div className="flex items-center justify-between text-xs font-extrabold text-purple-300">
          <span className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-400" /> Briefing do Dia para {profile.name || 'Dra. Fernanda'}
          </span>
          <span className="text-[10px] font-mono text-slate-400">Atualizado às {currentTimeStr}</span>
        </div>

        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
          {todaySessions.length > 0 ? (
            <>
              Hoje você possui <strong className="text-purple-300">{todaySessions.length} sessões agendadas</strong>.{' '}
              <strong className="text-emerald-400">{confirmedToday} já confirmaram</strong> e{' '}
              <strong className="text-amber-400">{pendingToday} aguardam resposta</strong>.{' '}
              {nextSession ? (
                <>
                  Sua próxima sessão é com <strong className="text-white">{nextSession.patientName}</strong> às{' '}
                  <strong className="text-purple-300">{nextSession.startTime}</strong> ({nextSession.type}).
                </>
              ) : (
                'Todas as sessões de hoje foram concluídas com sucesso!'
              )}
            </>
          ) : (
            'Você não possui sessões agendadas para hoje. Excelente momento para revisar prontuários pendentes ou organizar horários para a semana!'
          )}
        </p>

        {/* Action Pills */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {pendingToday > 0 && (
            <button
              onClick={onGoToReminders}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Enviar {pendingToday} Lembretes Pendentes</span>
            </button>
          )}

          <button
            onClick={() => handleOpenMessageModal('Maria Santos', 'Amanhã', '15:00')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5 text-purple-400" />
            <span>Redigir Aviso de Reagendamento</span>
          </button>
        </div>
      </div>

      {/* Grid containing Insights & Risk signals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {/* 2. RESUMO SEMANAL & INSIGHTS */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Insights da Semana
            </span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              +15% Presença
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                <strong>Confirmações em alta:</strong> Suas confirmações aumentaram 15% após a ativação dos lembretes automáticos no WhatsApp.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CalendarCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <p>
                <strong>Dia de maior movimento:</strong> Quarta-feira é seu dia de maior concentração de atendimentos (88% de ocupação).
              </p>
            </div>
          </div>
        </div>

        {/* 3. DETECÇÃO DE RISCO DE FALTA (SINAL DE ATENÇÃO ADMINISTRATIVA) */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 text-amber-400">
              <ShieldAlert className="w-4 h-4" /> Sinal de Atenção na Agenda
            </span>
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              {attentionSessions.length} Pendências
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            {attentionSessions.length > 0 ? (
              attentionSessions.slice(0, 2).map((s) => (
                <div
                  key={s.id}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-extrabold text-white">{s.patientName}</div>
                    <div className="text-[11px] text-slate-400">
                      {s.date} às {s.startTime} • Sem confirmação há 24h
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenMessageModal(s.patientName, s.date, s.startTime)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] border border-amber-500/30 shrink-0"
                  >
                    Lembrete IA
                  </button>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-xs">
                Nenhum sinal de atenção na agenda no momento! Todas as sessões próximas já foram confirmadas.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4. SUGESTÃO DE HORÁRIOS & OTIMIZAÇÃO DE ENCAIXE */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 relative z-10">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-purple-400" /> Sugestão Inteligente de Horários Livres
          </span>
          <button
            onClick={onGoToSchedule}
            className="text-[11px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
          >
            Ver Agenda <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold block">Terça-feira (Amanhã)</span>
            <div className="text-xs font-extrabold text-emerald-400">16:00 - 17:00</div>
            <p className="text-[10px] text-slate-500">Ideal para encaixe de retorno</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold block">Quinta-feira</span>
            <div className="text-xs font-extrabold text-emerald-400">10:00 - 11:00</div>
            <p className="text-[10px] text-slate-500">Intervalo recomendado pré-almoço</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold block">Sexta-feira</span>
            <div className="text-xs font-extrabold text-emerald-400">14:00 - 15:00</div>
            <p className="text-[10px] text-slate-500">Horário vago com alta procura</p>
          </div>
        </div>
      </div>

      {/* Modal Generator */}
      <AiMessageGeneratorModal
        isOpen={isMsgModalOpen}
        onClose={() => setIsMsgModalOpen(false)}
        initialPatientName={selectedPatientForMsg.name}
        initialDate={selectedPatientForMsg.date}
        initialTime={selectedPatientForMsg.time}
      />
    </div>
  );
};
