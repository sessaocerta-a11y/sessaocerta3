import React, { useState } from 'react';
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
  DollarSign
} from 'lucide-react';

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
  const [noShowsPerMonth, setNoShowsPerMonth] = useState<number>(5);

  const monthlyLoss = sessionValue * noShowsPerMonth;
  const yearlyLoss = monthlyLoss * 12;
  const recoveredValue = Math.round(monthlyLoss * 0.9); // 90% reduction in no-shows

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Preciso instalar algum aplicativo no meu celular ou no do paciente?',
      a: 'Não. O Sessão Certa opera 100% em nuvem e os lembretes são entregues diretamente no WhatsApp do paciente. Ele confirma com 1 clique sem precisar criar senha ou baixar apps.'
    },
    {
      q: 'Meus pacientes precisam criar conta ou login?',
      a: 'Jamais. Para garantir zero atrito, o paciente clica em um link criptografado e seguro, visualiza as informações da consulta e confirma a presença em menos de 5 segundos.'
    },
    {
      q: 'Como funciona a proteção de dados clínicos e a LGPD?',
      a: 'Seguimos rigorosamente os critérios do CFP e da LGPD. Os dados administrativos ficam isolados e os dados clínicos (evoluções e prontuários) são protegidos com criptografia at-rest.'
    },
    {
      q: 'O que acontece se o paciente pedir para reagendar?',
      a: 'Você recebe uma notificação instantânea no seu painel com o motivo e a sugestão do paciente, permitindo ajustar o horário na sua agenda com facilidade.'
    },
    {
      q: 'Posso personalizar o horário de envio das mensagens?',
      a: 'Sim. O sistema envia automaticamente o lembrete principal 24h antes e um aviso resumido 2h antes. Além disso, possui trava de horário (08h às 20h) para evitar mensagens incômodas fora do expediente.'
    }
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white flex flex-col">
      {/* PUBLIC LANDING HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 px-4 md:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-sky-600 flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-500/30">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                Sessão Certa
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  SaaS MVP
                </span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium">Gestão Inteligente para Psicólogos</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <button onClick={() => scrollToSection('calculadora')} className="hover:text-emerald-400 transition-colors">
              Calculadora de Faltas
            </button>
            <button onClick={() => scrollToSection('como-funciona')} className="hover:text-emerald-400 transition-colors">
              Como Funciona
            </button>
            <button onClick={() => scrollToSection('diferenciais')} className="hover:text-emerald-400 transition-colors">
              Diferenciais
            </button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-emerald-400 transition-colors">
              Perguntas Frequentes
            </button>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onLogin}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-800 transition-colors"
            >
              Fazer Login
            </button>

            <button
              onClick={onStartFreeTrial}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/50 transition-all flex items-center gap-2"
            >
              <span>Criar Conta</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* LANDING CONTENT */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-12">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 md:p-12 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Software de Automação de Consultório para Psicólogos</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto">
            Nunca mais perca uma sessão por esquecimento do paciente.
          </h1>

          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            O <strong>Sessão Certa</strong> envia lembretes automáticos pelo WhatsApp, confirma presenças com 1 clique e organiza sua rotina para você focar no que realmente importa: seus pacientes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onStartFreeTrial}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-950/50 transition-all flex items-center justify-center gap-2"
            >
              <span>Entrar no Sistema MVP Gratuitamente</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenOnboarding}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Ver Tour Guiado em 2 min</span>
            </button>
          </div>

          {/* Value Badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 border-t border-slate-800/80 max-w-xl mx-auto">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Configuração em 3 minutos
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Sem apps para pacientes
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Lembretes no WhatsApp
            </span>
          </div>
        </section>

        {/* CALCULATOR SECTION: Calculadora de Perdas por Faltas */}
        <section id="calculadora" className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Calculadora de Perdas por Faltas</h2>
              <p className="text-xs text-slate-400">Descubra quanto dinheiro o seu consultório perde por ano devido a desmarcações de última hora.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2">
            {/* Inputs */}
            <div className="space-y-5 bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Valor Médio da Sua Sessão (R$)</span>
                  <span className="text-emerald-400 font-extrabold">R$ {sessionValue}</span>
                </label>
                <input
                  type="range"
                  min="80"
                  max="500"
                  step="10"
                  value={sessionValue}
                  onChange={(e) => setSessionValue(Number(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>R$ 80</span>
                  <span>R$ 300</span>
                  <span>R$ 500</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Faltas / Desmarcações no Mês</span>
                  <span className="text-amber-400 font-extrabold">{noShowsPerMonth} faltas/mês</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={noShowsPerMonth}
                  onChange={(e) => setNoShowsPerMonth(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>1 falta</span>
                  <span>10 faltas</span>
                  <span>20 faltas</span>
                </div>
              </div>
            </div>

            {/* Outputs */}
            <div className="space-y-4 bg-gradient-to-br from-slate-950 to-slate-900 p-6 rounded-2xl border border-slate-800">
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/60 space-y-1">
                <span className="text-[11px] font-bold text-red-300 uppercase tracking-wider">Prejuízo Mensal Atual</span>
                <div className="text-3xl font-black text-red-400">R$ {monthlyLoss.toLocaleString('pt-BR')}</div>
                <p className="text-[11px] text-red-300/80">Deixados de faturar no consultório por mês.</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-900/60 space-y-1">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Prejuízo Anual Estimado</span>
                <div className="text-2xl font-black text-amber-400">R$ {yearlyLoss.toLocaleString('pt-BR')} / ano</div>
                <p className="text-[11px] text-amber-300/80">Dinheiro suficiente para investir em novos cursos e equipamentos.</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 space-y-1">
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Sua Recuperação com o Sessão Certa
                </span>
                <div className="text-2xl font-black text-emerald-300">+ R$ {recoveredValue.toLocaleString('pt-BR')} / mês</div>
                <p className="text-[11px] text-emerald-300/80">Ao reduzir até 90% das faltas com confirmações no WhatsApp.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: O Problema vs A Solução */}
        <section id="como-funciona" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-extrabold text-white">Faltas e desmarcações custam caro</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Muitos psicólogos perdem horas preciosas do seu dia tentando mandar mensagens manuais no WhatsApp, copiando horários e gerenciando agendas em papel.
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2 text-red-400">
                <span>✕</span> Horas vagas não preenchidas no consultório
              </li>
              <li className="flex items-center gap-2 text-red-400">
                <span>✕</span> Pacientes esquecendo o horário da sessão
              </li>
              <li className="flex items-center gap-2 text-red-400">
                <span>✕</span> Constrangimento ao cobrar faltas de última hora
              </li>
            </ul>
          </div>

          <div className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-emerald-500/30 space-y-4 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-extrabold text-white">O Sessão Certa cuida disso em 3 passos</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Depois de agendar uma sessão, todo o fluxo acontece no piloto automático sem você precisar mexer no celular.
            </p>
            <ol className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                <span><strong>Cadastre a sessão:</strong> Escolha o paciente, data e horário em menos de 10 segundos.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                <span><strong>Lembretes no WhatsApp:</strong> Disparados 24h e 2h antes da consulta.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                <span><strong>Confirmação Inteligente:</strong> O paciente confirma com 1 clique e seu painel atualiza em tempo real.</span>
              </li>
            </ol>
          </div>
        </section>

        {/* COMPARISON GRID */}
        <section id="diferenciais" className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white">Por que o Sessão Certa é Diferente?</h2>
            <p className="text-xs text-slate-400">Comparativo direto entre métodos tradicionais e o nosso SaaS especializado.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="text-sm font-extrabold text-slate-400 border-b border-slate-800 pb-2">Agenda Comum ou Bloco de Notas</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li className="flex items-center gap-2">❌ Registra apenas o horário no papel</li>
                <li className="flex items-center gap-2">❌ Exige envio manual de mensagens uma por uma</li>
                <li className="flex items-center gap-2">❌ Alta taxa de faltas por falta de acompanhamento</li>
                <li className="flex items-center gap-2">❌ Sem relatórios financeiros ou estatísticas de comparência</li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-3">
              <h4 className="text-sm font-extrabold text-emerald-400 border-b border-emerald-800/80 pb-2">Plataforma Sessão Certa</h4>
              <ul className="space-y-2.5 text-xs text-slate-200">
                <li className="flex items-center gap-2">✅ Confirmação automática via WhatsApp com links de 1 clique</li>
                <li className="flex items-center gap-2">✅ Painel de evolução clínica e prontuários sigilosos (CFP)</li>
                <li className="flex items-center gap-2">✅ Confirmação Inteligente com Waze/Google Maps e Google Agenda</li>
                <li className="flex items-center gap-2">✅ Indicadores financeiros e taxa de comparência em tempo real</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Perguntas Frequentes (FAQ)</h2>
              <p className="text-xs text-slate-400">Tire suas dúvidas técnicas e operacionais sobre o produto.</p>
            </div>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 text-left font-bold text-xs text-slate-200 flex items-center justify-between hover:text-emerald-400 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 shrink-0 text-emerald-400" /> : <ChevronDown className="w-4 h-4 shrink-0 text-slate-500" />}
                  </button>
                  {isOpen && (
                    <div className="p-4 pt-0 text-xs text-slate-400 border-t border-slate-900 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA FOOTER */}
        <section className="p-8 md:p-12 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/30 text-center space-y-4 shadow-2xl">
          <h2 className="text-2xl md:text-3xl font-black text-white">Pronto para organizar sua agenda e zerar faltas?</h2>
          <p className="text-xs md:text-sm text-slate-300 max-w-xl mx-auto">
            Comece agora a usar a plataforma e impulsione o faturamento do seu consultório de psicologia.
          </p>
          <div className="pt-2">
            <button
              onClick={onStartFreeTrial}
              className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xl shadow-emerald-950/60 transition-all inline-flex items-center gap-2"
            >
              <span>Acessar Painel do Psicólogo (MVP)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      {/* PUBLIC FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 px-4 md:px-8 py-6 text-center text-xs text-slate-500 space-y-2">
        <p>© 2026 Sessão Certa SaaS · Plataforma de Gestão e Automação para Psicólogos</p>
        <p className="text-[10px]">Conformidade com a LGPD e orientações do Conselho Federal de Psicologia (CFP)</p>
      </footer>
    </div>
  );
};
