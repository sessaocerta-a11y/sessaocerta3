import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Session, SessionStatus, PaymentStatus, AttendanceType } from '../../types';
import { X, Calendar, Clock, Video, MapPin, DollarSign, RefreshCw, UserCheck } from 'lucide-react';

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToEdit?: Session | null;
  initialPatientId?: string;
  initialDate?: string;
  initialTime?: string;
}

export const SessionFormModal: React.FC<SessionFormModalProps> = ({
  isOpen,
  onClose,
  sessionToEdit,
  initialPatientId,
  initialDate,
  initialTime
}) => {
  const { patients, sessions, addSession, updateSession, profile, addToast } = useApp();

  const [patientId, setPatientId] = useState('');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(initialTime || '10:00');
  const [endTime, setEndTime] = useState('10:50');
  const [type, setType] = useState<AttendanceType>('online');
  const [videoUrl, setVideoUrl] = useState('');
  const [price, setPrice] = useState<number>(profile.sessionDefaultPrice);
  const [status, setStatus] = useState<SessionStatus>('agendada');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pendente');
  const [recurrenceWeeks, setRecurrenceWeeks] = useState<number>(1);
  const [selectedDuration, setSelectedDuration] = useState<number>(profile.sessionDefaultDuration || 50);

  // Time conflict detection
  const conflictSession = sessions.find((s) => {
    if (sessionToEdit && s.id === sessionToEdit.id) return false;
    if (s.date !== date) return false;
    if (s.status === 'cancelada_paciente' || s.status === 'cancelada_psicologo') return false;
    return (startTime >= s.startTime && startTime < s.endTime) || (endTime > s.startTime && endTime <= s.endTime);
  });

  // Calculate end time based on start time and duration minutes
  const applyDuration = (start: string, durationMinutes: number) => {
    const [h, m] = start.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const endMinutes = h * 60 + m + durationMinutes;
      const endH = Math.floor(endMinutes / 60) % 24;
      const endM = endMinutes % 60;
      setEndTime(
        `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
      );
    }
  };

  // Auto populate duration when startTime changes
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    applyDuration(newStart, selectedDuration);
  };

  const handleDurationPreset = (durationMinutes: number) => {
    setSelectedDuration(durationMinutes);
    applyDuration(startTime, durationMinutes);
  };

  // When patient selection changes, auto set patient's default price and attendance type
  const handlePatientSelect = (pId: string) => {
    setPatientId(pId);
    const p = patients.find((item) => item.id === pId);
    if (p) {
      setType(p.attendanceType);
      setPrice(p.sessionPrice);
      if (p.attendanceType === 'online' && !videoUrl) {
        setVideoUrl('https://meet.google.com/ses-certa-online');
      }
    }
  };

  useEffect(() => {
    if (sessionToEdit) {
      setPatientId(sessionToEdit.patientId);
      setDate(sessionToEdit.date);
      setStartTime(sessionToEdit.startTime);
      setEndTime(sessionToEdit.endTime);
      setType(sessionToEdit.type);
      setVideoUrl(sessionToEdit.videoUrl || '');
      setPrice(sessionToEdit.price);
      setStatus(sessionToEdit.status);
      setPaymentStatus(sessionToEdit.paymentStatus);
      setRecurrenceWeeks(1);
    } else {
      const defaultPId = initialPatientId || (patients.length > 0 ? patients[0].id : '');
      if (defaultPId) handlePatientSelect(defaultPId);
      const targetDate = initialDate || new Date().toISOString().split('T')[0];
      const targetStart = initialTime || '10:00';
      setDate(targetDate);
      setStartTime(targetStart);
      applyDuration(targetStart, profile.sessionDefaultDuration || 50);
      setStatus('agendada');
      setPaymentStatus('pendente');
      setRecurrenceWeeks(1);
    }
  }, [sessionToEdit, initialPatientId, initialDate, initialTime, patients, profile]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedPatient = patients.find((p) => p.id === patientId);
    if (!selectedPatient) {
      alert('Selecione um paciente para a sessão.');
      return;
    }

    if (sessionToEdit) {
      updateSession(sessionToEdit.id, {
        patientId,
        patientName: selectedPatient.name,
        date,
        startTime,
        endTime,
        type,
        videoUrl: type === 'online' ? videoUrl : undefined,
        price: Number(price),
        status,
        paymentStatus,
      });
    } else {
      // Handle optional recurrence
      const numWeeks = Math.max(1, recurrenceWeeks);
      for (let i = 0; i < numWeeks; i++) {
        const d = new Date(date);
        d.setDate(d.getDate() + i * 7);
        const sessionDateStr = d.toISOString().split('T')[0];

        addSession({
          patientId,
          patientName: selectedPatient.name,
          date: sessionDateStr,
          startTime,
          endTime,
          type,
          videoUrl: type === 'online' ? videoUrl : undefined,
          price: Number(price),
          status,
          paymentStatus,
          whatsappReminderSent: false,
        });
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">
              {sessionToEdit ? 'Editar Agendamento' : 'Agendar Nova Sessão'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs text-slate-200 flex-1">
          {/* Conflict Warning Banner */}
          {conflictSession && (
            <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                <span>⚠️ Conflito de Horário Detectado</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Você já possui um atendimento com <strong>{conflictSession.patientName}</strong> agendado para <strong>{conflictSession.date}</strong> das <strong>{conflictSession.startTime} às {conflictSession.endTime}</strong>.
              </p>
            </div>
          )}

          {/* Paciente */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Paciente *</label>
            <select
              required
              value={patientId}
              onChange={(e) => handlePatientSelect(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="" disabled>Selecione o paciente...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.attendanceType} - R$ {p.sessionPrice})
                </option>
              ))}
            </select>
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Data *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Horário Início *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Término *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Duração Padrão Quick Presets */}
          <div className="space-y-1.5 pt-1">
            <label className="font-semibold text-slate-400 text-[11px] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Duração da Sessão:</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[30, 45, 50, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleDurationPreset(mins)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    selectedDuration === mins
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Modalidade & Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Modalidade</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AttendanceType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="online">Online (Videochamada)</option>
                <option value="presencial">Presencial (Consultório)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Valor da Sessão (R$)</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {type === 'online' && (
            <div className="space-y-1.5">
              <label className="font-semibold text-sky-400 flex items-center justify-between">
                <span>Link da Sala de Videochamada (Meet/Zoom)</span>
                <button
                  type="button"
                  onClick={() => setVideoUrl(`https://meet.google.com/psi-${Math.random().toString(36).substring(2, 8)}`)}
                  className="text-[10px] text-emerald-400 hover:underline"
                >
                  Gerar Link Meet
                </button>
              </label>
              <input
                type="url"
                placeholder="https://meet.google.com/abc-defg-hij"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Status & Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Status do Agendamento</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SessionStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="agendada">Agendada</option>
                <option value="confirmada">Confirmada pelo Paciente</option>
                <option value="realizada">Realizada / Concluída</option>
                <option value="cancelada_paciente">Cancelada p/ Paciente</option>
                <option value="cancelada_psicologo">Cancelada p/ Psicólogo</option>
                <option value="falta">Falta sem aviso</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Status do Pagamento</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="pendente">Pendente de Pagamento</option>
                <option value="pago">Pago (PIX / Dinheiro)</option>
                <option value="isento">Isento / Cortesia</option>
              </select>
            </div>
          </div>

          {/* Recorrência (Only for new sessions) */}
          {!sessionToEdit && (
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Repetir Agendamento Semanalmente?</span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={recurrenceWeeks}
                  onChange={(e) => setRecurrenceWeeks(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                >
                  <option value={1}>Apenas nesta data (Semana avulsa)</option>
                  <option value={2}>Repetir por 2 semanas</option>
                  <option value={4}>Repetir por 4 semanas (1 Mês)</option>
                  <option value={8}>Repetir por 8 semanas (2 Meses)</option>
                </select>
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-950 border border-slate-800 flex items-center justify-between rounded-xl pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20"
            >
              {sessionToEdit ? 'Salvar Agendamento' : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
