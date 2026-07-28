import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  KeyRound,
  Inbox,
  Info,
  Copy,
  ChevronDown,
  ChevronUp,
  Check,
  Send
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccessAuth: () => void;
}

interface SentEmailDetails {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'register',
  onClose,
  onSuccessAuth
}) => {
  const {
    registerAccount,
    verifyAccountCode,
    resendVerificationCode,
    loginWithCredentials,
    requestPasswordReset,
    confirmPasswordReset,
    addToast
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register' | 'confirm_email' | 'forgot_password' | 'reset_password'>(
    initialMode
  );
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [crp, setCrp] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);

  // Verification & Reset fields
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [activeCodeDisplay, setActiveCodeDisplay] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  // Email Preview State
  const [lastEmailSent, setLastEmailSent] = useState<SentEmailDetails | null>(null);
  const [showEmailInspector, setShowEmailInspector] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);

  // Error & loading state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setVerificationCodeInput('');
      setActiveCodeDisplay(null);
      setLastEmailSent(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Dispatch Email helper
  const sendEmailBackend = async (
    recipientEmail: string,
    recipientName: string,
    code: string,
    type: 'register' | 'reset' = 'register'
  ) => {
    try {
      const res = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recipientEmail,
          name: recipientName,
          verificationCode: code,
          type
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.emailDetails) {
          setLastEmailSent(data.emailDetails);
        }
      }
    } catch (err) {
      console.error('Erro ao enviar e-mail via API:', err);
    }
  };

  // Validation helper functions
  const validateRegister = (): boolean => {
    setErrorMessage(null);

    const nameTrimmed = name.trim();
    if (!nameTrimmed || nameTrimmed.split(' ').filter(Boolean).length < 2) {
      setErrorMessage('Por favor, informe seu nome completo (mínimo nome e sobrenome).');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Por favor, insira um e-mail válido.');
      return false;
    }

    if (password.length < 8) {
      setErrorMessage('A senha deve conter no mínimo 8 caracteres.');
      return false;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMessage('A senha deve conter pelo menos uma letra e um número.');
      return false;
    }

    if (password !== confirmPassword) {
      setErrorMessage('A confirmação de senha não confere com a senha digitada.');
      return false;
    }

    const cleanPhone = whatsapp.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Por favor, insira um número de WhatsApp válido com DDD (ex: 11 99999-8888).');
      return false;
    }

    if (!acceptTerms) {
      setErrorMessage('Você deve aceitar os Termos de Uso e Política de Privacidade para continuar.');
      return false;
    }

    return true;
  };

  const validateLogin = (): boolean => {
    setErrorMessage(null);
    if (!email) {
      setErrorMessage('Por favor, digite seu e-mail profissional.');
      return false;
    }
    if (!password) {
      setErrorMessage('Por favor, digite sua senha.');
      return false;
    }
    return true;
  };

  // Submit Handlers
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegister()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = registerAccount({
        name,
        email,
        password,
        phone: whatsapp,
        crp
      });

      setActiveCodeDisplay(result.verificationCode);
      await sendEmailBackend(email, name, result.verificationCode, 'register');

      setIsLoading(false);
      addToast(`E-mail de confirmação enviado com sucesso para ${email}!`, 'success');
      setMode('confirm_email');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Erro ao criar conta. Tente novamente.');
    }
  };

  const handleConfirmEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCodeInput || verificationCodeInput.trim().length < 6) {
      setErrorMessage('Digite o código de 6 dígitos.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      setIsLoading(false);
      const res = verifyAccountCode(email, verificationCodeInput);
      if (res.success) {
        onSuccessAuth();
        onClose();
      } else {
        setErrorMessage(res.message || 'Código inválido. Verifique o código enviado para seu e-mail e tente novamente.');
      }
    }, 400);
  };

  const handleResendCode = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    const newCode = resendVerificationCode(email);
    setActiveCodeDisplay(newCode);

    await sendEmailBackend(email, name || 'Profissional', newCode, 'register');

    setIsLoading(false);
    addToast(`Novo e-mail com código enviado para ${email}!`, 'info');
  };

  const handleCopyCodeToInput = (code: string) => {
    setVerificationCodeInput(code);
    setCodeCopied(true);
    addToast('Código de verificação preenchido automaticamente!', 'success');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;

    setIsLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      setIsLoading(false);
      const res = loginWithCredentials(email, password);
      if (res.success) {
        onSuccessAuth();
        onClose();
      } else if (res.requiresVerification) {
        setErrorMessage(res.message || 'Confirme sua conta antes de entrar.');
        setMode('confirm_email');
      } else {
        setErrorMessage(res.message || 'Credenciais inválidas.');
      }
    }, 500);
  };

  const handleQuickAdminLogin = () => {
    setIsLoading(true);
    setEmail('admin@sessaocerta.com.br');
    setPassword('admin123');
    setTimeout(() => {
      setIsLoading(false);
      const res = loginWithCredentials('admin@sessaocerta.com.br', 'admin123');
      if (res.success) {
        onSuccessAuth();
        onClose();
      } else {
        setErrorMessage(res.message || 'Falha no login do administrador.');
      }
    }, 400);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage('Informe seu e-mail cadastrado para enviarmos o código de redefinição.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    const res = requestPasswordReset(email);
    if (res.success) {
      const code = res.code || '123456';
      setActiveCodeDisplay(code);
      await sendEmailBackend(email, 'Profissional', code, 'reset');
      setIsLoading(false);
      setMode('reset_password');
    } else {
      setIsLoading(false);
      setErrorMessage(res.message || 'E-mail não encontrado.');
    }
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCodeInput || verificationCodeInput.trim().length < 6) {
      setErrorMessage('Informe o código de redefinição de 6 dígitos.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setErrorMessage('A confirmação de senha não confere.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      setIsLoading(false);
      const res = confirmPasswordReset(email, verificationCodeInput, newPassword);
      if (res.success) {
        setPassword(newPassword);
        setMode('login');
      } else {
        setErrorMessage(res.message || 'Código inválido.');
      }
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8 flex flex-col relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Branding */}
        <div className="p-6 bg-gradient-to-b from-slate-950 to-slate-900 border-b border-slate-800 text-center space-y-2 pt-8">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-sky-600 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Sessão Certa
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'register' && 'Crie sua conta profissional com login e senha reais'}
            {mode === 'login' && 'Bem-vindo de volta ao seu consultório digital'}
            {mode === 'confirm_email' && 'Verificação de Segurança e E-mail de Boas-Vindas'}
            {mode === 'forgot_password' && 'Recuperação de Senha Segura'}
            {mode === 'reset_password' && 'Redefinir Senha de Acesso'}
          </p>

          {(mode === 'login' || mode === 'register') && (
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mt-3 max-w-xs mx-auto">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setMode('login');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Fazer Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setMode('register');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Criar Conta
              </button>
            </div>
          )}
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in shadow-lg">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {/* MODE: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 flex items-center justify-between">
                  <span>Nome Completo *</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dra. Juliana Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">E-mail Profissional *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="juliana@psicologia.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">WhatsApp *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="(11) 99999-8888"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">CRP (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 06/123456"
                    value={crp}
                    onChange={(e) => setCrp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Criar Senha Segura *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 8 caracteres (letras e números)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Confirmar Senha *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repita a senha criada"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="terms">
                  Li e concordo com a <span className="text-emerald-400 underline">Política de Privacidade</span> e proteção LGPD.
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 pt-3"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>Criar Minha Conta Profissional</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2 text-[11px] text-slate-400">
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setMode('login');
                  }}
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Fazer Login
                </button>
              </div>
            </form>
          )}

          {/* MODE: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
              {/* ADMIN MVP QUICK ACCESS CARD */}
              <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-800/60 space-y-2 mb-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-purple-300 font-extrabold text-xs">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span>Acesso Rápido - Admin SaaS</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Administrador
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800 text-[11px] font-mono text-purple-200">
                  <span>admin@sessaocerta.com.br</span>
                  <span>admin123</span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickAdminLogin}
                  disabled={isLoading}
                  className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-950/50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Entrar com Conta Admin</span>
                </button>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">E-mail Profissional Cadastrado</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-300">Sua Senha</label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setMode('forgot_password');
                    }}
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Sua senha real cadastrada"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 pt-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>Entrar no Consultório Digital</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2 text-[11px] text-slate-400">
                Ainda não tem conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setMode('register');
                  }}
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Cadastrar-se gratuitamente
                </button>
              </div>
            </form>
          )}

          {/* MODE: CONFIRM EMAIL CODE */}
          {mode === 'confirm_email' && (
            <form onSubmit={handleConfirmEmailSubmit} className="space-y-4 py-2 text-xs">
              <div className="text-center space-y-2 pb-1">
                <h3 className="text-lg font-extrabold text-white">Verifique seu e-mail</h3>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Enviamos um código de verificação para:<br />
                  <span className="text-emerald-400 font-bold font-mono text-sm">{email}</span>
                </p>
                <p className="text-slate-400 text-xs">
                  Digite o código abaixo para concluir seu cadastro.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Código de 6 dígitos"
                    value={verificationCodeInput}
                    onChange={(e) => setVerificationCodeInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-3 text-center text-xl font-mono font-black tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500 shadow-inner"
                  />
                </div>
              </div>

              {errorMessage?.includes('expirou') ? (
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <span>Enviar novo código</span>
                  )}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar código</span>
                    </>
                  )}
                </button>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="text-emerald-400 font-semibold hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Enviar novo código</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setMode('register');
                  }}
                  className="hover:text-white underline"
                >
                  Alterar e-mail
                </button>
              </div>
            </form>
          )}

          {/* MODE: FORGOT PASSWORD */}
          {mode === 'forgot_password' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Informe seu E-mail Cadastrado</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <span>Enviar Código de Redefinição por E-mail</span>
                )}
              </button>

              <div className="text-center pt-2 text-[11px] text-slate-400">
                Lembrou da senha?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setMode('login');
                  }}
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Voltar ao Login
                </button>
              </div>
            </form>
          )}

          {/* MODE: RESET PASSWORD */}
          {mode === 'reset_password' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-sky-950/50 border border-sky-800/80 text-center space-y-1">
                <div className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                  E-mail de Redefinição Enviado para {email}
                </div>
                {activeCodeDisplay && (
                  <div className="text-2xl font-mono font-extrabold text-white tracking-widest pt-1">
                    {activeCodeDisplay}
                  </div>
                )}
                <div className="text-[11px] text-sky-300/80">
                  O código de redefinição de senha foi enviado com sucesso.
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Código de Redefinição (6 dígitos)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Ex: 123456"
                  value={verificationCodeInput}
                  onChange={(e) => setVerificationCodeInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-center text-base font-mono font-bold text-sky-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Nova Senha Profissional *</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Confirmar Nova Senha *</label>
                <input
                  type="password"
                  required
                  placeholder="Repita a nova senha"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <span>Redefinir Senha e Entrar</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
