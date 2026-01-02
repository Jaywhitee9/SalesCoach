
import React, { useState, useEffect } from 'react';
import { Lead } from '../../types';
import { 
  X, Phone, MessageCircle, Building2, Edit2, 
  CheckSquare, Clock, Mail, 
  Globe, AlertCircle, TrendingUp,
  Sparkles, Plus, User, Calendar, FileText,
  Filter, ChevronDown, HelpCircle, ArrowUpRight,
  ChevronLeft, ExternalLink, Hash, LayoutDashboard,
  Pencil, Save
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { TEAM_MEMBERS } from '../../constants';

interface LeadDrawerProps {
  lead: Lead | null;
  onClose: () => void;
}

export const LeadDrawer: React.FC<LeadDrawerProps> = ({ lead, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'history' | 'ai'>('overview');
  const [isScoreExpanded, setIsScoreExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditModalOpen) setIsEditModalOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, isEditModalOpen]);

  if (!lead) return null;

  // -- Actions --
  const handleCall = (phone: string) => {
    const normalized = phone.replace(/\D/g, '');
    window.location.href = `tel:${normalized}`;
  };

  const handleWhatsApp = (phone: string) => {
    const normalized = phone.replace(/\D/g, ''); 
    const international = normalized.startsWith('0') ? '972' + normalized.substring(1) : normalized;
    window.open(`https://wa.me/${international}`, '_blank');
  };

  // -- Render Helpers --
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'success';
      case 'Discovery': return 'brand';
      case 'Negotiation': return 'warning';
      case 'Closed': return 'neutral';
      case 'Proposal': return 'brand';
      default: return 'neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'New': return 'ליד חדש';
      case 'Discovery': return 'גילוי צרכים';
      case 'Negotiation': return 'משא ומתן';
      case 'Proposal': return 'הצעת מחיר';
      case 'Closed': return 'סגור';
      default: return status;
    }
  };

  // -- Content Sections --

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Top Section: Key Info & Score Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Lead Score Card (Premium Gradient Style) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all duration-300 relative overflow-hidden flex flex-col justify-between group hover:shadow-md">
           {/* Subtle Background Glow/Gradient */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
           <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl -ml-5 -mb-5 pointer-events-none"></div>

           <div className="relative z-10 flex justify-between items-start mb-2">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">ציון ליד</h3>
              <HelpCircle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
           </div>

           <div className="relative z-10 flex flex-col items-center justify-center py-2 flex-1">
              <span className="text-6xl font-bold text-slate-900 dark:text-white tracking-tighter mb-3 drop-shadow-sm">
                 {lead.score || 0}
              </span>
              
              {/* Premium Gradient Pill */}
              <div className={`px-4 py-1 rounded-full text-[11px] font-bold tracking-wide shadow-sm mb-4 text-white
                 ${(lead.score || 0) > 80 
                   ? 'bg-gradient-to-r from-brand-600 to-brand-500' 
                   : (lead.score || 0) > 50 
                     ? 'bg-gradient-to-r from-amber-500 to-amber-400' 
                     : 'bg-gradient-to-r from-slate-500 to-slate-400'}`
              }>
                 {(lead.score || 0) > 80 ? 'HIGH INTENT' : (lead.score || 0) > 50 ? 'MEDIUM INTENT' : 'LOW INTENT'}
              </div>

              <button 
                 onClick={() => setIsScoreExpanded(!isScoreExpanded)}
                 className="text-xs text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400 font-medium flex items-center gap-1 transition-colors mt-auto"
              >
                 פירוט ציון
                 <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isScoreExpanded ? 'rotate-180' : ''}`} />
              </button>
           </div>

           {/* Expandable Breakdown Panel */}
           <div 
             className={`relative z-10 grid gap-3 transition-all duration-300 ease-out overflow-hidden ${
               isScoreExpanded 
                 ? 'grid-rows-[1fr] opacity-100 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800' 
                 : 'grid-rows-[0fr] opacity-0 h-0 m-0 p-0 border-none'
             }`}
           >
              <div className="min-h-0 space-y-3">
                 {/* Tile 1: Fit */}
                 <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700/50">
                    <div className="flex justify-between items-center mb-1.5">
                       <span className="text-xs font-bold text-slate-700 dark:text-slate-200">התאמה (Fit)</span>
                       <span className="text-xs font-bold text-slate-900 dark:text-white">40/50</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                       <div className="h-full bg-brand-500 w-[80%] rounded-full"></div>
                    </div>
                 </div>

                 {/* Tile 2: Activity */}
                 <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700/50">
                    <div className="flex justify-between items-center mb-1.5">
                       <span className="text-xs font-bold text-slate-700 dark:text-slate-200">פעילות</span>
                       <span className="text-xs font-bold text-slate-900 dark:text-white">30/30</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 w-[100%] rounded-full"></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Right Side: General Details Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col relative group">
           <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-50 dark:border-slate-800/50">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                 <LayoutDashboard className="w-4 h-4 text-brand-500" />
                 פרטים כלליים
              </h3>
              
              {/* Edit Action */}
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 transition-colors px-2 py-1 rounded hover:bg-brand-50 dark:hover:bg-brand-900/20"
              >
                 <Pencil className="w-3 h-3" />
                 עריכה
              </button>
           </div>
           
           <div className="grid grid-cols-2 gap-y-6 gap-x-8">
              <div>
                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">סטטוס</span>
                 <Badge variant={getStatusColor(lead.status) as any} className="text-xs px-3 py-1">{getStatusLabel(lead.status)}</Badge>
              </div>
              <div>
                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">מקור הגעה</span>
                 <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-white font-medium">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    {lead.source}
                 </div>
              </div>
              <div>
                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">נציג מטפל</span>
                 <div className="flex items-center gap-2.5">
                    {lead.owner?.avatar ? (
                      <img src={lead.owner.avatar} className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 object-cover shadow-sm" alt="" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                    )}
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{lead.owner?.name}</span>
                 </div>
              </div>
              <div>
                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">תאריך נוצר</span>
                 <span className="text-sm font-medium text-slate-900 dark:text-white font-mono text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {lead.createdAt || '10/11/2024'}
                 </span>
              </div>
           </div>
        </div>

      </div>

      {/* 2. Contact Details Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
         <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
           <User className="w-4 h-4 text-brand-500" />
           פרטי קשר
         </h3>
         <div className="space-y-1">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">טלפון</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white dir-ltr text-right font-mono">{lead.phone}</p>
                  </div>
               </div>
               <button 
                 onClick={() => handleCall(lead.phone)}
                 className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white dark:hover:bg-slate-700 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
               >
                 <Phone className="w-3.5 h-3.5" />
               </button>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">אימייל</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{lead.email}</p>
                  </div>
               </div>
               <button 
                 onClick={() => window.open(`mailto:${lead.email}`)}
                 className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white dark:hover:bg-slate-700 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
               >
                 <ArrowUpRight className="w-4 h-4" />
               </button>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">אתר</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">www.spectra.com</p>
                  </div>
               </div>
               <button 
                 onClick={() => window.open('https://google.com', '_blank')}
                 className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white dark:hover:bg-slate-700 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
               >
                 <ExternalLink className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>

      {/* 3. Business Info */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
         <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
           <Building2 className="w-4 h-4 text-brand-500" />
           פרטי עסק
         </h3>
         <div className="grid grid-cols-2 gap-6 mb-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
               <p className="text-xs text-slate-500 mb-1">שם החברה</p>
               <p className="text-sm font-bold text-slate-900 dark:text-white">{lead.company}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
               <p className="text-xs text-slate-500 mb-1">ערך עסקה משוער</p>
               <p className="text-xl font-bold text-slate-900 dark:text-white">{lead.value}</p>
            </div>
         </div>
         <div>
            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
               <Hash className="w-3 h-3" /> תגיות ותחום
            </p>
            <div className="flex flex-wrap gap-2">
               {['Software', 'SaaS', 'Enterprise'].map(tag => (
                 <span key={tag} className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-full border border-slate-200 dark:border-slate-700 font-medium">
                   {tag}
                 </span>
               ))}
               {(lead.tags || []).map(tag => (
                 <span key={tag} className="px-2.5 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-xs rounded-full border border-brand-100 dark:border-brand-800">
                   {tag}
                 </span>
               ))}
               <button className="text-xs text-slate-400 hover:text-brand-600 px-2 py-1 rounded-full border border-dashed border-slate-300 hover:border-brand-300 transition-colors flex items-center gap-1">
                  <Plus className="w-3 h-3" /> הוסף
               </button>
            </div>
         </div>
      </div>

    </div>
  );

  const renderActivity = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
       <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">ציר זמן</h3>
          <Button variant="ghost" size="sm" className="text-xs h-8">
             <Filter className="w-3 h-3 ml-1" /> סינון
          </Button>
       </div>

       {/* RTL Timeline */}
       <div className="relative border-r-2 border-slate-100 dark:border-slate-800 mr-2 space-y-8 py-2">
          
          {/* Item 1 */}
          <div className="relative pr-6 group">
             <div className="absolute -right-[7px] top-1.5 w-3 h-3 rounded-full bg-white dark:bg-slate-950 border-2 border-brand-500 group-hover:scale-110 transition-transform"></div>
             <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-start">
                   <span className="text-xs font-bold text-brand-600 dark:text-brand-400">היום, 10:30</span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm group-hover:border-brand-200 dark:group-hover:border-brand-800 transition-colors">
                   <div className="flex items-center gap-2 mb-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm font-bold text-slate-900 dark:text-white">שיחת טלפון יוצאת</span>
                   </div>
                   <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">שיחה חיובית, התעניינו במודול ה-AI.</p>
                   <div className="mt-3 flex gap-2">
                      <Badge variant="neutral" className="text-[10px] flex items-center gap-1 px-2 py-0.5">
                         <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div> הקלטה
                      </Badge>
                   </div>
                </div>
             </div>
          </div>

          {/* Item 2 */}
          <div className="relative pr-6 group">
             <div className="absolute -right-[7px] top-1.5 w-3 h-3 rounded-full bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 group-hover:border-slate-400 transition-colors"></div>
             <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-start">
                   <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">אתמול, 14:15</span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
                   <div className="flex items-center gap-2 mb-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm font-bold text-slate-900 dark:text-white">אימייל נשלח</span>
                   </div>
                   <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">נשלחה הצעת מחיר (Proposal_v1.pdf)</p>
                </div>
             </div>
          </div>

          {/* Item 3 */}
          <div className="relative pr-6 group">
             <div className="absolute -right-[7px] top-1.5 w-3 h-3 rounded-full bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700"></div>
             <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-start">
                   <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">8 נוב, 09:00</span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl">
                   <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-sm font-bold text-slate-900 dark:text-white">ליד נוצר</span>
                   </div>
                   <p className="text-sm text-slate-500 dark:text-slate-400">מקור: קמפיין פייסבוק Q4</p>
                </div>
             </div>
          </div>

       </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4 animate-in fade-in duration-300">
       <div className="flex items-center gap-2 mb-4 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="relative flex-1">
             <select className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2 outline-none text-slate-700 dark:text-slate-200">
                <option>כל הפעולות</option>
                <option>שיחות</option>
                <option>אימיילים</option>
             </select>
          </div>
          <div className="relative flex-1">
             <select className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2 outline-none text-slate-700 dark:text-slate-200">
                <option>כל הזמנים</option>
                <option>השבוע</option>
                <option>החודש</option>
             </select>
          </div>
       </div>

       <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-right text-xs">
             <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                   <th className="px-4 py-3 font-medium">תאריך</th>
                   <th className="px-4 py-3 font-medium">פעולה</th>
                   <th className="px-4 py-3 font-medium">נציג</th>
                   <th className="px-4 py-3 font-medium">הערות</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[1,2,3,4].map((i) => (
                   <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">10/11/24 10:30</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">שיחה יוצאת</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">שרה כהן</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">שיחה חיובית, ביקש הצעה...</td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );

  const renderAI = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
       {/* Analysis Card */}
       <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
             <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
               <Sparkles className="w-4 h-4" />
             </div>
             <h3 className="font-bold text-indigo-900 dark:text-indigo-300 text-sm">ניתוח אוטומטי</h3>
          </div>
          <ul className="space-y-4">
             {[
               { title: 'כאב עיקרי', text: 'חוסר יעילות בתהליך הנוכחי, מחפש אוטומציה' },
               { title: 'רמת עניין', text: 'גבוהה מאוד (High Intent)' },
               { title: 'התנגדות פוטנציאלית', text: 'רגישות למחיר (הזכיר תקציב פעמיים)' }
             ].map((item, i) => (
               <li key={i} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span className="text-indigo-400 font-bold mt-1">•</span>
                  <div>
                     <strong className="block text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase mb-1">{item.title}</strong>
                     {item.text}
                  </div>
               </li>
             ))}
          </ul>
       </div>
       
       {/* Recommendations */}
       <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">המלצות לפעולה</h3>
          <div className="space-y-3">
             {[
               "שלח מחשבון ROI לפני השיחות על מחיר",
               "הדגש את יכולות המובייל בשיחה הבאה",
               "תזמן שיחת סגירה ליום חמישי בבוקר"
             ].map((rec, i) => (
               <label key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
                  <input type="checkbox" className="mt-1 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-slate-800" />
                  <span className="text-sm text-slate-700 dark:text-slate-200 font-medium group-hover:text-brand-800 dark:group-hover:text-brand-300 transition-colors">{rec}</span>
               </label>
             ))}
          </div>
       </div>

       <div className="text-center">
          <p className="text-[10px] text-slate-400 italic">
             הערה למפתחים: לחבר את ה-AI Insights ל-backend לאחר שילוב המודל החדש.
          </p>
       </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Panel - Slide from Right */}
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[480px] lg:w-[540px] bg-white dark:bg-slate-950 shadow-2xl shadow-slate-900/20 transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right flex flex-col h-full border-l border-slate-200 dark:border-slate-800">
        
        {/* Sticky Header Section */}
        <div className="flex-shrink-0 bg-white dark:bg-slate-900 z-20 border-b border-slate-100 dark:border-slate-800 relative">
            
            {/* Top Row: User Info & Close */}
            <div className="px-6 pt-6 pb-4 flex justify-between items-start">
                <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm">
                        {lead.name.charAt(0)}
                    </div>
                    {/* Name & Role */}
                    <div className="mt-1">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-2">{lead.name}</h2>
                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                            <span>מנכ"ל</span>
                            <span className="mx-2 text-slate-300">•</span>
                            <span>{lead.company}</span>
                        </div>
                    </div>
                </div>
                {/* Close Button */}
                <button 
                  onClick={onClose} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Actions Row */}
            <div className="px-6 pb-6 flex gap-3">
                <Button className="flex-1 justify-center py-2.5" onClick={() => handleCall(lead.phone)}>
                    <Phone className="w-4 h-4 ml-2" />
                    התקשר
                </Button>
                <Button variant="secondary" className="flex-1 justify-center py-2.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-900/20" onClick={() => handleWhatsApp(lead.phone)}>
                    <MessageCircle className="w-4 h-4 ml-2" />
                    וואטסאפ
                </Button>
                <Button variant="ghost" className="px-3 border border-slate-200 dark:border-slate-700 text-slate-500">
                    <Edit2 className="w-4 h-4" />
                </Button>
            </div>

            {/* Tabs */}
            <div className="px-6 flex gap-8 overflow-x-auto border-t border-slate-100 dark:border-slate-800 no-scrollbar">
              {[
                { id: 'overview', label: 'סקירה' },
                { id: 'activity', label: 'פעילויות' },
                { id: 'history', label: 'היסטוריה' },
                { id: 'ai', label: 'AI Insights', icon: Sparkles }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5
                    ${activeTab === tab.id 
                      ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400 font-bold' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'}
                  `}
                >
                  {tab.icon && <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'fill-current' : ''}`} />}
                  {tab.label}
                </button>
              ))}
            </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950">
           {activeTab === 'overview' && renderOverview()}
           {activeTab === 'activity' && renderActivity()}
           {activeTab === 'history' && renderHistory()}
           {activeTab === 'ai' && renderAI()}
        </div>

        {/* Edit Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={() => setIsEditModalOpen(false)} />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center">
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">עריכת פרטי ליד</h3>
                 <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
               </div>
               
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">סטטוס</label>
                   <div className="relative">
                     <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-brand-500">
                       <option>ליד חדש</option>
                       <option>גילוי צרכים</option>
                       <option>משא ומתן</option>
                       <option>הצעת מחיר</option>
                       <option>סגור</option>
                     </select>
                     <ChevronDown className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                   </div>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">מקור הגעה</label>
                   <div className="relative">
                     <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-brand-500">
                        <option>Website</option>
                        <option>LinkedIn</option>
                        <option>Referral</option>
                     </select>
                     <ChevronDown className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">נציג מטפל</label>
                   <div className="relative">
                     <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-brand-500">
                        {TEAM_MEMBERS.map(m => (
                          <option key={m.id}>{m.name}</option>
                        ))}
                     </select>
                     <ChevronDown className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                   </div>
                 </div>
               </div>

               <div className="flex justify-end gap-3 pt-2">
                 <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>ביטול</Button>
                 <Button onClick={() => setIsEditModalOpen(false)}>
                   <Save className="w-4 h-4 ml-2" />
                   שמירת שינויים
                 </Button>
               </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};
