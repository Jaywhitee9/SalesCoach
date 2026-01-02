
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { TopBar } from './components/Layout/TopBar';
import { EmptyCallState } from './components/Call/EmptyCallState';
import { CallSummaryModal } from './components/Call/CallSummaryModal';
import { Dashboard } from './components/Dashboard/Dashboard';
import { ManagerDashboard } from './components/Dashboard/ManagerDashboard';
import { LeadsDashboard } from './components/Leads/LeadsDashboard';
import { PipelineDashboard } from './components/Pipeline/PipelineDashboard';
import { SettingsDashboard } from './components/Settings/SettingsDashboard';
import { TasksDashboard } from './components/Tasks/TasksDashboard';
import { TargetsDashboard } from './components/Targets/TargetsDashboard';
import { PanelDashboard } from './components/Panel/PanelDashboard';
import { TeamChatDashboard } from './components/Chat/TeamChatDashboard';
import { ManagerChatDrawer } from './components/Chat/ManagerChatDrawer';
import { SuperAdminDashboard } from './components/SuperAdmin/SuperAdminDashboard';
import { Login } from './components/Auth/Login';
import { Button } from './components/Common/Button';
import { Lock, LayoutDashboard, Loader2, AlertTriangle } from 'lucide-react';
import {
  CURRENT_USER
} from './constants';
import { User } from './types';

// --- LOGIC INJECTION ---
import { CallProvider, useCall } from './src/context/CallContext';
import { supabase } from './src/lib/supabaseClient';


type Page = 'dashboard' | 'calls' | 'leads' | 'settings' | 'pipeline' | 'tasks' | 'targets' | 'chat';

// Inner App Component (Inside Provider)
function SalesFlowApp() {
  // Theme Management
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage or system preference on init
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('isDarkMode');
      if (saved !== null) {
        return JSON.parse(saved);
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const toggleTheme = () => {
    setIsDarkMode((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem('isDarkMode', JSON.stringify(newValue));
      return newValue;
    });
  };
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin V4 State (Impersonation)
  const [impersonatedOrg, setImpersonatedOrg] = useState<{ id: string, name: string } | null>(null);

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
          const { data: profile } = await supabase
            .from('profiles')
            .select('*, organizations(name, status)')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setCurrentUser({
              id: profile.id,
              name: profile.full_name || 'User',
              email: profile.email,
              avatar: profile.avatar_url,
              role: profile.role, // Important for Admin check
              type: profile.role === 'platform_admin' ? 'super_admin' : profile.role, // Map to new design types
              organization_id: profile.organization_id
            } as User);
            setIsAuthenticated(true);
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

  // --- TWILIO DEVICE ---
  useEffect(() => {
    // Initialize Twilio device when authenticated
    if (isAuthenticated && !isReady) {
      initDevice();
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
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const handleNavigate = (page: Page) => setActivePage(page);

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
      onImpersonate={(orgId, orgName) => setImpersonatedOrg({ id: orgId, name: orgName })}
    />;
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 overflow-hidden">

        <Sidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          userRole={currentUser.type}
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
                  onNavigate={handleNavigate}
                />
              ) : (
                <Dashboard
                  onStartCall={() => { setActivePage('calls'); }}
                  isDarkMode={isDarkMode}
                  userName={currentUser.name}
                  onNavigate={(page) => setActivePage(page as Page)}
                />
              )
            ) : activePage === 'leads' ? (
              <LeadsDashboard
                isDarkMode={isDarkMode}
                orgId={impersonatedOrg?.id || currentUser.organization_id}
                user={currentUser}
              />
            ) : activePage === 'pipeline' ? (
              <PipelineDashboard
                isDarkMode={isDarkMode}
                currentUser={currentUser}
              />
            ) : activePage === 'settings' ? (
              <SettingsDashboard
                isDarkMode={isDarkMode}
                user={currentUser}
                onLogout={handleLogout}
                toggleTheme={toggleTheme}
              />
            ) : activePage === 'tasks' ? (
              <TasksDashboard
                isDarkMode={isDarkMode}
                currentUser={currentUser}
              />
            ) : activePage === 'targets' ? (
              currentUser.type === 'manager' ? (
                <TargetsDashboard isDarkMode={isDarkMode} orgId={currentUser.organization_id} />
              ) : (
                <PanelDashboard
                  isDarkMode={isDarkMode}
                  onStartCall={(phone, leadId) => startCall(phone, currentUser.id, leadId)}
                  currentUser={currentUser}
                />
              )
            ) : activePage === 'chat' ? (
              <TeamChatDashboard
                isDarkMode={isDarkMode}
                currentUser={currentUser}
              />
            ) : (
              // CALLS PAGE - Unified Component with Real Logic
              <EmptyCallState
                onStartCall={() => { }} // Deprecated - EmptyCallState now handles this internally via handleStartDialer
                isCallActive={isCallActive}
                onEndCall={hangup}
                currentUserId={currentUser.id}
              />
            )}

          </main>
        </div>

        <ManagerChatDrawer
          currentUser={currentUser}
          isOpen={isChatDrawerOpen}
          onClose={() => setIsChatDrawerOpen(false)}
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

      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AcceptInvitationPage } from './components/Auth/AcceptInvitationPage';

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
  );
}
