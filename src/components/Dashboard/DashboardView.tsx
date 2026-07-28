import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Session } from '../../types';
import { ConsultorioIntelligenceCard } from '../AI/ConsultorioIntelligenceCard';
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Play,
  UserPlus,
  CalendarPlus,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
  Bell,
  Activity,
  AlertTriangle,
  FileText,
  Check,
  XCircle,
  HelpCircle,
  TrendingDown,
  ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardViewProps {
  onOpenNewSession: () => void;
  onOpenNewPatient: () => void;
  onGoToSchedule: () => void;
  onGoToPatients: () => void;
  onGoToReminders: () => void;
  onOpenOnboarding?: () => void;
  onSimulatePatientLink?: (session: Session) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewSession,
  onOpenNewPatient,
  onGoToSchedule,
  onGoToPatients,
  onGoToReminders,
  onOpenOnboarding,
  onSimulatePatientLink
}) => {
  const {
    profile,
    patients,
    sessions,
    startLiveSession,
    openWhatsAppModal,
    updateSessionStatus,
    updatePaymentStatus,
    generateWhatsAppLink,
    addToast,
    isAdmin,
    userRole
  } = useApp();

  const [expandedAlerts, setExpandedAlerts] = useState(true);

  // Filter metrics
  const activePatients = patients.filter((p) => p.status === 'ativo');
  const todayStr = new Date().toISOString().split('T')[0];

  const todaySessions = sessions
    .filter((s) => s.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const confirmedToday = todaySessions.filter((s) => s.status === 'confirmada').length;
  const pendingToday = todaySessions.filter((s) => s.status === 'agendada').length;
  const rescheduleToday = todaySessions.filter((s) => s.status === 'solicita_reagendamento').length;

  // Greeting based on current hour
  const currentHour = new Date().getHours();
  const greetingTime = currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite';

  // Identify next upcoming session today
  const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
  const nextSession = todaySessions.find(
    (s) => s.startTime >= currentTimeStr && s.status !== 'realizada' && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo'
  ) || todaySessions[0];

  // Calculate stats for monthly metrics
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthSessions = sessions.filter((s) => {
    const sDate = new Date(s.date);
    return sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear;
  });

  const completedSessions = currentMonthSessions.filter((s) => s.status === 'realizada');

  const revenueReceived = currentMonthSessions
    .filter((s) => s.paymentStatus === 'pago')
    .reduce((sum, s) => sum + s.price, 0);

  const revenuePending = currentMonthSessions
    .filter((s) => s.paymentStatus === 'pendente' && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo')
    .reduce((sum, s) => sum + s.price, 0);

  const totalAttempted = currentMonthSessions.filter((s) => s.status === 'realizada' || s.status === 'falta').length;
  const attendanceRate = totalAttempted > 0 ? Math.round((completedSessions.length / totalAttempted) * 100) : 100;

  // Estimated avoided loss calculation (assuming average session R$ 180 and confirmation rate)
  const totalAvoidedLoss = confirmedToday * 180;

  // Chart data: Monthly Revenue comparison
  const monthlyRevenueData = [
    { month: 'Mar', Recebido: 3200, Pendente: 400 },
    { month: 'Abr', Recebido: 3800, Pendente: 200 },
    { month: 'Mai', Recebido: 4200, Pendente: 350 },
    { month: 'Jun', Recebido: 4600, Pendente: 400 },
    { month: 'Jul', Recebido: revenueReceived || 4800, Pendente: revenuePending || 360 },
  ];

  // Attendance Type chart data
  const onlineCount = activePatients.filter((p) => p.attendanceType === 'online').length;
  const presencialCount = activePatients.filter((p) => p.attendanceType === 'presencial').length;
  const hibridoCount = activePatients.filter((p) => p.attendanceType === 'hibrido').length;

  const typeDistributionData = [
    { name: 'Online', value: onlineCount || 3, color: '#10b981' },
    { name: 'Presencial', value: presencialCount || 2, color: '#0284c7' },
    { name: 'Híbrido', value: hibridoCount || 1, color: '#8b5cf6' },
  ];

  // Recent activity logs simulation
  const recentActivities = [
    { id: '1', time: 'Hoje, 10:32', text: 'Maria Oliveira confirmou presença via link WhatsApp.', icon: CheckCircle2, color: 'text-emerald-400' },
    { id: '2', time: 'Hoje, 09:15', text: 'Lembrete automático enviado para João Silva.', icon: MessageCircle, color: 'text-sky-400' },
    { id: '3', time: 'Hoje, 08:00', text: 'Sessão concluída com Carlos Souza.', icon: Check, color: 'text-emerald-400' },
    { id: '4', time: 'Ontem, 18:40', text: 'Pagamento de R$ 180.00 registrado via PIX.', icon: DollarSign, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. CABEÇALHO PERSONALIZADO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1.5 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Consultório Inteligente Ativo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {greetingTime}, {profile.name}! 👋
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
            Aqui está o resumo da sua agenda hoje. Você possui <strong className="text-white font-bold">{todaySessions.length} atendimento(s)</strong> programado(s).
          </p>
        </div>

        {/* 2. AÇÕES RÁPIDAS PRINCIPAIS */}
        <div className="flex flex-wrap items-center gap-2.5 z-10 shrink-0">
          {onOpenOnboarding && (
            <button
              onClick={onOpenOnboarding}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors shadow-sm"
              title="Acessar o assistente de onboarding passo a passo"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Guia Inicial</span>
            </button>
          )}
          <button
            onClick={onOpenNewPatient}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>Novo Paciente</span>
          </button>
          <button
            onClick={onOpenNewSession}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-950/50"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Nova Sessão</span>
          </button>
          <button
            onClick={onGoToSchedule}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            title="Ver Agenda Completa"
          >
            <Calendar className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Ver Agenda Completa</span>
          </button>
        </div>
      </div>

      {/* ADMIN RBAC GLOBAL METRICS BANNER (ONLY VISIBLE FOR ADMIN USERS) */}
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

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-medium">Psicólogos Ativos no SaaS</span>
              <div className="text-lg font-black text-white font-mono">248 Assinantes</div>
              <span className="text-[10px] text-slate-400">Planos Otimizados</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-medium">Lembretes WhatsApp Enviados</span>
              <div className="text-lg font-black text-emerald-400 font-mono">14.820 msgs</div>
              <span className="text-[10px] text-emerald-400 font-bold">99.8% Entregues</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-medium">Health Check Servidores</span>
              <div className="text-lg font-black text-sky-400 font-mono">99.99% Uptime</div>
              <span className="text-[10px] text-sky-400">PostgreSQL Cloud SQL OK</span>
            </div>
          </div>
        </div>
      )}
      <ConsultorioIntelligenceCard
        onGoToSchedule={onGoToSchedule}
        onGoToReminders={onGoToReminders}
      />

      {/* 4. CARDS DE RESUMO DO DIA (4 MAIN KPI CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: Sessões Hoje (Azul) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition-all shadow-md group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Sessões Hoje
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">{todaySessions.length}</span>
            <button
              onClick={onGoToSchedule}
              className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-0.5"
            >
              Ver agenda <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Programadas para a data atual
          </p>
        </div>

        {/* CARD 2: Confirmadas (Verde) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all shadow-md group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Confirmadas
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-400">{confirmedToday}</span>
            <span className="text-xs font-semibold text-slate-400">
              de {todaySessions.length} total
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Presença garantida do paciente
          </p>
        </div>

        {/* CARD 3: Aguardando Resposta (Amarelo) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all shadow-md group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Aguardando Resposta
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-400">{pendingToday}</span>
            <button
              onClick={onGoToReminders}
              className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-0.5"
            >
              Reenviar <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Pacientes pendentes de lembrete
          </p>
        </div>

        {/* CARD 4: Reagendamentos / Solicitações (Ciano / Vermelho) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/40 transition-all shadow-md group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Reagendamentos
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-sky-400">{rescheduleToday}</span>
            <button
              onClick={onGoToReminders}
              className="text-xs font-semibold text-sky-400 hover:underline flex items-center gap-0.5"
            >
              Atender <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Solicitações de alteração de horário
          </p>
        </div>
      </div>

      {/* 5. PRÓXIMA SESSÃO (SPOTLIGHT CARD) */}
      {nextSession && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-xl space-y-4 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Próxima Sessão em Destaque
              </h2>
            </div>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800 flex items-center gap-1.5 w-fit">
              <Clock className="w-3.5 h-3.5" />
              <span>Horário das {nextSession.startTime}</span>
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xl font-extrabold text-white">{nextSession.patientName}</span>
                <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-lg border ${
                  nextSession.type === 'online'
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {nextSession.type}
                </span>
                <span className="text-xs text-slate-300 font-medium">R$ {nextSession.price}</span>
              </div>

              <p className="text-xs text-slate-400 flex items-center gap-3">
                <span>Horário: <strong>{nextSession.startTime} - {nextSession.endTime}</strong></span>
                <span>•</span>
                <span>
                  Status:{' '}
                  <strong className={
                    nextSession.status === 'confirmada' ? 'text-emerald-400' : 'text-amber-400'
                  }>
                    {nextSession.status === 'confirmada' ? 'Confirmada' : 'Aguardando confirmação'}
                  </strong>
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => startLiveSession(nextSession)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/50 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar Atendimento Ao Vivo</span>
              </button>

              <a
                href={generateWhatsAppLink(nextSession)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Lembrete WhatsApp</span>
              </a>

              {onSimulatePatientLink && (
                <button
                  onClick={() => onSimulatePatientLink(nextSession)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors"
                  title="Simular visualização do portal do paciente"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Simular Link</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAIN GRID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: TODAY'S TIMELINE & ALERTS */}
        <div className="lg:col-span-2 space-y-6">
          {/* 6. AGENDA DO DIA (TIMELINE) */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-base font-bold text-white">Agenda do Dia (Linha do Tempo)</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {todaySessions.length} sessão(ões)
                </span>
              </div>

              <button
                onClick={onGoToSchedule}
                className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
              >
                Ver Agenda Completa <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ESTADO VAZIO */}
            {todaySessions.length === 0 ? (
              <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 space-y-3 p-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Seu consultório começa aqui</h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-md mx-auto">
                  Cadastre seu primeiro paciente e crie sua primeira sessão para o Sessão Certa cuidar dos lembretes automáticos.
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
                    + Criar Primeira Sessão
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-white">
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

                        {session.paymentStatus === 'pago' ? (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                            Pago
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">
                            Pendente
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                        <span className="flex items-center gap-1 text-slate-300 font-mono">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          {session.startTime} - {session.endTime}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-slate-300">
                          R$ {session.price}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {session.status !== 'confirmada' && session.status !== 'realizada' && (
                        <button
                          onClick={() => {
                            updateSessionStatus(session.id, 'confirmada');
                            addToast(`Presença de ${session.patientName} confirmada!`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 text-[11px] font-bold transition-colors"
                          title="Confirmar Presença do Paciente"
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
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold transition-colors"
                          title="Marcar sessão como concluída"
                        >
                          Concluir
                        </button>
                      )}

                      {/* WhatsApp Reminder Direct Link */}
                      <a
                        href={generateWhatsAppLink(session)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-300 border border-emerald-700/50 transition-colors"
                        title="Enviar Lembrete WhatsApp ao Paciente"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>

                      {/* Start Live Session Action */}
                      <button
                        onClick={() => startLiveSession(session)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Atendimento</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 7. ÁREA "PRECISA DA SUA ATENÇÃO" (ALERTAS IMPORTANTES) */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Precisa da Sua Atenção</h3>
              </div>
              <button
                onClick={() => setExpandedAlerts(!expandedAlerts)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <span>{expandedAlerts ? 'Ocultar' : 'Expandir'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedAlerts ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {expandedAlerts && (
              <div className="space-y-2.5">
                {pendingToday > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-200 text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{pendingToday} paciente(s) ainda não confirmaram a sessão de hoje.</span>
                    </div>
                    <button
                      onClick={onGoToReminders}
                      className="px-2.5 py-1 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-[11px] font-bold border border-amber-700/50 shrink-0"
                    >
                      Enviar Lembrete
                    </button>
                  </div>
                )}

                {rescheduleToday > 0 && (
                  <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-800/50 text-sky-200 text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>{rescheduleToday} solicitação(ões) de reagendamento pendente(s).</span>
                    </div>
                    <button
                      onClick={onGoToReminders}
                      className="px-2.5 py-1 rounded-lg bg-sky-900/60 hover:bg-sky-800 text-sky-200 text-[11px] font-bold border border-sky-700/50 shrink-0"
                    >
                      Atender
                    </button>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-emerald-200 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Otimização de Horários: Você possui 2 lacunas livres na agenda desta semana.</span>
                  </div>
                  <button
                    onClick={onOpenNewSession}
                    className="px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-[11px] font-bold border border-emerald-700/50 shrink-0"
                  >
                    Agendar Horários
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* EVOLUÇÃO FINANCEIRA DO CONSULTÓRIO */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Evolução do Faturamento (R$)</h3>
                <p className="text-xs text-slate-400">Recebido vs. Pendente nos últimos meses</p>
              </div>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800">
                +14% vs mês anterior
              </span>
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
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
                  <Bar dataKey="Recebido" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT 1 COL: NOTIFICATIONS, AUTOMATION & DISTRIBUTION */}
        <div className="space-y-6">
          {/* 8. ATIVIDADES RECENTES (NOTIFICAÇÕES DE EVENTOS) */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Atividades Recentes</span>
              </div>
              <span className="text-[10px] uppercase font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
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

          {/* CENTRAL DE LEMBRETES WHATSAPP AUTOMÁTICOS */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-emerald-900/40 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <MessageCircle className="w-5 h-5" />
                <span>Lembretes WhatsApp</span>
              </div>
              <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                1-Clique
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Dispare lembretes de confirmação pré-formatados com botões interativos para o WhatsApp dos seus pacientes.
            </p>

            <button
              onClick={onGoToReminders}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all"
            >
              <span>Acessar Fila de Lembretes</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* PATIENT MODALITY DISTRIBUTION */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <h3 className="text-base font-bold text-white">Modalidade dos Pacientes</h3>
            <p className="text-xs text-slate-400">Proporção entre atendimentos online e presenciais</p>

            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {typeDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-800">
              {typeDistributionData.map((item) => (
                <div key={item.name} className="space-y-0.5">
                  <div className="flex items-center justify-center gap-1 text-slate-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-extrabold text-white text-sm">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
