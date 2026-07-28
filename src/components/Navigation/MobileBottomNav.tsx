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
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur-lg px-2 py-2 flex items-center justify-around text-slate-400">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all ${
              isActive
                ? 'text-emerald-400 font-bold bg-emerald-500/10'
                : 'hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        );
      })}

      {/* "Mais" button to open drawer */}
      <button
        onClick={onToggleMobileSidebar}
        className="flex flex-col items-center justify-center gap-1 flex-1 py-1 px-1 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Mais</span>
      </button>
    </div>
  );
};
