import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { authenticatedFetch } from '../../services/apiClient';
import {
  Sparkles,
  X,
  MessageSquare,
  Copy,
  Send,
  Wand2,
  Check,
  RefreshCw,
  User,
  Calendar,
  Clock,
  ExternalLink
} from 'lucide-react';

interface AiMessageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPatientName?: string;
  initialDate?: string;
  initialTime?: string;
  initialTopic?: string;
}

export const AiMessageGeneratorModal: React.FC<AiMessageGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialPatientName = '',
  initialDate = '',
  initialTime = '',
  initialTopic = 'Lembrete de Confirmação de Sessão'
}) => {
  const { addToast } = useApp();
  const [patientName, setPatientName] = useState(initialPatientName);
  const [date, setDate] = useState(initialDate || 'amanhã');
  const [time, setTime] = useState(initialTime || '14:00');
  const [topic, setTopic] = useState(initialTopic);
  const [tone, setTone] = useState<'amigavel' | 'profissional' | 'formal'>('amigavel');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerateMessage = async () => {
    setIsLoading(true);
    setIsCopied(false);

    try {
      const response = await authenticatedFetch('/api/ai/message-generator', {
        method: 'POST',
        body: JSON.stringify({
          patientName,
          date,
          time,
          topic,
          tone,
        }),
      });

      const data = await response.json();
      setGeneratedMessage(data.message || 'Erro ao gerar mensagem.');
    } catch (err) {
      console.error('Erro ao gerar mensagem IA:', err);
      addToast('Erro ao comunicar com o servidor de IA.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedMessage) return;
    navigator.clipboard.writeText(generatedMessage);
    setIsCopied(true);
    addToast('Mensagem copiada com sucesso!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!generatedMessage) return;
    const encoded = encodeURIComponent(generatedMessage);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-purple-500/30 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Gerador de Mensagens Inteligente</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  IA
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Redija comunicações acolhedoras e profissionais para WhatsApp.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Paciente</label>
              <input
                type="text"
                placeholder="Ex: Maria Santos"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Data</label>
              <input
                type="text"
                placeholder="Ex: Quinta-feira (28/07)"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Horário</label>
              <input
                type="text"
                placeholder="Ex: 15:00"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Tópico / Rascunho Livre</label>
            <input
              type="text"
              placeholder="Ex: Preciso avisar que mudou o horário da sessão para quinta-feira"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Tone selector */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Tom da Comunicação</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTone('amigavel')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all ${
                  tone === 'amigavel'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                😊 Amigável
              </button>
              <button
                type="button"
                onClick={() => setTone('profissional')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all ${
                  tone === 'profissional'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                💼 Profissional
              </button>
              <button
                type="button"
                onClick={() => setTone('formal')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all ${
                  tone === 'formal'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                📜 Formal
              </button>
            </div>
          </div>

          <button
            onClick={handleGenerateMessage}
            disabled={isLoading}
            className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-purple-200" />
                <span>Gerando com IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-purple-300" />
                <span>Gerar Mensagem com IA</span>
              </>
            )}
          </button>

          {/* Result Box */}
          {generatedMessage && (
            <div className="space-y-2 pt-2 animate-fadeIn">
              <label className="font-bold text-purple-300 flex items-center justify-between">
                <span>Resultado Gerado:</span>
                <span className="text-[10px] text-slate-400 font-mono">Pronto para WhatsApp</span>
              </label>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs whitespace-pre-line leading-relaxed shadow-inner">
                {generatedMessage}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>

                <button
                  onClick={handleSendWhatsApp}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Enviar no WhatsApp</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
