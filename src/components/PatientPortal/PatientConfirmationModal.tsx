import React, { useState } from 'react';
import { Logo } from '../Brand/Logo';
import { useApp } from '../../context/AppContext';
import { Session } from '../../types';
import {
  CheckCircle2,
  Calendar,
  Clock,
  User,
  MapPin,
  Video,
  AlertCircle,
  X,
  MessageCircle,
  Heart,
  Send,
  ExternalLink,
  Shield,
  Navigation,
  CalendarPlus
} from 'lucide-react';

interface PatientConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
}

export const PatientConfirmationModal: React.FC<PatientConfirmationModalProps> = ({
  isOpen,
  onClose,
  session
}) => {
  const { profile, updateSessionStatus, updateSession, addToast } = useApp();

  const [rescheduleReason, setRescheduleReason] = useState('');
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionType, setSubmissionType] = useState<'confirm' | 'reschedule' | null>(null);

  if (!isOpen || !session) return null;

  // Generate unique secure token representation
  const secureToken = session.id.replace(/-/g, '').substring(0, 8).toUpperCase();

  const handleConfirm = () => {
    updateSessionStatus(session.id, 'confirmada');
    setSubmissionType('confirm');
    setIsSubmitted(true);
    addToast(`Presença do paciente ${session.patientName} confirmada com sucesso!`);
  };

  const handleRequestReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    updateSessionStatus(session.id, 'solicita_reagendamento');
    if (rescheduleReason) {
      updateSession(session.id, {
        clinicalNotes: session.clinicalNotes 
          ? `${session.clinicalNotes}\n[Solicitação de Reagendamento]: ${rescheduleReason}`
          : `[Solicitação de Reagendamento]: ${rescheduleReason}`
      });
    }
    setSubmissionType('reschedule');
    setIsSubmitted(true);
    addToast(`Solicitação de reagendamento enviada ao psicólogo(a).`);
  };

  // Google Calendar Link generator
  const getGoogleCalendarUrl = () => {
    const startIso = `${session.date.replace(/-/g, '')}T${session.startTime.replace(':', '')}00`;
    const endIso = `${session.date.replace(/-/g, '')}T${session.endTime.replace(':', '')}00`;
    const title = encodeURIComponent(`Sessão de Psicologia — ${profile.name}`);
    const details = encodeURIComponent(`Consulta de Psicologia com ${profile.name} (${profile.crp}).\nModalidade: ${session.type.toUpperCase()}`);
    const location = encodeURIComponent(session.type === 'presencial' ? (profile.clinicAddress || 'Consultório') : 'Atendimento Online');
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  // Google Maps Link
  const getGoogleMapsUrl = () => {
    const query = encodeURIComponent(profile.clinicAddress || 'Consultório de Psicologia');
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  // Professional WhatsApp Link
  const getProfessionalWhatsAppUrl = () => {
    const cleanPhone = profile.phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá, ${profile.name}! Sou ${session.patientName}, gostaria de falar sobre minha consulta do dia ${session.date}.`);
    return `https://wa.me/55${cleanPhone}?text=${msg}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
        {/* Header Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" variant="dark" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!isSubmitted ? (
            <>
              {/* Professional Profile Header */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-emerald-600 to-sky-600 text-white flex items-center justify-center text-xl font-black shadow-md">
                  {profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white">{profile.name}</h2>
                  <p className="text-xs text-slate-400 font-medium">{profile.crp} · {profile.specialty}</p>
                </div>
              </div>

              {/* Consultation Details Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-300 border-b border-slate-800/80 pb-2 flex items-center justify-between">
                  <span>Sua Consulta Agendada</span>
                  <span className="text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-800/60">
                    {session.type === 'online' ? 'Atendimento Online' : 'Atendimento Presencial'}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Data: <strong className="text-white">{session.date}</strong></span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Horário: <strong className="text-white">{session.startTime} às {session.endTime}</strong></span>
                  </div>

                  {session.type === 'online' && (
                    <div className="flex items-center gap-2.5 text-sky-400">
                      <Video className="w-4 h-4 shrink-0" />
                      <span className="truncate">Sala de videochamada pronta</span>
                    </div>
                  )}

                  {session.type === 'presencial' && profile.clinicAddress && (
                    <div className="flex items-start gap-2.5 text-slate-300">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{profile.clinicAddress}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Action Buttons */}
              {!showRescheduleForm ? (
                <div className="space-y-2.5 pt-1">
                  <button
                    onClick={handleConfirm}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✅ Sim, Confirmo Minha Presença</span>
                  </button>

                  <button
                    onClick={() => setShowRescheduleForm(true)}
                    className="w-full py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>📅 Preciso Reagendar em Outro Horário</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestReschedule} className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">
                      Motivo / Preferência de novo horário:
                    </label>
                    <textarea
                      rows={3}
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="Ex: Tive um imprevisto de trabalho. Gostaria de reagendar para sexta-feira às 15h se possível..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRescheduleForm(false)}
                      className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      Voltar
                    </button>

                    <button
                      type="submit"
                      className="w-1/2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar Pedido</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            /* CONFIRMAÇÃO INTELIGENTE (SMART CONFIRMATION SCREEN) */
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-950/30">
                  {submissionType === 'confirm' ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : (
                    <Calendar className="w-8 h-8 text-amber-400" />
                  )}
                </div>

                <h3 className="text-base font-extrabold text-white">
                  {submissionType === 'confirm'
                    ? 'Presença Confirmada! ✅'
                    : 'Solicitação de Reagendamento Enviada!'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  {submissionType === 'confirm'
                    ? `Sua consulta com ${profile.name} está garantida para ${session.date} às ${session.startTime}.`
                    : `Recebemos seu pedido. ${profile.name} entrará em contato em breve para combinar um novo horário.`}
                </p>
              </div>

              {/* Confirmação Inteligente Smart Buttons */}
              {submissionType === 'confirm' && (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Recursos para sua consulta</span>
                  </div>

                  <div className="space-y-2">
                    {/* Add to Calendar */}
                    <a
                      href={getGoogleCalendarUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarPlus className="w-4 h-4 text-emerald-400" />
                        <span>Adicionar ao Google Agenda</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>

                    {/* Google Maps for Presencial */}
                    {session.type === 'presencial' && profile.clinicAddress && (
                      <a
                        href={getGoogleMapsUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-sky-400" />
                          <span className="truncate max-w-[200px]">Abrir no Google Maps</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </a>
                    )}

                    {/* Online Video Call Link */}
                    {session.type === 'online' && (
                      <a
                        href={session.videoUrl || 'https://meet.google.com/'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-3 rounded-xl bg-sky-950/80 hover:bg-sky-900 text-sky-200 text-xs font-semibold border border-sky-800 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-sky-400" />
                          <span>Entrar na Videochamada</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                      </a>
                    )}

                    {/* Direct WhatsApp Contact with Therapist */}
                    <a
                      href={getProfessionalWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-semibold border border-emerald-800/80 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                        <span>Falar com {profile.name}</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                    </a>
                  </div>
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  Concluir e Fechar
                </button>
              </div>
            </div>
          )}

          {/* Token Security Footer */}
          <div className="text-center border-t border-slate-800/80 pt-3 text-[10px] text-slate-500 font-mono">
            <span>🔒 Conexão segura · Token: {secureToken} · Sessão Certa</span>
          </div>
        </div>
      </div>
    </div>
  );
};

