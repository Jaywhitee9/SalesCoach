
import React, { useState, useEffect } from 'react';
import {
   LayoutDashboard,
   Building2,
   Users,
   Database,
   ShieldAlert,
   Search,
   Filter,
   MoreVertical,
   Trash2,
   AlertTriangle,
   CheckCircle2,
   X,
   ChevronDown,
   ChevronUp,
   Download,
   RefreshCw,
   ExternalLink,
   Key,
   Lock,
   LogOut,
   FileWarning,
   Activity,
   Settings,
   Eye,
   Plus,
   Loader2
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { supabase } from '../../src/lib/supabaseClient';
import { InviteUserModal } from '../Admin/InviteUserModal';

interface SuperAdminDashboardProps {
   onLogout: () => void;
   onImpersonate: (orgId: string, orgName: string) => void;
}

interface Organization {
   id: string;
   name: string;
   created_at: string;
   user_count: number;
   lead_count: number;
   plan?: string;
}

interface OrgUser {
   id: string;
   email: string;
   full_name: string;
   role: string;
   lead_count: number;
}

interface IsolationReport {
   total_organizations: number;
   total_users: number;
   total_leads: number;
   total_issues: number;
   null_org_id_leads: number;
   null_org_id_users: number;
   orphan_org_ids: string[];
   cross_org_assignments: any[];
   leads_per_org: { org_id: string, org_name: string, count: number }[];
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onLogout, onImpersonate }) => {
   // Data State
   const [organizations, setOrganizations] = useState<Organization[]>([]);
   const [isolationReport, setIsolationReport] = useState<IsolationReport | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   // Filter & Search
   const [filter, setFilter] = useState('');
   const [sortField, setSortField] = useState<'name' | 'user_count' | 'lead_count' | 'created_at'>('created_at');
   const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

   // Modals
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [showUsersModal, setShowUsersModal] = useState<string | null>(null);
   const [showDeleteOrgModal, setShowDeleteOrgModal] = useState<Organization | null>(null);
   const [showDeleteUserModal, setShowDeleteUserModal] = useState<OrgUser | null>(null);
   const [showVerificationPanel, setShowVerificationPanel] = useState(false);

   // Modal Form State
   const [newOrgName, setNewOrgName] = useState('');
   const [newOrgPlan, setNewOrgPlan] = useState('free');
   const [deleteConfirmation, setDeleteConfirmation] = useState('');
   const [showEditPlanModal, setShowEditPlanModal] = useState<Organization | null>(null);
   const [selectedPlan, setSelectedPlan] = useState('free');

   const [leadAction, setLeadAction] = useState<'unassign' | 'delete'>('unassign');
   const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
   const [usersLoading, setUsersLoading] = useState(false);
   const [actionLoading, setActionLoading] = useState(false);

   // Invitation State
   const [showInviteModal, setShowInviteModal] = useState(false);
   const [inviteOrgId, setInviteOrgId] = useState<string | null>(null);
   const [inviteOrgName, setInviteOrgName] = useState<string>('');
   const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);

   // Get auth token for API calls
   const getAuthHeaders = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return {
         'Authorization': `Bearer ${session?.access_token}`,
         'Content-Type': 'application/json'
      };
   };

   // Fetch Organizations
   const fetchOrganizations = async () => {
      setLoading(true);
      setError(null);
      try {
         const headers = await getAuthHeaders();
         const res = await fetch('/api/admin/organizations', { headers });
         const data = await res.json();

         if (!res.ok) throw new Error(data.error || 'Failed to fetch organizations');
         setOrganizations(data.organizations || []);
      } catch (err: any) {
         setError(err.message);
         console.error('[SuperAdmin] Fetch orgs error:', err);
      } finally {
         setLoading(false);
      }
   };

   // Fetch Isolation Report
   const fetchIsolationReport = async () => {
      try {
         const headers = await getAuthHeaders();
         const res = await fetch('/api/admin/verify-isolation', { headers });
         const data = await res.json();

         if (!res.ok) throw new Error(data.error);
         setIsolationReport(data.report);
      } catch (err: any) {
         console.error('[SuperAdmin] Isolation report error:', err);
      }
   };

   // Initial Load
   useEffect(() => {
      fetchOrganizations();
      fetchIsolationReport();
   }, []);

   // Create Organization
   const handleCreateOrg = async () => {
      if (!newOrgName.trim()) return;
      setActionLoading(true);
      try {
         const headers = await getAuthHeaders();
         const res = await fetch('/api/admin/organizations', {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: newOrgName.trim(), plan: newOrgPlan })
         });
         const data = await res.json();

         if (!res.ok) throw new Error(data.error);

         setShowCreateModal(false);
         setNewOrgName('');
         setNewOrgPlan('free');
         fetchOrganizations();
      } catch (err: any) {
         alert('Error: ' + err.message);
      } finally {
         setActionLoading(false);
      }
   };

   // Update Plan
   const handleUpdatePlan = async () => {
      if (!showEditPlanModal) return;
      setActionLoading(true);
      try {
         const headers = await getAuthHeaders();
         const res = await fetch(`/api/admin/organizations/${showEditPlanModal.id}/plan`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ plan: selectedPlan })
         });
         const data = await res.json();

         if (!res.ok) throw new Error(data.error);

         setShowEditPlanModal(null);
         fetchOrganizations();
      } catch (err: any) {
         alert('Error: ' + err.message);
      } finally {
         setActionLoading(false);
      }
   };

   // Delete Organization
   const handleDeleteOrg = async () => {
      if (!showDeleteOrgModal || deleteConfirmation !== 'DELETE') return;
      setActionLoading(true);
      try {
         const headers = await getAuthHeaders();
         const res = await fetch(`/api/admin/organizations/${showDeleteOrgModal.id}`, {
            method: 'DELETE',
            headers,
            body: JSON.stringify({ confirmation: 'DELETE' })
         });
         const data = await res.json();

         if (!res.ok) throw new Error(data.error);

         setShowDeleteOrgModal(null);
         setDeleteConfirmation('');
         fetchOrganizations();
         fetchIsolationReport();
      } catch (err: any) {
         alert('Error: ' + err.message);
      } finally {
         setActionLoading(false);
      }
   };

   // Fetch Org Users
   const fetchOrgUsers = async (orgId: string) => {
      setUsersLoading(true);
      try {
         const headers = await getAuthHeaders();
         const res = await fetch(`/api/admin/organizations/${orgId}/users`, { headers });
         const data = await res.json();

         if (!res.ok) throw new Error(data.error);
         setOrgUsers(data.users || []);
      } catch (err: any) {
         console.error('[SuperAdmin] Fetch users error:', err);
      } finally {
         setUsersLoading(false);
      }
   };

   // Delete User
   const handleDeleteUser = async () => {
      if (!showDeleteUserModal || deleteConfirmation !== 'DELETE') return;
      setActionLoading(true);
      try {
         const headers = await getAuthHeaders();
         const res = await fetch(`/api/admin/users/${showDeleteUserModal.id}`, {
            method: 'DELETE',
            headers,
            body: JSON.stringify({
               confirmation: 'DELETE',
               leadAction: leadAction
            })
         });
         const data = await res.json();

         if (!res.ok) throw new Error(data.error);

         setShowDeleteUserModal(null);
         setDeleteConfirmation('');
         // Refresh users list
         if (showUsersModal) fetchOrgUsers(showUsersModal);
         fetchOrganizations();
         fetchIsolationReport();
      } catch (err: any) {
         alert('Error: ' + err.message);
      } finally {
         setActionLoading(false);
      }
   };

   // Open Users Modal
   const openUsersModal = (orgId: string) => {
      setShowUsersModal(orgId);
      fetchOrgUsers(orgId);
      fetchOrgInvitations(orgId);
   };

   // Fetch Org Invitations
   const fetchOrgInvitations = async (orgId: string) => {
      try {
         const headers = await getAuthHeaders();
         const res = await fetch(`/api/admin/organizations/${orgId}/invitations`, { headers });
         const data = await res.json();

         if (!res.ok) throw new Error(data.error);
         setPendingInvitations(data.invitations?.filter((i: any) => !i.accepted_at) || []);
      } catch (err: any) {
         console.error('[SuperAdmin] Fetch invitations error:', err);
      }
   };

   // Open Invite Modal
   const openInviteModal = (orgId: string, orgName: string) => {
      setInviteOrgId(orgId);
      setInviteOrgName(orgName);
      setShowInviteModal(true);
   };

   // Handle Invite Success
   const handleInviteSuccess = () => {
      if (showUsersModal) {
         fetchOrgInvitations(showUsersModal);
      }
   };

   // Filtered & Sorted Organizations
   const filteredOrgs = organizations
      .filter(org => org.name.toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => {
         const aVal = a[sortField];
         const bVal = b[sortField];
         if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
         }
         return sortDir === 'asc'
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
      });

   // Stats
   const totalUsers = organizations.reduce((acc, org) => acc + org.user_count, 0);
   const totalLeads = organizations.reduce((acc, org) => acc + org.lead_count, 0);

   // Integrity Issues Count
   const integrityIssues = isolationReport?.total_issues || 0;

   // Sort Handler
   const handleSort = (field: typeof sortField) => {
      if (sortField === field) {
         setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      } else {
         setSortField(field);
         setSortDir('desc');
      }
   };

   const SortIcon = ({ field }: { field: typeof sortField }) => {
      if (sortField !== field) return null;
      return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
   };

   return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col" dir="rtl">

         {/* Header */}
         <header className="bg-slate-900 text-white pt-6 pb-20 px-6 lg:px-8 border-b border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto relative z-10">
               <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30 backdrop-blur-sm">
                        <ShieldAlert className="w-6 h-6 text-indigo-400" />
                     </div>
                     <div>
                        <h1 className="text-xl font-bold tracking-tight">לוח בקרה ראשי</h1>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                           <span className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                              נתונים בזמן אמת
                           </span>
                           <span>•</span>
                           <span>{organizations.length} ארגונים</span>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center gap-4">
                     <Button
                        variant="secondary"
                        className="hidden sm:flex bg-white/10 border-white/20 text-white hover:bg-white/20"
                        onClick={() => { fetchOrganizations(); fetchIsolationReport(); }}
                     >
                        <RefreshCw className="w-4 h-4 ml-2" />
                        רענון
                     </Button>
                     <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors border border-white/10">
                        <LogOut className="w-4 h-4 ml-2" />
                        התנתק
                     </button>
                  </div>
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 rounded-xl">
                     <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                           <Building2 className="w-5 h-5" />
                        </div>
                     </div>
                     <p className="text-sm text-slate-400 mb-1">ארגונים במערכת</p>
                     <p className="text-2xl font-mono font-bold text-white">{organizations.length}</p>
                  </div>

                  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 rounded-xl">
                     <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                           <Users className="w-5 h-5" />
                        </div>
                     </div>
                     <p className="text-sm text-slate-400 mb-1">סה"כ משתמשים</p>
                     <p className="text-2xl font-mono font-bold text-white">{totalUsers}</p>
                  </div>

                  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 rounded-xl">
                     <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                           <Database className="w-5 h-5" />
                        </div>
                     </div>
                     <p className="text-sm text-slate-400 mb-1">סה"כ לידים</p>
                     <p className="text-2xl font-mono font-bold text-white">{totalLeads}</p>
                  </div>

                  <div
                     className={`bg-slate-800/50 backdrop-blur-sm border p-5 rounded-xl cursor-pointer transition-all hover:scale-105 ${integrityIssues > 0
                        ? 'border-rose-500/50 bg-rose-900/20'
                        : 'border-emerald-500/50 bg-emerald-900/20'
                        }`}
                     onClick={() => setShowVerificationPanel(true)}
                  >
                     <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg ${integrityIssues > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                           {integrityIssues > 0 ? <FileWarning className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                        </div>
                        <span className="text-xs font-bold text-slate-400">לחץ לצפייה</span>
                     </div>
                     <p className="text-sm text-slate-400 mb-1">דוח תקינות נתונים</p>
                     <p className={`text-2xl font-mono font-bold ${integrityIssues > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {integrityIssues}
                     </p>
                  </div>
               </div>
            </div>
         </header>

         {/* Main Content */}
         <main className="flex-1 -mt-10 max-w-7xl mx-auto w-full px-6 lg:px-8 pb-12 relative z-20">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col min-h-[500px]">

               {/* Toolbar */}
               <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                     <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        רשימת ארגונים
                     </h2>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                     <div className="relative flex-1 sm:flex-initial">
                        <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                        <input
                           type="text"
                           placeholder="חיפוש ארגון..."
                           value={filter}
                           onChange={(e) => setFilter(e.target.value)}
                           className="w-full sm:w-64 pr-10 pl-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                     </div>

                     <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="w-4 h-4 ml-2" />
                        ארגון חדש
                     </Button>
                  </div>
               </div>

               {/* Table */}
               {loading ? (
                  <div className="flex-1 flex items-center justify-center min-h-[400px]">
                     <div className="text-center">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
                        <p className="text-slate-500">טוען נתונים...</p>
                     </div>
                  </div>
               ) : error ? (
                  <div className="flex-1 flex items-center justify-center flex-col min-h-[400px] text-rose-500">
                     <AlertTriangle className="w-10 h-10 mb-4" />
                     <p>{error}</p>
                     <p className="text-sm text-slate-400 mt-2">ודא שיש לך הרשאות Plateform Admin</p>
                  </div>
               ) : (
                  <div className="flex-1 overflow-x-auto">
                     <table className="w-full text-right border-collapse">
                        <thead>
                           <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                              <th className="px-6 py-4 cursor-pointer hover:text-indigo-600 text-right" onClick={() => handleSort('name')}>
                                 <div className="flex items-center gap-1">שם הארגון <SortIcon field="name" /></div>
                              </th>
                              <th className="px-6 py-4 text-center">תוכנית</th>
                              <th className="px-6 py-4 cursor-pointer hover:text-indigo-600 text-center" onClick={() => handleSort('user_count')}>
                                 <div className="flex items-center justify-center gap-1">משתמשים <SortIcon field="user_count" /></div>
                              </th>
                              <th className="px-6 py-4 cursor-pointer hover:text-indigo-600 text-center" onClick={() => handleSort('lead_count')}>
                                 <div className="flex items-center justify-center gap-1">לידים <SortIcon field="lead_count" /></div>
                              </th>
                              <th className="px-6 py-4 cursor-pointer hover:text-indigo-600 text-right" onClick={() => handleSort('created_at')}>
                                 <div className="flex items-center justify-start gap-1">נוצר בתאריך <SortIcon field="created_at" /></div>
                              </th>
                              <th className="px-6 py-4 text-left">פעולות</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           {filteredOrgs.map((org) => (
                              <tr key={org.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                 <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                          {org.name.charAt(0).toUpperCase()}
                                       </div>
                                       <div>
                                          <p className="font-semibold text-slate-900 dark:text-white">{org.name}</p>
                                          <p className="text-xs text-slate-500 font-mono">ID: {org.id.slice(0, 8)}...</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                    <Badge variant={org.plan === 'enterprise' ? 'brand' : org.plan === 'pro' ? 'success' : 'secondary'}>
                                       {org.plan?.toUpperCase() || 'FREE'}
                                    </Badge>
                                 </td>
                                 <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                                    {org.user_count}
                                 </td>
                                 <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                                    {org.lead_count}
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <span className="text-sm text-slate-500">{new Date(org.created_at).toLocaleDateString('he-IL')}</span>
                                 </td>
                                 <td className="px-6 py-4 text-left">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button
                                          onClick={() => openUsersModal(org.id)}
                                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                          title="צפה במשתמשים"
                                       >
                                          <Eye className="w-4 h-4" />
                                       </button>
                                       <button
                                          onClick={() => onImpersonate(org.id, org.name)}
                                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                          title="התחבר כארגון"
                                       >
                                          <ExternalLink className="w-4 h-4" />
                                       </button>
                                       <button
                                          onClick={() => setShowDeleteOrgModal(org)}
                                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                          title="מחק ארגון"
                                       >
                                          <Trash2 className="w-4 h-4" />
                                       </button>
                                       <button
                                          onClick={() => { setShowEditPlanModal(org); setSelectedPlan(org.plan || 'free'); }}
                                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                          title="שנה תוכנית"
                                       >
                                          <Settings className="w-4 h-4" />
                                       </button>
                                    </div>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                     {filteredOrgs.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                           לא נמצאו ארגונים במערכת
                        </div>
                     )}
                  </div>
               )}

               {/* Footer */}
               <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                     מציג {filteredOrgs.length} מתוך {organizations.length} ארגונים
                  </p>
               </div>
            </div>
         </main >

         {/* ===== MODALS ===== */}

         {/* Create Org Modal */}
         {
            showCreateModal && (
               <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                     <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">יצירת ארגון חדש</h3>
                        <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                           <X className="w-5 h-5 text-slate-400" />
                        </button>
                     </div>
                     <input
                        type="text"
                        placeholder="שם הארגון"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm mb-4"
                        autoFocus
                     />
                     <div className="mb-6">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">תוכנית</label>
                        <div className="grid grid-cols-3 gap-2">
                           {['free', 'pro', 'enterprise'].map(plan => (
                              <button
                                 key={plan}
                                 onClick={() => setNewOrgPlan(plan)}
                                 className={`py-2 px-3 text-sm rounded-lg border transition-all ${newOrgPlan === plan
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                    }`}
                              >
                                 {plan.charAt(0).toUpperCase() + plan.slice(1)}
                              </button>
                           ))}
                        </div>
                     </div>
                     <div className="flex gap-3">
                        <Button variant="secondary" className="flex-1" onClick={() => setShowCreateModal(false)}>
                           ביטול
                        </Button>
                        <Button className="flex-1" onClick={handleCreateOrg} disabled={actionLoading || !newOrgName.trim()}>
                           {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'צור ארגון'}
                        </Button>
                     </div>
                  </div>
               </div>
            )
         }

         {/* Delete Org Modal */}
         {
            showDeleteOrgModal && (
               <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
                           <AlertTriangle className="w-6 h-6 text-rose-500" />
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-slate-900 dark:text-white">מחיקת ארגון</h3>
                           <p className="text-sm text-slate-500">פעולה זו אינה הפיכה</p>
                        </div>
                     </div>
                     <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 mb-4">
                        <p className="text-sm text-rose-700 dark:text-rose-300">
                           מחיקת <strong>{showDeleteOrgModal.name}</strong> תגרור:
                        </p>
                        <ul className="text-sm text-rose-600 dark:text-rose-400 mt-2 space-y-1">
                           <li>• הסרת {showDeleteOrgModal.user_count} משתמשים</li>
                           <li>• מחיקת {showDeleteOrgModal.lead_count} לידים</li>
                           <li>• מחיקת כל המשימות והמידע הנלווה</li>
                        </ul>
                     </div>
                     <div className="mb-4">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                           הקלד <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">DELETE</span> לאישור:
                        </label>
                        <input
                           type="text"
                           value={deleteConfirmation}
                           onChange={(e) => setDeleteConfirmation(e.target.value)}
                           className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono"
                           placeholder="DELETE"
                        />
                     </div>
                     <div className="flex gap-3">
                        <Button variant="secondary" className="flex-1" onClick={() => { setShowDeleteOrgModal(null); setDeleteConfirmation(''); }}>
                           ביטול
                        </Button>
                        <Button
                           className="flex-1 bg-rose-600 hover:bg-rose-700"
                           onClick={handleDeleteOrg}
                           disabled={actionLoading || deleteConfirmation !== 'DELETE'}
                        >
                           {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'מחק לצמיתות'}
                        </Button>
                     </div>
                  </div>
               </div>
            )
         }

         {/* Edit Plan Modal */}
         {
            showEditPlanModal && (
               <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                     <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">שינוי תוכנית</h3>
                        <button onClick={() => setShowEditPlanModal(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                           <X className="w-5 h-5 text-slate-400" />
                        </button>
                     </div>

                     <div className="mb-6">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">
                           בחר תוכנית עבור <span className="font-bold">{showEditPlanModal.name}</span>
                        </label>
                        <div className="flex flex-col gap-2">
                           {['free', 'pro', 'enterprise'].map(plan => (
                              <button
                                 key={plan}
                                 onClick={() => setSelectedPlan(plan)}
                                 className={`py-3 px-4 text-left rounded-xl border transition-all flex items-center justify-between ${selectedPlan === plan
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-600 text-indigo-700 dark:text-indigo-300'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                    }`}
                              >
                                 <span className="font-medium">{plan.toUpperCase()}</span>
                                 {selectedPlan === plan && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                              </button>
                           ))}
                        </div>
                     </div>

                     <div className="flex gap-3">
                        <Button variant="secondary" className="flex-1" onClick={() => setShowEditPlanModal(null)}>
                           ביטול
                        </Button>
                        <Button className="flex-1" onClick={handleUpdatePlan} disabled={actionLoading}>
                           {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'שמור שינויים'}
                        </Button>
                     </div>
                  </div>
               </div>
            )
         }

         {/* Users Modal */}
         {
            showUsersModal && (
               <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col">
                     <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                           משתמשי הארגון
                           <span className="text-sm font-normal text-slate-500 ml-2">({orgUsers.length})</span>
                        </h3>
                        <div className="flex items-center gap-2">
                           <Button
                              size="sm"
                              onClick={() => {
                                 const org = organizations.find(o => o.id === showUsersModal);
                                 if (org) openInviteModal(org.id, org.name);
                              }}
                           >
                              <Plus className="w-4 h-4 mr-1" />
                              הזמן משתמש
                           </Button>
                           <button onClick={() => { setShowUsersModal(null); setOrgUsers([]); setPendingInvitations([]); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                              <X className="w-5 h-5 text-slate-400" />
                           </button>
                        </div>
                     </div>

                     {usersLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                           <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                     ) : (
                        <div className="flex-1 overflow-auto space-y-4">
                           {/* Pending Invitations */}
                           {pendingInvitations.length > 0 && (
                              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                                 <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3">
                                    הזמנות ממתינות ({pendingInvitations.length})
                                 </h4>
                                 <div className="space-y-2">
                                    {pendingInvitations.map((inv) => (
                                       <div key={inv.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg">
                                          <div>
                                             <p className="text-sm font-medium text-slate-900 dark:text-white">{inv.email}</p>
                                             <p className="text-xs text-slate-500">
                                                תפקיד: {inv.role === 'manager' ? 'מנהל' : 'נציג'} • פג תוקף: {new Date(inv.expires_at).toLocaleDateString('he-IL')}
                                             </p>
                                          </div>
                                          <Badge variant="warning">ממתין</Badge>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}

                           {/* Users Table */}
                           <table className="w-full text-right" dir="rtl">
                              <thead>
                                 <tr className="text-xs text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                                    <th className="pb-3 text-right">משתמש</th>
                                    <th className="pb-3 text-right">תפקיד</th>
                                    <th className="pb-3 text-center">לידים</th>
                                    <th className="pb-3 text-left">פעולות</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                 {orgUsers.map((user) => (
                                    <tr key={user.id} className="group">
                                       <td className="py-3">
                                          <div className="flex items-center gap-3">
                                             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold">
                                                {user.full_name?.charAt(0) || '?'}
                                             </div>
                                             <div>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.full_name || 'ללא שם'}</p>
                                                <p className="text-xs text-slate-400">{user.email}</p>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="py-3">
                                          <Badge variant={user.role === 'manager' ? 'brand' : user.role === 'platform_admin' ? 'warning' : 'secondary'}>
                                             {user.role}
                                          </Badge>
                                       </td>
                                       <td className="py-3 text-sm text-center text-slate-600 dark:text-slate-300">{user.lead_count}</td>
                                       <td className="py-3 text-left">
                                          <button
                                             onClick={() => setShowDeleteUserModal(user)}
                                             className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                          >
                                             <Trash2 className="w-4 h-4" />
                                          </button>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                           {orgUsers.length === 0 && (
                              <div className="p-8 text-center text-slate-400">אין משתמשים בארגון זה</div>
                           )}
                        </div>
                     )}
                  </div>
               </div>
            )
         }

         {/* Delete User Modal */}
         {
            showDeleteUserModal && (
               <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
                           <AlertTriangle className="w-6 h-6 text-rose-500" />
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-slate-900 dark:text-white">מחיקת משתמש</h3>
                           <p className="text-sm text-slate-500">{showDeleteUserModal.email}</p>
                        </div>
                     </div>

                     <div className="mb-4">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                           מה לעשות עם {showDeleteUserModal.lead_count} הלידים של המשתמש?
                        </label>
                        <div className="space-y-2">
                           <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-100">
                              <input type="radio" name="leadAction" value="unassign" checked={leadAction === 'unassign'} onChange={() => setLeadAction('unassign')} />
                              <div>
                                 <p className="text-sm font-medium text-slate-900 dark:text-white">בטל שיוך לידים</p>
                                 <p className="text-xs text-slate-500">הלידים יהפכו ללא משויכים (ניתן להקצות מחדש)</p>
                              </div>
                           </label>
                           <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-100">
                              <input type="radio" name="leadAction" value="delete" checked={leadAction === 'delete'} onChange={() => setLeadAction('delete')} />
                              <div>
                                 <p className="text-sm font-medium text-rose-600">מחק לידים</p>
                                 <p className="text-xs text-slate-500">כל הלידים יימחקו לצמיתות</p>
                              </div>
                           </label>
                        </div>
                     </div>

                     <div className="mb-4">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                           הקלד <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">DELETE</span> לאישור:
                        </label>
                        <input
                           type="text"
                           value={deleteConfirmation}
                           onChange={(e) => setDeleteConfirmation(e.target.value)}
                           className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono"
                           placeholder="DELETE"
                        />
                     </div>

                     <div className="flex gap-3">
                        <Button variant="secondary" className="flex-1" onClick={() => { setShowDeleteUserModal(null); setDeleteConfirmation(''); }}>
                           ביטול
                        </Button>
                        <Button
                           className="flex-1 bg-rose-600 hover:bg-rose-700"
                           onClick={handleDeleteUser}
                           disabled={actionLoading || deleteConfirmation !== 'DELETE'}
                        >
                           {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'מחק משתמש'}
                        </Button>
                     </div>
                  </div>
               </div>
            )
         }

         {/* Verification Panel Modal */}
         {
            showVerificationPanel && isolationReport && (
               <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-3xl shadow-2xl max-h-[80vh] flex flex-col">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-lg ${integrityIssues > 0 ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                              {integrityIssues > 0 ? <FileWarning className="w-5 h-5 text-rose-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                           </div>
                           <h3 className="text-lg font-bold text-slate-900 dark:text-white">דוח תקינות נתונים</h3>
                        </div>
                        <button onClick={() => setShowVerificationPanel(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                           <X className="w-5 h-5 text-slate-400" />
                        </button>
                     </div>

                     <div className="flex-1 overflow-auto space-y-6">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-4">
                           <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                              <p className="text-2xl font-bold text-slate-900 dark:text-white">{isolationReport.total_organizations}</p>
                              <p className="text-xs text-slate-500">ארגונים</p>
                           </div>
                           <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                              <p className="text-2xl font-bold text-slate-900 dark:text-white">{isolationReport.total_users}</p>
                              <p className="text-xs text-slate-500">משתמשים</p>
                           </div>
                           <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                              <p className="text-2xl font-bold text-slate-900 dark:text-white">{isolationReport.total_leads}</p>
                              <p className="text-xs text-slate-500">לידים</p>
                           </div>
                        </div>

                        {/* Issues */}
                        <div className="space-y-3">
                           <h4 className="font-semibold text-slate-900 dark:text-white">בעיות אינטגרציה:</h4>

                           <div className={`flex items-center justify-between p-3 rounded-xl ${isolationReport.null_org_id_leads > 0 ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                              <span className="text-sm">לידים ללא שיוך ארגוני (organization_id)</span>
                              <span className={`font-bold ${isolationReport.null_org_id_leads > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                 {isolationReport.null_org_id_leads}
                              </span>
                           </div>

                           <div className={`flex items-center justify-between p-3 rounded-xl ${isolationReport.null_org_id_users > 0 ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                              <span className="text-sm">משתמשים ללא שיוך ארגוני (organization_id)</span>
                              <span className={`font-bold ${isolationReport.null_org_id_users > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                 {isolationReport.null_org_id_users}
                              </span>
                           </div>

                           <div className={`flex items-center justify-between p-3 rounded-xl ${(isolationReport.orphan_org_ids?.length || 0) > 0 ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                              <span className="text-sm">לידים משויכים לארגונים לא קיימים</span>
                              <span className={`font-bold ${(isolationReport.orphan_org_ids?.length || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                 {isolationReport.orphan_org_ids?.length || 0}
                              </span>
                           </div>

                           <div className={`flex items-center justify-between p-3 rounded-xl ${(isolationReport.cross_org_assignments?.length || 0) > 0 ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                              <span className="text-sm">הקצאות צולבות (ליד בארגון שונה מהנציג)</span>
                              <span className={`font-bold ${(isolationReport.cross_org_assignments?.length || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                 {isolationReport.cross_org_assignments?.length || 0}
                              </span>
                           </div>
                        </div>

                        {/* Distribution */}
                        {isolationReport.leads_per_org && isolationReport.leads_per_org.length > 0 && (
                           <div>
                              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">לידים לפי ארגון:</h4>
                              <div className="space-y-2">
                                 {isolationReport.leads_per_org.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                       <span className="text-sm">{item.org_name || item.org_id?.slice(0, 8)}</span>
                                       <span className="font-bold text-slate-900 dark:text-white">{item.count}</span>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            )
         }

         {/* Invite User Modal */}
         <InviteUserModal
            isOpen={showInviteModal}
            onClose={() => {
               setShowInviteModal(false);
               setInviteOrgId(null);
               setInviteOrgName('');
            }}
            organizationId={inviteOrgId || ''}
            organizationName={inviteOrgName}
            onSuccess={handleInviteSuccess}
         />

      </div >
   );
};
