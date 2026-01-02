
import React, { useState } from 'react';
import { 
  Calendar, 
  Filter, 
  Plus, 
  CheckSquare, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Phone, 
  Mail, 
  FileText, 
  MessageSquare, 
  ChevronDown, 
  MoreHorizontal, 
  X, 
  ArrowLeft, 
  Sparkles, 
  Play, 
  User as UserIcon, 
  Search, 
  Users, 
  Briefcase, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  ListTodo
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { User } from '../../types';
import { TEAM_MEMBERS } from '../../constants';

// --- Types & Mock Data ---

type TaskType = 'call' | 'email' | 'proposal' | 'whatsapp' | 'admin' | 'meeting' | 'file';
type TaskStatus = 'open' | 'completed' | 'overdue';
type TaskPriority = 'high' | 'medium' | 'low';

interface Task {
  id: string;
  title: string;
  type: TaskType;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  leadName?: string;
  leadId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  aiReason?: string; // For "Next Best Action"
  notes?: string;
  ownerId?: string; // For Manager View
  managerNote?: string; // For Manager View
}

const MOCK_TASKS: Task[] = [
  // Rep's Tasks (Assigned to u1 - Sarah)
  { id: 't1', title: 'שיחת פולואפ על הצעת מחיר', type: 'call', dueDate: '2024-11-09', dueTime: '10:00', leadName: 'מיכאל רוס', status: 'overdue', priority: 'high', aiReason: 'הלקוח פתח את ההצעה 3 פעמים אתמול', ownerId: 'u1' },
  { id: 't2', title: 'אישור חוזה סופי', type: 'admin', dueDate: '2024-11-09', dueTime: '14:00', leadName: 'חברת אלפא', status: 'overdue', priority: 'medium', ownerId: 'u1' },
  { id: 't3', title: 'הכנת מצגת לקראת פגישה', type: 'file', dueDate: '2024-11-10', dueTime: '09:00', leadName: 'דנה שפירא', status: 'completed', priority: 'medium', ownerId: 'u1' },
  { id: 't4', title: 'שיחת היכרות ראשונית', type: 'call', dueDate: '2024-11-10', dueTime: '10:30', leadName: 'רונית אברהם', status: 'open', priority: 'high', aiReason: 'ליד חם חדש שנכנס הבוקר', ownerId: 'u1' },
  { id: 't5', title: 'שליחת סיכום פגישה', type: 'email', dueDate: '2024-11-10', dueTime: '13:00', leadName: 'יוסי ברק', status: 'open', priority: 'medium', ownerId: 'u1' },
  { id: 't6', title: 'בדיקת סטטוס בוואטסאפ', type: 'whatsapp', dueDate: '2024-11-10', dueTime: '14:15', leadName: 'ענת גולן', status: 'open', priority: 'low', ownerId: 'u1' },
  { id: 't7', title: 'עדכון CRM וסגירת יום', type: 'admin', dueDate: '2024-11-10', dueTime: '16:30', status: 'open', priority: 'low', ownerId: 'u1' },
  { id: 't8', title: 'פגישת מו"מ', type: 'meeting', dueDate: '2024-11-11', dueTime: '11:00', leadName: 'גיא פלד', status: 'open', priority: 'high', ownerId: 'u1' },

  // Team Tasks (Assigned to others)
  { id: 't9', title: 'הכנת חוזה לחתימה', type: 'admin', dueDate: '2024-11-09', dueTime: '09:00', leadName: 'טכנולוגיות בע"מ', status: 'overdue', priority: 'high', ownerId: 'u3' }, // Ron
  { id: 't10', title: 'שיחת מכירה ראשונה', type: 'call', dueDate: '2024-11-10', dueTime: '11:00', leadName: 'דוד כהן', status: 'open', priority: 'medium', ownerId: 'u3' },
  { id: 't11', title: 'פולואפ לאחר דמו', type: 'email', dueDate: '2024-11-10', dueTime: '15:00', leadName: 'סטארט אפ ניישן', status: 'open', priority: 'high', ownerId: 'u4' }, // Daniel
  { id: 't12', title: 'שיחת שימור לקוח', type: 'call', dueDate: '2024-11-08', dueTime: '10:00', leadName: 'חברת גמא', status: 'overdue', priority: 'high', ownerId: 'u4' },
  { id: 't13', title: 'הצעת מחיר דחופה', type: 'proposal', dueDate: '2024-11-10', dueTime: '12:00', leadName: 'אבי לוי', status: 'open', priority: 'high', ownerId: 'u5' }, // Noa
  { id: 't14', title: 'עדכון פרטי ליד', type: 'admin', dueDate: '2024-11-10', dueTime: '16:00', status: 'completed', priority: 'low', ownerId: 'u5' },
];

const TaskIcon = ({ type }: { type: TaskType }) => {
  switch (type) {
    case 'call': return <Phone className="w-3.5 h-3.5" />;
    case 'email': return <Mail className="w-3.5 h-3.5" />;
    case 'proposal': return <FileText className="w-3.5 h-3.5" />;
    case 'file': return <FileText className="w-3.5 h-3.5" />;
    case 'whatsapp': return <MessageSquare className="w-3.5 h-3.5" />;
    case 'meeting': return <Briefcase className="w-3.5 h-3.5" />;
    default: return <CheckSquare className="w-3.5 h-3.5" />;
  }
};

const TaskTypeLabel = ({ type }: { type: TaskType }) => {
  switch (type) {
    case 'call': return <span>שיחת טלפון</span>;
    case 'email': return <span>אימייל</span>;
    case 'proposal': return <span>הצעת מחיר</span>;
    case 'whatsapp': return <span>הודעת וואטסאפ</span>;
    case 'meeting': return <span>פגישה</span>;
    case 'file': return <span>קובץ</span>;
    default: return <span>כללי</span>;
  }
};

const TaskRow: React.FC<{ task: Task; onClick: () => void }> = ({ task, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="flex items-center justify-between p-4 rounded-xl border border-transparent bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-brand-200 dark:hover:border-slate-700 transition-all cursor-pointer group relative overflow-hidden"
    >
      <div className="flex items-center gap-4 relative z-10">
        {/* Checkbox */}
        <div 
           className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
             task.status === 'completed' 
               ? 'bg-emerald-500 border-emerald-500 text-white' 
               : 'border-slate-300 dark:border-slate-600 hover:border-brand-500 bg-slate-50 dark:bg-slate-800'
           }`}
           onClick={(e) => {
             e.stopPropagation();
             // In a real app, toggle completion here
           }}
        >
           {task.status === 'completed' && <CheckSquare className="w-4 h-4" />}
        </div>

        <div>
           <div className="flex items-center gap-2">
             <p className={`text-sm font-bold ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
               {task.title}
             </p>
             {task.priority === 'high' && (
                 <span className="flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-rose-100 dark:ring-rose-900/50" title="עדיפות גבוהה"></span>
             )}
           </div>
           
           <div className="flex items-center gap-3 mt-1">
              <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md ${
                  task.type === 'call' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                  task.type === 'email' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' :
                  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                <TaskIcon type={task.type} />
                <span className="text-[10px]"><TaskTypeLabel type={task.type} /></span>
              </span>
              
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {task.dueTime}
              </span>

              {task.leadName && (
                <>
                  <span className="text-slate-300 text-[10px]">•</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{task.leadName}</span>
                </>
              )}
           </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
         <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-brand-600 transition-colors">
            <Edit3 className="w-4 h-4" />
         </button>
         <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-600 transition-colors">
            <Trash2 className="w-4 h-4" />
         </button>
      </div>
    </div>
  );
};

// --- View Component: Rep Tasks (Original) ---

const RepTasksView: React.FC<{
  tasks: Task[];
  onSelectTask: (t: Task) => void;
  activeTab: string;
  setActiveTab: (t: 'today' | 'week' | 'all') => void;
}> = ({ tasks, onSelectTask, activeTab, setActiveTab }) => {
    // Derived Data
  const overdueTasks = tasks.filter(t => t.status === 'overdue');
  const todayTasks = tasks.filter(t => t.dueDate === '2024-11-10');
  const completedToday = todayTasks.filter(t => t.status === 'completed').length;
  
  // Filter Logic
  let displayedTasks = tasks;
  if (activeTab === 'today') {
    displayedTasks = todayTasks;
  } else if (activeTab === 'week') {
    displayedTasks = tasks.filter(t => t.dueDate >= '2024-11-10' && t.dueDate <= '2024-11-17');
  }

  // Grouping for "Today" View
  const morningTasks = displayedTasks.filter(t => t.dueTime && parseInt(t.dueTime) < 12);
  const noonTasks = displayedTasks.filter(t => t.dueTime && parseInt(t.dueTime) >= 12 && parseInt(t.dueTime) < 15);
  const afternoonTasks = displayedTasks.filter(t => t.dueTime && parseInt(t.dueTime) >= 15);
  // Add overdue to the top of "Today" view if not completed
  const relevantOverdue = activeTab === 'today' ? overdueTasks : [];

  const priorityTasks = tasks.filter(t => t.aiReason && t.status !== 'completed').slice(0, 2);

  return (
      <>
      {/* 2. KPI Cards - Premium Look */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 px-6">
         {/* Open Tasks */}
         <div className="group bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-card hover:shadow-card-hover border border-slate-100 dark:border-slate-800 transition-all duration-300 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-2 relative z-10">
               <span className="text-sm font-medium text-slate-500 dark:text-slate-400">משימות פתוחות</span>
               <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                  <ListTodo className="w-4 h-4" />
               </div>
            </div>
            <div className="mb-3 relative z-10">
               <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight font-mono">12</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative z-10">
               <div className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }}></div>
            </div>
         </div>
         
         {/* Overdue */}
         <div className="group bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-card hover:shadow-card-hover border border-slate-100 dark:border-slate-800 transition-all duration-300 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-2 relative z-10">
               <span className="text-sm font-medium text-slate-500 dark:text-slate-400">משימות באיחור</span>
               <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/20">
                  <AlertCircle className="w-4 h-4" />
               </div>
            </div>
            <div className="mb-3 relative z-10 flex items-end gap-2">
               <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight font-mono">2</span>
               <Badge variant="danger" className="mb-1 text-[10px]">דחוף</Badge>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative z-10">
               <div className="h-full bg-rose-500 rounded-full" style={{ width: '20%' }}></div>
            </div>
         </div>

         {/* Today's Progress */}
         <div className="group bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-card hover:shadow-card-hover border border-slate-100 dark:border-slate-800 transition-all duration-300 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-2 relative z-10">
               <span className="text-sm font-medium text-slate-500 dark:text-slate-400">הושלמו היום</span>
               <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                  <CheckCircle2 className="w-4 h-4" />
               </div>
            </div>
            <div className="mb-3 relative z-10">
               <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight font-mono">{completedToday}</span>
                  <span className="text-sm text-slate-400 font-medium">/ {todayTasks.length}</span>
               </div>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative z-10">
               <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${(completedToday / (todayTasks.length || 1)) * 100}%` }}></div>
            </div>
         </div>
      </div>

      {/* 3. Main Content - Split Layout */}
      <div className="flex-1 overflow-visible lg:overflow-hidden px-6 pb-6 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:h-full">
          
          {/* RIGHT COLUMN: Task List (8 cols) */}
          <div className="lg:col-span-8 flex flex-col bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm lg:h-full overflow-hidden backdrop-blur-sm order-2 lg:order-1">
             
             {/* Tabs */}
             <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 pt-4 pb-0 bg-white dark:bg-slate-900 rounded-t-2xl">
               <div className="flex gap-6 overflow-x-auto no-scrollbar">
                 {[
                   { id: 'today', label: 'היום' },
                   { id: 'week', label: 'השבוע' },
                   { id: 'all', label: 'כל המשימות' }
                 ].map(tab => (
                   <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id as any)}
                     className={`
                       pb-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                       ${activeTab === tab.id 
                         ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400' 
                         : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}
                     `}
                   >
                     {tab.label}
                   </button>
                 ))}
               </div>
               <Button variant="ghost" size="sm" className="text-xs mb-2 hidden sm:flex">
                  <Filter className="w-3.5 h-3.5 ml-1.5" /> סינון
               </Button>
             </div>

             {/* Task List Content */}
             <div className="flex-1 lg:overflow-y-auto p-6 space-y-8 bg-slate-50/30 dark:bg-slate-950/30">
               
               {/* Overdue Section */}
               {relevantOverdue.length > 0 && (
                 <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-4 flex items-center gap-2 pl-2 border-l-2 border-rose-500">
                       באיחור ({relevantOverdue.length})
                    </h3>
                    <div className="space-y-3">
                      {relevantOverdue.map(task => (
                        <TaskRow key={task.id} task={task} onClick={() => onSelectTask(task)} />
                      ))}
                    </div>
                 </div>
               )}

               {/* Morning */}
               {morningTasks.length > 0 && (
                 <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                      בוקר (08:00 - 12:00)
                    </h3>
                    <div className="space-y-3">
                      {morningTasks.map(task => (
                        <TaskRow key={task.id} task={task} onClick={() => onSelectTask(task)} />
                      ))}
                    </div>
                 </div>
               )}

               {/* Noon */}
               {noonTasks.length > 0 && (
                 <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                      צהריים (12:00 - 15:00)
                    </h3>
                    <div className="space-y-3">
                      {noonTasks.map(task => (
                        <TaskRow key={task.id} task={task} onClick={() => onSelectTask(task)} />
                      ))}
                    </div>
                 </div>
               )}

               {/* Afternoon */}
               {afternoonTasks.length > 0 && (
                 <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                      אחר הצהריים (15:00 - 18:00)
                    </h3>
                    <div className="space-y-3">
                      {afternoonTasks.map(task => (
                        <TaskRow key={task.id} task={task} onClick={() => onSelectTask(task)} />
                      ))}
                    </div>
                 </div>
               )}

               <div className="pt-4 text-center">
                 <Button variant="ghost" size="sm" className="text-slate-400 hover:text-brand-600">טען עוד משימות</Button>
               </div>
             </div>
          </div>

          {/* LEFT COLUMN: Smart Widgets (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:h-full lg:overflow-y-auto pb-4 order-1 lg:order-2">
             
             {/* Widget 1: Next Best Action - UPDATED DESIGN */}
             <div className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] rounded-2xl shadow-xl shadow-indigo-900/20 p-6 text-white relative overflow-hidden flex-shrink-0 border border-white/5">
                {/* Abstract Blurs */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full -mr-10 -mt-10 blur-3xl mix-blend-overlay"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full -ml-5 -mb-5 blur-3xl mix-blend-overlay"></div>
                
                <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-5">
                      <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 shadow-lg">
                        <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300/20" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight">הדבר הבא</h3>
                        <p className="text-xs text-indigo-200 opacity-80">משימות בעדיפות עליונה ע"פ ה-AI</p>
                      </div>
                   </div>
                   
                   <div className="space-y-4">
                     {priorityTasks.map((task, idx) => (
                       <div key={task.id} className="group bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/5 hover:border-white/20 transition-all duration-300 cursor-pointer shadow-lg hover:-translate-y-1" onClick={() => onSelectTask(task)}>
                          <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center gap-2">
                               <Badge variant="danger" className="text-[10px] bg-rose-600 text-white border-none shadow-md shadow-rose-900/20">עדיפות גבוהה</Badge>
                             </div>
                             <span className="text-xs text-indigo-200 font-mono bg-black/20 px-2 py-0.5 rounded-md">{task.dueTime}</span>
                          </div>
                          <p className="text-sm font-bold mb-1.5 truncate text-white">{task.title}</p>
                          <div className="flex items-start gap-2 mb-4">
                             <div className="w-0.5 h-full bg-indigo-400/50 rounded-full self-stretch"></div>
                             <p className="text-xs text-indigo-100 opacity-80 leading-relaxed">"{task.aiReason}"</p>
                          </div>
                          <button className="w-full py-2 bg-white text-indigo-900 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 shadow-sm">
                            <Play className="w-3 h-3 fill-current" /> התחל ביצוע
                          </button>
                       </div>
                     ))}
                   </div>
                </div>
             </div>

             {/* Widget 2: Stats by Type - Cleaned up */}
             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-5 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-brand-500" />
                  פילוח משימות
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   {[
                     { label: 'שיחות', count: 5, icon: Phone, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
                     { label: 'פולואפ', count: 3, icon: Mail, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
                     { label: 'הצעות מחיר', count: 2, icon: FileText, color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/20' },
                     { label: 'פגישות', count: 1, icon: Users, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
                   ].map((stat, i) => (
                     <div key={i} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors group cursor-default">
                        <div className={`p-2.5 rounded-xl mb-2 ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                           <stat.icon className="w-5 h-5" />
                        </div>
                        <span className="text-xl font-bold text-slate-900 dark:text-white">{stat.count}</span>
                        <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
      </>
  );
};

interface TasksDashboardProps {
  isDarkMode: boolean;
  currentUser: User;
}

export const TasksDashboard: React.FC<TasksDashboardProps> = ({ isDarkMode, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'all'>('today');
  
  // Filter for current user
  const userTasks = MOCK_TASKS.filter(t => 
    currentUser.type === 'manager' ? true : t.ownerId === currentUser.id
  );

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative">
      {/* Header */}
      <div className="px-6 py-6 md:py-8 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white">המשימות שלי</h1>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">ניהול משימות שוטף וביצועים.</p>
        </div>
        <div className="flex items-center gap-3">
           <Button>
             <Plus className="w-4 h-4 ml-2" />
             משימה חדשה
           </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
         <RepTasksView 
            tasks={userTasks.length > 0 ? userTasks : MOCK_TASKS} // Fallback for empty/demo
            onSelectTask={(t) => {}} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
         />
      </div>
    </div>
  );
};
