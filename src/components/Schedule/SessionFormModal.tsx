import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Session, SessionStatus, PaymentStatus, AttendanceType } from '../../types';
import {
  X,
  Calendar,
  Clock,
  Video,
  MapPin,
  DollarSign,
  RefreshCw,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  UserCheck,
} from 'lucide-react';

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToEdit?: Session | null;
  initialPatientId?: string;
  initialDate?: string;
  initialTime?: string;
  onOpenNewPatient?: () => void;
}

const QUICK_HOURS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
const DURATION_PRESETS = [30, 45, 50, 60, 90, 120];

// Helper to check valid HH:MM format
const isValidTime = (timeStr: string): boolean => {
  if (!timeStr) return false;
  const parts = timeStr.split(':');
  if (parts.length !== 2) return false;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return !isNaN(h) && h >= 0 && h < 24 && !isNaN(m) && m >= 0 && m < 60;
};

// Auto-format digits like "1030" into "10:30"
const formatTimeString = (val: string): string => {
  const clean = val.replace(/[^\d:]/g, '');
  if (clean.length === 4 && !clean.includes(':')) {
    return `${clean.slice(0, 2)}:${clean.slice(2, 4)}`;
  }
  return clean;
};

export const SessionFormModal: React.FC<SessionFormModalProps> = ({
  isOpen,
  onClose,
  sessionToEdit,
  initialPatientId,
  initialDate,
  initialTime,
  onOpenNewPatient,
}) => {
  const { patients, sessions, addSession, updateSession, profile, addToast } = useApp();

  // Controlled Form States
  const [patientId, setPatientId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('10:50');
  const [type, setType] = useState<AttendanceType>('online');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [price, setPrice] = useState<number>(150);
  const [status, setStatus] = useState<SessionStatus>('agendada');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pendente');
  const [recurrenceWeeks, setRecurrenceWeeks] = useState<number>(1);
  const [selectedDuration, setSelectedDuration] = useState<number>(profile?.sessionDefaultDuration || 50);

  // Initialize form values when modal opens or sessionToEdit changes
  useEffect(() => {
    if (!isOpen) return;

    if (sessionToEdit) {
      setPatientId(sessionToEdit.patientId || '');
      setDate(sessionToEdit.date || new Date().toISOString().split('T')[0]);
      setStartTime(sessionToEdit.startTime || '10:00');
      setEndTime(sessionToEdit.endTime || '10:50');
      setType(sessionToEdit.type || 'online');
      setVideoUrl(sessionToEdit.videoUrl || '');
      setPrice(typeof sessionToEdit.price === 'number' ? sessionToEdit.price : profile?.sessionDefaultPrice || 150);
      setStatus(sessionToEdit.status || 'agendada');
      setPaymentStatus(sessionToEdit.paymentStatus || 'pendente');
      setRecurrenceWeeks(1);
    } else {
      const defaultPId = initialPatientId || (patients.length > 0 ? patients[0].id : '');
      setPatientId(defaultPId);

      const targetPatient = patients.find((p) => p.id === defaultPId);
      if (targetPatient) {
        setType(targetPatient.attendanceType || 'online');
        setPrice(targetPatient.sessionPrice || profile?.sessionDefaultPrice || 150);
        setVideoUrl(targetPatient.attendanceType === 'online' ? (targetPatient.videoUrl || 'https://meet.google.com/ses-certa-online') : '');
      } else {
        setType('online');
        setPrice(profile?.sessionDefaultPrice || 150);
        setVideoUrl('https://meet.google.com/ses-certa-online');
      }

      const cleanInitialDate = typeof initialDate === 'string' ? initialDate : undefined;
      const cleanInitialTime = typeof initialTime === 'string' ? initialTime : undefined;

      const todayStr = new Date().toISOString().split('T')[0];
      const startT = cleanInitialTime || '10:00';
      const durMins = profile?.sessionDefaultDuration || 50;

      setDate(cleanInitialDate || todayStr);
      setStartTime(startT);
      setSelectedDuration(durMins);
      calculateAndSetEndTime(startT, durMins);

      setStatus('agendada');
      setPaymentStatus('pendente');
      setRecurrenceWeeks(1);
    }
  }, [isOpen, sessionToEdit, initialPatientId, initialDate, initialTime]);

  // Handle keyboard ESC shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // End time calculator
  const calculateAndSetEndTime = (startStr: string, durationMinutes: number) => {
    const formatted = formatTimeString(startStr);
    if (!isValidTime(formatted)) return;
    const [h, m] = formatted.split(':').map(Number);
    const totalMins = h * 60 + m + durationMinutes;
    const endH = Math.floor(totalMins / 60) % 24;
    const endM = totalMins % 60;
    setEndTime(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
  };

  // Handlers for user interactions
  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    const formatted = formatTimeString(val);
    if (isValidTime(formatted)) {
      calculateAndSetEndTime(formatted, selectedDuration);
    }
  };

  const handleEndTimeChange = (val: string) => {
    setEndTime(val);
  };

  const handleDurationSelect = (durationMinutes: number) => {
    setSelectedDuration(durationMinutes);
    calculateAndSetEndTime(startTime, durationMinutes);
  };

  const handleQuickHourClick = (hour: string) => {
    setStartTime(hour);
    calculateAndSetEndTime(hour, selectedDuration);
  };

  const handlePatientChange = (selectedId: string) => {
    setPatientId(selectedId);
    const p = patients.find((item) => item.id === selectedId);
    if (p) {
      setType(p.attendanceType);
      setPrice(p.sessionPrice);
      if (p.attendanceType === 'online') {
        setVideoUrl(p.videoUrl || 'https://meet.google.com/ses-certa-online');
      } else {
        setVideoUrl('');
      }
    }
  };

  const handleGenerateMeet = () => {
    const code = `${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
    const link = `https://meet.google.com/${code}`;
    setVideoUrl(link);
    addToast('Novo link do Google Meet criado!', 'success');
  };

  // Conflict detection
  const conflict = sessions.find((s) => {
    if (sessionToEdit && s.id === sessionToEdit.id) return false;
    if (s.date !== date) return false;
    if (s.status === 'cancelada_paciente' || s.status === 'cancelada_psicologo') return false;
    return (startTime >= s.startTime && startTime < s.endTime) || (endTime > s.startTime && endTime <= s.endTime);
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId) {
      alert('Por favor, selecione um paciente para a sessão.');
      return;
    }

    const selectedPatient = patients.find((p) => p.id === patientId);
    if (!selectedPatient) {
      alert('Paciente selecionado não encontrado.');
      return;
    }

    const formattedStart = formatTimeString(startTime) || '10:00';
    const formattedEnd = formatTimeString(endTime) || '10:50';

    if (sessionToEdit) {
      updateSession(sessionToEdit.id, {
        patientId,
        patientName: selectedPatient.name,
        date,
        startTime: formattedStart,
        endTime: formattedEnd,
        type,
        videoUrl: type === 'online' ? videoUrl : undefined,
        price: Number(price),
        status,
        paymentStatus,
      });
      addToast(`Sessão de ${selectedPatient.name} atualizada com sucesso!`, 'success');
    } else {
      const numWeeks = Math.max(1, recurrenceWeeks);
      for (let i = 0; i < numWeeks; i++) {
        const dateParts = date.split('-').map(Number);
        const y = dateParts[0] || new Date().getFullYear();
        const m = (dateParts[1] || 1) - 1;
        const d = (dateParts[2] || 1) + i * 7;
        const targetD = new Date(y, m, d);
        const yyyy = targetD.getFullYear();
        const mm = String(targetD.getMonth() + 1).padStart(2, '0');
        const dd = String(targetD.getDate()).padStart(2, '0');
        const sessionDateStr = `${yyyy}-${mm}-${dd}`;

        addSession({
          patientId,
          patientName: selectedPatient.name,
          date: sessionDateStr,
          startTime: formattedStart,
          endTime: formattedEnd,
          type,
          videoUrl: type === 'online' ? (videoUrl || 'https://meet.google.com/ses-certa-online') : undefined,
          price: Number(price),
          status,
          paymentStatus,
          whatsappReminderSent: false,
        });

        // Envia e-mail de confirmação de consulta para o paciente se houver e-mail cadastrado
        if (selectedPatient.email) {
          fetch('/api/sessions/send-confirmation-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: selectedPatient.email,
              patientName: selectedPatient.name,
              psychologistName: profile?.name || 'Dra. Fernanda',
              date: sessionDateStr,
              time: formattedStart,
              type,
              videoUrl: type === 'online' ? (videoUrl || 'https://meet.google.com/ses-certa-online') : undefined,
              price: Number(price)
            })
          }).catch((err) => console.error('[CLIENT SESSION EMAIL ERROR]', err));
        }
      }
      addToast(
        numWeeks > 1
          ? `${numWeeks} sessões recorrentes agendadas para ${selectedPatient.name}!`
          : `Sessão agendada com sucesso para ${selectedPatient.name}!`,
        'success'
      );
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {sessionToEdit ? 'Editar Agendamento' : 'Agendar Nova Sessão'}
              </h2>
              <p className="text-xs text-slate-400">Preencha os dados do atendimento</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs text-slate-200 flex-1">
          {/* Conflict Alert */}
          {conflict && (
            <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Alerta de Conflito de Horário</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Já existe consulta com <strong>{conflict.patientName}</strong> no dia <strong>{conflict.date}</strong> das <strong>{conflict.startTime} às {conflict.endTime}</strong>.
              </p>
            </div>
          )}

          {/* Paciente Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300">Paciente *</label>
              {onOpenNewPatient && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNewPatient();
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Novo Paciente</span>
                </button>
              )}
            </div>
            <select
              required
              value={patientId}
              onChange={(e) => handlePatientChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-medium text-xs"
            >
              <option value="" disabled>
                Selecione o paciente...
              </option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.attendanceType === 'online' ? 'Online' : 'Presencial'} - R$ {p.sessionPrice})
                </option>
              ))}
            </select>
          </div>

          {/* Data, Horário Início e Término */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Data *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Início *</label>
              <input
                type="text"
                placeholder="10:00"
                required
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Término *</label>
              <input
                type="text"
                placeholder="10:50"
                required
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          </div>

          {/* Atalhos de Horários Rápidos */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-400 text-[11px] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Horários Sugeridos:</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleQuickHourClick(h)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                    startTime === h
                      ? 'bg-emerald-600 text-white font-bold shadow-md ring-1 ring-emerald-400'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Duração Preset */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-400 text-[11px]">Duração da Sessão:</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DURATION_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleDurationSelect(mins)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDuration === mins
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Modalidade e Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Modalidade</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setType('online');
                    if (!videoUrl) setVideoUrl('https://meet.google.com/ses-certa-online');
                  }}
                  className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 font-semibold text-xs transition-all cursor-pointer ${
                    type === 'online' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Online</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('presencial');
                    setVideoUrl('');
                  }}
                  className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 font-semibold text-xs transition-all cursor-pointer ${
                    type === 'presencial' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Presencial</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Valor da Sessão (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">R$</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Link Online */}
          {type === 'online' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-sky-400 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  <span>Link da Sala Virtual (Google Meet / Zoom)</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateMeet}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Gerar Link Meet</span>
                </button>
              </div>
              <input
                type="url"
                placeholder="https://meet.google.com/abc-defg-hij"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          )}

          {/* Status & Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Status do Agendamento</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SessionStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
              >
                <option value="agendada">📅 Agendada</option>
                <option value="confirmada">✅ Confirmada pelo Paciente</option>
                <option value="realizada">🏆 Realizada / Concluída</option>
                <option value="cancelada_paciente">❌ Cancelada p/ Paciente</option>
                <option value="cancelada_psicologo">⚠️ Cancelada p/ Psicólogo</option>
                <option value="falta">🚫 Falta sem aviso</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Status do Pagamento</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
              >
                <option value="pendente">⏳ Pendente de Pagamento</option>
                <option value="pago">💰 Pago (PIX / Dinheiro)</option>
                <option value="isento">🎁 Isento / Cortesia</option>
              </select>
            </div>
          </div>

          {/* Recorrência (Apenas para novos agendamentos) */}
          {!sessionToEdit && (
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Repetir Agendamento Semanalmente?</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { weeks: 1, label: 'Avulso (1x)' },
                  { weeks: 2, label: '2 Semanas' },
                  { weeks: 4, label: '4 Semanas (1 Mês)' },
                  { weeks: 8, label: '8 Semanas (2 Meses)' },
                ].map((item) => (
                  <button
                    key={item.weeks}
                    type="button"
                    onClick={() => setRecurrenceWeeks(item.weeks)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      recurrenceWeeks === item.weeks
                        ? 'bg-emerald-600 text-white font-bold ring-1 ring-emerald-400'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-4 bg-slate-950 border border-slate-800 flex items-center justify-between rounded-xl pt-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{sessionToEdit ? 'Salvar Alterações' : 'Confirmar Agendamento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
