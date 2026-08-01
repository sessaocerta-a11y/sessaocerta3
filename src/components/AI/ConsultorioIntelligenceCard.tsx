import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ClaraEngine } from '../../services/claraEngine';
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
  ShieldAlert,
  Wand2,
  Lightbulb,
  FileText,
  UserX,
  DollarSign,
  ArrowRight
} from 'lucide-react';
import { AiMessageGeneratorModal } from './AiMessageGeneratorModal';

interface ConsultorioIntelligenceCardProps {
  onGoToSchedule?: () => void;
  onGoToReminders?: () => void;
  onAskClara?: (prompt: string) => void;
}

export const ConsultorioIntelligenceCard: React.FC<ConsultorioIntelligenceCardProps> = ({
  onGoToSchedule,
  onGoToReminders,
  onAskClara
}) => {
  const { profile, patients, sessions } = useApp();
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [selectedPatientForMsg, setSelectedPatientForMsg] = useState({
    name: '',
    date: '',
    time: '',
  });

  const { timeStr: currentTimeStr } = ClaraEngine.getDateHelpers();
  const briefing = ClaraEngine.generateMorningBriefing(patients, sessions, profile);
  const insights = ClaraEngine.generateProactiveInsights(patients, sessions, profile);

  const triggerAskClara = (prompt: string) => {
    if (onAskClara) {
      onAskClara(prompt);
    } else {
      window.dispatchEvent(new CustomEvent('clara-ask-question', { detail: { prompt } }));
    }
  };

  const handleOpenMessageModal = (patientName?: string, date?: string, time?: string) => {
    setSelectedPatientForMsg({
      name: patientName || '',
      date: date || 'amanhã',
      time: time || '14:00',
    });
    setIsMsgModalOpen(true);
  };

  return (
    <div className="p-6 rounded-3xl bg-slate-900 border border-emerald-500/30 shadow-xl space-y-6 relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/60 font-bold text-lg">
            🌸
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-white tracking-tight">
                Clara Insights | Secretária Virtual Proativa
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                Assistente Oficial
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Resumo matinal, monitoramento em tempo real e detecção de oportunidades no consultório.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenMessageModal()}
          className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-2 shrink-0"
        >
          <Wand2 className="w-4 h-4 text-emerald-400" />
          <span>Gerar Mensagem IA</span>
        </button>
      </div>

      {/* 1. RESUMO MATINAL COMPLETO DA CLARA (Clara Briefing) */}
      <div className="p-5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-4 relative z-10 shadow-inner">
        <div className="flex items-center justify-between text-xs font-extrabold text-emerald-300">
          <span className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Briefing Matinal da Clara</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400">Atualizado às {currentTimeStr}</span>
        </div>

        <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          {briefing.summaryText}
        </div>

        {/* Quick Action Triggers */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {briefing.pendingEvolutionsCount > 0 && (
            <button
              onClick={() => triggerAskClara('Quais prontuários estão pendentes de preenchimento?')}
              className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ver {briefing.pendingEvolutionsCount} Prontuário(s) Pendente(s)</span>
            </button>
          )}

          {briefing.pendingPaymentsCount > 0 && (
            <button
              onClick={() => triggerAskClara('Quem ainda não pagou?')}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Conferir {briefing.pendingPaymentsCount} Cobrança(s) Pendente(s)</span>
            </button>
          )}

          {briefing.patientsWithoutReturnCount > 0 && (
            <button
              onClick={() => triggerAskClara('Quais pacientes não retornam há mais de 30 dias?')}
              className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Recontatar {briefing.patientsWithoutReturnCount} Paciente(s)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. PROACTIVE INSIGHTS CAROUSEL / GRID */}
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between text-xs font-extrabold text-slate-300">
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Sugestões Proativas Ativas</span>
          </span>
          <span className="text-[10px] text-slate-400">{insights.length} Oportunidades Mapeadas</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.slice(0, 4).map((ins) => (
            <div
              key={ins.id}
              className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    {ins.badgeText}
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <h4 className="text-xs font-extrabold text-white">{ins.title}</h4>
                <p className="text-[11px] text-slate-300 leading-snug">{ins.description}</p>
              </div>

              {ins.actionPrompt && (
                <button
                  onClick={() => triggerAskClara(ins.actionPrompt!)}
                  className="mt-2 py-1.5 px-3 bg-slate-900 hover:bg-emerald-950 border border-slate-800 hover:border-emerald-500/40 text-[11px] text-emerald-300 font-bold rounded-xl transition-all flex items-center justify-between group"
                >
                  <span>{ins.actionLabel || 'Perguntar à Clara'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          ))}
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

