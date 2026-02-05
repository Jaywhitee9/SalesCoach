
import React, { useState } from 'react';
import { Lead } from '../../types';
import { MoreHorizontal, Plus, Trash2, Edit } from 'lucide-react';
import { Badge } from '../Common/Badge';

interface LeadsKanbanProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLead: (leadId: string, updates: Partial<Lead>) => void;
  onDeleteLead?: (leadId: string) => void;
  onAddLead?: (status: string) => void;
}

const COLUMNS = [
  { id: 'New', label: 'ליד חדש', color: 'bg-indigo-500' },
  { id: 'Discovery', label: 'גילוי צרכים', color: 'bg-purple-500' },
  { id: 'Proposal', label: 'הצעת מחיר', color: 'bg-pink-500' },
  { id: 'Negotiation', label: 'משא ומתן', color: 'bg-amber-500' },
  { id: 'Closed', label: 'סגור', color: 'bg-emerald-500' },
];

export const LeadsKanban: React.FC<LeadsKanbanProps> = ({ leads, onSelectLead, onUpdateLead, onDeleteLead, onAddLead }) => {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [columnMenuOpenId, setColumnMenuOpenId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
    // No setTimeout - clearer immediate feedback
    // Ensure the drag image is the card itself (default behavior is usually fine)
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (!draggedLeadId) return;

    // Local check to avoid unnecessary updates
    const lead = leads.find(l => l.id === draggedLeadId);
    if (lead && lead.status !== status) {
      onUpdateLead(draggedLeadId, { status });
    }
    setDraggedLeadId(null);
  };

  return (
    <div
      className="flex items-start gap-4 h-full overflow-x-auto pb-4"
      onClick={() => {
        setMenuOpenId(null);
        setColumnMenuOpenId(null); // Close column menus too
      }}
    >
      {COLUMNS.map((col) => {
        const colLeads = leads.filter(l => l.status === col.id);

        return (
          <div
            key={col.id}
            className="w-72 flex-shrink-0 flex flex-col h-full bg-slate-100/50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800/60"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1 relative">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${col.color}`}></div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{col.label}</h3>
                <span className="text-xs text-slate-400 font-medium">({colLeads.length})</span>
              </div>

              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setColumnMenuOpenId(columnMenuOpenId === col.id ? null : col.id);
                    setMenuOpenId(null); // Close card menus
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {/* Column Menu */}
                {columnMenuOpenId === col.id && (
                  <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onAddLead) onAddLead(col.id);
                        setColumnMenuOpenId(null);
                      }}
                      className="w-full text-right px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                    >
                      <Plus className="w-3.5 h-3.5" /> הוסף ליד כאן
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Cards Area */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1 pl-1 custom-scrollbar">
              {colLeads.map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  className={`bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all group relative ${draggedLeadId === lead.id ? 'opacity-40 scale-95' : 'opacity-100'}`}
                >
                  {/* Menu Button */}
                  <div className="absolute top-2 left-2 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === lead.id ? null : lead.id);
                        setColumnMenuOpenId(null);
                      }}
                      className={`p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-opacity ${menuOpenId === lead.id ? 'opacity-100 bg-slate-100 dark:bg-slate-800' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                      <MoreHorizontal className="w-4 h-4 text-slate-400" />
                    </button>

                    {menuOpenId === lead.id && (
                      <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectLead(lead); setMenuOpenId(null); }}
                          className="w-full text-right px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                        >
                          <Edit className="w-3 h-3" /> עריכה
                        </button>
                        {onDeleteLead && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteLead(lead.id); setMenuOpenId(null); }}
                            className="w-full text-right px-3 py-2 text-xs hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 flex items-center gap-2"
                          >
                            <Trash2 className="w-3 h-3" /> מחיקה
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div onClick={() => onSelectLead(lead)}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-tight">{lead.company || 'פרטי'}</span>
                      {lead.priority === 'Hot' && <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" title="דחוף"></div>}
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3 group-hover:text-brand-600 transition-colors line-clamp-2">
                      {lead.name}
                    </h4>

                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 font-mono tracking-tight">{lead.value}</span>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${lead.score && lead.score > 80 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {lead.score}
                        </span>
                        {lead.owner?.avatar && (
                          <img src={lead.owner.avatar} className="w-5 h-5 rounded-full border border-white dark:border-slate-800" alt="" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Action */}
            <button
              onClick={() => onAddLead && onAddLead(col.id)}
              className="mt-3 flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-dashed border-transparent hover:border-slate-300 dark:hover:border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              הוסף ליד
            </button>
          </div>
        );
      })}
    </div>
  );
};
