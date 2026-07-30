import React, { useState, useEffect } from 'react';
import { Logo } from '../Brand/Logo';
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  MessageCircle,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Calculator,
  Lock,
  Clock,
  Check,
  X,
  Play,
  FileText,
  Brain,
  Bot,
  Shield,
  Activity,
  Users,
  Smartphone,
  Award,
  Globe,
  Star,
  ExternalLink,
  PhoneCall,
  Mail,
  CheckCircle,
  AlertCircle,
  XCircle,
  Heart,
  Sun,
  Smile,
  Compass,
  Layers,
  RefreshCw,
  Feather
} from 'lucide-react';

const dashboardHeroMockup = '/src/assets/images/dashboard_hero_mockup_1785284394533.jpg';

interface LandingPageViewProps {
  onStartFreeTrial: () => void;
  onLogin: () => void;
  onOpenOnboarding: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onStartFreeTrial,
  onLogin,
  onOpenOnboarding
}) => {
  // Calculadora de perdas por faltas state
  const [sessionValue, setSessionValue] = useState<number>(180);
  const [noShowsPerMonth, setNoShowsPerMonth] = useState<number>(6);

  const monthlyLoss = sessionValue * noShowsPerMonth;
  const yearlyLoss = monthlyLoss * 12;
  const recoveredValue = Math.round(monthlyLoss * 0.92); // 92% de recuperação de faltas com confirmação automática

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Video modal preview state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);

  const faqs = [
    {
      q: 'A plataforma está em conformidade com as exigências da LGPD e as normas do CFP?',
      a: 'Sim, 100%. O Sessão Certa foi projetado desde o primeiro dia com arquitetura orientada à saúde mental e sigilo clínico. Todos os dados de prontuários e evoluções são criptografados no banco de dados (at-rest) com AES-256 e transmitidos sob conexões seguras SSL/TLS. Atendemos integralmente à Resolução CFP nº 001/2009 e à Lei Geral de Proteção de Dados (LGPD).'
    },
    {
      q: 'O meu paciente precisa baixar algum aplicativo ou criar senha?',
      a: 'Não! Para eliminar qualquer barreira de confirmação, o paciente recebe o lembrete diretamente no seu WhatsApp pessoal. Ele clica no link seguro do seu consultório e confirma ou solicita reagendamento em menos de 5 segundos, sem precisar instalar nada nem decorar senhas.'
    },
    {
      q: 'Como funciona o envio automático de lembretes no WhatsApp?',
      a: 'Assim que você cadastra a consulta na agenda, nosso motor dispara o lembrete principal 24 horas antes do atendimento e uma notificação de reforço 2 horas antes. O sistema possui trava inteligente de horário (envios apenas das 08h às 20h) para respeitar o descanso do paciente.'
    },
    {
      q: 'A Inteligência Artificial interfere nas minhas condutas clínicas ou diagnósticos?',
      a: 'Jamais. A IA do Sessão Certa atua estritamente como um Copiloto Administrativo e Organizacional. Ela é utilizada exclusivamente para resumir anotações brutas, estruturar tópicos de acompanhamento e sugerir mensagens de reagendamento. O raciocínio clínico, diagnóstico e escuta terapêutica continuam sendo 100% humanos e de responsabilidade exclusiva do psicólogo.'
    },
    {
      q: 'Posso testar gratuitamente antes de tomar uma decisão?',
      a: 'Com certeza! Você ganha acesso imediato de teste completo à plataforma para cadastrar seus primeiros pacientes, testar a agenda inteligente e ver o envio de lembretes na prática. Não solicitamos cartão de crédito no cadastro.'
    },
    {
      q: 'Se eu quiser cancelar ou migrar no futuro, meus dados ficam presos no sistema?',
      a: 'Não. Você é o único proprietário de todos os registros clínicos e dados dos seus pacientes. O Sessão Certa permite exportar seu histórico de prontuários e cadastros em formatos padrão (PDF e CSV) a qualquer momento com apenas 1 clique no seu painel.'
    },
    {
      q: 'O sistema funciona bem no celular, tablet e computador?',
      a: 'Sim! A plataforma é totalmente responsiva e desenvolvida como uma PWA (Progressive Web App). Você pode acessar do seu notebook na clínica, do seu tablet ou do seu celular na rua com a mesma rapidez e fluidez.'
    }
  ];

  // Scroll Spy Active Section State
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    const sectionIds = [
      'por-que-escolher',
      'rotina-clinica',
      'antes-depois',
      'beneficios',
      'ia-copilot',
      'calculadora',
      'faq'
    ];

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200; // Offset for sticky header
      let current = '';

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            current = id;
          }
        }
      }

      // If near bottom of page, highlight FAQ
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120) {
        current = 'faq';
      }

      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white flex flex-col antialiased">
      {/* --------------------------------------------------------------------- */}
      {/* HEADER / NAVIGATION BAR (ESTILO LINEAR / VERCEL) */}
      {/* --------------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-4 md:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Logo variant="dark" size="md" />
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase hidden sm:inline-block">
              Exclusivo Psicologia
            </span>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2.5 text-xs font-semibold text-slate-300 px-4 xl:px-8">
            <button
              onClick={() => scrollToSection('beneficios')}
              className={`transition-all py-1.5 px-3 rounded-xl font-bold ${
                activeSection === 'beneficios'
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-300 hover:text-emerald-400 hover:bg-slate-900/60'
              }`}
            >
              Benefícios
            </button>

            <button
              onClick={() => scrollToSection('por-que-escolher')}
              className={`transition-all py-1.5 px-3 rounded-xl font-bold ${
                activeSection === 'por-que-escolher'
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-300 hover:text-emerald-400 hover:bg-slate-900/60'
              }`}
            >
              Por que escolher
            </button>

            <button
              onClick={() => scrollToSection('rotina-clinica')}
              className={`transition-all py-1.5 px-3 rounded-xl font-bold ${
                activeSection === 'rotina-clinica'
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-300 hover:text-emerald-400 hover:bg-slate-900/60'
              }`}
            >
              Sua Rotina
            </button>

            <button
              onClick={() => scrollToSection('antes-depois')}
              className={`transition-all py-1.5 px-3 rounded-xl font-bold ${
                activeSection === 'antes-depois'
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-300 hover:text-emerald-400 hover:bg-slate-900/60'
              }`}
            >
              Transformação
            </button>

            <button
              onClick={() => scrollToSection('ia-copilot')}
              className={`transition-all py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 ${
                activeSection === 'ia-copilot'
                  ? 'text-purple-300 bg-purple-500/15 border border-purple-500/30 shadow-sm'
                  : 'text-purple-300 hover:text-purple-200 hover:bg-purple-950/40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Copiloto Ético</span>
            </button>

            <button
              onClick={() => scrollToSection('calculadora')}
              className={`transition-all py-1.5 px-3 rounded-xl font-bold ${
                activeSection === 'calculadora'
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-300 hover:text-emerald-400 hover:bg-slate-900/60'
              }`}
            >
              Calculadora
            </button>

            <button
              onClick={() => scrollToSection('faq')}
              className={`transition-all py-1.5 px-3 rounded-xl font-bold ${
                activeSection === 'faq'
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-300 hover:text-emerald-400 hover:bg-slate-900/60'
              }`}
            >
              FAQ
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onLogin}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-800 transition-all shadow-sm"
            >
              Fazer Login
            </button>

            <button
              onClick={onStartFreeTrial}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-xl shadow-emerald-950/60 transition-all flex items-center gap-2 group border border-emerald-400/20"
            >
              <span>Testar gratuitamente</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------------- */}
      {/* MAIN CONTENT LANDING PAGE */}
      {/* --------------------------------------------------------------------- */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-10 space-y-24">
        
        {/* =================================================================== */}
        {/* HERO SECTION (PRIMEIRA DOBRA COM MENSAGEM EMOCIONAL E PROFISSIONAL) */}
        {/* =================================================================== */}
        <section className="relative pt-6 pb-8 md:pt-12 md:pb-12 text-center space-y-8">
          {/* Subtle Ambient Background Light Gradients */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[650px] h-[380px] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none -z-10" />
          <div className="absolute top-24 left-1/3 w-[320px] h-[220px] bg-teal-500/10 blur-[110px] rounded-full pointer-events-none -z-10" />

          {/* SaaS Pill Tag */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-xl shadow-emerald-950/30 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <Heart className="w-3.5 h-3.5 text-emerald-400" />
            <span>Desenvolvido especificamente para a rotina do psicólogo</span>
          </div>

          {/* Hero Headline (Benefício Emocional e Profissional) */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
            Mais tempo para a{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
              escuta clínica
            </span>. Menos sobrecarga na gestão do consultório.
          </h1>

          {/* Subtitle (Foco em empatia, economia de tempo, organização e calma) */}
          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Compreendemos a sua realidade: conciliar a dedicação acolhedora aos seus pacientes com o controle de faltas, a burocracia do consultório e a organização dos prontuários exige uma energia valiosa. O <strong>Sessão Certa</strong> reúne <strong>agenda inteligente</strong>, <strong>prontuários sigilosos em conformidade com o CFP</strong>, <strong>lembretes delicados no WhatsApp</strong> e um <strong>copiloto administrativo</strong> para devolver sua paz de espírito e seu tempo livre.
          </p>

          {/* Primary Action Buttons (2 buttons strictly) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={onStartFreeTrial}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-2xl shadow-emerald-950/80 border border-emerald-400/30 transition-all flex items-center justify-center gap-3 group"
            >
              <span>Experimentar gratuitamente sem cartão</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => {
                onOpenOnboarding();
                setIsVideoModalOpen(true);
              }}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-bold text-sm border border-slate-700/80 transition-all flex items-center justify-center gap-2.5 backdrop-blur-md shadow-lg"
            >
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              <span>Ver demonstração em vídeo</span>
            </button>
          </div>

          {/* Fast Guarantee Info */}
          <p className="text-xs text-slate-400 font-medium pt-1">
            ✨ Cadastro em menos de 1 minuto • Sem necessidade de cartão de crédito • Acesso imediato
          </p>

          {/* =================================================================== */}
          {/* FAIXA DE CREDIBILIDADE E CONFIANÇA NA PRIMEIRA DOBRA (TRUST BAR) */}
          {/* =================================================================== */}
          <div className="pt-8">
            <div className="p-4 md:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md max-w-5xl mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 text-center text-xs">
                <div className="flex flex-col items-center justify-center gap-1.5 p-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="font-extrabold text-white">Sigilo & Criptografia</span>
                  <span className="text-[10px] text-slate-400">Proteção AES-256 at-rest</span>
                </div>

                <div className="flex flex-col items-center justify-center gap-1.5 p-2 border-l border-slate-800/80">
                  <Lock className="w-5 h-5 text-teal-400" />
                  <span className="font-extrabold text-white">Conformidade LGPD</span>
                  <span className="text-[10px] text-slate-400">Privacidade dos Pacientes</span>
                </div>

                <div className="flex flex-col items-center justify-center gap-1.5 p-2 border-l border-slate-800/80">
                  <Award className="w-5 h-5 text-sky-400" />
                  <span className="font-extrabold text-white">Diretrizes do CFP</span>
                  <span className="text-[10px] text-slate-400">Prontuário Ético e Seguro</span>
                </div>

                <div className="flex flex-col items-center justify-center gap-1.5 p-2 border-l border-slate-800/80">
                  <RefreshCw className="w-5 h-5 text-purple-400" />
                  <span className="font-extrabold text-white">Evolução Contínua</span>
                  <span className="text-[10px] text-slate-400">Novidades sem Taxas</span>
                </div>

                <div className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center gap-1.5 p-2 border-l border-slate-800/80">
                  <Heart className="w-5 h-5 text-rose-400" />
                  <span className="font-extrabold text-white">Foco na Psicologia</span>
                  <span className="text-[10px] text-slate-400">100% sob medida</span>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* MOCKUP PREMIUM DO DASHBOARD (MOLDURA DE LUXO ESTILO LINEAR/VERCEL) */}
          {/* =================================================================== */}
          <div className="pt-6">
            <div className="relative mx-auto max-w-5xl rounded-3xl bg-slate-900/90 border border-slate-700/60 p-2 shadow-2xl shadow-emerald-950/40 backdrop-blur-xl group">
              {/* Window Bar Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 rounded-t-2xl border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] font-mono text-slate-400 ml-2 hidden sm:inline-block">
                    app.sessaocerta.com.br / dashboard
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Painel em Tempo Real</span>
                </div>
              </div>

              {/* Main Image Banner Container */}
              <div className="relative overflow-hidden rounded-b-2xl border border-slate-800/60 bg-slate-950">
                <img
                  src={dashboardHeroMockup}
                  alt="Sessão Certa Dashboard Mockup Premium"
                  className="w-full h-auto object-cover rounded-b-2xl opacity-95 group-hover:scale-[1.01] transition-transform duration-700"
                />

                {/* Interactive Overlay Badges Floating on Dashboard */}
                <div className="absolute top-6 left-6 hidden md:flex items-center gap-3 p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/40 backdrop-blur-xl shadow-2xl animate-bounce-slow">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="text-left text-xs">
                    <div className="font-extrabold text-white flex items-center gap-1.5">
                      <span>WhatsApp Enviado</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full">Confirmado</span>
                    </div>
                    <p className="text-[10px] text-slate-300">Paciente confirmou presença em segundos!</p>
                  </div>
                </div>

                <div className="absolute bottom-6 right-6 hidden md:flex items-center gap-3 p-3 rounded-2xl bg-slate-900/90 border border-purple-500/40 backdrop-blur-xl shadow-2xl">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div className="text-left text-xs">
                    <div className="font-extrabold text-white flex items-center gap-1.5">
                      <span>Copiloto Ético de IA</span>
                      <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full">Exclusivo Administrativo</span>
                    </div>
                    <p className="text-[10px] text-slate-300">Organize evoluções sem comprometer seu descanso</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* NOVA SEÇÃO: "POR QUE ESCOLHER O SESSÃO CERTA?" */}
        {/* =================================================================== */}
        <section id="por-que-escolher" className="p-8 md:p-12 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-10 scroll-mt-24 backdrop-blur-md">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Desenvolvido para a Psicologia
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Por que psicólogos preferem o Sessão Certa?
            </h2>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Criamos um ambiente onde a tecnologia atua como uma aliada sutil, acolhendo as especificidades da sua prática clínica para simplificar sua rotina com total serenidade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">Pensado para a Escuta Clínica</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Não somos um sistema genérico para clínicas médicas. Compreendemos a importância do vínculo terapêutico, o sigilo das sessões e o tempo necessário entre cada atendimento.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-teal-500/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Feather className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">Leve e Sem Complicação</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Interface limpa, agradável e acolhedora. Desenhada para ser operada de forma intuitiva, sem curva de aprendizado cansativa, nos 10 minutos entre seus horários.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-sky-500/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">Sigilo & Proteção LGPD</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Prontuários eletrônicos protegidos por criptografia (AES-256) em conformidade rigorosa com a LGPD e as orientações éticas do Conselho Federal de Psicologia.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500/40 transition-all space-y-3">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">Autonomia Preservada</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                O sistema opera como um suporte silencioso de bastidores. Todas as decisões clínicas, registros e relacionamentos com pacientes continuam 100% sob seu controle.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* NARRATIVA ASPIRACIONAL: "SUA ROTINA TRANSFORMADA" */}
        {/* =================================================================== */}
        <section id="rotina-clinica" className="p-8 md:p-12 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 space-y-10 scroll-mt-24 shadow-2xl">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-widest bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
              Sua Nova Experiência
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Imagine sua rotina clínica com mais organização e leveza
            </h2>
            <p className="text-sm md:text-base text-slate-400 leading-relaxed">
              Deixe a ansiedade administrativa no passado e construa um dia a dia previsível, calmo e recompensador.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Morning */}
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 relative">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-extrabold text-sm">
                <Sun className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">08:00 • Início de dia calmo e previsível</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ao tomar seu café da manhã, você abre a agenda e percebe que as consultas do dia já foram confirmadas com delicadeza pelo WhatsApp automático. Sem sobressaltos ou cancelamentos surpresa.
              </p>
            </div>

            {/* Afternoon */}
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-extrabold text-sm">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">14:00 • Transição fluida entre atendimentos</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ao encerrar uma consulta, você registra as evoluções clínicas no prontuário sigiloso em poucos cliques. Tudo estruturado, seguro e alinhado ao CFP sem pilhas de papeis na mesa.
              </p>
            </div>

            {/* Evening */}
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 relative">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-extrabold text-sm">
                <Smile className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">18:00 • Encerramento de expediente sem levar trabalho para casa</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Você fecha o notebook exatamente no horário planejado com os recebimentos e agendamentos em dia. Noites e fins de semana inteiramente livres para descansar e estar com quem ama.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SEÇÃO "ANTES E DEPOIS DO SESSÃO CERTA" */}
        {/* =================================================================== */}
        <section id="antes-depois" className="space-y-8 scroll-mt-24">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Transformação Real
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Sua rotina clínica antes e depois do Sessão Certa
            </h2>
            <p className="text-sm md:text-base text-slate-400 leading-relaxed">
              Substitua a sobrecarga de tarefas manuais por uma plataforma que traz clareza, proteção e tempo para o que é essencial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* ANTES (PROBLEMAS) */}
            <div className="p-6 md:p-8 rounded-3xl bg-slate-900/40 border border-rose-500/30 space-y-6 flex flex-col justify-between backdrop-blur-sm relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-rose-500/20 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-rose-200">Sem o Sessão Certa</h3>
                    <p className="text-xs text-rose-300/80">Sobrecarga burocrática e ansiedade com desmarcações</p>
                  </div>
                </div>

                <ul className="space-y-3.5 text-xs text-slate-300">
                  <li className="flex items-start gap-3">
                    <div className="p-1 rounded-lg bg-rose-500/10 text-rose-400 shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white block">Incerteza e lacunas repentinas na agenda:</strong>
                      <span className="text-slate-400">Pacientes esquecem o horário da sessão, gerando perda financeira e furos de última hora.</span>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="p-1 rounded-lg bg-rose-500/10 text-rose-400 shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white block">Tempo precioso gasto com mensagens manuais:</strong>
                      <span className="text-slate-400">Noites ocupadas digitando ou copiando lembretes no WhatsApp para confirmar horários do dia seguinte.</span>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="p-1 rounded-lg bg-rose-500/10 text-rose-400 shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white block">Preocupação constante com sigilo e prontuários:</strong>
                      <span className="text-slate-400">Anotações espalhadas em cadernos ou arquivos sem proteção adequada contra vazamentos ou perdas.</span>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="p-1 rounded-lg bg-rose-500/10 text-rose-400 shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white block">Sensação de cansaço pós-expediente:</strong>
                      <span className="text-slate-400">Energia dividida entre a dedicação terapêutica e a administração exaustiva do consultório.</span>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/50 text-xs text-rose-300">
                ⚠️ <strong>Custo da desorganização:</strong> Desgaste mental, perda de horários valiosos e menos tempo de descanso com a família.
              </div>
            </div>

            {/* DEPOIS (SOLUÇÃO SESSÃO CERTA) */}
            <div className="p-6 md:p-8 rounded-3xl bg-slate-900/80 border border-emerald-500/40 space-y-6 flex flex-col justify-between backdrop-blur-md shadow-xl relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-emerald-500/20 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-emerald-300">Com o Sessão Certa</h3>
                    <p className="text-xs text-emerald-400/80">Tranquilidade, segurança e foco no ser humano</p>
                  </div>
                </div>

                <ul className="space-y-3.5 text-xs text-slate-200">
                  <li className="flex items-start gap-3">
                    <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white block">Agenda organizada e confirmação automática:</strong>
                      <span className="text-slate-300">Lembretes gentis no WhatsApp que garantem a presença dos pacientes de forma respeitosa.</span>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white block">Prontuário eletrônico sigiloso (CFP & LGPD):</strong>
                      <span className="text-slate-300">Evoluções protegidas com criptografia de ponta a ponta, prontas para consulta rápida e segura.</span>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white block">Copiloto administrativo de apoio:</strong>
                      <span className="text-slate-300">Organização eficiente de tópicos de acompanhamento e rascunhos sem afetar sua soberania clínica.</span>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white block">Recuperação do seu tempo e paz mental:</strong>
                      <span className="text-slate-300">Fim de expediente no horário desejado e até 8 horas livres por semana para você e seus projetos.</span>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-800/80 text-xs text-emerald-300 font-semibold">
                ✨ <strong>Seu ganho real:</strong> Estabilidade financeira, conformidade ética rigorosa e tranquilidade para escutar seus pacientes.
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SEÇÃO DE BENEFÍCIOS TRANSFORMADOS (FOCO EM RESULTADOS CONCRETOS) */}
        {/* =================================================================== */}
        <section id="beneficios" className="space-y-8 scroll-mt-24">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
              Benefícios Concretos
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Tudo o que seu consultório precisa para prosperar com serenidade
            </h2>
            <p className="text-sm md:text-base text-slate-400 leading-relaxed">
              Não entregamos apenas ferramentas isoladas; entregamos transformações perceptíveis na saúde do seu consultório e na sua qualidade de vida.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Benefit Card 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-white mb-2">Previsibilidade & Estabilidade Financeira</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Evite lacunas de receitas causadas por esquecimentos dos pacientes. Confirmações automáticas garantem horários nobres preenchidos e renda estável.
              </p>
            </div>

            {/* Benefit Card 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-teal-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-white mb-2">Recuperação de 8+ Horas por Semana</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Elimine a digitação repetitiva de mensagens no WhatsApp e o controle manual de recebimentos. O sistema trabalha em segundo plano por você.
              </p>
            </div>

            {/* Benefit Card 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-sky-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-white mb-2">Tranquilidade Ética & Segurança LGPD</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Atenda com absoluta paz de espírito. Prontuários e evoluções armazenados sob rígidos critérios do Conselho Federal de Psicologia e da LGPD.
              </p>
            </div>

            {/* Benefit Card 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-white mb-2">Acolhimento & Respeito ao Paciente</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Lembretes corteses e elegantes no WhatsApp com links diretos de confirmação, reagendamento e instruções da sessão, elevando o profissionalismo.
              </p>
            </div>

            {/* Benefit Card 5 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-white mb-2">Copiloto Ético para Apoio Administrativo</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Agilize a síntese de tópicos brutos e rascunhos de avisos sem perder tempo, deixando o raciocínio clínico 100% sob a sua soberania.
              </p>
            </div>

            {/* Benefit Card 6 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-white mb-2">Visão Clara da Saúde do Consultório</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Acompanhe indicadores de faturamento mensal, histórico de honorários e taxa de presença em relatórios limpos e descomplicados.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SEÇÃO "COMO FUNCIONA" (3 PASSOS SIMPLES E INTUITIVOS) */}
        {/* =================================================================== */}
        <section id="como-funciona" className="p-8 md:p-12 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-10 scroll-mt-24">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-widest bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
              Passo a Passo
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Como funciona em 3 passos simples
            </h2>
            <p className="text-sm md:text-base text-slate-400">
              Comece a transformar a gestão do seu consultório hoje mesmo sem nenhuma complicação técnica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 relative group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-emerald-950/80">
                1
              </div>
              <h3 className="text-lg font-extrabold text-white">1. Configure seu Consultório e Agenda</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cadastre seus horários de atendimento, locais (presencial ou online), valores das sessões e dados básicos dos seus pacientes em menos de 2 minutos.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 relative group">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-teal-950/80">
                2
              </div>
              <h3 className="text-lg font-extrabold text-white">2. Lembretes Disparados no WhatsApp</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                O motor do Sessão Certa envia automaticamente os lembretes para o paciente no WhatsApp com o link direto para confirmação ou remanejamento.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 relative group">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-purple-950/80">
                3
              </div>
              <h3 className="text-lg font-extrabold text-white">3. Atenda com Serenidade e Foco</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                O paciente confirma com 1 clique e sua agenda é atualizada no painel. Após a consulta, registre evoluções de forma sigilosa e organizada.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SEÇÃO DEDICADA À INTELIGÊNCIA ARTIFICIAL ÉTICA */}
        {/* =================================================================== */}
        <section id="ia-copilot" className="p-8 md:p-12 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 border border-purple-500/30 space-y-8 scroll-mt-24 shadow-2xl relative overflow-hidden">
          {/* Light Glow background */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 blur-[120px] pointer-events-none rounded-full" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 border-b border-slate-800 pb-8">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 text-xs font-bold">
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span>Inteligência Artificial Ética e Responsável</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                Um assistente para a sua organização — com total respeito à sua autonomia clínica.
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/30 max-w-md text-xs text-purple-200/90 leading-relaxed">
              <p>
                <strong>Compromisso Ético Sessão Certa:</strong> A IA da plataforma foi projetada estritamente para agilizar tarefas burocráticas e organizacionais pós-sessão. <strong>Ela jamais emite diagnósticos, formula pareceres ou interfere na escuta terapêutica única da psicologia.</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-extrabold text-white">Organização de Tópicos Brutos</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Agilize a estruturação de anotações administrativas rápidas feitas entre sessões em tópicos limpos e organizados.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-extrabold text-white">Rascunhos de Comunicação Cortês</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sugestões delicadas de mensagens para avisos de reagendamento, confirmações e recados administrativos no WhatsApp.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-extrabold text-white">Suporte para Dúvidas Operacionais</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Respostas rápidas sobre configurações do sistema, atalhos de prontuário e relatórios de atendimento.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* CALCULADORA DE PERDAS POR FALTAS INTERATIVA */}
        {/* =================================================================== */}
        <section id="calculadora" className="p-6 md:p-10 rounded-3xl bg-slate-900 border border-slate-800 space-y-8 scroll-mt-24">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">Calculadora Interativa de Recuperação de Faltas</h2>
              <p className="text-xs text-slate-400">Simule quanto o seu consultório deixa de faturar por falta de confirmação automática no WhatsApp.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2">
            {/* Inputs Controls */}
            <div className="space-y-6 bg-slate-950 p-6 rounded-2xl border border-slate-800/80">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Valor da Sua Sessão de Psicologia (R$)</span>
                  <span className="text-emerald-400 font-extrabold text-sm">R$ {sessionValue}</span>
                </label>
                <input
                  type="range"
                  min="80"
                  max="600"
                  step="10"
                  value={sessionValue}
                  onChange={(e) => setSessionValue(Number(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-800 h-2.5 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                  <span>R$ 80</span>
                  <span>R$ 300</span>
                  <span>R$ 600</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Faltas ou Desmarcações por Mês</span>
                  <span className="text-amber-400 font-extrabold text-sm">{noShowsPerMonth} faltas / mês</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="1"
                  value={noShowsPerMonth}
                  onChange={(e) => setNoShowsPerMonth(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-slate-800 h-2.5 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                  <span>1 falta</span>
                  <span>12 faltas</span>
                  <span>25 faltas</span>
                </div>
              </div>
            </div>

            {/* Calculations Output */}
            <div className="space-y-4 bg-gradient-to-br from-slate-950 to-slate-900 p-6 rounded-2xl border border-slate-800">
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-900/60 space-y-1">
                <span className="text-[10px] font-bold text-rose-300 uppercase tracking-widest">Prejuízo Mensal Atual</span>
                <div className="text-3xl font-black text-rose-400">R$ {monthlyLoss.toLocaleString('pt-BR')}</div>
                <p className="text-[11px] text-rose-300/80">Valor não faturado que poderia cobrir seus custos fixos.</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-900/60 space-y-1">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">Perda Acumulada no Ano</span>
                <div className="text-2xl font-black text-amber-400">R$ {yearlyLoss.toLocaleString('pt-BR')} / ano</div>
                <p className="text-[11px] text-amber-300/80">Recurso que poderia ser reinvestido na sua formação clínica ou bem-estar.</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 space-y-1">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Sua Recuperação com o Sessão Certa
                </span>
                <div className="text-2xl font-black text-emerald-300">+ R$ {recoveredValue.toLocaleString('pt-BR')} / mês</div>
                <p className="text-[11px] text-emerald-300/80">Com a taxa média de 92% de presenças garantidas via WhatsApp.</p>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* PERGUNTAS FREQUENTES (FAQ ACCORDION) */}
        {/* =================================================================== */}
        <section id="faq" className="p-6 md:p-10 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 scroll-mt-24">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">Perguntas Frequentes (FAQ)</h2>
              <p className="text-xs text-slate-400">Esclareça todas as suas dúvidas administrativas e éticas antes de começar.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className="rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden transition-all">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 md:p-5 text-left font-extrabold text-xs md:text-sm text-slate-200 flex items-center justify-between hover:text-emerald-400 transition-colors gap-4"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 shrink-0 text-emerald-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 shrink-0 text-slate-500" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="p-4 md:p-5 pt-0 text-xs text-slate-400 border-t border-slate-900 leading-relaxed font-normal">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* =================================================================== */}
        {/* SEÇÃO INSPIRADORA FINAL + CALL TO ACTION (CTA BANNER) */}
        {/* =================================================================== */}
        <section className="p-8 md:p-14 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/40 text-center space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 blur-[150px] pointer-events-none rounded-full" />

          <div className="space-y-4 max-w-3xl mx-auto relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
              <Heart className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sua vocação merece tranquilidade</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Dedique seu tempo e sua energia ao ser humano. Nós cuidamos da parte administrativa.
            </h2>
            
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
              Cada hora economizada no envio manual de lembretes ou na organização de papeis é uma hora a mais para aprofundar seus estudos, atender melhor seus pacientes ou simplesmente descansar com paz de espírito.
            </p>
          </div>

          <div className="pt-2 relative z-10 flex flex-col items-center gap-3">
            <button
              onClick={onStartFreeTrial}
              className="px-9 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-sm shadow-2xl shadow-emerald-950/80 transition-all inline-flex items-center gap-3 border border-emerald-300/30 group"
            >
              <span>Experimentar o Sessão Certa gratuitamente</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <span className="text-[11px] text-slate-400 font-medium">✨ Teste grátis imediato • Não pedimos cartão de crédito no cadastro</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-slate-400 font-medium pt-2 relative z-10 border-t border-slate-800/80 max-w-2xl mx-auto">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Acesso Imediato
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Sem cartão de crédito
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Conformidade CFP & LGPD
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Suporte humanizado em português
            </span>
          </div>
        </section>
      </main>

      {/* --------------------------------------------------------------------- */}
      {/* RODAPÉ COMPLETO E PROFISSIONAL (SAAS FOOTER) */}
      {/* --------------------------------------------------------------------- */}
      <footer className="border-t border-slate-800 bg-slate-950 px-4 md:px-8 py-12 text-xs text-slate-400 space-y-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Coluna 1: Marca e Missão */}
          <div className="space-y-4">
            <Logo variant="dark" size="md" showTagline={true} />
            <p className="text-xs text-slate-400 leading-relaxed">
              Software de gestão integrada e automação de lembretes no WhatsApp projetado especificamente para a rotina de psicólogos e terapeutas.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full w-max">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Plataforma Online e Segura</span>
            </div>
          </div>

          {/* Coluna 2: Produto & Recursos */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Navegação</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#beneficios" onClick={() => scrollToSection('beneficios')} className="hover:text-emerald-400 transition-colors">Benefícios Percebidos</a></li>
              <li><a href="#por-que-escolher" onClick={() => scrollToSection('por-que-escolher')} className="hover:text-emerald-400 transition-colors">Por que escolher o Sessão Certa</a></li>
              <li><a href="#rotina-clinica" onClick={() => scrollToSection('rotina-clinica')} className="hover:text-emerald-400 transition-colors">Sua Rotina Clínica</a></li>
              <li><a href="#antes-depois" onClick={() => scrollToSection('antes-depois')} className="hover:text-emerald-400 transition-colors">Transformação</a></li>
              <li><a href="#ia-copilot" onClick={() => scrollToSection('ia-copilot')} className="hover:text-emerald-400 transition-colors">IA Copilot Ético</a></li>
              <li><a href="#calculadora" onClick={() => scrollToSection('calculadora')} className="hover:text-emerald-400 transition-colors">Calculadora de Recuperação</a></li>
            </ul>
          </div>

          {/* Coluna 3: Conformidade e Ética */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Conformidade & Ética</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-slate-400">Proteção de Dados LGPD</span></li>
              <li><span className="text-slate-400">Diretrizes do CFP</span></li>
              <li><span className="text-slate-400">Criptografia AES-256</span></li>
              <li><span className="text-slate-400">Termos de Uso do Serviço</span></li>
              <li><span className="text-slate-400">Política de Privacidade</span></li>
            </ul>
          </div>

          {/* Coluna 4: Suporte e Contato */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Atendimento</h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>suporte@sessaocerta.com.br</span>
              </li>
              <li className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Suporte via WhatsApp Oficial</span>
              </li>
              <li className="text-[11px] text-slate-500 pt-1">
                Atendimento humanizado de Segunda a Sexta.
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright and Bottom Disclaimer */}
        <div className="max-w-7xl mx-auto border-t border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© 2026 Sessão Certa SaaS. Todos os direitos reservados.</p>
          <p className="text-[10px]">
            Conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018) e orientações éticas do Conselho Federal de Psicologia.
          </p>
        </div>
      </footer>

      {/* --------------------------------------------------------------------- */}
      {/* VIDEO DEMO MODAL */}
      {/* --------------------------------------------------------------------- */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                <h3 className="text-base font-extrabold text-white">Demonstração Interativa - Sessão Certa</h3>
              </div>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <Zap className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-extrabold text-white">Pronto para iniciar a Demonstração Interativa?</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Você pode explorar o tour guiado pelo painel do psicólogo agora mesmo sem precisar cadastrar nenhum dado pessoal.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setIsVideoModalOpen(false);
                    onOpenOnboarding();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all w-full sm:w-auto"
                >
                  Abrir Tour Guiado do Sistema
                </button>
                <button
                  onClick={() => {
                    setIsVideoModalOpen(false);
                    onStartFreeTrial();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all w-full sm:w-auto"
                >
                  Criar Minha Conta Grátis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
