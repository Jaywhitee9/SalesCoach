
import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  MessageCircle, 
  HelpCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  BookOpen, 
  Lightbulb, 
  Target,
  Menu // Hamburger Icon
} from 'lucide-react';
import { User } from '../../types';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';

interface TopBarProps {
  user: User;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onOpenChat?: () => void;
  onToggleMobileMenu: () => void;
}

// --- MOCK DATA ---

const MOCK_NOTIFICATIONS = [
  { 
    id: 'n1', 
    title: 'שיחת מעקב עם מיכאל רוס', 
    desc: 'בדיקת ROI לפני הצעת מחיר', 
    time: 'היום · 15:30', 
    status: 'active', 
    category: 'today' 
  },
  { 
    id: 'n2', 
    title: 'אישור הצעת מחיר - אלפא', 
    desc: 'ממתין לחתימה סופית', 
    time: 'היום · 17:00', 
    status: 'active', 
    category: 'today' 
  },
  { 
    id: 'n3', 
    title: 'ישיבת צוות שבועית', 
    desc: 'סקירת יעדים רבעונית', 
    time: 'מחר · 09:00', 
    status: 'future', 
    category: 'week' 
  },
  { 
    id: 'n4', 
    title: 'פולואפ דנה לוי', 
    desc: 'לקוח ביקש לחזור ביום חמישי', 
    time: 'יום ה׳ · 11:00', 
    status: 'future', 
    category: 'week' 
  },
  { 
    id: 'n5', 
    title: 'עדכון CRM שבועי', 
    desc: 'בוצע בהצלחה', 
    time: 'אתמול', 
    status: 'completed', 
    category: 'all' 
  }
];

const HELP_TIPS = [
  { id: 'h1', text: 'לחץ על ⌘K בכל שלב לחיפוש מהיר של לידים.' },
  { id: 'h2', text: 'ניתן לגרור משימות בלוח המשימות כדי לשנות סטטוס.' },
  { id: 'h3', text: 'ה-AI מנתח את השיחות שלך בזמן אמת ומציע טיפים.' }
];

const HELP_ACTIONS = [
  { id: 'a1', label: 'איך להגדיר יעדים אישיים' },
  { id: 'a2', label: 'איך לעדכן סטטוס ליד' },
  { id: 'a3', label: 'איך לעבוד עם תובנות ה-AI' },
];

export const TopBar: React.FC<TopBarProps> = ({ user, isDarkMode, toggleTheme, onOpenChat, onToggleMobileMenu }) => {
  const isRep = user.type === 'rep';
  
  // State
  const [activePanel, setActivePanel] = useState<'notifications' | 'help' | null>(null);
  const [hasUnread, setHasUnread] = useState(true);
  const [reminderFilter, setReminderFilter] = useState<'today' | 'week' | 'all'>('today');
  
  // Refs for click outside
  const containerRef = useRef<HTMLDivElement>(null);

  // Close panels when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActivePanel(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const togglePanel = (panel: 'notifications' | 'help') => {
    if (activePanel === panel) {
      setActivePanel(null);
    } else {
      setActivePanel(panel);
      if (panel === 'notifications') {
        setHasUnread(false);
      }
    }
  };

  // Filter Logic
  const filteredNotifications = MOCK_NOTIFICATIONS.filter(n => {
    if (reminderFilter === 'all') return true;
    if (reminderFilter === 'today') return n.category === 'today';
    if (reminderFilter === 'week') return n.category === 'today' || n.category === 'week';
    return true;
  });

  return (
    <header className="h-16 px-4 md:px-6 flex items-center justify-between flex-shrink-0 z-40 sticky top-0
      bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 transition-colors">
      
      {/* Left Area: Mobile Menu + Search */}
      <div className="flex items-center gap-3 w-full max-w-xl">
        
        {/* Mobile Hamburger Trigger */}
        <button 
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 -mr-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Area - Command Palette Style */}
        <div className="relative w-full group hidden sm:block">
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
            <Search className="w-4 h-4" />
          </div>
          <input 
            type="text" 
            placeholder="חיפוש מהיר (⌘K)" 
            className="w-full pr-10 pl-12 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 
                       rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 
                       focus:bg-white dark:focus:bg-slate-900 focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/10 
                       transition-all outline-none shadow-sm"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-50 pointer-events-none">
             <span className="text-[10px] font-mono text-slate-500 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5">⌘K</span>
          </div>
        </div>

        {/* Mobile Search Icon (Placeholder for expanding search) */}
        <button className="sm:hidden p-2 text-slate-500 dark:text-slate-400">
           <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 md:gap-3 pl-2" ref={containerRef}>
        
        {isRep && (
          <button 
            onClick={onOpenChat}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 text-slate-600 dark:text-slate-300 rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow"
          >
            <MessageCircle className="w-4 h-4 text-brand-500" />
            <span className="hidden lg:inline">צ'אט מנהל</span>
          </button>
        )}

        <div className="flex items-center gap-1 relative">
            
            {/* Help Button - Hidden on mobile to save space */}
            <div className="relative hidden md:block">
              <button 
                onClick={() => togglePanel('help')}
                className={`p-2 rounded-full transition-colors ${activePanel === 'help' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="עזרה"
              >
                <HelpCircle className="w-5 h-5" />
              </button>

              {/* Help Panel */}
              {activePanel === 'help' && (
                <div className="absolute top-full left-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                   <div className="p-4 bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                          <LifeBuoyIcon className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white">צריך עזרה?</h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">כל מה שנציג מכירות צריך לדעת על המסך הזה.</p>
                   </div>
                   
                   <div className="p-4 space-y-5">
                      {/* Tips */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                          טיפים מהירים
                        </h4>
                        <ul className="space-y-2">
                          {HELP_TIPS.map(tip => (
                            <li key={tip.id} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mt-1.5 flex-shrink-0"></span>
                              {tip.text}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Actions */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-blue-500" />
                          פעולות נפוצות
                        </h4>
                        <ul className="space-y-1">
                          {HELP_ACTIONS.map(action => (
                            <li key={action.id}>
                              <button className="w-full text-right text-xs py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-between group">
                                {action.label}
                                <ChevronLeft className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                   </div>

                   <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-center">
                      <button className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        פתח מרכז ידע מלא
                      </button>
                   </div>
                </div>
              )}
            </div>

            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => togglePanel('notifications')}
                className={`relative p-2 rounded-full transition-colors ${activePanel === 'notifications' ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Bell className="w-5 h-5" />
                {hasUnread && (
                  <span className="absolute top-2.5 left-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                )}
              </button>

              {/* Notifications Panel - Fixed Position: Aligned to Left (visual Left in RTL) to expand Right */}
              {activePanel === 'notifications' && (
                <div className="absolute top-full left-0 mt-3 w-72 sm:w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-left flex flex-col max-h-[500px]">
                   
                   {/* Header */}
                   <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 sticky top-0 bg-white dark:bg-slate-900 z-10">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 dark:text-white">התזכורות שלי</h3>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">
                          {filteredNotifications.length} פעילים
                        </span>
                      </div>
                      {/* Filter Chips */}
                      <div className="flex gap-2">
                        {[
                          { id: 'today', label: 'היום' },
                          { id: 'week', label: 'השבוע' },
                          { id: 'all', label: 'הכול' }
                        ].map(f => (
                          <button
                            key={f.id}
                            onClick={() => setReminderFilter(f.id as any)}
                            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${reminderFilter === f.id ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                   </div>

                   {/* List */}
                   <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {filteredNotifications.length > 0 ? (
                        filteredNotifications.map(item => (
                          <div key={item.id} className="group p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                             <div className="flex justify-between items-start mb-1">
                               <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight group-hover:text-brand-600 transition-colors">
                                 {item.title}
                               </h4>
                               <Badge variant={item.status === 'completed' ? 'success' : item.status === 'active' ? 'warning' : 'neutral'} className="text-[10px] px-1.5 py-0">
                                 {item.status === 'active' ? 'פעיל' : item.status === 'future' ? 'עתידי' : 'הושלם'}
                               </Badge>
                             </div>
                             <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-1">{item.desc}</p>
                             <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                               <Clock className="w-3 h-3" />
                               {item.time}
                             </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <CheckCircle2 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-xs text-slate-400">אין תזכורות לטווח זה</p>
                        </div>
                      )}
                   </div>

                   {/* Footer */}
                   <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center sticky bottom-0">
                      <button className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors">
                        נהל תזכורות
                      </button>
                   </div>
                </div>
              )}
            </div>
        </div>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>

        <button className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors group">
          <div className="relative">
             <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-600 shadow-sm group-hover:border-brand-300 transition-colors" />
             <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight group-hover:text-brand-600 transition-colors">{user.name}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{user.role}</p>
          </div>
        </button>
      </div>
    </header>
  );
};

// Helper Icon for Help Panel (LifeBuoy)
function LifeBuoyIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
      <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
      <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
      <line x1="14.83" y1="9.17" x2="18.36" y2="5.64" />
      <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
    </svg>
  )
}
