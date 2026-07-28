import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bot,
  Send,
  X,
  Sparkles,
  MessageSquare,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Minimize2,
  Maximize2,
  RefreshCw,
  Copy,
  ThumbsUp,
  ShieldAlert
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const CopilotWidget: React.FC = () => {
  const { profile, patients, sessions, addToast } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Context summary for AI
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter((s) => s.date === todayStr);
  const confirmedCount = todaySessions.filter((s) => s.status === 'confirmada').length;
  const pendingCount = todaySessions.filter((s) => s.status === 'agendada').length;
  const activePatientsCount = patients.filter((p) => p.status === 'ativo').length;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: `Olá, ${profile.name || 'Dra. Fernanda'}! 🤖 Sou o **Copiloto do Sessão Certa**.\n\nComo posso ajudar seu consultório hoje? Você pode me perguntar sobre sua agenda, solicitar lembretes para pacientes ou pedir ideias para otimizar seus horários.`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const quickPrompts = [
    'Minha agenda está cheia essa semana?',
    'Quantos pacientes confirmaram hoje?',
    'Quem precisa de lembrete WhatsApp?',
    'Quantos horários livres tenho amanhã?',
    'Gere uma mensagem para avisar alteração de horário',
  ];

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context: {
            practitionerName: profile.name,
            todayCount: todaySessions.length,
            confirmedCount,
            pendingCount,
            activePatientsCount,
            occupancyRate: '82%',
          },
        }),
      });

      const data = await response.json();
      const aiReplyText = data.text || 'Desculpe, não consegui obter resposta no momento.';

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Erro na chamada da IA:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: '🤖 Tive uma oscilação de conexão, mas posso te adiantar: você possui ' + todaySessions.length + ' sessões hoje, sendo ' + confirmedCount + ' confirmadas.',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Texto copiado para a área de transferência!');
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full shadow-2xl shadow-purple-950/80 border border-purple-400/30 transition-all hover:scale-105 active:scale-95 group"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
          </div>
          <span className="text-xs font-extrabold tracking-wide hidden sm:inline">
            Copiloto do Consultório
          </span>
          <span className="text-[10px] bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-400/30 font-mono">
            IA
          </span>
        </button>
      )}

      {/* Floating Chat Drawer Container */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-slate-900 border border-purple-500/30 rounded-3xl shadow-2xl shadow-purple-950/90 flex flex-col transition-all duration-300 overflow-hidden ${
            isMinimized
              ? 'w-80 h-16'
              : 'w-88 sm:w-96 h-[520px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-extrabold text-white">Copiloto do Consultório</h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Gemini 3.6
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Assistente Administrativo Inteligente</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                title={isMinimized ? 'Expandir' : 'Minimizar'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                title="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Disclaimer Ribbon */}
              <div className="bg-purple-950/40 px-3.5 py-1.5 border-b border-purple-900/40 flex items-center gap-1.5 text-[10px] text-purple-300 shrink-0">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>IA para auxílio administrativo. Não substitui avaliação clínica.</span>
              </div>

              {/* Chat Message History */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 space-y-1 ${
                        msg.sender === 'user'
                          ? 'bg-purple-600 text-white rounded-tr-none shadow-md'
                          : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                      }`}
                    >
                      <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 text-[9px] opacity-70">
                        <span>{msg.timestamp}</span>
                        {msg.sender === 'ai' && (
                          <button
                            onClick={() => handleCopyText(msg.text)}
                            className="hover:text-purple-300 transition-colors flex items-center gap-1"
                            title="Copiar texto"
                          >
                            <Copy className="w-2.5 h-2.5" /> Copiar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    <span>O Copiloto está analisando e respondendo...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className="p-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0 ml-1" />
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(qp)}
                    disabled={isLoading}
                    className="whitespace-nowrap px-2.5 py-1 bg-slate-900 hover:bg-purple-950/80 border border-slate-800 hover:border-purple-500/40 text-[10px] text-slate-300 hover:text-purple-200 rounded-lg transition-all shrink-0"
                  >
                    {qp}
                  </button>
                ))}
              </div>

              {/* Input Footer */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Pergunte ao Copiloto..."
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    disabled={isLoading}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputPrompt.trim() || isLoading}
                    className="p-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white rounded-xl transition-all shadow-md shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
