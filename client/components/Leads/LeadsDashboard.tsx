import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Upload,
  LayoutList,
  LayoutGrid,
  ChevronDown,
  ArrowUpDown,
  Trash2,
  UserPlus,
  Check,
  X,
  RotateCcw,
  Settings
} from 'lucide-react';
import { Button } from '../Common/Button';
import { LeadsTable } from './LeadsTable';
import { LeadsKanban } from './LeadsKanban';
import { LeadDrawer } from './LeadDrawer';
import { NewLeadDrawer } from './NewLeadDrawer';
import { CSVImportModal } from './CSVImportModal';
import { BulkAssignModal } from './BulkAssignModal';
import { DistributionSettingsModal } from '../Settings/DistributionSettingsModal';
import { User, Lead } from '../../types';
import { supabase } from '../../src/lib/supabaseClient';
import { useLeads } from '../../src/hooks/useLeads';

interface LeadsDashboardProps {
  isDarkMode: boolean;
  orgId?: string;
  user?: User;
}

export type SortConfig = {
  key: keyof Lead | string;
  direction: 'asc' | 'desc';
};

export const LeadsDashboard: React.FC<LeadsDashboardProps> = ({ isDarkMode, orgId, user }) => {
  const { leads, loading, error, refreshLeads, addLead, deleteLead, updateLead, generateAiScore } = useLeads(undefined, orgId, user?.id);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('leadsViewMode') as 'list' | 'kanban') || 'list';
    }
    return 'list';
  });

  // Persist view mode to localStorage
  React.useEffect(() => {
    localStorage.setItem('leadsViewMode', viewMode);
  }, [viewMode]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const selectedLead = leads.find(l => l.id === selectedLeadId) || null;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lastActivity', direction: 'asc' });

  // Drawer State
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [newLeadInitialData, setNewLeadInitialData] = useState<Partial<Lead> | undefined>(undefined);
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [isDistributionSettingsOpen, setIsDistributionSettingsOpen] = useState(false);

  const handleAddLead = (status?: string) => {
    setNewLeadInitialData(status ? { status } : undefined);
    setIsNewLeadOpen(true);
  };

  // -- Filters State --
  const [openFilter, setOpenFilter] = useState<'status' | 'owner' | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [tempSelectedStatuses, setTempSelectedStatuses] = useState<string[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string>('all');

  // Team Members State
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Fetch Team Members
  React.useEffect(() => {
    const fetchTeam = async () => {
      if (!orgId) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .eq('organization_id', orgId);

      if (data) {
        setTeamMembers(data.map(p => ({
          id: p.id,
          name: p.full_name,
          avatar: p.avatar_url || 'https://ui-avatars.com/api/?name=' + p.full_name,
          role: p.role
        })));
      }
    };
    fetchTeam();
  }, [orgId]);

  // Filter Logic
  const filteredLeads = leads.filter(lead => {
    const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(lead.status);
    const ownerMatch = selectedOwner === 'all' || lead.owner?.id === selectedOwner;

    // Search Logic
    const searchLower = searchTerm.toLowerCase();
    const searchMatch = !searchTerm ||
      lead.name.toLowerCase().includes(searchLower) ||
      lead.company?.toLowerCase().includes(searchLower) ||
      lead.phone?.includes(searchLower);

    return statusMatch && ownerMatch && searchMatch;
  });

  // Role Logic
  const isManager = user?.type === 'manager' || user?.type === 'admin' || user?.type === 'super_admin';


  // Sorting Helper for Hebrew Time Strings AND ISO dates
  const parseRelativeTime = (timeStr: string = ''): number => {
    if (!timeStr) return 999999;

    // Check if ISO Date (Simple check)
    if (timeStr.includes('T') || timeStr.includes('-')) {
      return new Date(timeStr).getTime();
    }

    // Lower number = more recent (smaller duration ago)
    if (timeStr.includes('דק׳')) return parseInt(timeStr.replace(/\D/g, '')) || 1;
    if (timeStr.includes('שעות') || timeStr.includes('שעה')) return (parseInt(timeStr.replace(/\D/g, '')) || 1) * 60;
    if (timeStr.includes('עכשיו')) return 0;
    if (timeStr.includes('היום')) return 720; // ~12 hours
    if (timeStr.includes('אתמול')) return 1440; // 24 hours
    if (timeStr.includes('יומיים')) return 2880;
    if (timeStr.includes('שבוע')) return 10080;
    return 999999; // Fallback
  };

  // Sorting Logic
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    const { key, direction } = sortConfig;

    let comparison = 0;

    if (key === 'lastActivity') {
      const aVal = parseRelativeTime(a.lastActivity);
      const bVal = parseRelativeTime(b.lastActivity);
      // For 'lastActivity' (duration ago):
      // Smallest number = most recent.
      // Ascending sort (standard) puts smallest first.
      // So 'asc' here means "Most Recent First".
      comparison = aVal - bVal;
    } else if (key === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (key === 'status') {
      comparison = a.status.localeCompare(b.status);
    } else {
      // Fallback
      comparison = String(a[key as keyof Lead] || '').localeCompare(String(b[key as keyof Lead] || ''));
    }

    return direction === 'asc' ? comparison : -comparison;
  });

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Toggle selection for bulk actions
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === sortedLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedLeads.map(l => l.id));
    }
  };

  // Status Filter Handlers
  const toggleStatusFilter = () => {
    if (openFilter === 'status') {
      setOpenFilter(null);
    } else {
      setTempSelectedStatuses([...selectedStatuses]); // Init buffer
      setOpenFilter('status');
    }
  };

  const handleStatusChange = (status: string) => {
    setTempSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const applyStatusFilter = () => {
    setSelectedStatuses(tempSelectedStatuses);
    setOpenFilter(null);
  };

  const resetStatusFilter = () => {
    setTempSelectedStatuses([]);
  };

  // Owner Filter Handlers
  const toggleOwnerFilter = () => {
    setOpenFilter(openFilter === 'owner' ? null : 'owner');
  };

  const selectOwner = (ownerId: string) => {
    setSelectedOwner(ownerId);
    setOpenFilter(null);
  };

  // Clear All
  const clearAllFilters = () => {
    setSelectedStatuses([]);
    setSelectedOwner('all');
    setSortConfig({ key: 'lastActivity', direction: 'asc' });
    setSearchTerm('');
    setOpenFilter(null);
  };

  // Status Mapping for UI
  const statusOptions = [
    { id: 'New', label: 'ליד חדש' },
    { id: 'Discovery', label: 'גילוי צרכים' },
    { id: 'Negotiation', label: 'בתהליך / פגישה' },
    { id: 'Proposal', label: 'הצעת מחיר' },
    { id: 'Follow Up', label: 'פולואפ' },
    { id: 'Closed', label: 'סגור - הצלחה' },
  ];

  const handleSaveNewLead = async (newLeadData: Partial<Lead>) => {
    try {
      await addLead(newLeadData);
      console.log("SAVE_LEAD_SUCCESS");
    } catch (error) {
      console.error("SAVE_LEAD_FAIL", error);
      alert("Failed to save lead: " + (error as Error).message);
    }
  };

  const handleBulkImport = async (leads: Partial<Lead>[]) => {
    // Import leads one by one
    for (const lead of leads) {
      try {
        await addLead(lead);
      } catch (error) {
        console.error("Import failed for lead:", lead.name, error);
      }
    }
    // Refresh leads list after import
    refreshLeads();
  };

  const handleBulkAssign = async (newOwnerId: string) => {
    if (selectedIds.length === 0) return;

    try {
      // 1. Update in Supabase
      const { error } = await supabase
        .from('leads')
        .update({ owner_id: newOwnerId })
        .in('id', selectedIds);

      if (error) throw error;

      // 2. Refresh List
      refreshLeads();

      // 3. Clear Selection
      setSelectedIds([]);

      // 4. Close Modal (handled by component but good ensure)
      setIsBulkAssignOpen(false);

    } catch (err: any) {
      alert('Failed to assign leads: ' + err.message);
      console.error(err);
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative">

      {/* 1. Header & Actions */}
      <div className="px-6 py-6 md:py-8 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">לידים</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">ניהול כל ההזדמנויות והלקוחות הפוטנציאליים.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Settings Button - Managers Only */}
          {isManager && (
            <button
              onClick={() => setIsDistributionSettingsOpen(true)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="הגדרות חלוקת לידים"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          <Button variant="secondary" className="hidden sm:flex" onClick={() => setIsCSVImportOpen(true)}>
            <Upload className="w-4 h-4 ml-2" />
            ייבוא
          </Button>
          <Button onClick={() => setIsNewLeadOpen(true)}>
            <Plus className="w-4 h-4 ml-2" />
            ליד חדש
          </Button>
        </div>
      </div>

      {/* 2. Filters Toolbar */}
      <div className="px-6 pb-6 flex flex-col gap-4 flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

          {/* Search & Filters Group */}
          <div className="flex items-center gap-3 w-full md:w-auto flex-1 relative z-20">
            <div className="relative w-full max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="חיפוש לפי שם, חברה או טלפון..."
                className="w-full pr-10 pl-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-2">

              {/* Owner Filter - Only for Managers */}
              {isManager && (
                <div className="relative">
                  <button
                    onClick={toggleOwnerFilter}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${openFilter === 'owner' || selectedOwner !== 'all'
                      ? 'bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-900/20 dark:border-brand-800 dark:text-brand-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-300'
                      }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    {selectedOwner === 'all' ? 'בעלים' : teamMembers.find(u => u.id === selectedOwner)?.name || 'Unknown'}
                    <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${openFilter === 'owner' ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Owner Dropdown Panel */}
                  {openFilter === 'owner' && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenFilter(null)}></div>
                      <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-1.5 max-h-64 overflow-y-auto">
                          <button
                            onClick={() => selectOwner('all')}
                            className={`w-full text-right px-3 py-2 rounded-lg text-sm flex items-center justify-between group transition-colors ${selectedOwner === 'all' ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
                          >
                            <span>כל הבעלים</span>
                            {selectedOwner === 'all' && <div className="w-2 h-2 bg-brand-600 rounded-full"></div>}
                          </button>

                          {teamMembers.map(member => (
                            <button
                              key={member.id}
                              onClick={() => selectOwner(member.id)}
                              className={`w-full text-right px-3 py-2 rounded-lg text-sm flex items-center justify-between group transition-colors ${selectedOwner === member.id ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
                            >
                              <div className="flex items-center gap-2">
                                <img src={member.avatar} className="w-5 h-5 rounded-full" alt="" />
                                <span>{member.name}</span>
                              </div>
                              {selectedOwner === member.id && <div className="w-2 h-2 bg-brand-600 rounded-full"></div>}
                            </button>
                          ))}
                        </div>
                        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                          <button onClick={() => selectOwner('all')} className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1">
                            איפוס
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Status Filter */}
              <div className="relative">
                <button
                  onClick={toggleStatusFilter}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${openFilter === 'status' || selectedStatuses.length > 0
                    ? 'bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-900/20 dark:border-brand-800 dark:text-brand-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-300'
                    }`}
                >
                  {selectedStatuses.length > 0 ? `סטטוס · ${selectedStatuses.length} נבחרו` : 'סטטוס'}
                  <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${openFilter === 'status' ? 'rotate-180' : ''}`} />
                </button>

                {/* Status Dropdown Panel */}
                {openFilter === 'status' && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenFilter(null)}></div>
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-1.5 space-y-0.5 max-h-72 overflow-y-auto">
                        {statusOptions.map(option => {
                          const isSelected = tempSelectedStatuses.includes(option.id);
                          return (
                            <label
                              key={option.id}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-slate-50 dark:bg-slate-800/60' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </div>
                                <span className={`text-sm ${isSelected ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {option.label}
                                </span>
                              </div>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={isSelected}
                                onChange={() => handleStatusChange(option.id)}
                              />
                            </label>
                          );
                        })}
                      </div>
                      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                        <button onClick={resetStatusFilter} className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1">
                          איפוס
                        </button>
                        <Button size="sm" onClick={applyStatusFilter} className="h-7 text-xs">
                          אישור
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>

              <button
                onClick={clearAllFilters}
                className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                disabled={selectedStatuses.length === 0 && selectedOwner === 'all' && sortConfig.key === 'lastActivity' && sortConfig.direction === 'asc'}
              >
                נקה הכל
              </button>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              title="תצוגת רשימה"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              title="תצוגת לוח"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Bulk Actions Bar (Conditional) */}
      {selectedIds.length > 0 && (
        <div className="absolute top-[140px] left-1/2 -translate-x-1/2 z-20 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-6 animate-in slide-in-from-top-2 fade-in duration-200">
          <span className="font-medium text-sm border-l border-slate-700 pl-4 ml-2">
            {selectedIds.length} נבחרו
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkAssignOpen(true)}
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              שנה בעלים
            </button>
            <button className="flex items-center gap-2 text-sm text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors">
              <ArrowUpDown className="w-4 h-4" />
              עדכן סטטוס
            </button>
            <button
              onClick={async () => {
                if (!confirm(`האם אתה בטוח שברצונך למחוק ${selectedIds.length} לידים?`)) return;
                for (const id of selectedIds) {
                  await deleteLead(id);
                }
                setSelectedIds([]);
              }}
              className="flex items-center gap-2 text-sm text-rose-300 hover:text-rose-100 px-2 py-1 rounded hover:bg-rose-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              מחק
            </button>
          </div>
          <button
            onClick={() => setSelectedIds([])}
            className="text-xs text-slate-500 hover:text-white underline mr-2"
          >
            ביטול
          </button>
        </div>
      )}

      {/* 4. Main Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        {sortedLeads.length > 0 ? (
          viewMode === 'list' ? (
            <LeadsTable
              leads={sortedLeads}
              onSelectLead={(l) => setSelectedLeadId(l.id)}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              sortConfig={sortConfig}
              onSort={handleSort}
              onUpdateLead={(id, updates) => updateLead(id, updates)}
              onDeleteLead={(id) => deleteLead(id)}
            />
          ) : (
            <LeadsKanban
              leads={sortedLeads}
              onSelectLead={(l) => setSelectedLeadId(l.id)}
              onUpdateLead={(id, updates) => updateLead(id, updates)}
              onAddLead={handleAddLead}
              onDeleteLead={(id) => {
                if (confirm('האם אתה בטוח שברצונך למחוק ליד זה?')) {
                  deleteLead(id);
                }
              }}
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">לא נמצאו לידים</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto mb-4">
              נסה לשנות את הסינון או החיפוש כדי למצוא את מה שאתה מחפש.
            </p>
            <Button variant="secondary" onClick={clearAllFilters}>
              <RotateCcw className="w-4 h-4 ml-2" />
              אפס סינון
            </Button>
          </div>
        )}
      </div>

      {/* 5. Lead Details Drawer (View) */}
      <LeadDrawer
        lead={selectedLead}
        onClose={() => setSelectedLeadId(null)}
        updateLead={updateLead}
        generateAiScore={generateAiScore}
        teamMembers={teamMembers}
      />

      {/* 6. New Lead Drawer (Create) */}
      <NewLeadDrawer
        isOpen={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        onSave={handleSaveNewLead}
        initialData={newLeadInitialData}
        teamMembers={teamMembers}
      />

      {/* 7. CSV Import Modal */}
      <CSVImportModal
        isOpen={isCSVImportOpen}
        onClose={() => setIsCSVImportOpen(false)}
        onImport={handleBulkImport}
        teamMembers={teamMembers}
      />

      {/* 8. Bulk Assign Modal */}
      <BulkAssignModal
        isOpen={isBulkAssignOpen}
        onClose={() => setIsBulkAssignOpen(false)}
        onAssign={handleBulkAssign}
        teamMembers={teamMembers}
        selectedCount={selectedIds.length}
      />

      {/* 9. Distribution Settings Modal */}
      {orgId && (
        <DistributionSettingsModal
          isOpen={isDistributionSettingsOpen}
          onClose={() => setIsDistributionSettingsOpen(false)}
          organizationId={orgId}
        />
      )}

    </div>
  );
};
