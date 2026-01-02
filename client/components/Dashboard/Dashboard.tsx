
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowDownRight,
  Play,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Award,
  Radio,
  Target,
  FileText,
  Lightbulb,
  ChevronDown,
  BarChart3,
  Eye,
  MoreHorizontal,
  Check
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LeadDrawer } from '../Leads/LeadDrawer';
import { useLeads } from '../../src/hooks/useLeads';
import { useTasks } from '../../src/hooks/useTasks';
import { AddTaskModal } from '../Tasks/AddTaskModal';
import { Lead } from '../../types';

interface DashboardProps {
  onStartCall: () => void;
  isDarkMode: boolean;
  onNavigate?: (page: string) => void;
  userName?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartCall, isDarkMode, onNavigate, userName }) => {
  // Helper for greeting based on Israel time
  const getGreeting = () => {
    const hour = new Date().getHours(); // Uses client's local time (assuming user is in context)
    if (hour >= 5 && hour < 12) return 'בוקר טוב';
    if (hour >= 12 && hour < 18) return 'צהריים טובים';
    if (hour >= 18 && hour < 22) return 'ערב טוב';
    return 'לילה טוב';
  };

  const greeting = getGreeting();

  // Filters State
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [activityFilter, setActivityFilter] = useState('שיחות טלפון');
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const navigate = useNavigate();

  const { leads, loading: leadsLoading } = useLeads();
  const { tasks = [], toggleTask, addTask, loading: tasksLoading } = useTasks();

  // Tasks Filter - now includes 'overdue' option
  const [tasksFilter, setTasksFilter] = useState<'day' | 'week' | 'month' | 'overdue'>('day');

  // Filter tasks by date range
  const filteredTasks = React.useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const filtered = tasks.filter(task => {
      // If task has no date, show it in "day" view
      if (!task.rawDate) {
        return tasksFilter === 'day';
      }

      const taskDate = new Date(task.rawDate);
      const isOverdue = !task.completed && taskDate < startOfToday;

      // Overdue tab - only show overdue incomplete tasks
      if (tasksFilter === 'overdue') {
        return isOverdue;
      }

      // For other tabs, DON'T show overdue tasks (they have their own tab)
      if (isOverdue) return false;

      // Check if task is in the selected range
      switch (tasksFilter) {
        case 'day':
          return taskDate >= startOfToday && taskDate < endOfToday;
        case 'week':
          return taskDate >= startOfWeek && taskDate < endOfWeek;
        case 'month':
          return taskDate >= startOfMonth && taskDate < endOfMonth;
        default:
          return false;
      }
    });

    // Sort by date (earliest first for overdue, latest first for future)
    return filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (!a.rawDate || !b.rawDate) return 0;
      return new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime();
    });
  }, [tasks, tasksFilter]);

  // Count overdue tasks for badge
  const overdueCount = React.useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return tasks.filter(task => {
      if (!task.rawDate || task.completed) return false;
      return new Date(task.rawDate) < startOfToday;
    }).length;
  }, [tasks]);

  // Real KPIs from API
  interface Stats {
    calls: { answered: number; total: number };
    appointments: number;
    newLeads: number;
    avgCallTime: number;
    qualityScore: number;
  }
  const [realStats, setRealStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // AI Coaching Data
  interface CoachingData {
    dailyFocus: Array<{ text: string; why: string }>;
    goldenTip: { title: string; content: string; example: string };
  }
  const [coaching, setCoaching] = useState<CoachingData | null>(null);
  const [coachingLoading, setCoachingLoading] = useState(true);

  // Fetch Real Stats based on timeRange
  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const res = await fetch(`/api/stats/daily?range=${timeRange}`);
        const json = await res.json();
        if (json.success) {
          setRealStats(json.stats);
        }
      } catch (err) {
        console.error('[Dashboard] Stats fetch error:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [timeRange]); // Re-fetch when timeRange changes

  // Fetch AI Coaching (once on load)
  useEffect(() => {
    const fetchCoaching = async () => {
      try {
        const res = await fetch('/api/coaching/daily');
        const json = await res.json();
        if (json.success && json.coaching) {
          setCoaching(json.coaching);
        }
      } catch (err) {
        console.error('[Dashboard] Coaching fetch error:', err);
      } finally {
        setCoachingLoading(false);
      }
    };
    fetchCoaching();
  }, []);

  // Weekly Performance Data
  interface WeeklyData {
    name: string;
    date: string;
    calls: number;
    successful: number;
    rate: number;
  }
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);

  useEffect(() => {
    const fetchWeekly = async () => {
      try {
        const res = await fetch('/api/stats/weekly-performance');
        const json = await res.json();
        if (json.success && json.data) {
          setWeeklyData(json.data);
        }
      } catch (err) {
        console.error('[Dashboard] Weekly performance fetch error:', err);
      } finally {
        setWeeklyLoading(false);
      }
    };
    fetchWeekly();
  }, []);

  // Ref for dropdown click outside
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsActivityOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handlers
  const handleTimeRangeChange = (range: 'day' | 'week' | 'month') => {
    setTimeRange(range);
    // TODO: use timeRange to refetch dashboard stats from backend
  };

  const handleFilterChange = (filter: string) => {
    setActivityFilter(filter);
    setIsActivityOpen(false);
    // TODO: fetch dashboard data based on activityFilter
  };

  const handleViewDetails = (leadName: string) => {
    const foundLead = leads.find(l => l.name === leadName);
    if (foundLead) {
      setSelectedLead(foundLead);
    } else {
      // Fallback mock if lead not found in main list
      setSelectedLead({
        id: `temp-${Date.now()}`,
        name: leadName,
        company: 'לקוח מזדמן',
        phone: '',
        email: '',
        status: 'New',
        priority: 'Warm',
        value: '$0',
        tags: []
      });
    }
  };

  // Use real weeklyData from API (performanceData removed)
  const barColors = isDarkMode ? '#6366f1' : '#4f46e5';
  const barColorsGreen = isDarkMode ? '#10b981' : '#059669';

  const getProgress = (value: string) => {
    const val = parseInt(value) || 0;
    const goal = 10;
    return Math.min((val / goal) * 100, 100);
  };

  const activityOptions = [
    'כל הפעילויות',
    'שיחות טלפון',
    'פגישות',
    'משימות'
  ];

  // Helper to assign icons based on content since we are reordering
  const getKpiIcon = (label: string) => {
    if (label.includes('איכות')) return <Award className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
    if (label.includes('פגישות')) return <Calendar className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
    if (label.includes('הושלמו')) return <CheckCircle2 className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
    return <Phone className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
  };

  // Reorder KPIs: Right to Left -> Quality, Appointments, Completed, Planned
  // Original DASHBOARD_KPIS order: Planned, Completed, Appointments, Quality
  // Data per Time Range - Use real stats for all ranges
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const timeRangeLabel = timeRange === 'day' ? 'היום' : timeRange === 'week' ? 'השבוע' : 'החודש';

  // 4 Main KPI Cards (quality goes in header badge)
  const mainKPIs = [
    {
      id: 'calls',
      label: `סה"כ שיחות ${timeRangeLabel}`,
      value: realStats ? String(realStats.calls.total) : '0',
      target: timeRange === 'day' ? 10 : timeRange === 'week' ? 50 : 200,
      trend: realStats ? `${realStats.calls.answered} נענו` : 'טוען...',
      subtext: realStats && realStats.calls.total > 0
        ? `${Math.round((realStats.calls.answered / realStats.calls.total) * 100)}% מענה`
        : '',
      color: 'bg-indigo-500'
    },
    {
      id: 'answered',
      label: 'שיחות שנענו',
      value: realStats ? String(realStats.calls.answered) : '0',
      target: timeRange === 'day' ? 8 : timeRange === 'week' ? 40 : 150,
      trend: '',
      subtext: 'מתוך סה"כ שיחות',
      color: 'bg-emerald-500'
    },
    {
      id: 'newLeads',
      label: 'לידים חדשים',
      value: realStats ? String(realStats.newLeads) : '0',
      target: timeRange === 'day' ? 5 : timeRange === 'week' ? 25 : 100,
      trend: timeRangeLabel,
      subtext: 'נוספו למערכת',
      color: 'bg-purple-500'
    },
    {
      id: 'avgTime',
      label: 'זמן שיחה ממוצע',
      value: realStats ? formatTime(realStats.avgCallTime) : '0:00',
      target: 300,
      trend: '',
      subtext: 'דקות',
      color: 'bg-amber-500'
    }
  ];

  // Quality score for header badge
  const qualityScore = realStats?.qualityScore || 0;

  // Reorder KPIs: Right to Left
  const orderedKPIs = [...mainKPIs].reverse();

  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

  // Derive Schedule from Real Tasks
  const todayDate = new Date().toISOString().split('T')[0];

  const filteredCalls = tasks
    .filter(t => {
      // 1. Time Range Filter
      const isToday = t.rawDate && t.rawDate.startsWith(todayDate);
      if (timeRange === 'day' && !isToday) return false;

      // 2. Activity Filter Logic
      // Start with default true, narrow down
      if (activityFilter === 'כל הפעילויות') return true;
      if (activityFilter === 'שיחות טלפון') return true; // Assuming all tasks are calls/tasks for now
      if (activityFilter === 'משימות') return true;

      // If filtering by 'Meetings' (פגישות), check title or type (future improvement)
      if (activityFilter === 'פגישות') {
        return t.title.includes('פגישה');
      }

      return true;
    })
    .map(t => {
      const dateObj = t.rawDate ? new Date(t.rawDate) : new Date();
      const timeStr = dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

      return {
        id: t.id,
        time: timeStr,
        leadName: t.leadName,
        outcome: t.title, // Use title as "Outcome/Type" for display
        status: t.completed ? 'Completed' : 'Scheduled',
        originalTask: t
      };
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 bg-transparent" dir="rtl">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 animate-slide-up">

        {/* Right Side: Title & Greeting + Quality Badge */}
        <div className="text-right flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              {greeting}, {userName || 'שרה'} ☀️
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">מוכנה לכבוש את היעדים של היום?</p>
          </div>

          {/* Quality Score Badge */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border border-amber-200/60 dark:border-amber-700/50 rounded-xl px-3 py-2">
            <Award className="w-4 h-4 text-amber-500" />
            <div className="text-center">
              <span className="text-[10px] text-amber-600 dark:text-amber-300 block">ציון איכות</span>
              <span className="text-lg font-bold text-amber-700 dark:text-amber-200">{qualityScore}</span>
            </div>
          </div>
        </div>

        {/* Left Side: Actions & Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 relative z-20">

          {/* 1. Time Range Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-full sm:w-auto">
            {[
              { id: 'day', label: 'היום' },
              { id: 'week', label: 'שבוע' },
              { id: 'month', label: 'חודש' }
            ].map((range) => (
              <button
                key={range.id}
                onClick={() => handleTimeRangeChange(range.id as any)}
                className={`
                    flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md transition-all
                    ${timeRange === range.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}
                  `}
              >
                {range.label}
              </button>
            ))}
          </div>





          {/* 3. CTA Button (Primary Action on Left) */}
          <Button
            onClick={onStartCall}
            className="w-full sm:w-auto shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all py-2.5 px-5"
          >
            <Phone className="w-4 h-4 ml-2" />
            התחל שיחה עכשיו
          </Button>

        </div>
      </div>

      {/* 1. KPI Cards - 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        {orderedKPIs.map((kpi, index) => (
          <div key={index} className="group bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-card hover:shadow-card-hover border border-slate-200 dark:border-slate-800 transition-all duration-300 relative overflow-hidden">
            {/* Subtle Gradient Blob on Hover */}
            <div className="absolute -right-10 -top-10 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors"></div>

            <div className="flex flex-col h-full justify-between relative z-10">
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{kpi.label}</span>
                {getKpiIcon(kpi.label)}
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight font-mono">{kpi.value}</span>
              </div>

              <div className="space-y-3">
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min((parseInt(kpi.value) / (kpi.target || 100)) * 100, 100)}%` }}></div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">{kpi.subtext}</span>
                  {kpi.trend && (
                    <span className="text-[11px] font-bold flex items-center text-brand-600 dark:text-brand-400">
                      {kpi.trend}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Middle Section: Calls & Coaching */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 mb-10">

        {/* Left: Today's Schedule (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-slate-100 dark:border-slate-800 flex flex-col min-h-[420px] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                הלו"ז {timeRange === 'day' ? 'להיום' : timeRange === 'week' ? 'לשבוע הקרוב' : 'לחודש הקרוב'}
              </h2>
              <Badge variant="neutral" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">{filteredCalls.length} שיחות</Badge>
            </div>

            {/* 2. Activity Dropdown - Moved Here */}
            <div className="relative w-full sm:w-auto" ref={dropdownRef}>
              <button
                onClick={() => setIsActivityOpen(!isActivityOpen)}
                className="w-full sm:w-40 flex items-center justify-between px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-brand-300 dark:hover:border-brand-700 transition-colors shadow-sm"
              >
                <span className="truncate">{activityFilter}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isActivityOpen ? 'rotate-180' : ''}`} />
              </button>

              {isActivityOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in zoom-in-95 duration-200 text-right">
                  {activityOptions.map(option => (
                    <button
                      key={option}
                      onClick={() => handleFilterChange(option)}
                      className={`
                        w-full text-right px-4 py-2 text-xs flex items-center justify-between transition-colors
                        ${activityFilter === option
                          ? 'bg-brand-50/50 dark:bg-brand-900/10 text-brand-600 dark:text-brand-400 font-medium'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}
                      `}
                    >
                      {option}
                      {activityFilter === option && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 font-semibold w-24">שעה</th>
                  <th className="px-6 py-3 font-semibold">ליד</th>
                  <th className="px-6 py-3 font-semibold">סוג / תוצאה</th>
                  <th className="px-6 py-3 font-semibold">סטטוס</th>
                  <th className="px-6 py-3 font-semibold w-24">פעולה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {filteredCalls.map((call, idx) => (
                  <tr key={call.id} className="group hover:bg-brand-50/30 dark:hover:bg-brand-900/10 transition-colors">
                    <td className="px-6 py-4 align-middle">
                      <span className="font-mono text-sm text-slate-600 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                        {call.time}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-brand-700 transition-colors">{call.leadName}</div>
                      <div className="text-xs text-slate-400">מנכ"ל, חברה בע"מ</div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="text-sm text-slate-600 dark:text-slate-300">{call.outcome}</div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      {call.status === 'In Progress' ? (
                        <div className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 font-bold text-xs animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                          בשיחה כעת
                        </div>
                      ) : call.status === 'Scheduled' ? (
                        <span className="text-xs font-medium text-slate-500">מתוכנן</span>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          הושלם
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 align-middle">
                      {call.status === 'In Progress' ? (
                        <Button size="sm" onClick={onStartCall} className="h-8 px-4 shadow-lg shadow-brand-500/20 text-xs">חזור לשיחה</Button>
                      ) : call.status === 'Scheduled' ? (
                        <button
                          onClick={onStartCall}
                          className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs hover:bg-white dark:hover:bg-slate-800 hover:border-brand-300 hover:text-brand-600 transition-all flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900"
                        >
                          <Phone className="w-3 h-3" /> התחל
                        </button>
                      ) : (
                        <button
                          onClick={() => handleViewDetails(call.leadName)}
                          className="text-xs text-slate-400 hover:text-brand-600 underline decoration-slate-300 hover:decoration-brand-300 transition-all"
                        >
                          פרטים
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Live Coaching Focus (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Focus Card - Modern Glass Gradient */}
          <div className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] rounded-2xl shadow-xl shadow-indigo-900/20 p-6 text-white relative overflow-hidden min-h-[260px] flex flex-col border border-white/5">
            {/* Abstract decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full -mr-20 -mt-20 blur-3xl mix-blend-overlay"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/20 rounded-full -ml-10 -mb-10 blur-3xl mix-blend-overlay"></div>

            <div className="relative z-10 flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 shadow-lg">
                  <Lightbulb className="w-5 h-5 text-yellow-300 fill-yellow-300/20" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">המיקוד להיום</h3>
                  <p className="text-xs text-indigo-200 opacity-80">
                    {coachingLoading ? 'מנתח ביצועים...' : 'מבוסס על ביצועי אתמול'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 flex-1">
                {coachingLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-white/30 border-t-yellow-400 rounded-full"></div>
                  </div>
                ) : coaching?.dailyFocus?.length > 0 ? (
                  coaching.dailyFocus.map((focus, idx) => (
                    <div key={idx} className="group flex items-start gap-3 bg-white/5 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm rounded-xl p-3.5 border border-white/5 hover:border-white/20 cursor-default hover:translate-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
                      <div>
                        <p className="text-sm leading-relaxed font-medium text-indigo-50/90 group-hover:text-white">{focus.text}</p>
                        {focus.why && <p className="text-xs text-indigo-300/60 mt-1">{focus.why}</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-indigo-200/60 py-4 text-sm">אין נתוני אימון כרגע</div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Tips Carousel - Clean Style */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex-1 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-200"></div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-500" />
              {coaching?.goldenTip?.title || 'טיפ זהב'}
            </h3>
            <div className="relative z-10">
              {coachingLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <div className="animate-spin w-4 h-4 border-2 border-slate-200 border-t-amber-500 rounded-full"></div>
                  <span className="text-sm text-slate-400">מעבד טיפים...</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic">
                    "{coaching?.goldenTip?.content || 'לקוחות ששואלים על מחיר בתחילת השיחה הם לרוב בשלים יותר.'}"
                  </p>
                  {coaching?.goldenTip?.example && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/30">
                      <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">💡 דוגמה:</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{coaching.goldenTip.example}</p>
                    </div>
                  )}
                </>
              )}
              <div className="mt-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                  <span className="text-[10px] text-white font-bold">AI</span>
                </div>
                <span className="text-xs text-slate-400">AI Coach Analysis</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 3. Bottom Section: Tasks & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">

        {/* Panel A: Tasks (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-5 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">משימות</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 font-medium rounded-lg"
              onClick={() => onNavigate?.('tasks')}
            >
              הכל ←
            </Button>
          </div>

          {/* Time Filter */}
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-4">
            {(['day', 'week', 'month', 'overdue'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTasksFilter(range)}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all relative ${tasksFilter === range
                  ? range === 'overdue'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-sm'
                    : 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                {range === 'day' ? 'היום' : range === 'week' ? 'השבוע' : range === 'month' ? 'החודש' : 'באיחור'}
                {range === 'overdue' && overdueCount > 0 && (
                  <span className="absolute -top-2 -left-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {overdueCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tasks List */}
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[280px] scrollbar-thin">
            {tasksLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-5 h-5 border-2 border-slate-200 border-t-brand-500 rounded-full"></div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <Check className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">אין משימות {tasksFilter === 'day' ? 'להיום' : tasksFilter === 'week' ? 'לשבוע' : 'לחודש'}</p>
                <p className="text-slate-400 text-xs mt-1">🎉 הכל בסדר!</p>
              </div>
            ) : (
              filteredTasks.map(task => (
                <div
                  key={task.id}
                  className={`
                    group flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer border
                    ${task.completed
                      ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50'
                      : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-slate-100 dark:border-slate-700 hover:border-brand-200 dark:hover:border-brand-800 shadow-sm hover:shadow-md'}
                  `}
                  onClick={() => toggleTask(task.id, task.completed)}
                >
                  {/* Checkbox */}
                  <div className="mt-0.5 flex-shrink-0">
                    <div className={`
                      w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all
                      ${task.completed
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-300 dark:border-slate-600 group-hover:border-brand-500 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20'}
                    `}>
                      {task.completed && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-tight transition-colors ${task.completed
                      ? 'text-slate-400 dark:text-slate-500 line-through'
                      : 'text-slate-800 dark:text-slate-200 group-hover:text-brand-600'
                      }`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md font-medium">
                        {task.leadName}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.dueDate}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Task Button */}
          <Button
            variant="secondary"
            size="sm"
            className="w-full mt-4 border-dashed border-2 text-slate-500 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 py-2.5 font-medium"
            onClick={() => setIsAddTaskModalOpen(true)}
          >
            + הוסף משימה חדשה
          </Button>

          <AddTaskModal
            isOpen={isAddTaskModalOpen}
            onClose={() => setIsAddTaskModalOpen(false)}
            onAdd={addTask}
          />
        </div>

        {/* Panel B: Weekly Performance (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">ביצועים שבועיים</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {weeklyLoading ? 'טוען נתונים...' : `סה"כ ${weeklyData.reduce((a, b) => a + b.calls, 0)} שיחות השבוע`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 bg-brand-500 rounded-full"></span>
                <span className="text-slate-600 dark:text-slate-300">סה"כ שיחות</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                <span className="text-slate-600 dark:text-slate-300">שיחות מוצלחות</span>
              </div>
            </div>
          </div>

          {weeklyLoading ? (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin w-8 h-8 border-3 border-slate-200 border-t-brand-500 rounded-full"></div>
                <span className="text-sm text-slate-400">טוען נתונים...</span>
              </div>
            </div>
          ) : weeklyData.length > 0 ? (
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barGap={8} barCategoryGap="20%">
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <Tooltip
                    cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', radius: 8 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className={`px-4 py-3 rounded-xl shadow-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <p className={`font-bold text-sm mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              יום {data.name}
                            </p>
                            <div className="space-y-1">
                              <p className="text-xs flex items-center gap-2">
                                <span className="w-2 h-2 bg-brand-500 rounded-full"></span>
                                <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>שיחות: {data.calls}</span>
                              </p>
                              <p className="text-xs flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>מוצלחות: {data.successful}</span>
                              </p>
                              {data.calls > 0 && (
                                <p className="text-xs font-medium text-amber-500 mt-1">
                                  {data.rate}% הצלחה
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="calls" radius={[8, 8, 0, 0]} barSize={32} fill={barColors} name="סה״כ שיחות" />
                  <Bar dataKey="successful" radius={[8, 8, 0, 0]} barSize={32} fill={barColorsGreen} name="מוצלחות" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <div className="text-center">
                <Phone className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">אין נתוני שיחות השבוע</p>
              </div>
            </div>
          )}
        </div>

      </div>

      <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />

    </div>
  );
};
