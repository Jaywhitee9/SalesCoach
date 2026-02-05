
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

interface LeadsTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({ 
  leads, 
  onSelectLead, 
  selectedIds, 
  onToggleSelect,
  onToggleSelectAll,
  sortConfig,
  onSort
}) => {
  const allSelected = leads.length > 0 && selectedIds.length === leads.length;

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
      case 'Closed': return 'סגור';
      case 'Proposal': return 'הצעת מחיר';
      default: return status;
    }
  };

  const SortIndicator = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <div className="w-3 h-3"></div>; // Spacer
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-brand-600" />
      : <ArrowDown className="w-3 h-3 text-brand-600" />;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 font-semibold uppercase border-b border-slate-100 dark:border-slate-800">
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
            {leads.map((lead) => (
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
                   <Badge variant={getStatusColor(lead.status) as any}>
                     {getStatusLabel(lead.status)}
                   </Badge>
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
                     {lead.source}
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
                   <span className="text-xs text-slate-500 dark:text-slate-400">{lead.lastActivity}</span>
                </td>

                <td className="px-6 py-4">
                   <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                     <ArrowLeftCircle className="w-3.5 h-3.5 text-brand-500" />
                     {lead.nextStep}
                   </div>
                </td>

                <td className="px-4 py-4 text-left">
                  <button className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
