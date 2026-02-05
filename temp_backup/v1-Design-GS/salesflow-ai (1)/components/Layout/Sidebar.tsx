
import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Phone, 
  CheckSquare, 
  BarChart2, 
  Settings, 
  Command,
  PieChart,
  Target,
  MessageSquare,
  X
} from 'lucide-react';

interface SidebarProps {
  activePage: 'dashboard' | 'calls' | 'settings' | 'leads' | 'pipeline' | 'tasks' | 'targets' | 'chat';
  onNavigate: (page: 'dashboard' | 'calls' | 'settings' | 'leads' | 'pipeline' | 'tasks' | 'targets' | 'chat') => void;
  userRole: 'rep' | 'manager';
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, userRole, isOpen, onClose }) => {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'לוח בקרה', page: 'dashboard' as const },
    { id: 'pipeline', icon: PieChart, label: 'פאנל', page: 'pipeline' as const },
    { id: 'leads', icon: Users, label: 'לידים', page: 'leads' as const },
    { id: 'calls', icon: Phone, label: 'שיחות', page: 'calls' as const },
    { id: 'tasks', icon: CheckSquare, label: 'משימות', page: 'tasks' as const },
    { id: 'chat', icon: MessageSquare, label: 'צ\'אט', page: 'chat' as const },
    ...(userRole === 'manager' ? [{ id: 'targets', icon: Target, label: 'יעדים', page: 'targets' as const }] : []),
    { id: 'reports', icon: BarChart2, label: 'דוחות', page: 'dashboard' as const },
  ];

  const handleNavClick = (page: any) => {
    onNavigate(page);
    onClose(); // Close drawer on mobile selection
  };

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div className={`
        fixed lg:relative inset-y-0 right-0 z-50 
        flex flex-col w-64 lg:w-20 
        bg-[#0B1120] border-l lg:border-l-0 lg:border-e border-white/5 
        items-center py-6 shadow-2xl lg:shadow-xl 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Background Ambience */}
        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-brand-500/10 to-transparent pointer-events-none"></div>

        {/* Mobile Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white lg:hidden"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Logo */}
        <div 
          className="mb-8 p-3 bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl shadow-lg shadow-brand-500/20 cursor-pointer hover:scale-105 transition-transform duration-200 group relative z-10" 
          onClick={() => handleNavClick('dashboard')}
        >
          <Command className="w-6 h-6 text-white relative z-10" />
          <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-2 w-full px-3 relative z-10 overflow-y-auto lg:overflow-visible">
          {navItems.map((item) => {
            const isActive = activePage === item.page && (item.page !== 'dashboard' || item.id === 'dashboard');

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.page)}
                className={`
                  flex items-center lg:flex-col lg:justify-center w-full lg:aspect-square p-3 lg:p-0 rounded-xl lg:rounded-2xl transition-all duration-300 group relative
                  ${isActive
                    ? 'bg-white/10 text-white shadow-inner border border-white/5' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}
                `}
                title={item.label}
              >
                {/* Icon */}
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <item.icon className="w-5 h-5 lg:mx-auto" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                
                {/* Label: Inline on Mobile, Below on Desktop */}
                <span className={`
                  text-sm lg:text-[9px] font-medium mr-4 lg:mr-0 lg:mt-1.5 transition-opacity duration-300 
                  ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}
                `}>
                  {item.label}
                </span>
                
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-brand-400 rounded-l-full lg:left-[-4px] lg:right-auto lg:w-1 lg:h-8 lg:rounded-r-full shadow-[0_0_12px_rgba(129,140,248,0.5)]"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto px-3 w-full flex flex-col gap-3">
          <button 
            onClick={() => handleNavClick('settings')}
            className={`
              flex items-center lg:flex-col lg:justify-center w-full lg:aspect-square p-3 lg:p-0 rounded-xl lg:rounded-2xl transition-all
              ${activePage === 'settings' 
                ? 'bg-white/10 text-white border border-white/5' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}
            `}
          >
            <Settings className="w-5 h-5 lg:mx-auto" />
            <span className="lg:hidden text-sm font-medium mr-4">הגדרות</span>
          </button>
          
          <div className="w-full lg:w-8 h-px bg-white/10 mx-auto my-1"></div>
          
          {/* User Avatar Placeholder */}
          <div className="w-full flex lg:justify-center px-2 lg:px-0 items-center gap-3 lg:gap-0">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 border border-white/10 shadow-sm flex-shrink-0"></div>
             <span className="lg:hidden text-sm text-slate-300">החשבון שלי</span>
          </div>
        </div>
      </div>
    </>
  );
};
