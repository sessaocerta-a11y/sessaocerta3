import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Session, SessionStatus, AttendanceType } from '../../types';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageCircle,
  Play,
  CalendarPlus,
  Filter,
  DollarSign,
  List,
  Grid,
  Sparkles,
  UserCheck,
  Check,
  User,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  Activity,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Monitor
} from 'lucide-react';

interface ScheduleViewProps {
  onOpenNewSession: (date?: string, time?: string) => void;
  onEditSession: (session: Session) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  onOpenNewSession,
  onEditSession
}) => {
  const {
    sessions,
    patients,
    startLiveSession,
    updateSessionStatus,
    updatePaymentStatus,
    generateWhatsAppLink,
    addToast
  } = useApp();

  const [viewMode, setViewMode] = useState<'dia' | 'semana' | 'mes' | 'consultorio' | 'lista'>('dia');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [typeFilter, setTypeFilter] = useState<'todos' | 'online' | 'presencial'>('todos');

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  // Format date header string in PT-BR
  const formattedDateTitle = (() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  })();

  // Navigation handlers
  const navigateDate = (offsetDays: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + offsetDays);
    setSelectedDate(dateObj.toISOString().split('T')[0]);
  };

  const navigateMonth = (offsetMonths: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setMonth(dateObj.getMonth() + offsetMonths);
    setSelectedDate(dateObj.toISOString().split('T')[0]);
  };

  // Status Badge Colors Mapping
  const statusBadgeColors: Record<SessionStatus, { bg: string; text: string; border: string; label: string }> = {
    agendada: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', label: 'Agendada' },
    confirmada: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'Confirmada' },
    solicita_reagendamento: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'Solicitou Reagendar' },
    realizada: { bg: 'bg-slate-800', text: 'text-emerald-300', border: 'border-slate-700', label: 'Realizada' },
    cancelada_paciente: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', label: 'Canc. Paciente' },
    cancelada_psicologo: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', label: 'Canc. Psicólogo' },
    falta: { bg: 'bg-rose-950/80', text: 'text-rose-300', border: 'border-rose-800', label: 'Falta sem aviso' },
  };

  // Hourly timeline slots for Day View (07:00 to 20:00)
  const hourSlots = Array.from({ length: 14 }, (_, i) => {
    const hour = i + 7;
    return `${String(hour).padStart(2, '0')}:00`;
  });

  // Calculate Week dates for Week View (Sunday to Saturday)
  const getWeekDates = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const current = new Date(y, m - 1, d);
    const firstDayOfWeek = new Date(current);
    firstDayOfWeek.setDate(current.getDate() - current.getDay()); // Sunday

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(firstDayOfWeek);
      dayDate.setDate(firstDayOfWeek.getDate() + i);
      days.push(dayDate.toISOString().split('T')[0]);
    }
    return days;
  };

  const weekDateStrs = getWeekDates();

  // Filtered Sessions
  const getSessionsForDate = (dateStr: string) => {
    return sessions
      .filter((s) => s.date === dateStr && (typeFilter === 'todos' || s.type === typeFilter))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const daySessions = getSessionsForDate(selectedDate);
  const todaySessionsAll = getSessionsForDate(todayStr);

  // Month Calendar Grid calculation
  const getMonthDaysGrid = () => {
    const [y, m] = selectedDate.split('-').map(Number);
    const firstDayOfMonth = new Date(y, m - 1, 1);
    const lastDayOfMonth = new Date(y, m, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = lastDayOfMonth.getDate();

    const gridCells = [];

    // Empty cells before start of month
    for (let i = 0; i < startDayOfWeek; i++) {
      gridCells.push(null);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      gridCells.push(dateStr);
    }

    return gridCells;
  };

  const monthGridCells = getMonthDaysGrid();

  // Identify next active session for "Modo Consultório"
  const currentHourMin = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
  const nextConsultorioSession =
    todaySessionsAll.find(
      (s) => s.startTime >= currentHourMin && s.status !== 'realizada' && s.status !== 'cancelada_paciente' && s.status !== 'cancelada_psicologo'
    ) || todaySessionsAll[0];

  const currentPatientObj = nextConsultorioSession
    ? patients.find((p) => p.id === nextConsultorioSession.patientId)
    : null;

  return (
    <div className="space-y-6 pb-20 relative">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5" />
            <span>Agenda Operacional Inteligente</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Agenda do Consultório
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Gerencie horários, confirmações e atendimentos com máxima rapidez.
          </p>
        </div>

        {/* Quick Actions Header */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setViewMode('consultorio')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              viewMode === 'consultorio'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Monitor className="w-4 h-4 text-emerald-400" />
            <span>Modo Consultório</span>
          </button>

          <button
            onClick={() => onOpenNewSession(selectedDate)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 transition-all"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>+ Agendar Sessão</span>
          </button>
        </div>
      </div>

      {/* PAINEL DE CONTROLE DE DATA E MODOS DE VISUALIZAÇÃO */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Navegador de Data */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => (viewMode === 'mes' ? navigateMonth(-1) : navigateDate(-1))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                isToday ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => (viewMode === 'mes' ? navigateMonth(1) : navigateDate(1))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Próximo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Título do Período */}
        <div className="text-center">
          <h2 className="text-sm font-extrabold text-white capitalize">{formattedDateTitle}</h2>
          <span className="text-[11px] text-slate-400">
            {daySessions.length} atendimento(s) programado(s)
          </span>
        </div>

        {/* Seletores de Filtro e Modos */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="todos">Todas Modalidades</option>
            <option value="online">Online</option>
            <option value="presencial">Presencial</option>
          </select>

          {/* Abas de Modo */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('dia')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'dia' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dia
            </button>
            <button
              onClick={() => setViewMode('semana')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'semana' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('mes')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'mes' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setViewMode('consultorio')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                viewMode === 'consultorio' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3 h-3" />
              <span>Consultório</span>
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'lista' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Lista
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MODO CONSULTÓRIO (REAL-TIME CLINIC DESK MODE) */}
      {/* ========================================================================= */}
      {viewMode === 'consultorio' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/50 border border-emerald-500/40 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-white uppercase tracking-wider">
                    Modo Consultório Ao Vivo
                  </h2>
                  <p className="text-xs text-slate-300">
                    Visão focada para a sua rotina de atendimentos de hoje.
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
                {todaySessionsAll.length} Atendimento(s) Hoje
              </span>
            </div>

            {nextConsultorioSession ? (
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 p-6 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner">
                  {/* Info Paciente */}
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-extrabold text-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/80">
                      {nextConsultorioSession.patientName.charAt(0)}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-xl font-extrabold text-white">
                          {nextConsultorioSession.patientName}
                        </h3>
                        <span
                          className={`text-xs font-bold uppercase px-3 py-0.5 rounded-full border ${
                            nextConsultorioSession.type === 'online'
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {nextConsultorioSession.type}
                        </span>

                        <span
                          className={`text-xs font-bold uppercase px-3 py-0.5 rounded-full border ${
                            statusBadgeColors[nextConsultorioSession.status].bg
                          } ${statusBadgeColors[nextConsultorioSession.status].text} ${
                            statusBadgeColors[nextConsultorioSession.status].border
                          }`}
                        >
                          {statusBadgeColors[nextConsultorioSession.status].label}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-300 font-medium">
                        <span className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold">
                          <Clock className="w-4 h-4" />
                          {nextConsultorioSession.startTime} - {nextConsultorioSession.endTime}
                        </span>
                        <span>•</span>
                        <span className="font-bold text-white">
                          R$ {nextConsultorioSession.price}
                        </span>
                        <span>•</span>
                        <span>
                          Pagamento:{' '}
                          <strong
                            className={
                              nextConsultorioSession.paymentStatus === 'pago'
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                            }
                          >
                            {nextConsultorioSession.paymentStatus.toUpperCase()}
                          </strong>
                        </span>
                      </div>

                      {currentPatientObj?.initialAnamnesis && (
                        <p className="text-xs text-slate-400 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 max-w-2xl mt-2">
                          <strong className="text-emerald-400 font-semibold">Anamnese / Contexto:</strong>{' '}
                          {currentPatientObj.initialAnamnesis}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações Principais do Consultório */}
                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    <button
                      onClick={() => startLiveSession(nextConsultorioSession)}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xl shadow-emerald-950/80 transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Iniciar Atendimento Ao Vivo</span>
                    </button>

                    <a
                      href={generateWhatsAppLink(nextConsultorioSession)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700 text-xs font-bold transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </a>

                    <button
                      onClick={() => {
                        updateSessionStatus(nextConsultorioSession.id, 'realizada');
                        addToast(`Sessão com ${nextConsultorioSession.patientName} marcada como realizada!`);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-bold transition-colors"
                      title="Concluir sessão"
                    >
                      <Check className="w-4 h-4" />
                      <span>Concluir</span>
                    </button>

                    <button
                      onClick={() => {
                        updateSessionStatus(nextConsultorioSession.id, 'falta');
                        addToast(`Falta registrada para ${nextConsultorioSession.patientName}.`);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-semibold transition-colors"
                      title="Marcar falta"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Falta</span>
                    </button>
                  </div>
                </div>

                {/* Fila de Próximos Atendimentos Hoje */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Outros Atendimentos Hoje ({todaySessionsAll.length})
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {todaySessionsAll.map((session) => (
                      <div
                        key={session.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          session.id === nextConsultorioSession.id
                            ? 'bg-slate-900 border-emerald-500/50 shadow-md'
                            : 'bg-slate-950/60 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {session.startTime} - {session.endTime}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              statusBadgeColors[session.status].bg
                            } ${statusBadgeColors[session.status].text}`}
                          >
                            {statusBadgeColors[session.status].label}
                          </span>
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-white">{session.patientName}</p>
                            <p className="text-[11px] text-slate-400 uppercase">{session.type}</p>
                          </div>

                          <button
                            onClick={() => startLiveSession(session)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors"
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 space-y-3">
                <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">Nenhum atendimento agendado para hoje</h3>
                <p className="text-slate-400 text-xs max-w-md mx-auto">
                  Aproveite seu tempo livre ou agende novas consultas na sua agenda.
                </p>
                <button
                  onClick={() => onOpenNewSession(todayStr)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                >
                  + Agendar Sessão
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MODO DIÁRIO (DAY TIMELINE VIEW) */}
      {/* ========================================================================= */}
      {viewMode === 'dia' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <span>Linha do Tempo Diária ({selectedDate})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">07:00 às 20:00</span>
          </div>

          <div className="space-y-3">
            {hourSlots.map((hourStr) => {
              const hourSessions = daySessions.filter(
                (s) => s.startTime.substring(0, 2) === hourStr.substring(0, 2)
              );

              if (hourSessions.length > 0) {
                return (
                  <div key={hourStr} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="w-16 font-mono text-sm font-bold text-emerald-400 shrink-0 pt-1">
                      {hourStr}
                    </div>

                    <div className="flex-1 space-y-2">
                      {hourSessions.map((session) => {
                        const badge = statusBadgeColors[session.status];
                        return (
                          <div
                            key={session.id}
                            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-base font-extrabold text-white">
                                  {session.patientName}
                                </span>
                                <span
                                  className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
                                >
                                  {badge.label}
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
                              </div>

                              <div className="flex items-center gap-4 text-xs text-slate-400">
                                <span className="font-mono text-emerald-400 font-semibold">
                                  {session.startTime} - {session.endTime}
                                </span>
                                <span>•</span>
                                <span className="font-bold text-white">R$ {session.price}</span>
                                <span>•</span>
                                <span className={session.paymentStatus === 'pago' ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                                  {session.paymentStatus.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                onClick={() => startLiveSession(session)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Atendimento</span>
                              </button>

                              <a
                                href={generateWhatsAppLink(session)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors"
                                title="Enviar Lembrete WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>

                              <button
                                onClick={() => onEditSession(session)}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold"
                              >
                                Editar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Slot Vazio
              return (
                <div
                  key={hourStr}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <span className="font-mono text-xs font-bold text-slate-500 w-16">{hourStr}</span>
                  <span className="text-xs text-slate-600 italic">Horário livre</span>
                  <button
                    onClick={() => onOpenNewSession(selectedDate, hourStr)}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-900/50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agendar {hourStr}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODO SEMANAL (WEEK GRID VIEW) */}
      {/* ========================================================================= */}
      {viewMode === 'semana' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 overflow-x-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-extrabold text-white">Visão Semanal</h3>
            <span className="text-xs text-slate-400">Segunda a Domingo</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 min-w-[800px]">
            {weekDateStrs.map((dStr) => {
              const daySess = getSessionsForDate(dStr);
              const [y, m, d] = dStr.split('-').map(Number);
              const dateObj = new Date(y, m - 1, d);
              const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
              const isCellToday = dStr === todayStr;
              const isCellSelected = dStr === selectedDate;

              return (
                <div
                  key={dStr}
                  className={`p-3 rounded-2xl border flex flex-col justify-between space-y-3 min-h-[350px] transition-all ${
                    isCellSelected
                      ? 'bg-slate-900 border-emerald-500 shadow-lg'
                      : isCellToday
                      ? 'bg-slate-950 border-emerald-500/50'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="text-center pb-2 border-b border-slate-800/80">
                      <span className="text-[11px] uppercase font-bold text-slate-400">{dayName}</span>
                      <h4 className={`text-base font-extrabold ${isCellToday ? 'text-emerald-400' : 'text-white'}`}>
                        {d}/{m}
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {daySess.map((session) => {
                        const badge = statusBadgeColors[session.status];
                        return (
                          <div
                            key={session.id}
                            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1 hover:border-slate-700 transition-colors cursor-pointer"
                            onClick={() => onEditSession(session)}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 font-bold">
                              <span>{session.startTime}</span>
                              <span className={`px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-xs font-extrabold text-white truncate">{session.patientName}</p>
                            <p className="text-[10px] text-slate-400 uppercase">{session.type}</p>
                          </div>
                        );
                      })}

                      {daySess.length === 0 && (
                        <p className="text-[11px] text-slate-600 text-center py-6 italic">
                          Sem sessões
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenNewSession(dStr)}
                    className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agendar</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODO MENSAL (MONTH CALENDAR GRID VIEW) */}
      {/* ========================================================================= */}
      {viewMode === 'mes' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-extrabold text-white">Calendário Mensal</h3>
            <span className="text-xs text-slate-400 font-semibold">
              Clique em um dia para navegar
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase pb-2">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthGridCells.map((dStr, idx) => {
              if (!dStr) {
                return <div key={`empty-${idx}`} className="h-24 bg-slate-950/20 rounded-2xl border border-transparent" />;
              }

              const daySess = getSessionsForDate(dStr);
              const dayNum = Number(dStr.split('-')[2]);
              const isCellToday = dStr === todayStr;
              const isCellSelected = dStr === selectedDate;

              return (
                <div
                  key={dStr}
                  onClick={() => {
                    setSelectedDate(dStr);
                    setViewMode('dia');
                  }}
                  className={`h-24 p-2 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all hover:border-emerald-500/80 ${
                    isCellSelected
                      ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20'
                      : isCellToday
                      ? 'bg-slate-950 border-emerald-500/40'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-extrabold ${
                        isCellToday
                          ? 'w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center'
                          : 'text-white'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {daySess.length > 0 && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                        {daySess.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-hidden">
                    {daySess.slice(0, 2).map((s) => (
                      <div key={s.id} className="text-[10px] truncate text-slate-300 font-medium bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {s.startTime} {s.patientName.split(' ')[0]}
                      </div>
                    ))}
                    {daySess.length > 2 && (
                      <p className="text-[9px] text-emerald-400 font-bold text-center">
                        +{daySess.length - 2} mais
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODO LISTA (FILTERED LIST VIEW) */}
      {/* ========================================================================= */}
      {viewMode === 'lista' && (
        <div className="space-y-3">
          {daySessions.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 rounded-3xl border border-dashed border-slate-800 space-y-3">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Nenhum agendamento encontrado</h3>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Não existem sessões cadastradas para o filtro ou data selecionada.
              </p>
              <button
                onClick={() => onOpenNewSession(selectedDate)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                + Agendar Sessão
              </button>
            </div>
          ) : (
            daySessions.map((session) => {
              const badge = statusBadgeColors[session.status];
              return (
                <div
                  key={session.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center shrink-0 min-w-[90px]">
                      <div className="text-xs font-mono text-emerald-400 font-bold">{session.startTime}</div>
                      <div className="text-[10px] text-slate-500">até {session.endTime}</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-1">{session.date}</div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-white">{session.patientName}</h3>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
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
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        <span className="font-bold text-white">R$ {session.price}</span>
                        <span>•</span>
                        {session.paymentStatus === 'pago' ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                          </span>
                        ) : (
                          <button
                            onClick={() => updatePaymentStatus(session.id, 'pago')}
                            className="text-amber-400 hover:underline font-semibold"
                          >
                            Marcar como Pago
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => startLiveSession(session)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Atendimento</span>
                    </button>

                    <a
                      href={generateWhatsAppLink(session)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 transition-colors"
                      title="Enviar Lembrete WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => onEditSession(session)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MOBILE FLOATING ACTION BUTTON (FAB) */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <button
          onClick={() => onOpenNewSession(selectedDate)}
          className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold shadow-2xl flex items-center justify-center border-2 border-emerald-400/50 active:scale-95 transition-transform"
          title="Nova Sessão"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};
