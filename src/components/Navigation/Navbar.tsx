import React from 'react';
import { Logo } from '../Brand/Logo';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Plus,
  UserPlus,
  CalendarPlus,
  Lock,
  Menu,
  MessageCircle,
  HelpCircle,
  Globe,
  LogOut
} from 'lucide-react';

interface NavbarProps {
  onOpenNewSessionModal: () => void;
  onOpenNewPatientModal: () => void;
  onToggleSidebarMobile: () => void;
  onGoToLanding?: () => void;
  onLogout?: () => void;
  onOpenProfileModal?: () => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewSessionModal,
  onOpenNewPatientModal,
  onToggleSidebarMobile,
  onGoToLanding,
  onLogout,
  onOpenProfileModal,
  activeTab
}) => {
  const { profile, hideConfidentialData, toggleHideConfidentialData, userRole, setUserRole, isAdmin, canSwitchRole } = useApp();

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 lg:px-8 py-3 flex items-center justify-between text-slate-100">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebarMobile}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          title="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div
          onClick={onGoToLanding}
          className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
          title="Ir para a página inicial"
        >
          <Logo size="sm" variant="dark" />
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:inline-block">
            SaaS MVP
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* RBAC Role Indicator & Switcher Button */}
        {canSwitchRole ? (
          <button
            onClick={() => setUserRole(isAdmin ? 'professional' : 'admin')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              isAdmin
                ? 'bg-purple-950/60 text-purple-300 border-purple-700/60 hover:bg-purple-900/80 shadow-sm'
                : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="Clique para alternar o perfil de acesso RBAC entre Psicólogo e Admin"
          >
            <Lock className={`w-4 h-4 ${isAdmin ? 'text-purple-400' : 'text-emerald-400'}`} />
            <span className="hidden sm:inline">Perfil:</span>
            <span className={isAdmin ? 'text-purple-300 font-black' : 'text-emerald-400 font-bold'}>
              {isAdmin ? 'Admin SaaS' : 'Psicólogo'}
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border bg-slate-800/90 text-slate-300 border-slate-700/80">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Perfil:</span>
            <span className="text-emerald-400 font-bold">Psicólogo</span>
          </div>
        )}
        {/* Sigilo / Privacy Toggle */}
        <button
          onClick={toggleHideConfidentialData}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
            hideConfidentialData
              ? 'bg-amber-950/40 text-amber-300 border-amber-700/50 shadow-inner'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
          }`}
          title={
            hideConfidentialData
              ? 'Ocupante ativado: Prontuários e anotações clínicas estão ocultos para compartilhamento seguro de tela.'
              : 'Clique para ocultar dados confidenciais do paciente antes de compartilhar a tela.'
          }
        >
          {hideConfidentialData ? (
            <>
              <EyeOff className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline font-semibold">Modo Sigilo (Ativado)</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 text-slate-400" />
              <span className="hidden md:inline">Modo Sigilo (Ocultar Prontuário)</span>
            </>
          )}
        </button>

        {/* Landing Page Link Button */}
        {onGoToLanding && (
          <button
            onClick={onGoToLanding}
            className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-sky-300 border border-slate-700 transition-colors"
            title="Voltar para a Landing Page Comercial"
          >
            <Globe className="w-4 h-4 text-sky-400" />
            <span>Landing Page</span>
          </button>
        )}

        {/* Quick Action Buttons */}
        <button
          onClick={onOpenNewPatientModal}
          className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          <UserPlus className="w-4 h-4 text-emerald-400" />
          <span>Novo Paciente</span>
        </button>

        <button
          onClick={onOpenNewSessionModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/20 transition-colors"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>Agendar Sessão</span>
        </button>

        {/* Psychologist Profile Header Summary */}
        <div className="h-6 w-px bg-slate-800 mx-1.5 hidden sm:block" />

        <button
          onClick={onOpenProfileModal}
          className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-800/80 transition-all group border border-transparent hover:border-slate-700/60"
          title="Clique para visualizar e editar o perfil do profissional"
        >
          <div className="relative">
            <img
              src={profile.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100'}
              alt={profile.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/40 group-hover:ring-emerald-400 group-hover:scale-105 transition-all shadow-sm"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
          </div>
          <div className="hidden lg:block text-left leading-tight">
            <div className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1">
              <span>{profile.name}</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-mono">{profile.crp}</div>
          </div>
        </button>

        {/* Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-rose-950/60 hover:bg-rose-900/90 text-rose-300 border border-rose-800/60 transition-all shadow-sm ml-0.5"
            title="Sair da conta e voltar para a página inicial"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        )}
      </div>
    </header>
  );
};
