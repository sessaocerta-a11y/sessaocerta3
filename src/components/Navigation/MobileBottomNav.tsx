import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageCircle,
  Menu
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: NavTab) => void;
  onToggleMobileSidebar: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onToggleMobileSidebar,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Início', icon: LayoutDashboard },
    { id: 'schedule' as NavTab, label: 'Agenda', icon: Calendar },
    { id: 'patients' as NavTab, label: 'Pacientes', icon: Users },
    { id: 'reminders' as NavTab, label: 'Mensagens', icon: MessageCircle },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800/90 backdrop-blur-xl px-3 py-2 flex items-center justify-around text-slate-400 shadow-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center gap-1.5 flex-1 py-1.5 px-2 min-h-[50px] rounded-2xl transition-all ${
              isActive
                ? 'text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 shadow-sm'
                : 'hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-emerald-400' : 'text-slate-400'}`} />
            <span className="text-[11px] tracking-tight font-medium leading-none">{item.label}</span>
          </button>
        );
      })}

      {/* "Mais" button to open drawer */}
      <button
        onClick={onToggleMobileSidebar}
        className="flex flex-col items-center justify-center gap-1.5 flex-1 py-1.5 px-2 min-h-[50px] rounded-2xl text-slate-400 hover:text-slate-200 transition-all"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[11px] tracking-tight font-medium leading-none">Mais</span>
      </button>
    </div>
  );
};
