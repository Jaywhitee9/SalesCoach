import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  X,
  Check
} from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';
import { Lead, User } from '../../types';

interface LeadAssignmentDashboardProps {
  currentUser: User;
  isDarkMode: boolean;
}

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  leadCount: number;
}

export const LeadAssignmentDashboard: React.FC<LeadAssignmentDashboardProps> = ({ currentUser, isDarkMode }) => {
  const [unassignedLeads, setUnassignedLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [currentUser.organization_id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch unassigned leads
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', currentUser.organization_id)
        .is('owner_id', null)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;
      setUnassignedLeads(leads || []);

      // Fetch team members with lead counts
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .eq('organization_id', currentUser.organization_id)
        .in('role', ['rep', 'manager']);

      if (profilesError) throw profilesError;

      // Get lead counts for each member
      const membersWithCounts = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', currentUser.organization_id)
            .eq('owner_id', profile.id);

          return {
            ...profile,
            leadCount: count || 0
          };
        })
      );

      setTeamMembers(membersWithCounts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle lead selection
  const toggleLeadSelection = (leadId: string) => {
    const newSelection = new Set(selectedLeads);
    if (newSelection.has(leadId)) {
      newSelection.delete(leadId);
    } else {
      newSelection.add(leadId);
    }
    setSelectedLeads(newSelection);
  };

  // Select all filtered leads
  const selectAll = () => {
    const filtered = getFilteredLeads();
    setSelectedLeads(new Set(filtered.map(l => l.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedLeads(new Set());
  };

  // Assign leads to a team member
  const assignLeads = async (memberId: string) => {
    if (selectedLeads.size === 0) return;

    try {
      setIsAssigning(true);

      const { data: { session } } = await supabase.auth.getSession();

      // Update all selected leads
      const updates = Array.from(selectedLeads).map(leadId =>
        fetch(`/api/leads/${leadId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            owner: { id: memberId }
          })
        })
      );

      await Promise.all(updates);

      // Refresh data
      await fetchData();
      clearSelection();
    } catch (error) {
      console.error('Error assigning leads:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  // Quick assign single lead
  const quickAssign = async (leadId: string, memberId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          owner: { id: memberId }
        })
      });

      await fetchData();
    } catch (error) {
      console.error('Error assigning lead:', error);
    }
  };

  // Filter leads
  const getFilteredLeads = () => {
    return unassignedLeads.filter(lead => {
      const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const filteredLeads = getFilteredLeads();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">הקצאת לידים</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            הקצה לידים לא מוקצים לנציגי המכירות
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>רענן</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <UserPlus className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">לידים לא מוקצים</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{unassignedLeads.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">נציגים פעילים</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{teamMembers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">נבחרו</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{selectedLeads.size}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Unassigned Leads */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="חפש ליד..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">כל הסטטוסים</option>
                <option value="New">חדש</option>
                <option value="Discovery">גילוי</option>
                <option value="Proposal">הצעה</option>
              </select>
            </div>

            {selectedLeads.size > 0 && (
              <div className="mt-3 flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedLeads.size} לידים נבחרו
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors"
                  >
                    נקה בחירה
                  </button>
                  <button
                    onClick={selectAll}
                    className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors"
                  >
                    בחר הכל
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Leads List */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                לידים לא מוקצים ({filteredLeads.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {filteredLeads.length === 0 ? (
                <div className="p-12 text-center">
                  <UserPlus className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400">אין לידים לא מוקצים</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                    כל הלידים הוקצו לנציגים
                  </p>
                </div>
              ) : (
                filteredLeads.map(lead => (
                  <div
                    key={lead.id}
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      selectedLeads.has(lead.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedLeads.has(lead.id)}
                        onChange={() => toggleLeadSelection(lead.id)}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 dark:text-white truncate">
                          {lead.name}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                          {lead.company || lead.phone}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {lead.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Team Members */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">נציגי המכירות</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                לחץ כדי להקצות את הלידים הנבחרים
              </p>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {teamMembers.map(member => (
                <button
                  key={member.id}
                  onClick={() => selectedLeads.size > 0 && assignLeads(member.id)}
                  disabled={selectedLeads.size === 0 || isAssigning}
                  className="w-full p-4 text-right hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=random`}
                      alt={member.full_name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 dark:text-white truncate">
                        {member.full_name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {member.leadCount} לידים
                      </p>
                    </div>
                    {selectedLeads.size > 0 && (
                      <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 transform rotate-180" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedLeads.size > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  בחר נציג מהרשימה כדי להקצות {selectedLeads.size} לידים
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
