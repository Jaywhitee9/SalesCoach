
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
  Target,
  BarChart3,
  Phone,
  Send,
  User,
  Building2,
  MessageSquare
} from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';
import { User as UserType } from '../../types';
import { Button } from '../Common/Button';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

// Rotating testimonials data
const testimonials = [
  {
    quote: "המערכת עזרה לי לזהות התנגדויות בזמן אמת ולסגור 3 עסקאות נוספות החודש.",
    author: "שרה כהן",
    role: "נציגת מכירות",
    company: "טכנולוגיות בע\"מ",
    metric: "+24%",
    metricLabel: "יחס סגירה",
    initial: "ש"
  },
  {
    quote: "הקואוצ'ינג החי שינה לגמרי את הגישה שלי לשיחות מכירה. התוצאות מדברות בעד עצמן.",
    author: "דוד לוי",
    role: "מנהל צוות מכירות",
    company: "סטארטאפ ישראלי",
    metric: "+45%",
    metricLabel: "עלייה בהמרות",
    initial: "ד"
  },
  {
    quote: "סוף סוף יש לי כלי שעוזר לי להבין בדיוק איפה אני מפסיד עסקאות ואיך לשפר.",
    author: "מיכל אברהם",
    role: "נציגה בכירה",
    company: "פיננסים פלוס",
    metric: "x2",
    metricLabel: "הכפלת מכירות",
    initial: "מ"
  },
  {
    quote: "האנליטיקות עזרו לי לזהות את הנציגים החזקים ולשתף את הטכניקות שלהם עם כל הצוות.",
    author: "יוסי מזרחי",
    role: "סמנכ\"ל מכירות",
    company: "קבוצת השקעות",
    metric: "+38%",
    metricLabel: "צמיחה בהכנסות",
    initial: "י"
  }
];

// Features - static, not rotating
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

  // Contact form state
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Rotate testimonials every 6 seconds (slower)
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
        setIsAnimating(false);
      }, 400);
    }, 6000);
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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate submission
    await new Promise(r => setTimeout(r, 1500));

    // In production, you would send this data to your backend
    console.log('Contact form submitted:', contactForm);

    setIsSubmitting(false);
    setSubmitSuccess(true);
  };

  const testimonial = testimonials[currentTestimonial];

  // Contact Form View
  if (showContactForm) {
    return (
      <div className="min-h-screen flex w-full bg-white dark:bg-slate-950 font-sans overflow-hidden animate-in fade-in duration-300">
        {/* Right Side - Contact Form */}
        <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center items-center p-8 lg:p-16 relative z-10 bg-white dark:bg-slate-950">
          <div className="w-full max-w-md animate-in fade-in slide-in-from-right-4 duration-500">

            {/* Back Button - Arrow points RIGHT for RTL */}
            <button
              onClick={() => { setShowContactForm(false); setSubmitSuccess(false); }}
              className="flex items-center gap-2 text-slate-500 hover:text-brand-600 mb-8 transition-all hover:gap-3"
            >
              <ArrowRight className="w-4 h-4" />
              <span>חזרה להתחברות</span>
            </button>

            {/* Header */}
            <div className="mb-8 text-center lg:text-right">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center text-white shadow-xl shadow-brand-500/20">
                  <LayoutDashboard className="w-7 h-7" />
                </div>
                <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">SalesFlow AI</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">צור קשר 📞</h1>
              <p className="text-slate-500 dark:text-slate-400 text-base">מעוניינים לשמוע עוד? השאירו פרטים ונחזור אליכם בהקדם.</p>
            </div>

            {submitSuccess ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8 text-center animate-in fade-in zoom-in">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mb-2">הפנייה נשלחה בהצלחה!</h3>
                <p className="text-emerald-600 dark:text-emerald-400">נציג שלנו יצור איתך קשר בקרוב.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">שם מלא</label>
                  <div className="relative group">
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder-slate-400"
                      placeholder="הכנס את שמך המלא"
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">אימייל</label>
                  <div className="relative group">
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder-slate-400"
                      placeholder="name@company.com"
                      dir="ltr"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Phone & Company Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">טלפון</label>
                    <div className="relative group">
                      <input
                        type="tel"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder-slate-400"
                        placeholder="050-000-0000"
                        dir="ltr"
                      />
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">חברה</label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={contactForm.company}
                        onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder-slate-400"
                        placeholder="שם החברה"
                      />
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">הודעה (אופציונלי)</label>
                  <div className="relative group">
                    <textarea
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder-slate-400 resize-none"
                      placeholder="ספר לנו על הצרכים שלך..."
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 text-base font-bold justify-center shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 hover:-translate-y-0.5 transition-all duration-300"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>שולח...</span>
                    </div>
                  ) : (
                    <>שלח פנייה <Send className="w-4 h-4 mr-2" /></>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto pt-10 text-xs text-slate-400 text-center lg:text-right">
            © 2024 SalesFlow AI. כל הזכויות שמורות.
          </div>
        </div>

        {/* Left Side - Same Visual */}
        <LeftPanel testimonial={testimonial} currentTestimonial={currentTestimonial} isAnimating={isAnimating} setCurrentTestimonial={setCurrentTestimonial} setIsAnimating={setIsAnimating} />
      </div>
    );
  }

  // Login Form View
  return (
    <div className="min-h-screen flex w-full bg-white dark:bg-slate-950 font-sans overflow-hidden">

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center items-center p-8 lg:p-16 relative z-10 bg-white dark:bg-slate-950">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Header */}
          <div className="mb-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
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
            <button
              onClick={() => setShowContactForm(true)}
              className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 transition-colors"
            >
              צור קשר למידע נוסף
            </button>
          </p>

          {/* Footer - Inside the form container */}
          <div className="mt-10 text-xs text-slate-400 text-center">
            © 2024 SalesFlow AI. כל הזכויות שמורות.
          </div>

        </div>
      </div>

      {/* Left Side - Visual */}
      <LeftPanel testimonial={testimonial} currentTestimonial={currentTestimonial} isAnimating={isAnimating} setCurrentTestimonial={setCurrentTestimonial} setIsAnimating={setIsAnimating} />
    </div>
  );
};

// Extracted Left Panel Component
const LeftPanel = ({ testimonial, currentTestimonial, isAnimating, setCurrentTestimonial, setIsAnimating }: any) => (
  <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
    {/* Background Gradients */}
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-950 to-purple-900 z-0"></div>
    <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
    <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen"></div>
    <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] mix-blend-screen"></div>

    {/* Content Container */}
    <div className="relative z-10 max-w-lg w-full px-12 flex flex-col gap-6">

      {/* Testimonial Card - NOW AT TOP */}
      <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all duration-500 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl"></div>

        {/* Quote Icon */}
        <Quote className="w-8 h-8 text-brand-400/40 mb-3" />

        {/* Quote Text */}
        <p className="text-white text-base leading-relaxed mb-5">
          "{testimonial.quote}"
        </p>

        {/* Author Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {testimonial.initial}
            </div>
            <div>
              <span className="block text-white font-bold text-sm">{testimonial.author}</span>
              <span className="block text-indigo-300/80 text-xs">{testimonial.role}</span>
            </div>
          </div>

          {/* Metric Badge */}
          <div className="text-center">
            <div className="flex items-center gap-1 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 text-sm font-bold">{testimonial.metric}</span>
            </div>
            <span className="text-emerald-200/50 text-[10px] mt-0.5 block">{testimonial.metricLabel}</span>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mt-5">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsAnimating(true);
                setTimeout(() => {
                  setCurrentTestimonial(idx);
                  setIsAnimating(false);
                }, 400);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentTestimonial
                ? 'bg-brand-400 w-6'
                : 'bg-white/20 hover:bg-white/40 w-1.5'
                }`}
            />
          ))}
        </div>
      </div>

      {/* Features Grid - NOW BELOW TESTIMONIALS */}
      <div className="grid grid-cols-2 gap-3">
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all group"
          >
            <feature.icon className="w-5 h-5 text-brand-400 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-white font-semibold text-sm mb-0.5">{feature.title}</h4>
            <p className="text-indigo-200/60 text-xs">{feature.desc}</p>
          </div>
        ))}
      </div>

      {/* Stats Row */}
      <div className="flex justify-center gap-6 pt-2">
        <div className="text-center">
          <span className="block text-2xl font-bold text-white">500+</span>
          <span className="text-indigo-300/60 text-xs">מוקדי מכירות</span>
        </div>
        <div className="text-center border-x border-white/10 px-6">
          <span className="block text-2xl font-bold text-white">2M+</span>
          <span className="text-indigo-300/60 text-xs">שיחות מנותחות</span>
        </div>
        <div className="text-center">
          <span className="block text-2xl font-bold text-white">+35%</span>
          <span className="text-indigo-300/60 text-xs">עלייה ממוצעת</span>
        </div>
      </div>
    </div>

    {/* Pattern Overlay */}
    <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none" style={{ backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`, backgroundSize: '32px 32px' }}></div>
  </div>
);
