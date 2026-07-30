import React, { useState } from 'react';
import { Logo } from '../Brand/Logo';
import { useApp } from '../../context/AppContext';
import {
  CheckCircle2,
  Sparkles,
  User,
  Clock,
  DollarSign,
  UserPlus,
  Calendar,
  ChevronRight,
  ChevronLeft,
  X,
  ShieldCheck,
  Building
} from 'lucide-react';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewPatient: () => void;
  onOpenNewSession: () => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  onOpenNewPatient,
  onOpenNewSession
}) => {
  const { profile, updateProfile, patients, sessions, addToast } = useApp();

  const [step, setStep] = useState(1);

  // Form states for profile onboarding
  const [name, setName] = useState(profile.name);
  const [crp, setCrp] = useState(profile.crp);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [sessionPrice, setSessionPrice] = useState(profile.sessionDefaultPrice);
  const [sessionDuration, setSessionDuration] = useState(profile.sessionDefaultDuration);

  if (!isOpen) return null;

  const totalSteps = 6;

  const handleNext = () => {
    if (step === 2 || step === 3) {
      updateProfile({
        name,
        crp,
        phone,
        email,
        sessionDefaultPrice: Number(sessionPrice),
        sessionDefaultDuration: Number(sessionDuration),
      });
    }
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      addToast('Configuração concluída! Seu consultório está pronto.');
      onClose();
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8 flex flex-col">
        {/* Step Progress Bar */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-extrabold text-xs">
              {step}/{totalSteps}
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Configuração Inicial Guiada</h3>
              <p className="text-[10px] text-slate-400">Em menos de 2 minutos para uso pleno</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visual Progress Line */}
        <div className="w-full bg-slate-950 h-1">
          <div
            className="bg-emerald-500 h-1 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Step Contents */}
        <div className="p-6 space-y-6 flex-1 text-slate-200">
          {/* STEP 1: Boas-vindas */}
          {step === 1 && (
            <div className="text-center space-y-4 py-2">
              <div className="flex justify-center my-2">
                <Logo size="lg" variant="dark" showTagline={true} />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-white">
                  Bem-vindo ao Sessão Certa! 👋
                </h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Vamos configurar seu consultório digital em menos de 2 minutos. Com o Sessão Certa, você automatiza confirmações no WhatsApp, reduz faltas e ganha mais tranquilidade.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Seu assistente pessoal de consultório</span>
                </div>
                <p className="text-slate-400">
                  Cadastre seus pacientes, crie agendamentos e deixe que os lembretes automáticos façam o trabalho de confirmação por você.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Dados do Profissional */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <User className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Informações do Profissional</h3>
                  <p className="text-[11px] text-slate-400">Como seus pacientes identificam você nos lembretes</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Seu Nome Completo *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Registro Profissional (CRP)</label>
                  <input
                    type="text"
                    value={crp}
                    onChange={(e) => setCrp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">WhatsApp do Consultório *</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">E-mail Profissional</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Parâmetros de Atendimento */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Clock className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Parâmetros Padrão das Consultas</h3>
                  <p className="text-[11px] text-slate-400">Valores e duração média das sessões</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Valor Padrão da Consulta (R$)</label>
                  <input
                    type="number"
                    min="0"
                    value={sessionPrice}
                    onChange={(e) => setSessionPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Duração Padrão (Minutos)</label>
                  <select
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value={30}>30 Minutos</option>
                    <option value={45}>45 Minutos</option>
                    <option value={50}>50 Minutos (Padrão CRP/TCC)</option>
                    <option value={60}>60 Minutos (1 Hora)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Cadastrar 1º Paciente */}
          {step === 4 && (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <UserPlus className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-white">Cadastre seu Primeiro Paciente</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Você possui atualmente <strong className="text-white">{patients.length} paciente(s)</strong> cadastrado(s).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    onOpenNewPatient();
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Abrir Formulário de Novo Paciente</span>
                </button>

                {patients.length > 0 && (
                  <p className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Pacientes cadastrados disponíveis! Pode prosseguir.</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Agendar 1ª Sessão */}
          {step === 5 && (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                <Calendar className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-white">Agende sua Primeira Sessão</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Agende a consulta e o Sessão Certa criará os lembretes do WhatsApp automaticamente.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    onOpenNewSession();
                  }}
                  className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Abrir Agendamento de Sessão</span>
                </button>

                {sessions.length > 0 && (
                  <p className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sessão agendada! Lembretes prontos.</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: Concluído */}
          {step === 6 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-white">
                  Tudo Pronto e Configurado! 🚀
                </h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Sua conta está preparada. Agora você já pode acompanhar suas confirmações de presença, enviar lembretes em 1 clique e manter seu consultório em ordem.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            disabled={step === 1}
            onClick={handlePrev}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <button
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/20 flex items-center gap-1.5"
          >
            <span>{step === totalSteps ? 'Ir para o Painel Principal' : 'Próximo Passo'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
