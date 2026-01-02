import React from 'react';
import { Lead } from '../../types';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Badge } from '../Common/Badge';

interface LeadsKanbanProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

const COLUMNS = [
  { id: 'New', label: 'ליד חדש', color: 'bg-indigo-500' },
  { id: 'Discovery', label: 'גילוי צרכים', color: 'bg-purple-500' },
  { id: 'Proposal', label: 'הצעת מחיר', color: 'bg-pink-500' },
  { id: 'Negotiation', label: 'משא ומתן', color: 'bg-amber-500' },
  { id: 'Closed', label: 'סגור', color: 'bg-emerald-500' },
];

export const LeadsKanban: React.FC<LeadsKanbanProps> = ({ leads, onSelectLead }) => {
  return (
    <div className="flex items-start gap-4 h-full overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const colLeads = leads.filter(l => l.status === col.id);
        
        return (
          <div key={col.id} className="w-72 flex-shrink-0 flex flex-col h-full bg-slate-100/50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800/60">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${col.color}`}></div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{col.label}</h3>
                <span className="text-xs text-slate-400 font-medium">({colLeads.length})</span>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Cards Area */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1 pl-1">
              {colLeads.map(lead => (
                <div 
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md cursor-pointer transition-shadow group"
                >
                   <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-tight">{lead.company}</span>
                      {lead.priority === 'Hot' && <div className="w-2 h-2 rounded-full bg-rose-500" title="דחוף"></div>}
                   </div>
                   
                   <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3 group-hover:text-brand-600 transition-colors">
                     {lead.name}
                   </h4>

                   <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{lead.value}</span>
                      
                      <div className="flex items-center gap-2">
                         <span className={`text-[10px] font-bold ${lead.score && lead.score > 80 ? 'text-emerald-600' : 'text-slate-400'}`}>
                           {lead.score}
                         </span>
                         {lead.owner?.avatar && (
                           <img src={lead.owner.avatar} className="w-5 h-5 rounded-full" alt="" />
                         )}
                      </div>
                   </div>
                </div>
              ))}
            </div>

            {/* Footer Action */}
            <button className="mt-3 flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-dashed border-transparent hover:border-slate-300 dark:hover:border-slate-700">
              <Plus className="w-3.5 h-3.5" />
              הוסף ליד
            </button>
          </div>
        );
      })}
    </div>
  );
};
