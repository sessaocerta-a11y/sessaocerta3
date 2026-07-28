import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Session } from '../../types';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Save,
  ShieldCheck,
  Eye,
  EyeOff,
  Smile,
  CheckCircle2,
  FileText,
  DollarSign,
  HeartHandshake
} from 'lucide-react';

interface LiveSessionModalProps {
  session: Session;
  onClose: () => void;
}

export const LiveSessionModal: React.FC<LiveSessionModalProps> = ({
  session,
  onClose
}) => {
  const {
    saveClinicalNotes,
    updatePaymentStatus,
    getPatientById,
    hideConfidentialData,
    toggleHideConfidentialData
  } = useApp();

  const patient = getPatientById(session.patientId);

  // Timer State (50 min default)
  const [secondsLeft, setSecondsLeft] = useState(50 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Clinical Notes & Evolution State
  const [notes, setNotes] = useState(session.clinicalNotes || '');
  const [moodRating, setMoodRating] = useState<number>(session.moodRating || 3);
  const [homework, setHomework] = useState(session.homework || '');
  const [topics, setTopics] = useState<string[]>(session.topicsAddressed || []);
  const [newTopicInput, setNewTopicInput] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Timer countdown effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsLeft]);

  // Format seconds to MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleAddTopic = () => {
    if (newTopicInput.trim() && !topics.includes(newTopicInput.trim())) {
      setTopics([...topics, newTopicInput.trim()]);
      setNewTopicInput('');
    }
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    setTopics(topics.filter((t) => t !== topicToRemove));
  };

  const handleSaveNotes = () => {
    saveClinicalNotes(session.id, notes, moodRating, homework, topics);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleFinishConsultation = () => {
    saveClinicalNotes(session.id, notes, moodRating, homework, topics);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header Bar */}
        <div className="p-4 sm:p-6 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Atendimento em Andamento
                </h2>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ao Vivo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Paciente: <strong className="text-white">{session.patientName}</strong> | {session.type}
              </p>
            </div>
          </div>

          {/* Timer Display */}
          <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 font-mono text-xl font-extrabold text-emerald-400 px-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <span>{formatTime(secondsLeft)}</span>
            </div>

            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title={isTimerRunning ? 'Pausar Cronômetro' : 'Iniciar Cronômetro'}
            >
              {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                setSecondsLeft(50 * 60);
                setIsTimerRunning(true);
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Reiniciar Cronômetro (50 min)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Privacy & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleHideConfidentialData}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                hideConfidentialData ? 'bg-amber-950 text-amber-300 border-amber-700' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {hideConfidentialData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden md:inline">
                {hideConfidentialData ? 'Sigilo Ativo' : 'Ocultar Prontuário'}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 overflow-hidden">
          {/* Left Panel: Patient Info & Summary */}
          <div className="p-5 bg-slate-950/60 border-r border-slate-800 space-y-5 overflow-y-auto text-xs text-slate-300">
            <div className="space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <HeartHandshake className="w-4 h-4 text-emerald-400" />
                <span>Resumo do Paciente</span>
              </h3>

              <div className="space-y-2">
                <div><strong className="text-slate-400">Nome:</strong> {session.patientName}</div>
                <div><strong className="text-slate-400">Telefone:</strong> {patient?.phone || 'Não informado'}</div>
                <div><strong className="text-slate-400">Contato de Emergência:</strong> {patient?.emergencyContactName} ({patient?.emergencyContactPhone})</div>
                <div><strong className="text-slate-400">Valor da Sessão:</strong> R$ {session.price}</div>
              </div>
            </div>

            {/* Anamnese rápida */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <span className="font-bold text-white block">Queixa Principal / Anamnese:</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {patient?.initialAnamnesis || 'Sem registro de anamnese inicial.'}
              </p>
            </div>

            {/* Checklist de tópicos */}
            <div className="space-y-2">
              <span className="font-bold text-white block">Tópicos e Abordagens:</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Reestruturação Cognitiva"
                  value={newTopicInput}
                  onChange={(e) => setNewTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-600 focus:outline-none"
                />
                <button
                  onClick={handleAddTopic}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold"
                >
                  +
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {topics.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]"
                  >
                    <span>{t}</span>
                    <button onClick={() => handleRemoveTopic(t)} className="hover:text-white">×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Center & Right 2 Cols: Main Clinical Evolution Editor */}
          <div className="lg:col-span-2 p-6 space-y-4 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Evolução Clínica & Prontuário do Dia</span>
                </h3>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">Salvamento Automático</span>
                  <button
                    onClick={handleSaveNotes}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaved ? 'Salvo!' : 'Salvar Agora'}</span>
                  </button>
                </div>
              </div>

              {/* Textarea Evolution Notes */}
              {hideConfidentialData ? (
                <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-amber-300 text-xs font-bold">Modo Sigilo Ativado</p>
                  <p className="text-slate-500 text-[11px]">
                    O conteúdo do prontuário foi ocultado temporariamente. Desative o modo sigilo na barra superior para digitar ou visualizar.
                  </p>
                </div>
              ) : (
                <textarea
                  rows={10}
                  placeholder="Escreva a evolução psicoterápica da sessão, reações emocionais do paciente, relatos de vida, intervenções do psicólogo..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none font-sans leading-relaxed"
                />
              )}

              {/* Tarefas de casa / Atividade para próxima sessão */}
              <div className="space-y-1.5">
                <label className="font-semibold text-xs text-slate-300">
                  Tarefas de Casa & Exercícios Propostos:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Preencher o Diário de Pensamentos Automáticos durante episódios de ansiedade."
                  value={homework}
                  onChange={(e) => setHomework(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">Status Financeiro:</span>
                {session.paymentStatus === 'pago' ? (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800">
                    Sessão Paga (R$ {session.price})
                  </span>
                ) : (
                  <button
                    onClick={() => updatePaymentStatus(session.id, 'pago')}
                    className="px-3 py-1.5 rounded-lg bg-amber-950 text-amber-300 hover:bg-amber-900 border border-amber-800 text-xs font-bold transition-colors"
                  >
                    Dar Baixa no Pagamento (R$ {session.price})
                  </button>
                )}
              </div>

              <button
                onClick={handleFinishConsultation}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all"
              >
                Concluir Atendimento & Salvar Prontuário
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
