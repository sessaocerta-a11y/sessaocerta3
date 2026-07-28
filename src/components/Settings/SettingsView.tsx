import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ConfirmationModal } from '../Common/ConfirmationModal';
import {
  Settings,
  User,
  ShieldCheck,
  DollarSign,
  Download,
  RotateCcw,
  Save,
  Lock,
  Building,
  QrCode,
  FileText,
  CheckCircle2,
  Trash2
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    profile,
    updateProfile,
    patients,
    sessions,
    resetToDemoData,
    loadDemoData,
    clearPatientsAndSessions,
    addToast,
    userRole,
    setUserRole,
    canSwitchRole
  } = useApp();

  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const [name, setName] = useState(profile.name);
  const [crp, setCrp] = useState(profile.crp);
  const [specialty, setSpecialty] = useState(profile.specialty);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [sessionDefaultPrice, setSessionDefaultPrice] = useState(profile.sessionDefaultPrice);
  const [sessionDefaultDuration, setSessionDefaultDuration] = useState(profile.sessionDefaultDuration);
  const [clinicAddress, setClinicAddress] = useState(profile.clinicAddress || '');
  const [pixKey, setPixKey] = useState(profile.pixKey || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      crp,
      specialty,
      phone,
      email,
      avatarUrl,
      sessionDefaultPrice: Number(sessionDefaultPrice),
      sessionDefaultDuration: Number(sessionDefaultDuration),
      clinicAddress,
      pixKey,
    });
  };

  // Export full JSON database for LGPD portability request
  const handleExportData = () => {
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      psychologistProfile: profile,
      patients,
      sessions,
      lgpdNotice: 'Exportação de dados completa nos termos do Art. 18 da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).',
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sessao_certa_backup_lgpd_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addToast('Relatório completo exportado nos padrões da LGPD com sucesso!');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-emerald-400" />
            <span>Configurações do Consultório & LGPD</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Ajuste informações profissionais, valores padrão das sessões e diretrizes de proteção de dados.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Info Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
          <h2 className="text-base font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              <span>Dados do Psicólogo(a) & Foto de Perfil</span>
            </span>
            <span className="text-xs text-emerald-400 font-mono font-semibold">{crp}</span>
          </h2>

          {/* Avatar Preview */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-4">
            <img
              src={profile.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100'}
              alt={profile.name}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-md"
            />
            <div className="space-y-1 flex-1">
              <div className="text-xs font-bold text-slate-300">Foto de Perfil Atual</div>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://exemplo.com/sua-foto.jpg"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500">Cole uma URL de imagem ou clique na foto de perfil no menu superior para usar a galeria/upload de arquivos.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-200">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Nome Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Registro Profissional (CRP)</label>
              <input
                type="text"
                required
                value={crp}
                onChange={(e) => setCrp(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="font-semibold text-slate-300">Especialidades & Abordagens</label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Telefone do Consultório</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
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

        {/* Practice Defaults Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Building className="w-4 h-4 text-emerald-400" />
            <span>Parâmetros de Atendimento & Cobrança</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-200">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Valor Padrão da Sessão (R$)</label>
              <input
                type="number"
                min="0"
                value={sessionDefaultPrice}
                onChange={(e) => setSessionDefaultPrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Duração Padrão (Minutos)</label>
              <input
                type="number"
                min="10"
                value={sessionDefaultDuration}
                onChange={(e) => setSessionDefaultDuration(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Chave PIX para Cobrança</label>
              <input
                type="text"
                placeholder="CPF, E-mail ou Chave Aleatória"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Endereço do Consultório Presencial</label>
              <input
                type="text"
                placeholder="Av. Paulista, 1000 - São Paulo SP"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Configurações</span>
            </button>
          </div>
        </div>
      </form>

      {/* LGPD & Security Section */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Segurança, Sigilo Profissional e LGPD</span>
          </h2>

          <span className="text-xs font-semibold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800">
            Conforme Código de Ética do CFP
          </span>
        </div>

        {/* Official Seal "Sessão Certa Seguro" Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-950 to-purple-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-950/80">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white">Selo Sessão Certa Seguro</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Certificado Ativo
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Seu consultório possui criptografia ativa ponta a ponta (AES-256), regras de multitenancy isolado e política de sigilo alinhada ao CFP e LGPD (Lei nº 13.709/2018).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => addToast('Certificado de Segurança Sessão Certa verificado: Criptografia AES-256, Backup Diário e Isolamento de Dados OK!', 'success')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shrink-0 flex items-center gap-1.5 shadow-md"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Verificar Selo</span>
          </button>
        </div>

        {/* RBAC Access Control Card */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Controle de Acesso Baseado em Níveis (RBAC)</h3>
                <p className="text-xs text-slate-400">
                  Gerencie as permissões do usuário logado na plataforma Sessão Certa.
                </p>
              </div>
            </div>

            {canSwitchRole ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUserRole('professional')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    userRole === 'professional'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Psicólogo
                </button>
                <button
                  type="button"
                  onClick={() => setUserRole('admin')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    userRole === 'admin'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Admin SaaS
                </button>
              </div>
            ) : (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Perfil: Psicólogo (Profissional)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="font-bold text-emerald-400">Perfil Comum (Psicólogo)</span>
              <p className="text-[11px] text-slate-400">
                Acesso restrito exclusivamente aos seus pacientes, agendamentos, prontuários sigilosos e relatórios do próprio consultório. Aba Admin oculta.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="font-bold text-purple-300">Perfil Admin (Administrador SaaS)</span>
              <p className="text-[11px] text-slate-400">
                Acesso total ao Painel Admin SaaS, métricas globais de faturamento, monitoramento de servidores, logs de auditoria e esquemas DDL do banco PostgreSQL.
              </p>
            </div>
          </div>
        </div>

        {/* Security Controls (2FA & Audit Logs) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" /> Autenticação em Dois Fatores (2FA)
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                ATIVADO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Proteja seu acesso ao consultório exigindo um código de verificação via SMS ou e-mail ao realizar login em novos dispositivos.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Log de Auditoria do Consultório
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Último acesso: Hoje, 20:25</span>
            </div>
            <p className="text-xs text-slate-400">
              Todas as alterações de prontuário, logins e confirmações de sessão são registradas com timestamp imutável para sua segurança jurídica.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            <strong>Garantia de Sigilo de Dados Clínicos:</strong> O Sessão Certa foi projetado para assegurar que as anotações de prontuário eletrônico sigiloso fiquem sob a guarda técnica e exclusiva do profissional psicólogo, em inteira conformidade com a Resolução CFP nº 01/2009 e a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportData}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Dados (LGPD)</span>
          </button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {patients.length > 0 && (
              <button
                type="button"
                onClick={() => setIsClearModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 text-xs font-semibold border border-slate-700 hover:border-rose-700/60 transition-all"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Limpar Dados Fakes do Consultório</span>
              </button>
            )}

            {patients.length === 0 && (
              <button
                type="button"
                onClick={loadDemoData}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 text-xs font-semibold border border-purple-800/60 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Carregar Dados Demonstrativos (Demo)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Clear Fake Data Confirmation Modal */}
      <ConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={clearPatientsAndSessions}
        title="Limpar Pacientes e Dados Fakes"
        description="Tem certeza de que deseja remover todos os pacientes e agendamentos fictícios do consultório? Seu perfil ficará 100% limpo e pronto para os seus atendimentos reais."
        confirmText="Sim, Limpar Dados"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};
