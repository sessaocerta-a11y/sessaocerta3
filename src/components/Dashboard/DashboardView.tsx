import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Session } from '../../types';
import { ConsultorioIntelligenceCard } from '../AI/ConsultorioIntelligenceCard';
import {
  Users,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Play,
  UserPlus,
  CalendarPlus,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Activity,
  AlertTriangle,
  FileText,
  Check,
  ChevronDown,
  Sun,
  Moon,
  Sunset,
  CreditCard,
  Video,
  MapPin,
  CheckSquare,
  Zap,
  TrendingUp,
  Heart,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface DashboardViewProps {
  onOpenNewSession: () => void;
  onOpenNewPatient: () => void;
  onGoToSchedule: () => void;
  onGoToPatients: () => void;
  onGoToReminders: () => void;
  onGoToFinance?: () => void;
  onOpenOnboarding?: () => void;
  onSimulatePatientLink?: (session: Session) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewSession,
  onOpenNewPatient,
  onGoToSchedule,
  onGoToPatients,
  onGoToReminders,
  onGoToFinance,
  onOpenOnboarding,
  onSimulatePatientLink
}) => {
  const {
    profile,
    patients,
    sessions,
    startLiveSession,
    updateSessionStatus,
    updatePaymentStatus,
    generateWhatsAppLink,
    addToast,
    isAdmin
  } = useApp();

  const [expandedAlerts, setExpandedAlerts] = useState(true);

  // Memoize all dashboard metric calculations to avoid re-computations on unrelated state updates
  const {
    activePatients,
    archivedPatients,
    dischargedPatients,
    displayDate,
    todaySessions,
    confirmedToday,
    pendingToday,
    rescheduleToday,
    completedToday,
    onlineTodayCount,
    presencialTodayCount,
    firstConsultationsToday,
    weekSessionsCount,
    pendingConfirmationsCount,
    incompleteNotesSessions,
    pendingPaymentSessions,
    greetingTime,
    contextualMessage,
    GreetingIcon,
    nextSession,
    last30DaysData
  } = useMemo(() => {
    // Active & Archived Patients
    const activePatients = patients.filter((p) => p.status === 'ativo');
    const archivedPatients = patients.filter((p) => p.status === 'arquivado');
    const dischargedPatients = patients.filter((p) => p.status === 'alta');
    
    // Date Helpers
    const todayObj = new Date();
    const todayStr = todayObj.toISOString().split('T')[0];

    const formattedDate = todayObj.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    // Today's Sessions sorted chronologically
    const todaySessions = sessions
      .filter((s) => s.date === todayStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const confirmedToday = todaySessions.filter((s) => s.status === 'confirmada').length;
    const pendingToday = todaySessions.filter((s) => s.status === 'agendada').length;
    const rescheduleToday = todaySessions.filter((s) => s.status === 'solicita_reagendamento').length;
    const completedToday = todaySessions.filter((s) => s.status === 'realizada').length;

    // Modality Breakdown
    const onlineTodayCount = todaySessions.filter((s) => s.type === 'online').length;
    const presencialTodayCount = todaySessions.filter((s) => s.type === 'presencial').length;

    // First Consultations (Novos Pacientes no dia)
    const firstConsultationsToday = todaySessions.filter((s) => {
      const p = patients.find((pat) => pat.id === s.patientId || pat.name === s.patientName);
      return p && p.createdAt && p.createdAt.startsWith(todayStr);
    }).length;

    // Week Sessions calculation
    const startOfWeek = new Date(todayObj);
    const dayOfWeek = startOfWeek.getDay(); // 0 (Sun) to 6 (Sat)
    startOfWeek.setDate(todayObj.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

    const weekSessionsCount = sessions.filter((s) => {
      const sDate = new Date(s.date + 'T00:00:00');
      return sDate >= startOfWeek && sDate <= endOfWeek;
    }).length;

    // Total Pending Confirmations
    const pendingConfirmationsCount = pendingToday + rescheduleToday;

    // Incomplete Clinical Notes (Prontuários sem anotação nas sessões realizadas)
    const incompleteNotesSessions = sessions.filter(
      (s) => s.status === 'realizada' && (!s.clinicalNotes || s.clinicalNotes.trim() === '')
    );

    // Pending Payments for completed sessions
    const pendingPaymentSessions = sessions.filter(
      (s) => s.status === 'realizada' && s.paymentStatus === 'pendente'
    );

    // Greeting based on current hour with welcoming tone
    const currentHour = todayObj.getHours();
    const currentMinute = todayObj.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    
    let greetingTime = 'Bom dia';
    let contextualMessage = 'Preparamos sua agenda e pendências com clareza para um dia calmo e produtivo.';
    let GreetingIcon = Sun;

    if (currentHour >= 12 && currentHour < 18) {
      greetingTime = 'Boa tarde';
      contextualMessage = 'Seus atendimentos da tarde estão organizados. Acompanhe os próximos passos com serenidade.';
      GreetingIcon = Sunset;
    } else if (currentHour >= 18) {
      greetingTime = 'Boa noite';
      contextualMessage = 'Excelente trabalho hoje! Confira o encerramento do expediente e os lembretes para amanhã.';
      GreetingIcon = Moon;
    }

    // Identify NEXT UPCOMING SESSION TODAY
    const nextSession =
      todaySessions.find(
        (s) =>
          s.startTime >= currentTimeStr &&
          s.status !== 'realizada' &&
          s.status !== 'cancelada_paciente' &&
          s.status !== 'cancelada_psicologo'
      ) ||
      todaySessions.find(
        (s) =>
          s.status !== 'realizada' &&
          s.status !== 'cancelada_paciente' &&
          s.status !== 'cancelada_psicologo'
      ) ||
      (todaySessions.length > 0 ? todaySessions[0] : null);

    // 30-Day Attendance Evolution Data for the main chart
    const last30DaysData = [
      { periodo: 'Semana 1', realizadas: 12, agendadas: 14 },
      { periodo: 'Semana 2', realizadas: 16, agendadas: 18 },
      { periodo: 'Semana 3', realizadas: 19, agendadas: 20 },
      { periodo: 'Semana 4 (Atual)', realizadas: completedToday || 18, agendadas: todaySessions.length || 22 },
    ];

    return {
      activePatients,
      archivedPatients,
      dischargedPatients,
      displayDate,
      todaySessions,
      confirmedToday,
      pendingToday,
      rescheduleToday,
      completedToday,
      onlineTodayCount,
      presencialTodayCount,
      firstConsultationsToday,
      weekSessionsCount,
      pendingConfirmationsCount,
      incompleteNotesSessions,
      pendingPaymentSessions,
      greetingTime,
      contextualMessage,
      GreetingIcon,
      nextSession,
      last30DaysData
    };
  }, [patients, sessions]);

  // Recent Activity Stream
  const recentActivities = [
    { id: '1', time: 'Há 12 min', text: 'Maria Oliveira confirmou presença via WhatsApp.', icon: CheckCircle2, color: 'text-emerald-400' },
    { id: '2', time: 'Hoje, 09:30', text: 'Lembrete automático enviado para João Silva.', icon: MessageCircle, color: 'text-sky-400' },
    { id: '3', time: 'Hoje, 08:00', text: 'Atendimento concluído com Carlos Souza.', icon: Check, color: 'text-emerald-400' },
    { id: '4', time: 'Ontem, 18:40', text: 'Pagamento de R$ 180,00 confirmado via PIX.', icon: DollarSign, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* ========================================== */}
      {/* 1. CENTRO DE COMANDO & SAUDAÇÃO CONTEXTUAL */}
      {/* ========================================== */}
      <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-extrabold uppercase tracking-wider">
                <GreetingIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Centro de Comando Clínico</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>{displayDate}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sigilo & LGPD Ativos</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {greetingTime}, Dr(a). {profile.name}! 👋
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
              {contextualMessage}
            </p>
          </div>

          {/* Top Header Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 relative z-10">
            {onOpenOnboarding && (
              <button
                onClick={onOpenOnboarding}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all shadow-sm"
                title="Acessar o assistente de onboarding passo a passo"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Guia Inicial</span>
              </button>
            )}

            <button
              onClick={onGoToSchedule}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Ver Agenda Completa</span>
            </button>
          </div>
        </div>

        {/* Quick Operational Status Ribbon */}
        <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Hoje</span>
              <strong className="text-white text-xs">{todaySessions.length} Atendimentos</strong>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Confirmados</span>
              <strong className="text-emerald-400 text-xs">{confirmedToday} de {todaySessions.length}</strong>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Confirmações</span>
              <strong className="text-amber-400 text-xs">{pendingConfirmationsCount} Pendentes</strong>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Prontuários</span>
              <strong className="text-sky-300 text-xs">{incompleteNotesSessions.length} Posições sem anotação</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. PRÓXIMO ATENDIMENTO (ELEMENTO PRINCIPAL) */}
      {/* ========================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Próximo Atendimento em Destaque
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">Prioridade Operacional Máxima</span>
        </div>

        {nextSession ? (
          <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/40 shadow-2xl space-y-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-500" />

            {/* Top Bar inside Spotlight Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-extrabold text-xs flex items-center gap-1.5 shadow-sm">
                  <Clock className="w-4 h-4" />
                  <span>Horário: {nextSession.startTime} - {nextSession.endTime}</span>
                </span>

                <span
                  className={`text-xs font-bold uppercase px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                    nextSession.type === 'online'
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  }`}
                >
                  {nextSession.type === 'online' ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                  <span>Sessão {nextSession.type === 'online' ? 'Online' : 'Presencial'}</span>
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="text-slate-400">Status da Presença:</span>
                <span
                  className={`px-3 py-1 rounded-full border ${
                    nextSession.status === 'confirmada'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {nextSession.status === 'confirmada' ? '✓ Confirmada' : '⏱ Pendente'}
                </span>
              </div>
            </div>

            {/* Main Content inside Spotlight Card */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                  <span>{nextSession.patientName}</span>
                </h3>

                <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <strong className="text-white">Valor: R$ {nextSession.price}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Pagamento:{' '}
                    <strong className={nextSession.paymentStatus === 'pago' ? 'text-emerald-400' : 'text-amber-400'}>
                      {nextSession.paymentStatus === 'pago' ? 'Pago' : 'Pendente'}
                    </strong>
                  </span>
                  {nextSession.clinicalNotes && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> Possui anotações prévias
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons in Next Session Card */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  onClick={() => startLiveSession(nextSession)}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-950/60 hover:scale-[1.02] transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Iniciar Atendimento Ao Vivo</span>
                </button>

                <a
                  href={generateWhatsAppLink(nextSession)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold transition-all"
                  title="Enviar Lembrete WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>

                {onSimulatePatientLink && (
                  <button
                    onClick={() => onSimulatePatientLink(nextSession)}
                    className="flex items-center gap-1.5 px-3.5 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all"
                    title="Simular Portal do Paciente"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                    <span className="hidden sm:inline">Portal do Paciente</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Todos os atendimentos de hoje foram concluídos!</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Nenhum outro atendimento pendente para a data atual. Aproveite o momento para descansar, atualizar registros clínicos ou planejar o próximo dia.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={onOpenNewSession}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
              >
                + Agendar Nova Sessão
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 3. TAREFAS AUTOMÁTICAS E PENDÊNCIAS URGENTES */}
      {/* ========================================== */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Tarefas Automáticas da Rotina</h3>
              <p className="text-xs text-slate-400">Ações urgentes destacadas para execução com poucos cliques</p>
            </div>
          </div>

          <button
            onClick={() => setExpandedAlerts(!expandedAlerts)}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
          >
            <span>{expandedAlerts ? 'Recolher' : 'Expandir'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedAlerts ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {expandedAlerts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Task 1: Confirmações Pendentes */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Confirmações de Presença
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {pendingToday} Pendentes
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {pendingToday > 0
                  ? `${pendingToday} paciente(s) do dia ainda aguardam confirmação via WhatsApp.`
                  : 'Todas as consultas do dia já possuem confirmação de presença registrada.'}
              </p>

              <div className="pt-1 flex items-center justify-between gap-2">
                <button
                  onClick={onGoToReminders}
                  className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 w-full justify-center"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{pendingToday > 0 ? 'Enviar Lembretes no WhatsApp' : 'Ver Fila de WhatsApp'}</span>
                </button>
              </div>
            </div>

            {/* Task 2: Prontuários Incompletos */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-sky-500/30 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> Evoluções de Prontuário
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  {incompleteNotesSessions.length} Pendentes
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {incompleteNotesSessions.length > 0
                  ? `${incompleteNotesSessions.length} sessão(ões) concluída(s) necessitam do registro de anotações clínicas.`
                  : 'Todos os registros de evolução clínica estão devidamente preenchidos.'}
              </p>

              <div className="pt-1 flex items-center justify-between gap-2">
                <button
                  onClick={onGoToSchedule}
                  className="px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all flex items-center gap-1.5 w-full justify-center"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Registrar Evoluções Clinicas</span>
                </button>
              </div>
            </div>

            {/* Task 3: Recibos e Pagamentos Pendentes */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" /> Recibos & Pagamentos
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {pendingPaymentSessions.length} A Receber
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {pendingPaymentSessions.length > 0
                  ? `${pendingPaymentSessions.length} atendimento(s) realizado(s) aguardam confirmação de pagamento ou recibo.`
                  : 'Sem pagamentos pendentes para as sessões concluídas.'}
              </p>

              <div className="pt-1 flex items-center justify-between gap-2">
                <button
                  onClick={onGoToFinance || onGoToSchedule}
                  className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 w-full justify-center"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Gerenciar Financeiro</span>
                </button>
              </div>
            </div>

            {/* Task 4: Reagendamentos Solicitados */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Solicitações de Reagendamento
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  {rescheduleToday} Pedidos
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {rescheduleToday > 0
                  ? `${rescheduleToday} paciente(s) solicitaram troca de horário no WhatsApp.`
                  : 'Nenhum pedido de reagendamento pendente na fila.'}
              </p>

              <div className="pt-1 flex items-center justify-between gap-2">
                <button
                  onClick={onGoToReminders}
                  className="px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-1.5 w-full justify-center"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Remanejar Horários</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 4. INTELIGÊNCIA ARTIFICIAL E SUGESTÕES PROATIVAS */}
      {/* ========================================== */}
      <ConsultorioIntelligenceCard
        onGoToSchedule={onGoToSchedule}
        onGoToReminders={onGoToReminders}
      />

      {/* ========================================== */}
      {/* 5. RESUMO OPERACIONAL DO DIA */}
      {/* ========================================== */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold text-white uppercase tracking-wider px-1">
          Resumo Operacional do Dia
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* INDICADOR 1: Atendimentos do Dia */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all shadow-md group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Atendimentos Hoje
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-black text-white">{todaySessions.length}</span>
              <button
                onClick={onGoToSchedule}
                className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-0.5"
              >
                Ver agenda <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              {confirmedToday} confirmados • {completedToday} concluídos
            </p>
          </div>

          {/* INDICADOR 2: Modalidade (Presencial vs Online) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/40 transition-all shadow-md group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Presencial vs Online
              </span>
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Video className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-sky-400">{onlineTodayCount}</span>
                <span className="text-xs text-slate-400 font-semibold">Online</span>
                <span className="text-slate-600">|</span>
                <span className="text-2xl font-black text-purple-300">{presencialTodayCount}</span>
                <span className="text-xs text-slate-400 font-semibold">Presencial</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              Distribuição por canal de atendimento
            </p>
          </div>

          {/* INDICADOR 3: Pacientes Ativos */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 transition-all shadow-md group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Pacientes Ativos
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-black text-purple-300">{activePatients.length}</span>
              <button
                onClick={onGoToPatients}
                className="text-xs font-semibold text-purple-300 hover:underline flex items-center gap-0.5"
              >
                Ver lista <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              🟢 {activePatients.length} Ativos • 📦 {archivedPatients.length} Arquivados • 🎓 {dischargedPatients.length} Alta
            </p>
          </div>

          {/* INDICADOR 4: Sessões da Semana */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 transition-all shadow-md group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Sessões na Semana
              </span>
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-black text-teal-300">{weekSessionsCount}</span>
              <span className="text-xs font-semibold text-slate-400">Nesta semana</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              Garantia de ocupação da agenda
            </p>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 6. AÇÕES RÁPIDAS (BOTÕES GRANDES E LÍMPIDOS) */}
      {/* ========================================== */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
          Ações Rápidas do Consultório
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Action 1: Cadastrar Paciente */}
          <button
            onClick={onOpenNewPatient}
            className="p-4 rounded-2xl bg-slate-950/80 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col items-center text-center gap-2.5 group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
              Cadastrar Paciente
            </span>
          </button>

          {/* Action 2: Criar Sessão */}
          <button
            onClick={onOpenNewSession}
            className="p-4 rounded-2xl bg-slate-950/80 hover:bg-sky-950/30 border border-slate-800 hover:border-sky-500/40 transition-all flex flex-col items-center text-center gap-2.5 group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-200 group-hover:text-sky-400 transition-colors">
              Criar Sessão
            </span>
          </button>

          {/* Action 3: Abrir Agenda */}
          <button
            onClick={onGoToSchedule}
            className="p-4 rounded-2xl bg-slate-950/80 hover:bg-purple-950/30 border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col items-center text-center gap-2.5 group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition-colors">
              Abrir Agenda
            </span>
          </button>

          {/* Action 4: Acessar Financeiro */}
          <button
            onClick={onGoToFinance || onGoToSchedule}
            className="p-4 rounded-2xl bg-slate-950/80 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col items-center text-center gap-2.5 group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors">
              Acessar Financeiro
            </span>
          </button>

          {/* Action 5: Fila WhatsApp */}
          <button
            onClick={onGoToReminders}
            className="p-4 rounded-2xl bg-slate-950/80 hover:bg-teal-950/30 border border-slate-800 hover:border-teal-500/40 transition-all flex flex-col items-center text-center gap-2.5 group shadow-sm col-span-2 sm:col-span-1"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-200 group-hover:text-teal-400 transition-colors">
              Fila WhatsApp
            </span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 7. AGENDA DO DIA & ATIVIDADES RECENTES (2 COLS) */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* AGENDA DO DIA (TIMELINE CRONOLÓGICA) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-base font-bold text-white">Timeline do Dia ({todaySessions.length} sessões)</h2>
            </div>

            <button
              onClick={onGoToSchedule}
              className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
            >
              Ver Agenda Completa <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todaySessions.length === 0 ? (
            <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 space-y-3 p-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-white">Nenhum atendimento agendado para hoje</h3>
              <p className="text-slate-400 text-xs leading-relaxed max-w-md mx-auto">
                Sua agenda para o dia atual está livre. Desfrute de um momento de descanso ou aproveite para organizar seus cadastros.
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={onOpenNewPatient}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
                >
                  + Cadastrar Paciente
                </button>
                <button
                  onClick={onOpenNewSession}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-colors"
                >
                  + Agendar Sessão
                </button>
              </div>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
              {todaySessions.map((session) => {
                const isNext = nextSession?.id === session.id;

                return (
                  <div key={session.id} className="relative group">
                    <div
                      className={`absolute -left-[23px] top-4 w-4 h-4 rounded-full border-2 transition-all ${
                        isNext
                          ? 'bg-emerald-500 border-white shadow-md shadow-emerald-500/50 scale-125'
                          : session.status === 'confirmada'
                          ? 'bg-emerald-400 border-slate-900'
                          : session.status === 'realizada'
                          ? 'bg-slate-600 border-slate-900'
                          : 'bg-amber-400 border-slate-900'
                      }`}
                    />

                    <div
                      className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isNext
                          ? 'bg-slate-950/90 border-emerald-500/40 shadow-lg'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800">
                            {session.startTime} - {session.endTime}
                          </span>

                          <span className="text-sm font-extrabold text-white">
                            {session.patientName}
                          </span>

                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                              session.type === 'online'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {session.type}
                          </span>

                          {session.status === 'confirmada' && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Confirmada
                            </span>
                          )}

                          {session.status === 'solicita_reagendamento' && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Solicitou Reagendar
                            </span>
                          )}

                          {session.status === 'agendada' && (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                              Aguardando resposta
                            </span>
                          )}

                          {session.status === 'realizada' && (
                            <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                              Concluída
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                          <span>Valor: <strong className="text-white">R$ {session.price}</strong></span>
                          <span>•</span>
                          <span>
                            Pagamento:{' '}
                            <strong className={session.paymentStatus === 'pago' ? 'text-emerald-400' : 'text-amber-400'}>
                              {session.paymentStatus === 'pago' ? 'Pago' : 'Pendente'}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Quick Operational Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {session.status !== 'confirmada' && session.status !== 'realizada' && (
                          <button
                            onClick={() => {
                              updateSessionStatus(session.id, 'confirmada');
                              addToast(`Presença de ${session.patientName} confirmada!`);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 text-xs font-bold transition-colors"
                            title="Confirmar Presença"
                          >
                            Confirmar
                          </button>
                        )}

                        {session.status !== 'realizada' && (
                          <button
                            onClick={() => {
                              updateSessionStatus(session.id, 'realizada');
                              addToast(`Sessão com ${session.patientName} marcada como realizada.`);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors"
                            title="Concluir sessão"
                          >
                            Concluir
                          </button>
                        )}

                        <a
                          href={generateWhatsAppLink(session)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 transition-colors"
                          title="Enviar Lembrete WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>

                        <button
                          onClick={() => startLiveSession(session)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Atender</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ATIVIDADES RECENTES */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Atividades Recentes</span>
            </div>
            <span className="text-[10px] uppercase font-mono bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded">
              Hoje
            </span>
          </div>

          <div className="space-y-3.5">
            {recentActivities.map((act) => {
              const IconComp = act.icon;
              return (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                    <IconComp className={`w-3.5 h-3.5 ${act.color}`} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-slate-300 leading-snug">{act.text}</p>
                    <span className="text-[10px] text-slate-500 font-mono">{act.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 8. GRÁFICO PRINCIPAL (APÓS A ÁREA OPERACIONAL) */}
      {/* ========================================== */}
      <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Acompanhamento de Tendência
            </span>
            <h3 className="text-lg font-extrabold text-white tracking-tight mt-1">
              Evolução dos Atendimentos nos Últimos 30 Dias
            </h3>
            <p className="text-xs text-slate-400">
              Comparativo de consultas realizadas vs. agendadas no consultório.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Realizadas</span>
            </div>
            <div className="flex items-center gap-1.5 text-sky-400">
              <span className="w-3 h-3 rounded-full bg-sky-500" />
              <span>Agendadas</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={last30DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRealizadas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorAgendadas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="periodo" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="realizadas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRealizadas)" />
              <Area type="monotone" dataKey="agendadas" stroke="#0284c7" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorAgendadas)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========================================== */}
      {/* 9. PAINEL ADMIN RBAC GLOBAL (SE ADMIN) */}
      {/* ========================================== */}
      {isAdmin && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-500/40 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>Métricas Globais da Plataforma SaaS (Visão Admin RBAC)</span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                    Acesso Exclusivo
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Resumo executivo de faturamento, psicólogos ativos, MRR e status do servidor Cloud SQL.
                </p>
              </div>
            </div>

            <span className="text-xs font-mono text-purple-300 bg-purple-950 px-3 py-1 rounded-xl border border-purple-800 shrink-0">
              Perfil: Administrator (Super Admin)
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-purple-500/30 space-y-1">
              <span className="text-[10px] text-slate-400 font-medium">MRR Recorrente Global</span>
              <div className="text-lg font-black text-purple-300 font-mono">R$ 48.900/mês</div>
              <span className="text-[10px] text-emerald-400 font-bold">+18.4% vs mês anterior</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-purple-500/30 space-y-1">
              <span className="text-[10px] text-slate-400 font-medium">Psicólogos Ativos</span>
              <div className="text-lg font-black text-white font-mono">342 Assinantes</div>
              <span className="text-[10px] text-sky-400 font-bold">Churn rate: 0.8%</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-purple-500/30 space-y-1">
              <span className="text-[10px] text-slate-400 font-medium">Lembretes WhatsApp</span>
              <div className="text-lg font-black text-emerald-400 font-mono">14.820 Envio/Mês</div>
              <span className="text-[10px] text-emerald-400 font-bold">Taxa de Entrega: 99.8%</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-purple-500/30 space-y-1">
              <span className="text-[10px] text-slate-400 font-medium">Servidor Cloud SQL</span>
              <div className="text-lg font-black text-emerald-400 font-mono">100% Operacional</div>
              <span className="text-[10px] text-slate-400">Latência: 14ms (AES-256)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
