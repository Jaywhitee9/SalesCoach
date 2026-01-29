
import React from 'react';
import { Lead } from '../../types';
import { Badge } from '../Common/Badge';
import {
  MoreVertical,
  Building2,
  ArrowLeftCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { SortConfig } from './LeadsDashboard';

interface Status {
  id: string;
  label: string;
  color: string;
}

interface LeadsTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  onUpdateLead?: (id: string, updates: Partial<Lead>) => void;
  onDeleteLead?: (id: string) => void;
  statuses?: Status[];
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  onSelectLead,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  sortConfig,
  onSort,
  onUpdateLead,
  onDeleteLead,
  statuses = []
}) => {
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);
  const allSelected = leads.length > 0 && selectedIds.length === leads.length;

  // Click outside to close menu
  React.useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null);
    if (menuOpenId) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [menuOpenId]);

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'Website': return 'אתר אינטרנט';
      case 'LinkedIn': return 'לינקדאין';
      case 'Facebook Ads': return 'פייסבוק';
      case 'Referral': return 'הפניה';
      case 'Webinar': return 'וובינר';
      default: return source;
    }
  };

  const SortIndicator = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <div className="w-3 h-3"></div>; // Spacer
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-3 h-3 text-brand-600" />
      : <ArrowDown className="w-3 h-3 text-brand-600" />;
  };

  const formatActivityTime = (timeStr?: string) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    if (!isNaN(date.getTime()) && (timeStr.includes('T') || timeStr.includes('-'))) {
      return new Intl.DateTimeFormat('he-IL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
    }
    return timeStr;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden"
      style={{ minHeight: '400px' }}
    >
      <div className="overflow-visible">
        <table className="w-full text-right border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 font-semibold uppercase border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
              </th>

              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center gap-1.5">
                  שם ליד
                  <SortIndicator columnKey="name" />
                </div>
              </th>

              <th className="px-6 py-4">חברה</th>

              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                onClick={() => onSort('status')}
              >
                <div className="flex items-center gap-1.5">
                  סטטוס
                  <SortIndicator columnKey="status" />
                </div>
              </th>

              <th className="px-6 py-4">בעלים</th>
              <th className="px-6 py-4">מקור</th>
              <th className="px-6 py-4">ציון</th>

              <th
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                onClick={() => onSort('lastActivity')}
              >
                <div className="flex items-center gap-1.5">
                  פעילות אחרונה
                  <SortIndicator columnKey="lastActivity" />
                </div>
              </th>

              <th className="px-6 py-4">הצעד הבא</th>
              <th className="px-4 py-4 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {leads.map((lead) => {
              const statusConfig = statuses.find(s => s.id === lead.status);

              return (
                <tr
                  key={lead.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('input[type="checkbox"]') || (e.target as HTMLElement).closest('button')) return;
                    onSelectLead(lead);
                  }}
                  className={`
                    group cursor-pointer transition-colors
                    ${selectedIds.includes(lead.id) ? 'bg-brand-50/50 dark:bg-brand-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}
                  `}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(lead.id)}
                      onChange={() => onToggleSelect(lead.id)}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{lead.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{lead.phone}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {lead.company}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-transparent"
                      style={{
                        backgroundColor: statusConfig ? `${statusConfig.color}20` : '#f1f5f9', // 20% opacity or slate-100
                        color: statusConfig ? statusConfig.color : '#64748b', // color or slate-500
                      }}
                    >
                      {statusConfig ? statusConfig.label : lead.status}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {lead.owner?.avatar ? (
                        <img src={lead.owner.avatar} alt="" className="w-6 h-6 rounded-full border border-white dark:border-slate-700" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                      )}
                      <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[80px]">{lead.owner?.name}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {getSourceLabel(lead.source)}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className="relative w-8 h-8 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="12" fill="none" strokeWidth="3" className="stroke-slate-100 dark:stroke-slate-800" />
                          <circle
                            cx="16" cy="16" r="12" fill="none" strokeWidth="3"
                            className={`${(lead.score || 0) > 80 ? 'stroke-emerald-500' : (lead.score || 0) > 50 ? 'stroke-amber-500' : 'stroke-rose-500'}`}
                            strokeDasharray="75.4"
                            strokeDashoffset={75.4 - (75.4 * (lead.score || 0)) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-[10px] font-bold text-slate-700 dark:text-slate-300">{lead.score}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatActivityTime(lead.lastActivity)}</span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <ArrowLeftCircle className="w-3.5 h-3.5 text-brand-500" />
                      {lead.nextStep}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-left relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === lead.id ? null : lead.id);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${menuOpenId === lead.id ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {menuOpenId === lead.id && (
                      <div className="absolute left-8 top-8 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead(lead);
                            setMenuOpenId(null);
                          }}
                          className="w-full text-right px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 block"
                        >
                          עריכה
                        </button>
                        {onDeleteLead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('האם אתה בטוח?')) {
                                onDeleteLead(lead.id);
                              }
                              setMenuOpenId(null);
                            }}
                            className="w-full text-right px-4 py-2.5 text-sm hover:bg-rose-50 dark:hover:bg-rose-900/10 text-rose-600 block"
                          >
                            מחיקה
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
