
import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  TrendingUp,
  LayoutDashboard,
  Quote,
  Users,
  Zap,
  Target,
  BarChart3,
  Phone
} from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';
import { User } from '../../types';
import { Button } from '../Common/Button';

interface LoginProps {
  onLogin: (user: User) => void;
}

// Rotating testimonials data
const testimonials = [
  {
    quote: "המערכת עזרה לי לזהות התנגדויות בזמן אמת ולסגור 3 עסקאות נוספות החודש.",
    author: "שרה כהן",
    role: "נציגת מכירות",
    company: "טכנולוגיות בע\"מ",
    metric: "+24%",
    metricLabel: "יחס סגירה"
  },
  {
    quote: "הקואוצ'ינג החי שינה לגמרי את הגישה שלי לשיחות מכירה. התוצאות מדברות בעד עצמן.",
    author: "דוד לוי",
    role: "מנהל צוות מכירות",
    company: "סטארטאפ ישראלי",
    metric: "+45%",
    metricLabel: "עלייה בהמרות"
  },
  {
    quote: "סוף סוף יש לי כלי שעוזר לי להבין בדיוק איפה אני מפסיד עסקאות ואיך לשפר.",
    author: "מיכל אברהם",
    role: "נציגה בכירה",
    company: "פיננסים פלוס",
    metric: "x2",
    metricLabel: "הכפלת מכירות"
  },
  {
    quote: "האנליטיקות עזרו לי לזהות את הנציגים החזקים ולשתף את הטכניקות שלהם עם כל הצוות.",
    author: "יוסי מזרחי",
    role: "סמנכ\"ל מכירות",
    company: "קבוצת השקעות",
    metric: "+38%",
    metricLabel: "צמיחה בהכנסות"
  }
];

// Features to rotate
const features = [
  { icon: Phone, title: "ניתוח שיחות בזמן אמת", desc: "AI שמקשיב ומנחה בזמן אמת" },
  { icon: Target, title: "זיהוי הזדמנויות", desc: "לא מפספסים עוד עסקאות" },
  { icon: BarChart3, title: "דוחות מתקדמים", desc: "תובנות שמובילות לפעולה" },
  { icon: Users, title: "ניהול צוות חכם", desc: "הכשרה והעצמה אוטומטית" }
];

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Rotate testimonials every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
        setIsAnimating(false);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      alert("אנא הכנס אימייל וסיסמה");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { alert("התחברות נכשלה: " + error.message); return; }

      const user = data?.user;
      if (!user) { alert("התחברות נכשלה: לא התקבל משתמש."); return; }

      let profile: any = null;
      let lastErr: any = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        const { data: fetchedProfile, error: profileErr } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, role, organization_id")
          .eq("id", user.id)
          .single();

        if (fetchedProfile) { profile = fetchedProfile; break; }

        lastErr = profileErr;
        await new Promise((r) => setTimeout(r, 600));
      }

      if (!profile) {
        console.error("Profile fetch failed:", lastErr);
        alert("ההתחברות הצליחה אבל הפרופיל לא נמצא. נסה שוב בעוד רגע.");
        return;
      }

      const mappedType =
        profile.role === "platform_admin" ? "super_admin" :
          profile.role === "manager" ? "manager" :
            "rep";

      console.log('[Login] User logged in with org:', profile.organization_id);

      onLogin({
        id: profile.id,
        name: profile.full_name || "User",
        role: profile.role,
        avatar: profile.avatar_url,
        type: mappedType,
        organization_id: profile.organization_id
      });

    } catch (err) {
      console.error("Login Error:", err);
      alert("שגיאה לא צפויה בהתחברות. בדוק את הקונסולה.");
    } finally {
      setIsLoading(false);
    }
  };

  const testimonial = testimonials[currentTestimonial];

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

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            אין לך חשבון עדיין?{' '}
            <a href="#" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
              צור קשר למידע נוסף
            </a>
          </p>

        </div>

        {/* Footer */}
        <div className="mt-auto pt-10 text-xs text-slate-400 text-center lg:text-right">
          © 2024 SalesFlow AI. כל הזכויות שמורות.
        </div>
      </div>

      {/* Left Side - Visual with Rotating Content (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-950 to-purple-900 z-0"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] mix-blend-screen"></div>

        {/* Content Container */}
        <div className="relative z-10 max-w-lg w-full px-12 flex flex-col gap-8">

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all group"
              >
                <feature.icon className="w-6 h-6 text-brand-400 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-white font-semibold text-sm mb-1">{feature.title}</h4>
                <p className="text-indigo-200/70 text-xs">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Testimonial Card with Rotation */}
          <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl"></div>

            {/* Quote Icon */}
            <Quote className="w-10 h-10 text-brand-400/30 mb-4" />

            {/* Quote Text */}
            <p className="text-white text-lg leading-relaxed mb-6 font-light">
              "{testimonial.quote}"
            </p>

            {/* Author Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  {testimonial.author.charAt(0)}
                </div>
                <div>
                  <span className="block text-white font-bold">{testimonial.author}</span>
                  <span className="block text-indigo-300 text-sm">{testimonial.role}, {testimonial.company}</span>
                </div>
              </div>

              {/* Metric Badge */}
              <div className="text-center">
                <div className="flex items-center gap-1 bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 text-lg font-bold">{testimonial.metric}</span>
                </div>
                <span className="text-emerald-200/60 text-xs mt-1 block">{testimonial.metricLabel}</span>
              </div>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setIsAnimating(true);
                    setTimeout(() => {
                      setCurrentTestimonial(idx);
                      setIsAnimating(false);
                    }, 300);
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentTestimonial
                      ? 'bg-brand-400 w-6'
                      : 'bg-white/20 hover:bg-white/40'
                    }`}
                />
              ))}
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <span className="block text-3xl font-bold text-white">500+</span>
              <span className="text-indigo-300/70 text-sm">מוקדי מכירות</span>
            </div>
            <div className="text-center border-x border-white/10 px-8">
              <span className="block text-3xl font-bold text-white">2M+</span>
              <span className="text-indigo-300/70 text-sm">שיחות מנותחות</span>
            </div>
            <div className="text-center">
              <span className="block text-3xl font-bold text-white">+35%</span>
              <span className="text-indigo-300/70 text-sm">עלייה ממוצעת</span>
            </div>
          </div>
        </div>

        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none" style={{ backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`, backgroundSize: '32px 32px' }}></div>
      </div>

    </div>
  );
};
