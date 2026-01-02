
import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  TrendingUp,
  LayoutDashboard,
  ShieldAlert
} from 'lucide-react';
import { CURRENT_USER, MANAGER_USER, SUPER_ADMIN_USER } from '../../constants';
import { User } from '../../types';
import { Button } from '../Common/Button';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('sara@salesflow.ai');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // Default to Rep for standard login flow mock
      onLogin(CURRENT_USER);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex w-full bg-white dark:bg-slate-950 font-sans overflow-hidden">
      
      {/* Right Side - Form (RTL: Visually Right) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-24 relative z-10 bg-white dark:bg-slate-950">
        
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="mb-10 text-center lg:text-right">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
               <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center text-white shadow-xl shadow-brand-500/20">
                 <LayoutDashboard className="w-7 h-7" />
               </div>
               <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">SalesFlow AI</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">ברוכים הבאים 👋</h1>
            <p className="text-slate-500 dark:text-slate-400 text-base">הכנס את הפרטים שלך כדי להתחבר למערכת.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">אימייל</label>
              <div className="relative group">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder-slate-400 group-hover:border-slate-300 dark:group-hover:border-slate-700"
                  placeholder="name@company.com"
                  dir="ltr"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">סיסמה</label>
                <a href="#" className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 transition-colors">שכחת סיסמה?</a>
              </div>
              <div className="relative group">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder-slate-400 group-hover:border-slate-300 dark:group-hover:border-slate-700"
                  placeholder="••••••••"
                  dir="ltr"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3.5 text-base font-bold justify-center shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 hover:-translate-y-0.5 transition-all duration-300"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>מתחבר...</span>
                </div>
              ) : (
                <>כניסה למערכת <ArrowRight className="w-4 h-4 mr-2 rotate-180" /></>
              )}
            </Button>
          </form>

          {/* Quick Demo Login Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-slate-950 text-slate-400 font-medium">או כניסה מהירה להדגמה</span>
            </div>
          </div>

          {/* Quick Access Grid */}
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => onLogin(CURRENT_USER)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-all group bg-white dark:bg-slate-900 shadow-sm hover:shadow-md text-center"
            >
               <img src={CURRENT_USER.avatar} className="w-8 h-8 rounded-full object-cover group-hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700" alt="Sarah" />
               <div>
                 <span className="block text-[10px] font-bold text-slate-900 dark:text-white group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">{CURRENT_USER.name}</span>
                 <span className="block text-[9px] text-slate-500">נציגה</span>
               </div>
            </button>

            <button 
              onClick={() => onLogin(MANAGER_USER)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all group bg-white dark:bg-slate-900 shadow-sm hover:shadow-md text-center"
            >
               <img src={MANAGER_USER.avatar} className="w-8 h-8 rounded-full object-cover group-hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700" alt="David" />
               <div>
                 <span className="block text-[10px] font-bold text-slate-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">{MANAGER_USER.name}</span>
                 <span className="block text-[9px] text-slate-500">מנהל</span>
               </div>
            </button>

            <button 
              onClick={() => onLogin(SUPER_ADMIN_USER)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group bg-white dark:bg-slate-900 shadow-sm hover:shadow-md text-center"
            >
               <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white border border-slate-700 group-hover:scale-110 transition-transform">
                 <ShieldAlert className="w-4 h-4" />
               </div>
               <div>
                 <span className="block text-[10px] font-bold text-slate-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">Admin</span>
                 <span className="block text-[9px] text-slate-500">System</span>
               </div>
            </button>
          </div>

        </div>
        
        {/* Footer */}
        <div className="mt-auto pt-10 text-xs text-slate-400 text-center lg:text-right">
          © 2024 SalesFlow AI. All rights reserved.
        </div>
      </div>

      {/* Left Side - Visual (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
         {/* Background Gradients */}
         <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-950 z-0"></div>
         <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen"></div>
         
         {/* Glassmorphism Card */}
         <div className="relative z-10 max-w-md w-full animate-in fade-in zoom-in-95 duration-700 delay-200">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
               
               {/* Decorative glow inside card */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl"></div>

               <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl leading-tight">ביצועים בזמן אמת</h3>
                    <p className="text-emerald-200 text-xs font-medium uppercase tracking-wide opacity-80">AI Coaching Impact</p>
                  </div>
               </div>
               
               <div className="space-y-5">
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:bg-white/10 transition-colors cursor-default">
                     <div className="flex justify-between items-center mb-3">
                        <span className="text-indigo-100 text-sm font-medium">יחס סגירה (Win Rate)</span>
                        <div className="flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 text-xs font-bold border border-emerald-500/20">
                           <TrendingUp className="w-3 h-3" /> +24%
                        </div>
                     </div>
                     <div className="w-full h-2 bg-slate-800/50 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 w-[70%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                     </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                     <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-indigo-300" />
                     </div>
                     <p className="text-indigo-100 text-sm leading-relaxed font-light">
                        "המערכת עזרה לי לזהות התנגדויות <span className="text-white font-medium border-b border-indigo-500/50">בזמן אמת</span> ולסגור 3 עסקאות נוספות החודש."
                     </p>
                  </div>
                  
                  <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                     <img src="https://picsum.photos/100/100" className="w-8 h-8 rounded-full border border-white/20" alt="Avatar" />
                     <div>
                        <span className="block text-white text-xs font-bold">שרה כהן</span>
                        <span className="block text-indigo-300 text-[10px]">נציגה מצטיינת, נובמבר 2024</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Pattern Overlay */}
         <div className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none" style={{ backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`, backgroundSize: '32px 32px' }}></div>
      </div>

    </div>
  );
};
