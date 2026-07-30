import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  MessageSquare,
  Settings,
  ShieldCheck,
  PhoneCall,
  Lock,
  ChevronRight,
  ExternalLink,
  Clock,
  RotateCcw,
  Globe,
  LogOut,
  Zap
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConfirmationModal } from '../Common/ConfirmationModal';

export type NavTab = 'dashboard' | 'schedule' | 'patients' | 'sessions' | 'reminders' | 'connect' | 'settings' | 'admin' | 'landing';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout?: () => void;
  onOpenProfileModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen,
  onCloseMobile,
  onLogout,
  onOpenProfileModal
}) => {
  const { profile, patients, sessions, resetToDemoData, isAdmin, userRole, setUserRole, canSwitchRole } = useApp();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const activePatientsCount = patients.filter((p) => p.status === 'ativo').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessionsCount = sessions.filter((s) => s.date === todayStr).length;

  const allNavItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: string | number; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'schedule', label: 'Agenda & Horários', icon: Calendar, badge: todaySessionsCount > 0 ? `${todaySessionsCount} hoje` : undefined },
    { id: 'patients', label: 'Pacientes & Prontuários', icon: Users, badge: activePatientsCount },
    { id: 'sessions', label: 'Sessões & Evoluções', icon: FileText },
    { id: 'reminders', label: 'Lembretes WhatsApp', icon: MessageSquare },
    { id: 'connect', label: 'Sessão Certa Connect', icon: Zap, badge: 'IA & APIs' },
    { id: 'settings', label: 'Configurações & LGPD', icon: Settings },
    { id: 'admin', label: 'Painel Admin SaaS', icon: ShieldCheck, adminOnly: true, badge: 'Restrito' },
    { id: 'landing', label: 'Landing & Calculadora', icon: Globe },
  ];

  // RBAC Filter: Hide admin-only tab for standard professional users
  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  const handleSelect = (tab: NavTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 z-40 lg:hidden backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 lg:top-[57px] left-0 z-40 w-64 h-full lg:h-[calc(100vh-57px)] bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-5 overflow-y-auto">
          {/* Interactive Professional Profile Card */}
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="w-full p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 transition-all text-left flex items-center gap-3 group shadow-sm hover:shadow-emerald-950/30"
            title="Clique para abrir e editar as informações e foto do profissional"
          >
            <div className="relative shrink-0">
              <img
                src={profile.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100'}
                alt={profile.name}
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/40 group-hover:scale-105 transition-all"
              />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-extrabold text-white truncate group-hover:text-emerald-300 transition-colors">
                {profile.name}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono font-semibold truncate">
                {profile.crp}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {profile.specialty}
              </div>
            </div>
          </button>

          {/* Section Label */}
          <div className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Menu Principal
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600/15 text-emerald-400 font-semibold border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Clinic Info Card */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Ambiente Protegido
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800">
                  LGPD OK
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Dados criptografados no padrão sigiloso CFP (Conselho Federal de Psicologia).
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-2.5">
          {/* RBAC Role Toggle Card */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-400" />
                <span>Perfil de Acesso (RBAC)</span>
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isAdmin ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {isAdmin ? 'ADMIN' : 'PSICÓLOGO'}
              </span>
            </div>
            {canSwitchRole ? (
              <div className="grid grid-cols-2 gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => setUserRole('professional')}
                  className={`py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                    userRole === 'professional'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Psicólogo
                </button>
                <button
                  type="button"
                  onClick={() => setUserRole('admin')}
                  className={`py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                    userRole === 'admin'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Admin SaaS
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 leading-tight pt-0.5">
                Conta de uso exclusivo do Profissional da Saúde.
              </p>
            )}
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-rose-300 hover:text-white bg-rose-950/50 hover:bg-rose-900/80 rounded-xl transition-all border border-rose-800/60 shadow-sm"
              title="Sair da conta e retornar à landing page"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Sair do Sistema</span>
            </button>
          )}

          <button
            onClick={() => setIsResetModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
            title="Restaurar dados fictícios de demonstração"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Restaurar Demo MVP</span>
          </button>
        </div>
      </aside>

      {/* Reset Demo Confirmation Modal */}
      <ConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={resetToDemoData}
        title="Restaurar Dados de Demonstração"
        description="Tem certeza de que deseja restaurar as configurações e dados de demonstração do sistema? Isso redefinirá seu perfil para o padrão inicial do MVP."
        confirmText="Sim, Restaurar Demo"
        cancelText="Cancelar"
        variant="warning"
      />
    </>
  );
};
