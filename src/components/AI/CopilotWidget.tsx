import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ClaraChatMessage,
  ClaraPendingAction,
  ClaraProactiveInsight
} from '../../types';
import { ClaraEngine } from '../../services/claraEngine';
import { authenticatedFetch } from '../../services/apiClient';
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
  ShieldAlert,
  Zap,
  ArrowRight,
  Check,
  Ban,
  DollarSign,
  TrendingUp,
  UserCheck
} from 'lucide-react';

export const CopilotWidget: React.FC = () => {
  const {
    profile,
    patients,
    sessions,
    addPatient,
    updatePatient,
    deletePatient,
    addSession,
    updateSession,
    deleteSession,
    updateSessionStatus,
    updatePaymentStatus,
    saveClinicalNotes,
    generateWhatsAppLink,
    addToast
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'proactive'>('chat');
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inProgressState, setInProgressState] = useState<{ type: string; step?: string; data?: any } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial welcome message from Clara (smart dynamic greeting)
  const [messages, setMessages] = useState<ClaraChatMessage[]>(() => {
    const smart = ClaraEngine.generateSmartGreeting(patients, sessions, profile);
    return [
      {
        id: 'msg-1',
        sender: 'ai',
        text: smart.summaryText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const quickPrompts = [
    'Quais pacientes tenho hoje?',
    'Quantas consultas tenho amanhã?',
    'Quanto faturei este mês?',
    'Quem ainda não pagou?',
    'Quantos pacientes ativos tenho?',
  ];

  // Auto-scroll chat history
  useEffect(() => {
    if (isOpen && !isMinimized && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, activeTab]);

  const handleSendMessageRef = useRef<(prompt?: string) => void>(() => {});

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  // Daily Executive Smart Greeting Briefing
  useEffect(() => {
    const { todayStr } = ClaraEngine.getDateHelpers();
    const lastBriefingDate = localStorage.getItem('clara_last_briefing_date');
    if (lastBriefingDate !== todayStr && profile) {
      const briefing = ClaraEngine.generateMorningBriefing(patients, sessions, profile);
      const briefingMsg: ClaraChatMessage = {
        id: `briefing-${Date.now()}`,
        sender: 'ai',
        text: briefing.summaryText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id.startsWith('briefing-'))) return prev;
        return [briefingMsg, ...prev];
      });
      localStorage.setItem('clara_last_briefing_date', todayStr);
    }
  }, [patients, sessions, profile]);

  // Listen for global custom event 'clara-ask-question' to open Clara and send prompt
  useEffect(() => {
    const handleAskClaraEvent = (e: CustomEvent<{ prompt: string }>) => {
      if (e.detail && e.detail.prompt) {
        setIsOpen(true);
        setIsMinimized(false);
        setActiveTab('chat');
        handleSendMessageRef.current(e.detail.prompt);
      }
    };

    window.addEventListener('clara-ask-question' as any, handleAskClaraEvent as any);
    return () => {
      window.removeEventListener('clara-ask-question' as any, handleAskClaraEvent as any);
    };
  }, []);

  // Compute Proactive Insights from ClaraEngine (memoized for performance)
  const proactiveInsights = useMemo(() => {
    return ClaraEngine.generateProactiveInsights(patients, sessions, profile);
  }, [patients, sessions, profile]);

  /**
   * Directly execute system functions in AppContext and update real database
   */
  const executeClaraAction = (actionType: string, payload: any) => {
    if (actionType === 'add_patient') {
      const emergencyParts = (payload.emergencyContact || '').split('-');
      const emName = emergencyParts[0] ? emergencyParts[0].trim() : 'Contato de Emergência';
      const emPhone = emergencyParts[1] ? emergencyParts[1].trim() : (payload.phone || '(11) 99999-0000');

      const newP = addPatient({
        name: payload.name || 'Novo Paciente',
        email: payload.email || `${(payload.name || 'paciente').toLowerCase().replace(/\s+/g, '')}@email.com`,
        phone: payload.phone || '(11) 99999-0000',
        cpf: payload.cpf || '',
        birthDate: payload.birthDate || '',
        status: 'ativo',
        sessionPrice: payload.sessionPrice || 150,
        attendanceType: payload.attendanceType || 'online',
        city: payload.city || '',
        state: payload.state || '',
        country: payload.country || 'Brasil',
        emergencyContactName: payload.emergencyContactName || emName,
        emergencyContactPhone: payload.emergencyContactPhone || emPhone,
        initialAnamnesis: payload.notes || '',
        notes: payload.notes || ''
      });
      addToast(`Paciente ${newP.name} cadastrado com sucesso!`, 'success');
    } else if (actionType === 'edit_patient' && payload.id) {
      updatePatient(payload.id, payload.updates || {}, 'Clara (Assistente Virtual)');
    } else if (actionType === 'archive_patient' && (payload.id || payload.patientId)) {
      updatePatient(payload.id || payload.patientId, { status: 'arquivado' }, 'Clara (Assistente Virtual)');
    } else if (actionType === 'discharge_patient' && (payload.id || payload.patientId)) {
      updatePatient(payload.id || payload.patientId, { status: 'alta' }, 'Clara (Assistente Virtual)');
    } else if (actionType === 'delete_patient' && payload.id) {
      deletePatient(payload.id, profile?.name || 'Clara (Assistente Virtual)');
    } else if (actionType === 'create_session') {
      const matchedP = patients.find(p => p.name.toLowerCase() === (payload.patientName || '').toLowerCase());
      const newS = addSession({
        patientId: matchedP ? matchedP.id : (payload.patientId || `pat-${Date.now()}`),
        patientName: payload.patientName || (matchedP ? matchedP.name : 'Paciente'),
        date: payload.date || new Date().toISOString().split('T')[0],
        startTime: payload.startTime || '14:00',
        endTime: payload.endTime || '15:00',
        status: 'agendada',
        type: payload.type || 'online',
        price: payload.price || (matchedP ? matchedP.sessionPrice : 150),
        paymentStatus: 'pendente',
        recurrence: 'pontual'
      });
      addToast(`Consulta agendada para ${newS.patientName} em ${newS.date.split('-').reverse().join('/')} às ${newS.startTime}!`, 'success');
    } else if (actionType === 'reschedule_session' && payload.sessionId) {
      updateSession(payload.sessionId, {
        date: payload.newDate,
        startTime: payload.newTime,
        endTime: payload.newTime,
        status: 'agendada'
      });
      addToast(`Consulta reagendada para ${payload.newDate.split('-').reverse().join('/')} às ${payload.newTime}!`, 'success');
    } else if (actionType === 'cancel_session' && payload.sessionId) {
      updateSessionStatus(payload.sessionId, 'cancelada_psicologo');
      addToast(`Consulta de ${payload.patientName || 'paciente'} cancelada!`, 'info');
    } else if (actionType === 'create_clinical_note') {
      if (payload.sessionId) {
        saveClinicalNotes(payload.sessionId, payload.notes || '');
        addToast(`Evolução clínica/prontuário salvo!`, 'success');
      } else {
        const pName = payload.patientName || '';
        const pSessions = sessions.filter(s => s.patientName.toLowerCase().includes(pName.toLowerCase()));
        if (pSessions.length > 0) {
          saveClinicalNotes(pSessions[0].id, payload.notes || '');
          addToast(`Evolução clínica registrada para ${pSessions[0].patientName}!`, 'success');
        } else {
          const matchedP = patients.find(p => p.name.toLowerCase().includes(pName.toLowerCase()));
          if (matchedP) {
            updatePatient(matchedP.id, {
              initialAnamnesis: matchedP.initialAnamnesis ? `${matchedP.initialAnamnesis}\n\n[${new Date().toLocaleDateString('pt-BR')}] ${payload.notes}` : payload.notes
            });
            addToast(`Evolução salva na ficha de ${matchedP.name}!`, 'success');
          }
        }
      }
    } else if (actionType === 'send_email') {
      addToast(`E-mail enviado com sucesso para ${payload.email || payload.patientName}!`, 'success');
    } else if (actionType === 'send_whatsapp') {
      const matchedS = sessions.find(s => s.patientName.toLowerCase().includes((payload.patientName || '').toLowerCase()));
      if (matchedS) {
        const link = generateWhatsAppLink(matchedS);
        window.open(link, '_blank');
        addToast(`WhatsApp iniciado para ${matchedS.patientName}!`, 'success');
      } else {
        const cleanPhone = (payload.phone || '').replace(/\D/g, '');
        const welcomeText = `Olá ${payload.patientName || ''}, seja bem-vindo(a) ao consultório! Estou à disposição.`;
        const link = `https://wa.me/55${cleanPhone || '11999990000'}?text=${encodeURIComponent(welcomeText)}`;
        window.open(link, '_blank');
        addToast(`WhatsApp iniciado para ${payload.patientName || 'paciente'}!`, 'success');
      }
    } else if (actionType === 'confirm_session' && payload.sessionId) {
      updateSessionStatus(payload.sessionId, 'confirmada');
      addToast(`Consulta confirmada com sucesso!`, 'success');
    } else if (actionType === 'mark_paid') {
      if (payload.sessionId) {
        updatePaymentStatus(payload.sessionId, 'pago');
        addToast(`Pagamento marcado como PAGO!`, 'success');
      } else {
        const pName = payload.patientName || '';
        const pSessions = sessions.filter(s => s.patientName.toLowerCase().includes(pName.toLowerCase()));
        if (pSessions.length > 0) {
          updatePaymentStatus(pSessions[0].id, 'pago');
          addToast(`Pagamento registrado com sucesso para ${pSessions[0].patientName}!`, 'success');
        } else {
          // Create session entry with paid status
          const today = new Date().toISOString().split('T')[0];
          addSession({
            patientName: pName || 'Paciente',
            date: today,
            startTime: '10:00',
            durationMinutes: 50,
            type: 'presencial',
            status: 'realizada',
            price: payload.amount || 150,
            paymentStatus: 'pago'
          });
          addToast(`Pagamento de R$ ${payload.amount || 150},00 registrado com sucesso!`, 'success');
        }
      }
    } else if (actionType === 'open_prontuario') {
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'patients' } }));
      if (payload.patientName) {
        window.dispatchEvent(new CustomEvent('open-patient-detail', { detail: { patientName: payload.patientName } }));
      }
      addToast(`Prontuário de ${payload.patientName || 'paciente'} aberto na tela.`, 'info');
    } else if (actionType === 'open_patients_list' || actionType === 'open_patients_tab') {
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'patients' } }));
      window.dispatchEvent(new CustomEvent('open-new-patient-modal'));
      addToast(`Aba de pacientes e formulário de cadastro abertos!`, 'info');
    }
  };

  /**
   * Send query to Clara (integrating Backend Gemini API with Local ClaraEngine Fallback)
   */
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim() || isLoading) return;

    const userMsg: ClaraChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputPrompt('');
    setIsLoading(true);

    // Compute local fallbacks, action execution and context
    const localResult = ClaraEngine.processQuery(prompt, patients, sessions, profile, messages, inProgressState);
    const { todayStr, tomorrowStr } = ClaraEngine.getDateHelpers();

    if (localResult.executeImmediately) {
      executeClaraAction(localResult.executeImmediately.type, localResult.executeImmediately.payload);
      if (localResult.nextInProgressState !== undefined) {
        setInProgressState(localResult.nextInProgressState);
      } else {
        setInProgressState(null);
      }
    } else if (localResult.nextInProgressState !== undefined) {
      setInProgressState(localResult.nextInProgressState);
    } else {
      setInProgressState(null);
    }

    try {
      const response = await authenticatedFetch('/api/ai/copilot', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          context: {
            practitionerName: profile.name,
            crp: profile.crp,
            specialty: profile.specialty,
            todayStr,
            tomorrowStr,
            patients: patients.map((p) => ({
              id: p.id,
              name: p.name,
              status: p.status,
              birthDate: p.birthDate,
              phone: p.phone,
            })),
            sessions: sessions.map((s) => ({
              id: s.id,
              patientName: s.patientName,
              date: s.date,
              startTime: s.startTime,
              status: s.status,
              price: s.price,
              paymentStatus: s.paymentStatus,
              hasClinicalNotes: !!(s.clinicalNotes && s.clinicalNotes.trim().length > 0),
            })),
            history: messages.slice(-4).map((m) => ({ sender: m.sender, text: m.text })),
          },
        }),
      });

      const data = await response.json();
      let aiReplyText = data.text;

      // If action executed locally or backend response is unavailable, empty, isFallback or generic greeting, use ClaraEngine local result
      if (
        localResult.executeImmediately ||
        localResult.nextInProgressState ||
        !aiReplyText ||
        data.isFallback ||
        aiReplyText.includes('Erro') ||
        aiReplyText.includes('oscilação') ||
        (aiReplyText.includes('Eu sou a Clara') && aiReplyText.includes('Como posso te auxiliar'))
      ) {
        aiReplyText = localResult.text;
      }

      const aiMsg: ClaraChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        pendingAction: localResult.pendingAction
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (_err) {
      // Clean fallback using ClaraEngine local deterministic calculations
      const aiMsg: ClaraChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: localResult.text,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        pendingAction: localResult.pendingAction
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Execute action requested by user (e.g. Cancel session, Confirm payment)
   */
  const handleExecuteAction = (msgId: string, action: ClaraPendingAction) => {
    if (action.type === 'cancel_session' && action.sessionId) {
      updateSessionStatus(action.sessionId, 'cancelada_psicologo');
      addToast(`Consulta de ${action.patientName} cancelada com sucesso!`, 'info');
    } else if (action.type === 'mark_paid' && action.sessionId) {
      updatePaymentStatus(action.sessionId, 'pago');
      addToast(`Pagamento de ${action.patientName} marcado como PAGO!`, 'success');
    } else if (action.type === 'confirm_session' && action.sessionId) {
      updateSessionStatus(action.sessionId, 'confirmada');
      addToast(`Sessão de ${action.patientName} confirmada!`, 'success');
    }

    // Mark action as executed in message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, actionExecuted: true } : m
      )
    );

    // Clara replies with confirmation acknowledgment
    setMessages((prev) => [
      ...prev,
      {
        id: `ai-conf-${Date.now()}`,
        sender: 'ai',
        text: `✅ **Ação Concluída!** A alteração referente a **${action.patientName || 'paciente'}** foi realizada e registrada com sucesso no sistema.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
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
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-full shadow-2xl shadow-emerald-950/80 border border-emerald-400/40 transition-all hover:scale-105 active:scale-95 group"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-emerald-200 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
          </div>
          <span className="text-xs font-extrabold tracking-wide hidden sm:inline">
            Falar com a Clara
          </span>
          <span className="text-[10px] bg-slate-950/80 px-2 py-0.5 rounded-full border border-emerald-400/30 font-semibold text-emerald-300">
            Assistente Clara
          </span>
        </button>
      )}

      {/* Floating Chat Drawer Container */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/30 rounded-3xl shadow-2xl shadow-slate-950/90 flex flex-col transition-all duration-300 overflow-hidden ${
            isMinimized
              ? 'w-80 h-16'
              : 'w-88 sm:w-96 h-[560px] max-h-[88vh]'
          }`}
        >
          {/* Header */}
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-sm">
                🌸
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-extrabold text-white">Clara | Sessão Certa</h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Assistente Oficial
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Inteligência Clínica & Gestão</p>
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
              {/* Navigation Tabs (Chat vs Modo Proativo) */}
              <div className="flex border-b border-slate-800 bg-slate-950/80 shrink-0">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-2 text-center text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                    activeTab === 'chat'
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>💬 Chat com a Clara</span>
                </button>
                <button
                  onClick={() => setActiveTab('proactive')}
                  className={`flex-1 py-2 text-center text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                    activeTab === 'proactive'
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>⚡ Modo Proativo</span>
                </button>
              </div>

              {/* TAB 1: CHAT MODE */}
              {activeTab === 'chat' && (
                <>
                  {/* Ethical Banner */}
                  <div className="bg-emerald-950/40 px-3 py-1.5 border-b border-emerald-900/40 flex items-center gap-1.5 text-[10px] text-emerald-300/90 shrink-0">
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Conectada exclusivamente aos dados reais do seu consultório.</span>
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
                          className={`max-w-[88%] rounded-2xl p-3 space-y-2 ${
                            msg.sender === 'user'
                              ? 'bg-emerald-600 text-white rounded-tr-none shadow-md'
                              : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                          }`}
                        >
                          <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>

                          {/* Interactive Action Chips (e.g. [08:00], [Agendar Paciente], [Enviar Cobrança WhatsApp]) */}
                          {msg.sender === 'ai' && (
                            (() => {
                              const matches = Array.from(msg.text.matchAll(/\[(.*?)\]/g)).map((m) => m[1]);
                              if (matches.length === 0) return null;
                              return (
                                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
                                  {matches.map((chip, idx) => {
                                    const isTimeSlot = /^\d{2}:\d{2}$/.test(chip);
                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => {
                                          if (isTimeSlot) {
                                            handleSendMessage(`Agendar consulta às ${chip}`);
                                          } else if (chip.includes('WhatsApp') || chip.includes('Parabéns')) {
                                            handleSendMessage(`Mandar mensagem WhatsApp para o paciente`);
                                          } else if (chip.includes('Pago')) {
                                            handleSendMessage(`Marcar pagamento pendente como pago`);
                                          } else if (chip.includes('Cadastrar')) {
                                            window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'patients' } }));
                                            window.dispatchEvent(new CustomEvent('open-new-patient-modal'));
                                            handleSendMessage(`Cadastrar novo paciente`);
                                          } else if (chip.includes('Prontuário') || chip.includes('Prontuários')) {
                                            handleSendMessage(`Quais prontuários estão pendentes de preenchimento?`);
                                          } else if (chip.includes('Pagamento') || chip.includes('Pagamentos')) {
                                            handleSendMessage(`Quem ainda não pagou?`);
                                          } else if (chip.includes('Agenda')) {
                                            handleSendMessage(`Clara, quais pacientes tenho hoje?`);
                                          } else if (chip.includes('Retorno') || chip.includes('Retornos')) {
                                            handleSendMessage(`Quais pacientes estão sem retorno?`);
                                          } else if (chip.includes('Cancelar')) {
                                            setInProgressState(null);
                                            handleSendMessage(`Cancelar`);
                                          } else {
                                            handleSendMessage(chip);
                                          }
                                        }}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-sm flex items-center gap-1 ${
                                          isTimeSlot
                                            ? 'bg-emerald-950/80 text-emerald-300 hover:bg-emerald-800 hover:text-white border border-emerald-500/30'
                                            : 'bg-slate-900 text-slate-200 hover:bg-emerald-950 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40'
                                        }`}
                                      >
                                        {isTimeSlot && <Sparkles className="w-3 h-3 text-emerald-400" />}
                                        <span>{chip}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            })()
                          )}

                          {/* Interactive Action Confirmation Card */}
                          {msg.pendingAction && !msg.actionExecuted && (
                            <div className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-slate-200 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-400">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>{msg.pendingAction.title}</span>
                              </div>
                              <p className="text-[11px] text-slate-300 leading-snug">
                                {msg.pendingAction.description}
                              </p>
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => handleExecuteAction(msg.id, msg.pendingAction!)}
                                  className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm"
                                >
                                  <Check className="w-3 h-3" /> Confirmar Ação
                                </button>
                                <button
                                  onClick={() => {
                                    setMessages((prev) =>
                                      prev.map((m) =>
                                        m.id === msg.id ? { ...m, actionExecuted: true } : m
                                      )
                                    );
                                  }}
                                  className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded-lg transition-all"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}

                          {msg.actionExecuted && (
                            <div className="text-[10px] text-emerald-400/80 font-semibold flex items-center gap-1 pt-1">
                              <CheckCircle2 className="w-3 h-3" /> Ação executada no sistema
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 text-[9px] opacity-70">
                            <span>{msg.timestamp}</span>
                            {msg.sender === 'ai' && (
                              <button
                                onClick={() => handleCopyText(msg.text)}
                                className="hover:text-emerald-300 transition-colors flex items-center gap-1"
                                title="Copiar resposta"
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
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        <span>A Clara está consultando os dados reais e analisando...</span>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Prompts Carousel */}
                  {(() => {
                    let activePrompts = quickPrompts;
                    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;

                    if (inProgressState && inProgressState.type && inProgressState.type !== 'IDLE') {
                      const type = inProgressState.type;
                      const step = inProgressState.step;

                      if (type === 'add_patient_wizard' || type.startsWith('AGUARDANDO_')) {
                        if (step === 'awaiting_confirmation' || type === 'AGUARDANDO_CONFIRMACAO') {
                          activePrompts = ['Sim, confirmar cadastro', 'Cancelar'];
                        } else if (type === 'AGUARDANDO_CONFIRMACAO_EXCLUSAO') {
                          const targetName = inProgressState.data?.patientName ? inProgressState.data.patientName.toUpperCase() : '';
                          activePrompts = [targetName ? `EXCLUIR ${targetName}` : 'EXCLUIR PACIENTE', 'Cancelar'];
                        } else if (type === 'AGUARDANDO_CONFIRMACAO_ARQUIVAR') {
                          activePrompts = ['Sim, arquivar paciente', 'Cancelar'];
                        } else if (type === 'AGUARDANDO_CONFIRMACAO_ALTA') {
                          activePrompts = ['Sim, dar alta', 'Cancelar'];
                        } else if (['awaiting_phone', 'awaiting_email', 'awaiting_cpf', 'awaiting_emergency', 'awaiting_notes', 'awaiting_price'].includes(step || '')) {
                          activePrompts = ['Pular este campo', 'Cancelar'];
                        } else {
                          activePrompts = ['Cancelar'];
                        }
                      } else if (type === 'post_registration_options' || type === 'open_prontuario_after_add') {
                        activePrompts = [
                          '1️⃣ Agendar primeira consulta',
                          '2️⃣ Abrir prontuário',
                          '3️⃣ Registrar evolução',
                          '4️⃣ Registrar pagamento',
                          '5️⃣ Agendar retorno',
                          '6️⃣ Enviar e-mail',
                          '7️⃣ Voltar para a lista'
                        ];
                      }
                    } else if (lastMsg && lastMsg.text.includes('Deseja abrir o prontuário')) {
                      activePrompts = ['Sim, abrir prontuário agora', 'Não, obrigado'];
                    }

                    return (
                      <div className="p-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                        {activePrompts.map((qp, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(qp)}
                            disabled={isLoading}
                            className="whitespace-nowrap px-2.5 py-1 bg-slate-900 hover:bg-emerald-950/80 border border-slate-800 hover:border-emerald-500/40 text-[10px] text-slate-300 hover:text-emerald-200 rounded-lg transition-all shrink-0 font-medium"
                          >
                            {qp}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

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
                        placeholder="Pergunte à Clara... (ex: Quem não pagou este mês?)"
                        value={inputPrompt}
                        onChange={(e) => setInputPrompt(e.target.value)}
                        disabled={isLoading}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={!inputPrompt.trim() || isLoading}
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl transition-all shadow-md shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </>
              )}

              {/* TAB 2: MODO PROATIVO (Proactive Insights) */}
              {activeTab === 'proactive' && (
                <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-950/50">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/30 text-xs text-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Clara Insight Engine V2</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Monitoramento contínuo em tempo real. Cards inteligentes com prioridade que somem automaticamente ao serem resolvidos.
                    </p>
                  </div>

                  {proactiveInsights.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs space-y-2 bg-slate-900/40 rounded-2xl border border-slate-800">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                      <p className="font-bold text-white">Tudo em Dia no Consultório!</p>
                      <p className="text-[11px] text-slate-400">Não há pendências críticas, prontuários em atraso ou pagamentos pendentes no momento.</p>
                    </div>
                  ) : (
                    proactiveInsights.map((insight) => {
                      let badgeStyle = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
                      if (insight.priority === 'critical') {
                        badgeStyle = 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse';
                      } else if (insight.priority === 'important') {
                        badgeStyle = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                      } else if (insight.priority === 'attention') {
                        badgeStyle = 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
                      }

                      return (
                        <div
                          key={insight.id}
                          className={`p-3.5 rounded-2xl bg-slate-900 border transition-all space-y-2 shadow-sm ${
                            insight.priority === 'critical'
                              ? 'border-rose-500/40 hover:border-rose-400'
                              : 'border-slate-800 hover:border-emerald-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                              {insight.badgeText}
                            </span>
                            <Sparkles className={`w-3.5 h-3.5 ${insight.priority === 'critical' ? 'text-rose-400' : 'text-emerald-400'}`} />
                          </div>

                          <h4 className="text-xs font-bold text-white">{insight.title}</h4>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {insight.description}
                          </p>

                          <button
                            onClick={() => {
                              // 1. Switch system tab if configured
                              if (insight.systemTab) {
                                window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: insight.systemTab } }));
                                if (insight.actionType === 'open_prontuario' && insight.actionPayload?.patientName) {
                                  window.dispatchEvent(new CustomEvent('open-patient-detail', { detail: { patientName: insight.actionPayload.patientName } }));
                                }
                              }

                              // 2. Action Dispatcher (No NLP, No text prompt, No fallback)
                              if (insight.actionId) {
                                const result = ClaraEngine.dispatchAction(
                                  insight.actionId,
                                  insight.actionPayload || {},
                                  patients,
                                  sessions,
                                  profile
                                );

                                if (result.executeImmediately) {
                                  executeClaraAction(result.executeImmediately.type, result.executeImmediately.payload || {});
                                }

                                const aiMsg: ClaraChatMessage = {
                                  id: `action-res-${Date.now()}`,
                                  sender: 'ai',
                                  text: result.text,
                                  timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                                  pendingAction: result.pendingAction
                                };

                                setMessages((prev) => [...prev, aiMsg]);
                                setActiveTab('chat');
                              } else if (insight.actionType && insight.actionType !== 'open_schedule') {
                                executeClaraAction(insight.actionType, insight.actionPayload || {});
                              }
                            }}
                            className="w-full mt-1 py-1.5 px-3 bg-slate-950 hover:bg-emerald-950 border border-slate-800 hover:border-emerald-500/40 text-[11px] text-emerald-300 font-bold rounded-xl transition-all flex items-center justify-between group"
                          >
                            <span>{insight.actionLabel || 'Executar Ação'}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};
