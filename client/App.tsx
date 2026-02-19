
import React, { useState, useEffect, useMemo } from 'react';
import { Toast, Button, ErrorBoundary } from './src/components/ui';
import { Sidebar, TopBar } from './src/components/layout';
import { EmptyCallState, CallSummaryModal } from './src/components/calls';
import { Dashboard, ManagerDashboard } from './src/components/dashboard';
import { LeadsDashboard } from './src/components/leads';
import { PipelineDashboard } from './src/components/pipeline';
import { SettingsDashboard } from './src/components/settings';
import { TasksDashboard } from './src/components/tasks';
import { TargetsDashboard } from './src/components/targets';
import { PanelDashboard } from './src/components/panel/PanelDashboard';
import { TeamChatDashboard } from './src/components/chat/TeamChatDashboard';
import { ManagerChatDrawer } from './src/components/chat/ManagerChatDrawer';
import { GamificationDashboard } from './src/components/gamification/GamificationDashboard';
import { RemindersModal } from './src/components/notifications/RemindersModal';
import { SuperAdminDashboard } from './src/components/superadmin/SuperAdminDashboard';
import { Login, AcceptInvitationPage } from './src/components/auth';
import { Lock, LayoutDashboard, Loader2, AlertTriangle } from 'lucide-react';
import {
  CURRENT_USER
} from './constants';
import { User } from './types';

// --- LOGIC INJECTION ---
import { CallProvider, useCall } from './src/context/CallContext';
import { supabase } from './src/lib/supabaseClient';


type Page = 'dashboard' | 'calls' | 'leads' | 'settings' | 'pipeline' | 'tasks' | 'targets' | 'chat' | 'gamification';

// Inner App Component (Inside Provider)
function SalesFlowApp() {
  // Theme Management
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage or system preference on init
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('isDarkMode');
      // If stored in localStorage, respect it (it might be set from DB sync previously)
      if (stored) return JSON.parse(stored);

      // Default false
      document.documentElement.classList.remove('dark');
      return false;
    }
    document.documentElement.classList.remove('dark');
    return false;
  });

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const toggleTheme = () => {
    setIsDarkMode((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem('isDarkMode', JSON.stringify(newValue));
      if (newValue) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return newValue;
    });
  };

  // Sync on mount and change
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isRemindersModalOpen, setIsRemindersModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin V4 State (Impersonation)
  const [impersonatedOrg, setImpersonatedOrg] = useState<{ id: string, name: string, center_type?: 'sales' | 'support' } | null>(null);

  // Compute effective org ID for Shadow Mode - use impersonated org if in shadow mode
  const effectiveOrgId = impersonatedOrg?.id || currentUser?.organization_id;

  // Create an effective user object that has the correct org ID and Center Type for Shadow Mode
  // MEMOIZED to prevent unnecessary re-renders
  const effectiveUser = useMemo(() => currentUser ? {
    ...currentUser,
    organization_id: effectiveOrgId || currentUser.organization_id,
    center_type: impersonatedOrg?.center_type || currentUser.center_type || 'sales'
  } : null, [currentUser, effectiveOrgId, impersonatedOrg?.center_type]);

  // Removed noisy useEffect that logged on every render

  // Logic Hooks
  const { callStatus, startCall, hangup, callSummary, clearSummary, initDevice, isReady, activeLeadId, callDuration, transcripts } = useCall();

  // Derived State
  const isCallActive = callStatus === 'connected' || callStatus === 'dialing';
  const [showCallSummary, setShowCallSummary] = useState(false);

  // --- AUTH EFFECT ---
  useEffect(() => {
    const checkSession = async () => {
      try {
        setAuthLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Fetch profile with organization center_type
          const { data: profile, error } = await supabase
            .from('profiles')
            .select(`
              *,
              organization:organizations!organization_id(center_type)
            `)
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error("Error fetching profile:", error);
            setAuthError(error.message);
            await supabase.auth.signOut();
            return;
          }

          if (profile) {
            // Flatten center_type into the user object
            const userWithCenterType: User = {
              id: profile.id,
              name: profile.full_name || 'User',
              email: profile.email,
              avatar: profile.avatar_url,
              role: profile.role, // Important for Admin check
              type: profile.role === 'platform_admin' ? 'super_admin' : profile.role, // Map to new design types
              organization_id: profile.organization_id,
              center_type: (Array.isArray(profile.organization) ? profile.organization[0]?.center_type : profile.organization?.center_type) || 'sales',
              preferences: profile.preferences // Load preferences
            } as User;

            setCurrentUser(userWithCenterType);
            setIsAuthenticated(true);

            // Apply Dark Mode Preference if exists
            if (userWithCenterType.preferences?.darkMode !== undefined) {
              setIsDarkMode(userWithCenterType.preferences.darkMode);
            }
          }
        }
      } catch (e: any) {
        console.error("Auth Error", e);
        setAuthError(e.message);
      } finally {
        setAuthLoading(false);
      }
    };
    checkSession();

    // Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- REALTIME NOTIFICATIONS ---
  useEffect(() => {
    if (!currentUser) return;

    // Listen for new leads assigned to me
    const channel = supabase.channel('public:leads:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          // Check if I am the owner
          if (payload.new.owner_id === currentUser.id) {
            // Check if notifications are enabled (default true)
            const enabled = currentUser.preferences?.leadNotifications ?? true;
            if (enabled) {
              setToast({ message: `🔔 התקבל ליד חדש: ${payload.new.name || 'ללא שם'}`, type: 'success' });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]); // Re-subscribe if currentUser changes (e.g. preferences update)


  // --- TWILIO DEVICE ---
  // Defer initialization until first user interaction to avoid AudioContext warning
  useEffect(() => {
    if (isAuthenticated && !isReady) {
      const handleUserInteraction = () => {
        initDevice();
        // Remove listeners after first interaction
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      };
      document.addEventListener('click', handleUserInteraction, { once: true });
      document.addEventListener('keydown', handleUserInteraction, { once: true });
      return () => {
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      };
    }
  }, [isAuthenticated, isReady]);

  // Handle Call Summary Modal
  useEffect(() => {
    if (callSummary) {
      setShowCallSummary(true);
    }
  }, [callSummary]);



  const handleLogin = (user: User) => {
    // This is valid for the mockup fallback, but usually handled by Supabase
    setCurrentUser(user);
    setIsAuthenticated(true);
    setActivePage('dashboard');
    // Apply preferences on login
    if (user.preferences?.darkMode !== undefined) {
      setIsDarkMode(user.preferences.darkMode);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const handleNavigate = (page: Page) => setActivePage(page);

  // Callback to update user preferences locally
  const handleUpdateUser = (updates: Partial<User>) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, ...updates });
    }
  };

  // Helper for Access Denied View
  const AccessDeniedView = () => (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-lg max-w-md text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">אין לך הרשאה לעמוד זה</h2>
        <Button onClick={() => setActivePage('dashboard')} className="w-full justify-center">
          <LayoutDashboard className="w-4 h-4 ml-2" />
          חזרה לדשבורד שלי
        </Button>
      </div>
    </div>
  );

  // --- RENDER ---

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div>;

  if (!isAuthenticated || !currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Super Admin View (With Impersonation Check)
  if (currentUser.type === 'super_admin' && !impersonatedOrg) {
    return <SuperAdminDashboard
      onLogout={handleLogout}
      onImpersonate={(orgId, orgName, centerType) => setImpersonatedOrg({ id: orgId, name: orgName, center_type: centerType })}
    />;
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 overflow-hidden">

        <Sidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          userRole={currentUser.type}
          centerType={effectiveUser?.center_type}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        <div className="flex flex-1 flex-col min-w-0">

          <TopBar
            user={currentUser}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
            onNavigate={handleNavigate}
            onOpenChat={() => setIsChatDrawerOpen(true)}
            onOpenReminders={() => setIsRemindersModalOpen(true)}
            onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            onLogout={handleLogout}
          />

          {/* Impersonation Banner */}
          {impersonatedOrg && (
            <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-bold flex justify-between items-center z-50 shadow-sm relative sticker top-0">
              <span className="flex items-center gap-2"><div className="w-2 h-2 bg-white rounded-full animate-pulse"></div> Viewing as Manager: {impersonatedOrg.name}</span>
              <button onClick={() => setImpersonatedOrg(null)} className="bg-black/20 hover:bg-black/30 px-3 py-1 rounded text-xs transition-colors">Exit Shadow Mode</button>
            </div>
          )}

          <main className="flex flex-1 overflow-hidden relative">

            {activePage === 'dashboard' ? (
              currentUser.type === 'manager' || impersonatedOrg ? (
                <ManagerDashboard
                  isDarkMode={isDarkMode}
                  orgId={impersonatedOrg?.id || currentUser.organization_id}
                  userName={currentUser.name}
                  centerType={effectiveUser?.center_type}
                  onNavigate={handleNavigate}
                />
              ) : (
                <Dashboard
                  onStartCall={() => { setActivePage('calls'); }}
                  isDarkMode={isDarkMode}
                  userName={currentUser.name}
                  centerType={effectiveUser?.center_type}
                  onNavigate={(page) => setActivePage(page as Page)}
                  orgId={effectiveOrgId}
                  userId={currentUser.id}
                  userRole={currentUser.role}
                />
              )
            ) : activePage === 'leads' ? (
              <LeadsDashboard
                isDarkMode={isDarkMode}
                orgId={effectiveOrgId}
                user={effectiveUser!}
              />
            ) : activePage === 'pipeline' ? (
              <PipelineDashboard
                isDarkMode={isDarkMode}
                currentUser={effectiveUser!}
              />
            ) : activePage === 'settings' ? (
              <SettingsDashboard
                isDarkMode={isDarkMode}
                user={currentUser}
                onLogout={handleLogout}
                toggleTheme={toggleTheme}
                onUpdateUser={handleUpdateUser}
              />
            ) : activePage === 'tasks' ? (
              <TasksDashboard
                isDarkMode={isDarkMode}
                currentUser={effectiveUser!}
              />
            ) : activePage === 'targets' ? (
              currentUser.type === 'manager' ? (
                <TargetsDashboard isDarkMode={isDarkMode} orgId={effectiveOrgId!} />
              ) : (
                <PanelDashboard
                  isDarkMode={isDarkMode}
                  onStartCall={(phone, leadId) => startCall(phone, currentUser.id, leadId)}
                  currentUser={effectiveUser!}
                />
              )
            ) : activePage === 'chat' ? (
              <TeamChatDashboard
                isDarkMode={isDarkMode}
                currentUser={effectiveUser!}
              />
            ) : activePage === 'gamification' ? (
              <GamificationDashboard
                userId={currentUser.id}
                orgId={effectiveOrgId}
              />
            ) : (
              // CALLS PAGE - Unified Component with Real Logic
              <EmptyCallState
                onStartCall={() => { }} // Deprecated - EmptyCallState now handles this internally via handleStartDialer
                isCallActive={isCallActive}
                onEndCall={hangup}
                currentUserId={currentUser.id}
                orgId={effectiveOrgId}
              />
            )}

          </main>
        </div>

        <ManagerChatDrawer
          currentUser={currentUser}
          isOpen={isChatDrawerOpen}
          onClose={() => setIsChatDrawerOpen(false)}
          orgId={effectiveOrgId}
          activeContext={activePage === 'calls' && isCallActive ? {
            type: 'call',
            id: 'c_active',
            label: 'שיחה פעילה',
            subLabel: 'Running Call...'
          } : null}
        />

        <CallSummaryModal
          leadName={activeLeadId ? 'ליד' : ''}
          leadId={activeLeadId || ''}
          callDuration={callDuration}
          transcripts={transcripts}
        />

        {/* Reminders Modal - Rendered at root for proper centering */}
        <RemindersModal
          isOpen={isRemindersModalOpen}
          onClose={() => setIsRemindersModalOpen(false)}
          userId={currentUser?.id}
          orgId={effectiveOrgId}
        />

      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';

// Wrapper to check if we're on invite route
function AppRoutes() {
  const location = useLocation();

  // If on invite path, show invitation page
  if (location.pathname.startsWith('/invite/')) {
    return <AcceptInvitationPage />;
  }

  // Otherwise show main app
  return (
    <CallProvider>
      <SalesFlowApp />
    </CallProvider>
  );
}

// Global Provider Wrapper
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/invite/:token" element={<AcceptInvitationPage />} />
          <Route path="*" element={
            <CallProvider>
              <SalesFlowApp />
            </CallProvider>
          } />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
