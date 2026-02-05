
import React, { useState } from 'react';
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
import { TeamChatDashboard } from './components/Chat/TeamChatDashboard';
import { ManagerChatDrawer } from './components/Chat/ManagerChatDrawer';
import { SuperAdminDashboard } from './components/SuperAdmin/SuperAdminDashboard';
import { Login } from './components/Auth/Login';
import { Button } from './components/Common/Button';
import { Lock, LayoutDashboard } from 'lucide-react';
import { 
  CURRENT_USER, 
  CURRENT_LEAD
} from './constants';
import { User } from './types';

type Page = 'dashboard' | 'calls' | 'leads' | 'settings' | 'pipeline' | 'tasks' | 'targets' | 'chat';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Call State
  const [isCallActive, setIsCallActive] = useState(false);
  const [showCallSummary, setShowCallSummary] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<User>(CURRENT_USER);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(CURRENT_USER);
  };

  const handleNavigate = (page: Page) => {
    setActivePage(page);
  };

  // Call Handlers
  const startCall = () => {
    if (activePage !== 'calls') {
      setActivePage('calls');
    }
    setIsCallActive(true);
    setShowCallSummary(false);
  };

  const endCall = () => {
    setIsCallActive(false);
    setShowCallSummary(true);
  };

  const handleSaveSummary = (data: any) => {
    console.log("Call Summary Saved:", data);
    setShowCallSummary(false);
  };

  // Helper for Access Denied View
  const AccessDeniedView = () => (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-lg max-w-md text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">אין לך הרשאה לעמוד זה</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
          מסך זה זמין רק לבעלי הרשאות מתאימות. <br/>
          אנא חזור לדשבורד שלך.
        </p>
        <Button onClick={() => setActivePage('dashboard')} className="w-full justify-center">
          <LayoutDashboard className="w-4 h-4 ml-2" />
          חזרה לדשבורד שלי
        </Button>
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (currentUser.type === 'super_admin') {
    return <SuperAdminDashboard onLogout={handleLogout} />;
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
              onOpenChat={() => setIsChatDrawerOpen(true)}
              onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />

            <main className="flex flex-1 overflow-hidden relative">
              
              {activePage === 'dashboard' ? (
                currentUser.type === 'manager' ? (
                  <ManagerDashboard isDarkMode={isDarkMode} />
                ) : (
                  <Dashboard 
                    onStartCall={startCall} 
                    isDarkMode={isDarkMode}
                  />
                )
              ) : activePage === 'leads' ? (
                <LeadsDashboard isDarkMode={isDarkMode} />
              ) : activePage === 'pipeline' ? (
                <PipelineDashboard 
                  isDarkMode={isDarkMode} 
                  currentUser={currentUser}
                />
              ) : activePage === 'settings' ? (
                <SettingsDashboard 
                  isDarkMode={isDarkMode} 
                  user={currentUser}
                />
              ) : activePage === 'tasks' ? (
                <TasksDashboard 
                  isDarkMode={isDarkMode} 
                  currentUser={currentUser}
                />
              ) : activePage === 'targets' ? (
                currentUser.type === 'manager' ? (
                  <TargetsDashboard isDarkMode={isDarkMode} />
                ) : (
                  <AccessDeniedView />
                )
              ) : activePage === 'chat' ? (
                <TeamChatDashboard 
                  isDarkMode={isDarkMode}
                />
              ) : (
                // CALLS PAGE - Unified Component
                <EmptyCallState 
                  onStartCall={startCall} 
                  isCallActive={isCallActive}
                  onEndCall={endCall}
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
              label: 'שיחה פעילה: מיכאל רוס',
              subLabel: '08:42 • ציון איכות 88'
            } : null}
          />

          <CallSummaryModal 
            isOpen={showCallSummary}
            onClose={() => setShowCallSummary(false)}
            onSave={handleSaveSummary}
            leadName={CURRENT_LEAD.name}
          />

        </div>
    </div>
  );
}

export default App;
