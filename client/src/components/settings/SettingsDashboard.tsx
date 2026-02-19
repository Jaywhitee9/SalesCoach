
import React, { useState, useEffect } from 'react';
import {
  User,
  Users,
  UserPlus,
  Phone,
  Plug,
  Bell,
  ShieldCheck,
  CreditCard,
  Palette,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  ChevronLeft,
  Camera,
  Lock,
  Globe,
  Moon,
  Mail,
  Smartphone,
  Plus,
  MoreVertical,
  Copy,
  Edit2,
  Trash2,
  GripVertical,
  Sliders,
  Download,
  LogOut,
  Clock,
  Target,
  Key,
  BookOpen,
  LayoutTemplate,
  X
} from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';
import { PipelineSettings } from './PipelineSettings';
import { CampaignSettings } from './CampaignSettings';
import { SettingsCalls } from './SettingsCalls';
import { WebhookSettings } from './WebhookSettings';
import { KnowledgeBase } from './KnowledgeBase';
import { LeadDistributionSettings } from './LeadDistributionSettings';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { SYSTEM_HEALTH_DATA } from '../../constants';
import { User as UserType, ServiceStatus } from '../../types';

interface SettingsDashboardProps {
  isDarkMode: boolean;
  user: UserType;
  onLogout: () => void;
  toggleTheme: () => void;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  last_sign_in_at?: string;
  avatar_url?: string;
}

// --- SUB-COMPONENTS ---

// 1. Profile & Account
const SettingsProfile = ({ user, isDarkMode, toggleTheme }: { user: UserType; isDarkMode: boolean; toggleTheme: () => void }) => {
  const isRep = user.type === 'rep';
  // Initialize from user preferences or default to true
  const [leadNotif, setLeadNotif] = useState(user.preferences?.leadNotifications ?? true);

  // Helper to save preferences to DB
  const updatePreferences = async (updates: any) => {
    try {
      const currentPrefs = user.preferences || {};
      const newPrefs = { ...currentPrefs, ...updates };

      const { error } = await supabase
        .from('profiles')
        .update({ preferences: newPrefs })
        .eq('id', user.id);

      if (error) throw error;

      // Update local user object reference if possible, or reliance on reload/context update
      // For now, we update the local object to reflect change immediately in UI if needed
      if (user) user.preferences = newPrefs;

    } catch (err) {
      console.error('Failed to update preferences:', err);
    }
  };

  // Wrapper for toggling theme that also saves to DB
  const handleToggleTheme = () => {
    toggleTheme();
    // Save the NEW state (opposite of current isDarkMode)
    updatePreferences({ darkMode: !isDarkMode });
  };

  // Wrapper for toggling notifications
  const handleToggleNotif = () => {
    const newValue = !leadNotif;
    setLeadNotif(newValue);
    updatePreferences({ leadNotifications: newValue });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top: My Profile */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6">הפרופיל שלי</h3>
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer">
              <img src={user.avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 dark:border-slate-800" />
              {!isRep && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</p>
              <p className="text-xs text-slate-500">{user.role}</p>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">שם מלא</label>
              <input
                type="text"
                defaultValue={user.name}
                disabled={isRep}
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none ${!isRep ? 'focus:ring-2 focus:ring-brand-500' : 'opacity-70 cursor-not-allowed'}`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">אימייל</label>
              <input
                type="email"
                defaultValue={user.email || "sara@company.com"}
                disabled={isRep}
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none ${!isRep ? 'focus:ring-2 focus:ring-brand-500' : 'opacity-70 cursor-not-allowed'}`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">טלפון</label>
              <input
                type="tel"
                defaultValue="050-1234567"
                disabled={isRep}
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none ${!isRep ? 'focus:ring-2 focus:ring-brand-500' : 'opacity-70 cursor-not-allowed'}`}
              />
            </div>
            {!isRep && (
              <div className="md:col-span-2 flex justify-end mt-2">
                <Button>עדכון פרטים</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Login & Security (HIDDEN FOR REP) */}
      {!isRep && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6">כניסה ואבטחה אישית</h3>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Lock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">סיסמה ואבטחה</p>
                <p className="text-xs text-slate-500">עודכן לאחרונה לפני 3 חודשים</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                <Button variant="secondary">שינוי סיסמה</Button>
              </div>
            </div>
          </div>
          <div className="h-px bg-slate-100 dark:bg-slate-800 my-6"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">אימות דו-שלבי (2FA)</p>
              <p className="text-xs text-slate-500">שכבת הגנה נוספת לחשבון שלך</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="success">מופעל</Badge>
              <div className="w-10 h-5 bg-brand-600 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
          </div>
          <div className="mt-6 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-xs text-slate-500 flex justify-between">
            <span>כניסה אחרונה: היום, 09:30</span>
            <span>IP: 213.57.120.44 (Tel Aviv)</span>
          </div>
        </div>
      )}

      {/* Bottom: Preferences */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6">העדפות אישיות</h3>

        {/* Language/Timezone - HIDDEN FOR REP */}
        {!isRep && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> שפת ממשק
              </label>
              <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none">
                <option>עברית (Hebrew)</option>
                <option>English</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> אזור זמן (Timezone)
              </label>
              <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none">
                <option>Jerusalem (GMT+2)</option>
                <option>London (GMT+0)</option>
                <option>New York (GMT-5)</option>
              </select>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between py-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">מצב לילה כברירת מחדל</span>
            </div>
            <div
              onClick={handleToggleTheme}
              className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${isDarkMode ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${isDarkMode ? 'right-1' : 'left-1'}`}></div>
            </div>
          </div>

          {/* Lead Notification Toggle */}
          <div className="flex items-center justify-between py-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">התראה על ליד חדש שהוקצה אליי</span>
            </div>
            <div
              onClick={handleToggleNotif}
              className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${leadNotif ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${leadNotif ? 'right-1' : 'left-1'}`}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- PHONE MANAGEMENT MODAL ---
const UserPhoneModal = ({ userId, userName, onClose }: { userId: string, userName: string, onClose: () => void }) => {
  const [config, setConfig] = useState({ numbers: [], active_index: 0, auto_rotate: true });
  const [loading, setLoading] = useState(true);
  const [newNumber, setNewNumber] = useState('');

  // Fetch Config
  useEffect(() => {
    const fetchConfig = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const res = await fetch(`/api/users/phone-config?userId=${userId}&organizationId=current`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        const data = await res.json();
        if (data.success && data.config) {
          setConfig(data.config);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [userId]);

  const handleSave = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch('/api/users/phone-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId, organizationId: 'current', config })
      });
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const addNumber = () => {
    if (!newNumber) return;
    const updated = { ...config, numbers: [...(config.numbers || []), { number: newNumber, label: 'Secondary', consecutive_failures: 0 }] };
    setConfig(updated);
    setNewNumber('');
  };

  const removeNumber = (idx: number) => {
    const updated = { ...config, numbers: config.numbers.filter((_, i) => i !== idx) };
    setConfig(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">ניהול מספרים - {userName}</h3>
        <p className="text-sm text-slate-500 mb-6">הגדר מספרים חלופיים וניהול ספאם.</p>

        {loading ? (
          <div className="py-8 text-center text-slate-500">טוען נתונים...</div>
        ) : (
          <div className="space-y-6">

            {/* Auto Rotate Toggle */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.auto_rotate ? 'bg-brand-100 text-brand-600' : 'bg-slate-200 text-slate-500'}`}>
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Anti-Spam Protection</p>
                  <p className="text-xs text-slate-500">החלף מספר אוטומטית אם מזוהה כספאם</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={config.auto_rotate} onChange={e => setConfig({ ...config, auto_rotate: e.target.checked })} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {/* Numbers List */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase">מספרים משויכים</label>

              {(!config.numbers || config.numbers.length === 0) && (
                <p className="text-sm text-slate-400 italic">לא הוגדרו מספרים פרטיים (משתמש במספר הארגון)</p>
              )}

              {config.numbers?.map((n: any, idx: number) => (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${idx === config.active_index ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-800'}`}>
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-bold w-6 h-6 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-mono font-medium text-slate-900 dark:text-white">{n.number}</p>
                      {n.consecutive_failures > 0 && <span className="text-[10px] text-rose-500">({n.consecutive_failures} כישלונות)</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setConfig({ ...config, active_index: idx })} title="קבע כפעיל" className={`p-1.5 rounded hover:bg-white dark:hover:bg-slate-800 ${idx === config.active_index ? 'text-brand-600' : 'text-slate-400 hover:text-brand-600'}`}>
                      <User className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeNumber(idx)} className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add New */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="+972..."
                  value={newNumber}
                  onChange={e => setNewNumber(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                />
                <Button onClick={addNumber} disabled={!newNumber} variant="secondary" size="sm">הוסף</Button>
              </div>
            </div>

          </div>
        )}

        <div className="flex justify-end gap-3 mt-8">
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button onClick={handleSave} disabled={loading}>שמור שינויים</Button>
        </div>
      </div>
    </div>
  );
}

// 2. Team & Roles
const SettingsTeam = ({ members }: { members: TeamMember[] }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [editingPhoneUser, setEditingPhoneUser] = useState<{ id: string, name: string } | null>(null);

  // Use real members if available, otherwise mock
  const displayMembers = members.length > 0 ? members : [
    { id: '1', name: 'שרה כהן', email: 'sara@company.com', role: 'rep', team: 'צוות אלפא', status: 'active', lastLogin: 'לפני שעה' },
    { id: '2', name: 'דוד לוי', email: 'david@company.com', role: 'manager', team: 'הנהלה', status: 'active', lastLogin: 'אתמול' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{members.length || 12}</p>
            <p className="text-xs text-slate-500">משתמשים פעילים</p>
          </div>
          <Users className="w-8 h-8 text-brand-100 dark:text-brand-900/50" />
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">3</p>
            <p className="text-xs text-slate-500">הזמנות פתוחות</p>
          </div>
          <Mail className="w-8 h-8 text-amber-100 dark:text-amber-900/50" />
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">4</p>
            <p className="text-xs text-slate-500">צוותים</p>
          </div>
          <Users className="w-8 h-8 text-blue-100 dark:text-blue-900/50" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'users' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          משתמשים
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'roles' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          תפקידים והרשאות
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div className="relative">
              <input type="text" placeholder="חיפוש משתמש..." className="pl-4 pr-9 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border-none rounded-lg w-64 outline-none focus:ring-1 focus:ring-brand-500" />
              <Users className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
            <Button size="sm">
              <Plus className="w-4 h-4 ml-1.5" />
              הזמן משתמש חדש
            </Button>
          </div>
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">שם</th>
                <th className="px-6 py-3 font-medium">אימייל</th>
                <th className="px-6 py-3 font-medium">תפקיד</th>
                <th className="px-6 py-3 font-medium">צוות</th>
                <th className="px-6 py-3 font-medium">סטטוס</th>
                <th className="px-6 py-3 font-medium">כניסה אחרונה</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayMembers.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group">
                  <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{u.name}</td>
                  <td className="px-6 py-3 text-slate-500">{u.email}</td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500">{u.team}</td>
                  <td className="px-6 py-3">
                    <Badge variant={u.status === 'active' ? 'success' : 'warning'}>
                      {u.status === 'active' || !u.status ? 'פעיל' : 'ממתין'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-slate-500 font-mono text-xs">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('he-IL') : (u.lastLogin || '-')}</td>
                  <td className="px-6 py-3 text-left">
                    <button className="text-slate-400 hover:text-brand-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingPhoneUser({ id: u.id, name: u.name }); }}
                      title="ניהול מספרים"
                      className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors opacity-0 group-hover:opacity-100 mx-1">
                      <Phone className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['מנהל מערכת (Admin)', 'מנהל מכירות (Manager)', 'נציג מכירות (Rep)'].map((role, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-brand-300 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg text-brand-600 dark:text-brand-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex gap-2">
                  <button title="שכפול" className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600"><Copy className="w-4 h-4" /></button>
                  <button title="עריכה" className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600"><Edit2 className="w-4 h-4" /></button>
                </div>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-1">{role}</h4>
              <p className="text-xs text-slate-500 mb-4 h-8">
                {i === 0 ? 'גישה מלאה לכל הגדרות המערכת והנתונים.' : 'גישה מוגבלת לנתונים אישיים ופעולות מכירה בסיסיות.'}
              </p>
              <div className="flex gap-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>גישה ל-CRM</span>
                <span className="text-slate-300">|</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>שיחות</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingPhoneUser && (
        <UserPhoneModal
          userId={editingPhoneUser.id}
          userName={editingPhoneUser.name}
          onClose={() => setEditingPhoneUser(null)}
        />
      )}
    </div>
  );
};



// 4. Integrations
const SettingsIntegrations = () => {
  const categories = [
    { title: 'טלפוניה', items: [{ name: 'Twilio Voice', status: 'connected', type: 'Voice Provider' }] },
    { title: 'תמלול וקול', items: [{ name: 'Soniox AI', status: 'connected', type: 'Transcription Engine' }] },
    { title: 'CRM & Webhooks', items: [{ name: 'Salesforce', status: 'disconnected', type: 'CRM Sync' }, { name: 'HubSpot', status: 'connected', type: 'CRM Sync' }] },
    { title: 'תקשורת', items: [{ name: 'Slack', status: 'connected', type: 'Notifications' }, { name: 'Zoom', status: 'disconnected', type: 'Video' }] }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-lg border border-emerald-100 dark:border-emerald-900/20 text-sm font-medium w-fit">
        <CheckCircle2 className="w-4 h-4" />
        מחובר ל-4 אינטגרציות פעילות
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {categories.map((cat, idx) => (
          <div key={idx}>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">{cat.title}</h3>
            <div className="space-y-4">
              {cat.items.map((item, itemIdx) => (
                <div key={itemIdx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${item.status === 'connected' ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      <Plug className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${item.status === 'connected' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                        <span className="text-xs text-slate-500">{item.status === 'connected' ? 'מחובר' : 'לא מחובר'}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant={item.status === 'connected' ? 'secondary' : 'primary'} size="sm">
                    {item.status === 'connected' ? 'הגדרות' : 'חבר'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 5. Notifications
const SettingsNotifications = () => (
  <div className="space-y-6 animate-in fade-in duration-300">
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6">ערוצי התראה</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Bell, title: 'התראות במערכת', desc: 'Push notifications בדפדפן', active: true },
          { icon: Mail, title: 'התראות במייל', desc: 'סיכום יומי והתראות דחופות', active: true },
          { icon: Smartphone, title: 'התראות SMS', desc: 'בקרוב', active: false, disabled: true }
        ].map((channel, i) => (
          <div key={i} className={`border rounded-lg p-4 flex items-start justify-between ${channel.active ? 'border-brand-200 bg-brand-50/50 dark:bg-brand-900/10 dark:border-brand-800' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 opacity-70'}`}>
            <div className="flex gap-3">
              <channel.icon className={`w-5 h-5 ${channel.active ? 'text-brand-600' : 'text-slate-400'}`} />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{channel.title}</p>
                <p className="text-xs text-slate-500">{channel.desc}</p>
              </div>
            </div>
            {!channel.disabled && (
              <div className={`w-9 h-5 rounded-full relative cursor-pointer ${channel.active ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${channel.active ? 'right-1' : 'left-1'}`}></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6">כללי התראה</h3>

      <div className="space-y-6">
        {/* Leads Group */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">לידים</h4>
          <div className="space-y-2">
            {['ליד חדש נכנס למערכת', 'ליד חם (Score > 80) שסומן ע"י AI', 'ליד לא טופל מעל 4 שעות'].map((rule, i) => (
              <label key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                <span className="text-sm text-slate-700 dark:text-slate-200">{rule}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Calls Group */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">שיחות ואיכות</h4>
          <div className="space-y-2">
            {['שיחה הסתיימה עם ציון איכות נמוך מ-60', 'זוהתה התנגדות מחיר שלא טופלה', 'נציג לא ביצע שיחות מעל שעה'].map((rule, i) => (
              <label key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors">
                <input type="checkbox" defaultChecked={i === 0} className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                <span className="text-sm text-slate-700 dark:text-slate-200">{rule}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button>שמור הגדרות התראות</Button>
      </div>
    </div>
  </div>
);

// 6. Security & Data
const SettingsSecurity = () => (
  <div className="space-y-6 animate-in fade-in duration-300">
    {/* Access Control */}
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-emerald-500" /> אבטחת גישה
      </h3>

      <div className="space-y-5">
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-sm font-medium text-slate-900 dark:text-white block">אכיפת אימות דו-שלבי (2FA)</span>
            <span className="text-xs text-slate-500">חייב את כל המנהלים להתחבר עם גורם אימות נוסף</span>
          </div>
          <div className="w-10 h-5 bg-brand-600 rounded-full relative cursor-pointer">
            <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">מדיניות סיסמאות</label>
            <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none">
              <option>רגילה (מינימום 8 תווים)</option>
              <option>בינונית (אותיות ומספרים)</option>
              <option>מחמירה (כולל סימנים מיוחדים)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">ניתוק אוטומטי (Session Timeout)</label>
            <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none">
              <option>30 דקות</option>
              <option>60 דקות</option>
              <option>4 שעות</option>
            </select>
          </div>
        </div>

        <div className="pt-2">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 block">IP Allowlist (רשימת היתרים)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1">
              213.57.120.* <button><XCircle className="w-3 h-3 text-slate-400 hover:text-rose-500" /></button>
            </span>
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1">
              84.110.20.* <button><XCircle className="w-3 h-3 text-slate-400 hover:text-rose-500" /></button>
            </span>
          </div>
          <Button size="sm" variant="secondary" className="text-xs h-7 border-dashed">
            + הוסף כתובת IP
          </Button>
        </div>
      </div>
    </div>

    {/* Data Retention */}
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6">מדיניות שמירת נתונים</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">הקלטות שיחה</label>
          <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none">
            <option>שמור למשך 6 חודשים</option>
            <option>שמור למשך 12 חודשים</option>
            <option>שמור לנצח</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">תמלילי שיחה (Transcripts)</label>
          <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none">
            <option>שמור למשך 24 חודשים</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">לידים ונתוני CRM</label>
          <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none">
            <option>שמור לנצח</option>
          </select>
        </div>
      </div>
      <p className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
        <AlertTriangle className="w-3.5 h-3.5" />
        שים לב: מחיקת נתונים מתבצעת אוטומטית בסוף התקופה ולא ניתן לשחזרה.
      </p>
    </div>

    {/* Danger Zone */}
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-rose-100 dark:border-rose-900/30 p-6 shadow-sm">
      <h3 className="text-base font-bold text-rose-600 dark:text-rose-400 mb-4">אזור סכנה</h3>
      <div className="flex gap-4">
        <Button variant="secondary" className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-900/20">
          <Download className="w-4 h-4 ml-2" />
          ייצוא כל הנתונים (CSV)
        </Button>
        <Button variant="danger" className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white dark:bg-slate-900 dark:border-rose-900">
          <Trash2 className="w-4 h-4 ml-2" />
          מחיקת סביבת עבודה
        </Button>
      </div>
    </div>
  </div>
);

// 7. Billing
const SettingsBilling = ({ usage }: { usage: { users: number, minutes: number } }) => (
  <div className="space-y-6 animate-in fade-in duration-300">
    {/* Current Plan */}
    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-2xl font-bold">תוכנית Pro Team</h3>
            <span className="px-2 py-0.5 rounded-full bg-indigo-400/30 border border-indigo-300/30 text-xs font-medium">שנתי</span>
          </div>
          <p className="text-indigo-100 text-sm mb-6">התוכנית המתקדמת לצוותים בצמיחה.</p>

          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors">
              שדרג ל-Enterprise
            </button>
            <button className="px-4 py-2 bg-indigo-700/50 border border-indigo-400/30 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              ביטול מנוי
            </button>
          </div>
        </div>
        <div className="text-left bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/10 min-w-[200px]">
          <p className="text-xs text-indigo-200 uppercase tracking-wider mb-1">תשלום הבא</p>
          <p className="text-xl font-bold mb-4">₪1,200</p>
          <p className="text-xs text-indigo-200 uppercase tracking-wider mb-1">תאריך חידוש</p>
          <p className="text-sm font-medium">10 נובמבר, 2025</p>
        </div>
      </div>
    </div>

    {/* Usage Stats */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <p className="text-xs text-slate-500 mb-1">משתמשים (Seats)</p>
        <div className="flex justify-between items-end mb-2">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">{usage.users}</span>
          <span className="text-xs font-medium text-slate-400">מתוך 20</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 w-[60%]"></div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <p className="text-xs text-slate-500 mb-1">דקות שיחה ואימון</p>
        <div className="flex justify-between items-end mb-2">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">{Math.round(usage.minutes)}</span>
          <span className="text-xs font-medium text-slate-400">מתוך 2,000</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 w-[42%]"></div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <p className="text-xs text-slate-500 mb-1">אמצעי תשלום</p>
        <div className="flex items-center gap-3 mt-1">
          <div className="w-10 h-6 bg-slate-800 rounded text-white text-[8px] flex items-center justify-center tracking-widest">
            VISA
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">**** 4242</span>
        </div>
        <button className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline mt-2">
          עדכן אמצעי תשלום
        </button>
      </div>
    </div>

    {/* Invoices */}
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm">היסטוריית חשבוניות</h3>
        <button className="text-xs text-brand-600 dark:text-brand-400 hover:underline">צפה בהכל</button>
      </div>
      <table className="w-full text-right text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500">
          <tr>
            <th className="px-6 py-3 font-medium">תאריך</th>
            <th className="px-6 py-3 font-medium">תקופה</th>
            <th className="px-6 py-3 font-medium">סכום</th>
            <th className="px-6 py-3 font-medium">סטטוס</th>
            <th className="px-6 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {[
            { date: '10/11/2024', period: 'Nov 2024', amount: '₪1,200', status: 'paid' },
            { date: '10/10/2024', period: 'Oct 2024', amount: '₪1,200', status: 'paid' },
            { date: '10/09/2024', period: 'Sep 2024', amount: '₪1,200', status: 'paid' },
          ].map((inv, i) => (
            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
              <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{inv.date}</td>
              <td className="px-6 py-3 text-slate-500">{inv.period}</td>
              <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{inv.amount}</td>
              <td className="px-6 py-3">
                <Badge variant="success" className="text-[10px] uppercase">שולם</Badge>
              </td>
              <td className="px-6 py-3 text-left">
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 text-xs">
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// 8. Overview (Modified)
const SettingsOverview = ({ setCategory, stats }: {
  setCategory: (id: string) => void,
  stats: {
    users: number,
    activeIntegrations: number,
    leads: number,
    campaigns: number,
    knowledge: number
  }
}) => {
  // Initialize with MOCK data so it is never empty on load
  const [healthData, setHealthData] = useState<ServiceStatus[]>(SYSTEM_HEALTH_DATA);
  const [loadingHealth, setLoadingHealth] = useState(false); // No loading state needed since we have mocks

  React.useEffect(() => {
    // Attempt to fetch real data
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/system/health');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.health) && data.health.length > 0) {
            setHealthData(data.health); // Overwrite with real data if available
          }
        }
      } catch (err) {
        console.warn('System Health Check Failed - Using cached data:', err);
      }
    };

    fetchHealth();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* System Health Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">סטטוס מערכת</h3>
          </div>
          <a href="#" className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline flex items-center">
            צפה בהיסטוריה <ChevronLeft className="w-3 h-3 ml-1" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {healthData.map((service) => (
            <div key={service.id} className="flex flex-col gap-2 p-3 rounded-lg border border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate pr-2">{service.name}</span>
                {service.status === 'operational' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {service.status === 'degraded' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                {service.status === 'down' && <XCircle className="w-4 h-4 text-rose-500" />}
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider
                     ${service.status === 'operational' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
                     ${service.status === 'degraded' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                     ${service.status === 'down' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : ''}
                   `}>
                  {service.status === 'operational' ? 'תקין' : service.status === 'degraded' ? 'איטי' : 'מושבת'}
                </span>
                <span className="text-[10px] text-slate-400 tabular-nums">
                  {service.latency}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        <div onClick={() => setCategory('profile')} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-all cursor-pointer group hover:border-brand-200 dark:hover:border-brand-800">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform duration-300">
            <Palette className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">פרופיל וחשבון</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed h-10">
            ניהול פרטים אישיים, סיסמה, העדפות שפה וממשק.
          </p>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center">ערוך פרופיל <ChevronLeft className="w-3 h-3 mr-1" /></span>
        </div>

        <div onClick={() => setCategory('team')} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-all cursor-pointer group hover:border-brand-200 dark:hover:border-brand-800">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-300">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">צוות ותפקידים</h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{stats.users} פעילים</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed h-10">
            הוסף משתמשים, נהל הרשאות וצור צוותי מכירות חדשים.
          </p>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center">נהל צוות <ChevronLeft className="w-3 h-3 mr-1" /></span>
        </div>

        <div onClick={() => setCategory('calls')} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-all cursor-pointer group hover:border-brand-200 dark:hover:border-brand-800">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform duration-300">
            <Phone className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">שיחות ואימון</h3>
          <div className="flex gap-2 mb-6 h-10 items-start">
            <Badge variant="success" className="text-[10px]">תמלול פעיל</Badge>
            <Badge variant="brand" className="text-[10px]">AI Coach פעיל</Badge>
          </div>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center">הגדרות שיחה <ChevronLeft className="w-3 h-3 mr-1" /></span>
        </div>

        <div onClick={() => setCategory('pipeline')} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-all cursor-pointer group hover:border-brand-200 dark:hover:border-brand-800">
          <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-4 group-hover:scale-110 transition-transform duration-300">
            <LayoutTemplate className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">תהליך מכירה</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed h-10">
            התאמת שלבי המכירה, סטטוסים וצבעים בלוח הלידים.
          </p>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center">ערוך סטטוסים <ChevronLeft className="w-3 h-3 mr-1" /></span>
        </div>

        <div onClick={() => setCategory('knowledge')} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-all cursor-pointer group hover:border-brand-200 dark:hover:border-brand-800">
          <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4 group-hover:scale-110 transition-transform duration-300">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">בסיס ידע</h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{stats.knowledge} פריטים</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed h-10">
            נהל את המידע העסקי, התחבר למסמכים וצור מאגר ידע חכם.
          </p>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center">נהל ידע <ChevronLeft className="w-3 h-3 mr-1" /></span>
        </div>

        <div onClick={() => setCategory('campaigns')} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-all cursor-pointer group hover:border-brand-200 dark:hover:border-brand-800">
          <div className="w-10 h-10 rounded-lg bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center text-pink-600 dark:text-pink-400 mb-4 group-hover:scale-110 transition-transform duration-300">
            <Target className="w-5 h-5" />
          </div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">קמפיינים</h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{stats.campaigns} פעילים</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed h-10">
            צור מקורות לידים, הגדר דפי נחיתה ונהל קמפיינים שונים.
          </p>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center">נהל קמפיינים <ChevronLeft className="w-3 h-3 mr-1" /></span>
        </div>

        <div onClick={() => setCategory('integrations')} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-all cursor-pointer group hover:border-brand-200 dark:hover:border-brand-800">
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 group-hover:scale-110 transition-transform duration-300">
            <Plug className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">אינטגרציות</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed h-10">
            {stats.activeIntegrations} אינטגרציות מחוברות. נהל מפתחות API ו-Webhooks.
          </p>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center">נהל חיבורים <ChevronLeft className="w-3 h-3 mr-1" /></span>
        </div>

        <div onClick={() => setCategory('notifications')} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-all cursor-pointer group hover:border-brand-200 dark:hover:border-brand-800">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 group-hover:scale-110 transition-transform duration-300">
            <Bell className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">התראות</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed h-10">
            קבע אלו התראות ישלחו במייל, בדפדפן או לנייד.
          </p>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center">ערוך חוקים <ChevronLeft className="w-3 h-3 mr-1" /></span>
        </div>

        <div onClick={() => setCategory('security')} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-all cursor-pointer group hover:border-brand-200 dark:hover:border-brand-800">
          <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4 group-hover:scale-110 transition-transform duration-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">אבטחה ומידע</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed h-10">
            ניהול אימות דו-שלבי (2FA), מדיניות סיסמאות ויומני ביקורת.
          </p>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center">הגדרות אבטחה <ChevronLeft className="w-3 h-3 mr-1" /></span>
        </div>

        <div onClick={() => setCategory('billing')} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-all cursor-pointer group hover:border-brand-200 dark:hover:border-brand-800">
          <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-4 group-hover:scale-110 transition-transform duration-300">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">תשלומים ומנוי</h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{stats.leads} לידים</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed h-10">
            צפייה בחשבוניות, ניהול מנוי ועדכון אמצעי תשלום.
          </p>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center">ניהול מנוי <ChevronLeft className="w-3 h-3 mr-1" /></span>
        </div>

      </div>
    </div>
  );
}

// --- MAIN DASHBOARD COMPONENT ---

export const SettingsDashboard: React.FC<SettingsDashboardProps> = ({ isDarkMode, user, onLogout, toggleTheme }) => {
  // Define all categories
  const allCategories = [
    { id: 'overview', label: 'סקירת מערכת', icon: Activity },
    { id: 'profile', label: 'פרופיל וחשבון', icon: User },
    { id: 'team', label: 'צוות ותפקידים', icon: Users },
    { id: 'distribution', label: 'חלוקת לידים', icon: UserPlus },
    { id: 'calls', label: 'שיחות ואימון', icon: Phone },
    { id: 'pipeline', label: 'תהליך מכירה', icon: LayoutTemplate },
    { id: 'campaigns', label: 'קמפיינים', icon: Target },
    { id: 'knowledge', label: 'בסיס ידע', icon: BookOpen },
    { id: 'webhooks', label: 'Webhooks', icon: Key },
    { id: 'integrations', label: 'אינטגרציות', icon: Plug },
    { id: 'notifications', label: 'התראות', icon: Bell },
    { id: 'security', label: 'אבטחה ונתונים', icon: ShieldCheck },
    { id: 'billing', label: 'תשלומים', icon: CreditCard },
  ];

  // Filter categories for 'rep' user type
  const categories = user.type === 'rep'
    ? allCategories.filter(cat => cat.id === 'profile')
    : allCategories;

  // Set default active category
  // If user is rep, default to 'profile', otherwise 'overview'
  const [activeCategory, setActiveCategory] = useState(user.type === 'rep' ? 'profile' : 'overview');

  // Map category IDs to components and header info
  const renderContent = () => {
    switch (activeCategory) {
      case 'overview': return <SettingsOverview setCategory={setActiveCategory} stats={stats} />;
      case 'profile': return <SettingsProfile user={user} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />;
      case 'team': return <SettingsTeam members={teamMembers} />;
      case 'distribution': return <LeadDistributionSettings orgId={user.organization_id} />;
      case 'calls': return <SettingsCalls user={user} />;
      case 'pipeline': return <PipelineSettings orgId={user.organization_id} />;
      case 'campaigns': return <CampaignSettings />;
      case 'knowledge': return <KnowledgeBase user={user} />;
      case 'webhooks': return <WebhookSettings />;
      case 'integrations': return <SettingsIntegrations />;
      case 'notifications': return <SettingsNotifications />;
      case 'security': return <SettingsSecurity />;
      case 'billing': return <SettingsBilling usage={{ users: stats.users, minutes: callMinutes }} />;
      default: return <SettingsOverview setCategory={setActiveCategory} stats={stats} />;
    }
  };

  const getHeaderInfo = () => {
    switch (activeCategory) {
      case 'overview': return { title: 'סקירת מערכת', desc: 'נהל את סביבת העבודה, הצוות, השיחות והאינטגרציות במקום אחד.' };
      case 'profile': return { title: 'פרופיל וחשבון', desc: 'נהל את הפרטים האישיים, הגדרות האבטחה וההעדפות שלך.' };
      case 'team': return { title: 'צוות ותפקידים', desc: 'נהל את המשתמשים, הצוותים והרשאות הגישה במערכת.' };
      case 'distribution': return { title: 'חלוקת לידים', desc: 'קבע כיצד לידים חדשים יתחלקו - חלוקה אוטומטית או הקצאה ידנית.' };
      case 'calls': return { title: 'שיחות ואימון', desc: 'הגדר כיצד המערכת מתמללת, מנתחת ומאמנת את הנציגים בזמן אמת.' };
      case 'pipeline': return { title: 'תהליך מכירה', desc: 'הגדר את שלבי ה-Pipeline, סטטוסים וצבעים לניהול לידים.' };
      case 'campaigns': return { title: 'קמפיינים', desc: 'נהל קמפיינים וסנן לידים לפי מקור (דף נחיתה, גוגל, ועוד).' };
      case 'knowledge': return { title: 'בסיס ידע', desc: 'הגדר מידע ייחודי לעסק שלך - המאמן ישתמש בזה לאימון חכם ומותאם אישית.' };
      case 'webhooks': return { title: 'Webhooks & API', desc: 'קבל לידים מפייסבוק, דפי נחיתה, גוגל ומקורות חיצוניים.' };
      case 'integrations': return { title: 'אינטגרציות', desc: 'חבר את המערכת לכלים החיצוניים שלך (CRM, טלפוניה ועוד).' };
      case 'notifications': return { title: 'התראות', desc: 'בחר על מה לקבל עדכונים ובאילו ערוצים.' };
      case 'security': return { title: 'אבטחה ונתונים', desc: 'נהל את מדיניות האבטחה, שמירת הנתונים ופרטיות המידע.' };
      case 'billing': return { title: 'תשלומים', desc: 'צפה בתוכנית המנוי, חשבוניות ועדכן אמצעי תשלום.' };
      default: return { title: 'הגדרות', desc: '' };
    }
  };

  const headerInfo = getHeaderInfo();

  // Fetch Real Data
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [callMinutes, setCallMinutes] = useState(0);
  const [leadCount, setLeadCount] = useState(0);
  const [campaignCount, setCampaignCount] = useState(0);
  const [knowledgeCount, setKnowledgeCount] = useState(0);

  React.useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url');

      if (profiles) {
        setTeamMembers(profiles.map(p => ({
          id: p.id,
          name: p.full_name || 'User',
          email: p.email || '',
          role: p.role || 'rep',
          avatar_url: p.avatar_url
        })));
      }

      // 2. Fetch Call Stats
      if (user.role === 'manager') {
        const { data: calls } = await supabase
          .from('calls')
          .select('duration');

        if (calls) {
          const totalSeconds = calls.reduce((acc, call) => acc + (call.duration || 0), 0);
          setCallMinutes(totalSeconds / 60);
        }

        // 3. Fetch Lead Count
        const { count: leads } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true });
        setLeadCount(leads || 0);

        // 4. Fetch Campaign Count
        const { count: campaigns } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true });
        setCampaignCount(campaigns || 0);

        // 5. Fetch Knowledge Base Count
        const { count: knowledge } = await supabase
          .from('organization_knowledge')
          .select('*', { count: 'exact', head: true });
        setKnowledgeCount(knowledge || 0);
      } else {
        // For reps, just fetch their own leads
        const { count: leads } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true });
        setLeadCount(leads || 0);
      }
    };

    fetchData();
  }, [user.role]);

  const stats = {
    users: teamMembers.length || 1,
    activeIntegrations: 4, // Still mocked for now
    leads: leadCount,
    campaigns: campaignCount,
    knowledge: knowledgeCount
  };

  return (
    <div className="flex flex-1 h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">

      {/* 1. Left Settings Sidebar (RTL: Visual Right) */}
      <div className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 hidden lg:flex flex-col">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">הגדרות מערכת</h2>
          <p className="text-xs text-slate-500 mt-1">ניהול סביבת העבודה</p>
        </div>

        <div className="p-3 space-y-1 flex-1 overflow-y-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${activeCategory === cat.id
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}
              `}
            >
              <cat.icon className={`w-4 h-4 ${activeCategory === cat.id ? 'text-brand-600' : 'opacity-70'}`} />
              {cat.label}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />
            התנתק
          </button>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-in fade-in duration-300">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{headerInfo.title}</h1>

            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{headerInfo.desc}</p>
          </div>
        </div>

        {/* Content Render */}
        {renderContent()}

      </div>
    </div>
  );
};
