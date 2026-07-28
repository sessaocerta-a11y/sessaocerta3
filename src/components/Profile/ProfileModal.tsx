import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  User,
  Camera,
  Upload,
  Link,
  ShieldCheck,
  CheckCircle2,
  Mail,
  Phone,
  Award,
  DollarSign,
  Clock,
  MapPin,
  QrCode,
  MessageSquare,
  Sparkles,
  Lock,
  RefreshCw
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  { label: 'Dra. Ana (TCC)', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80' },
  { label: 'Dr. Lucas (Análise)', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80' },
  { label: 'Dra. Camila (Humana)', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80' },
  { label: 'Dr. Fernando (Infantil)', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80' },
  { label: 'Dra. Beatriz (Casal)', url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=300&auto=format&fit=crop&q=80' },
  { label: 'Dr. Gabriel (Neuro)', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80' }
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { profile, updateProfile, isAdmin, userRole, addToast } = useApp();

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [crp, setCrp] = useState(profile.crp);
  const [specialty, setSpecialty] = useState(profile.specialty);
  const [phone, setPhone] = useState(profile.phone);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || PRESET_AVATARS[0].url);
  const [sessionDefaultPrice, setSessionDefaultPrice] = useState(profile.sessionDefaultPrice);
  const [sessionDefaultDuration, setSessionDefaultDuration] = useState(profile.sessionDefaultDuration);
  const [clinicAddress, setClinicAddress] = useState(profile.clinicAddress || '');
  const [pixKey, setPixKey] = useState(profile.pixKey || '');
  const [whatsappTemplate, setWhatsappTemplate] = useState(profile.whatsappTemplate || '');

  const [activeAvatarTab, setActiveAvatarTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [customUrlInput, setCustomUrlInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(profile.name);
      setEmail(profile.email);
      setCrp(profile.crp);
      setSpecialty(profile.specialty);
      setPhone(profile.phone);
      setAvatarUrl(profile.avatarUrl || PRESET_AVATARS[0].url);
      setSessionDefaultPrice(profile.sessionDefaultPrice);
      setSessionDefaultDuration(profile.sessionDefaultDuration);
      setClinicAddress(profile.clinicAddress || '');
      setPixKey(profile.pixKey || '');
      setWhatsappTemplate(profile.whatsappTemplate || '');
      setCustomUrlInput(profile.avatarUrl || '');
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  // File Upload Handler (converts image to base64 Data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('A imagem selecionada deve ter no máximo 5MB.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
          addToast('Foto de perfil carregada com sucesso!', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) {
      addToast('Informe uma URL de imagem válida.', 'warning');
      return;
    }
    setAvatarUrl(customUrlInput.trim());
    addToast('URL da foto de perfil aplicada!', 'success');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Por favor, informe seu nome completo.', 'warning');
      return;
    }

    updateProfile({
      name: name.trim(),
      email: email.trim(),
      crp: crp.trim(),
      specialty: specialty.trim(),
      phone: phone.trim(),
      avatarUrl: avatarUrl,
      sessionDefaultPrice: Number(sessionDefaultPrice) || 150,
      sessionDefaultDuration: Number(sessionDefaultDuration) || 50,
      clinicAddress: clinicAddress.trim(),
      pixKey: pixKey.trim(),
      whatsappTemplate: whatsappTemplate.trim()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-3xl my-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <span>Perfil do Profissional</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isAdmin ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {isAdmin ? 'Admin SaaS' : 'Psicólogo'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Altere sua foto de exibição, CRP, valores de sessão e dados do consultório.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Avatar & Photo Editor Card */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative group shrink-0">
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-24 h-24 rounded-2xl object-cover ring-4 ring-emerald-500/40 shadow-xl group-hover:scale-105 transition-all"
                />
                <div className="absolute inset-0 rounded-2xl bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="space-y-1 text-center sm:text-left flex-1">
                <h3 className="text-base font-extrabold text-white">{name || 'Seu Nome'}</h3>
                <p className="text-xs text-emerald-400 font-mono font-semibold">{crp || 'CRP 00/000000'} • {specialty || 'Especialidade'}</p>
                <p className="text-xs text-slate-400">{email || 'email@exemplo.com'}</p>
                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveAvatarTab('presets')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      activeAvatarTab === 'presets' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Galeria Sugerida
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAvatarTab('upload')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      activeAvatarTab === 'upload' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Enviar Foto (Arquivo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAvatarTab('url')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      activeAvatarTab === 'url' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Link URL da Foto
                  </button>
                </div>
              </div>
            </div>

            {/* Avatar Selector Content */}
            {activeAvatarTab === 'presets' && (
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <span className="text-xs font-semibold text-slate-400">Escolha uma foto da galeria do sistema:</span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(item.url)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all group ${
                        avatarUrl === item.url ? 'border-emerald-500 scale-105 shadow-md shadow-emerald-950/60' : 'border-slate-800 hover:border-slate-600'
                      }`}
                      title={item.label}
                    >
                      <img src={item.url} alt={item.label} className="w-full h-14 object-cover" />
                      {avatarUrl === item.url && (
                        <div className="absolute top-1 right-1 bg-emerald-600 text-white rounded-full p-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeAvatarTab === 'upload' && (
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <span className="text-xs font-semibold text-slate-400">Selecione uma foto salva no seu computador ou celular:</span>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-dashed border-slate-700 hover:border-emerald-500/60 text-slate-300 font-medium text-xs cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Clique aqui para escolher arquivo de imagem (PNG, JPG, WEBP)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeAvatarTab === 'url' && (
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <span className="text-xs font-semibold text-slate-400">Cole a URL direta da sua imagem na web:</span>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Link className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="url"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      placeholder="https://exemplo.com/minha-foto.jpg"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 1: Dados Profissionais */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Identificação & Registro Profissional</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome Completo <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Dra. Ana Paula Silva"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  CRP / Registro Conselho <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={crp}
                    onChange={(e) => setCrp(e.target.value)}
                    placeholder="Ex: CRP 06/142859"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Especialidade / Abordagem Clínica
                </label>
                <div className="relative">
                  <Sparkles className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="Ex: Terapia Cognitivo-Comportamental (TCC)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  E-mail de Contato
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="psicologo@sessao.com.br"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Telefone / WhatsApp Profissional
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Configurações Financeiras e de Sessão */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Valores de Sessão & Cobrança PIX</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Valor Padrão da Sessão (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={sessionDefaultPrice}
                    onChange={(e) => setSessionDefaultPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Duração Padrão (Minutos)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    min="15"
                    step="5"
                    value={sessionDefaultDuration}
                    onChange={(e) => setSessionDefaultDuration(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Chave PIX do Consultório
                </label>
                <div className="relative">
                  <QrCode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Chave CPF, e-mail ou aleatória"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Endereço do Consultório
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    placeholder="Av. Paulista, 1000 - Sala 42 (ou Atendimento Online)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: WhatsApp Lembrete Template */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Modelo do Lembrete de WhatsApp</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Variáveis: &#123;paciente&#125;, &#123;data&#125;, &#123;horario&#125;, &#123;link_video&#125;</span>
            </label>
            <textarea
              rows={3}
              value={whatsappTemplate}
              onChange={(e) => setWhatsappTemplate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 leading-relaxed font-mono"
            />
          </div>

          {/* Buttons Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
