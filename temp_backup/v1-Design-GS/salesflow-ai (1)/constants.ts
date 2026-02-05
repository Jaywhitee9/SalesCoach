
import { Stage, Message, Insight, CoachSuggestion, Lead, LeadAtRisk, User, KPIMetric, DashboardTask, RecentCall, ServiceStatus, DailyTip, PipelineStage, FunnelStage, SourceMetric, Deal, TeamMember, RepCapacity, RepTargets, ChatThread, Organization } from './types';

export const CURRENT_USER: User = {
  id: 'u1',
  name: 'שרה כהן',
  role: 'נציגת מכירות',
  avatar: 'https://picsum.photos/100/100',
  type: 'rep'
};

export const MANAGER_USER: User = {
  id: 'u2',
  name: 'דוד לוי',
  role: 'מנהל מכירות',
  avatar: 'https://picsum.photos/id/1005/100/100',
  type: 'manager'
};

export const SUPER_ADMIN_USER: User = {
  id: 'sa1',
  name: 'מערכת',
  role: 'Super Admin',
  avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=0f172a&color=fff',
  type: 'super_admin'
};

export const TEAM_MEMBERS: User[] = [
  CURRENT_USER,
  { id: 'u3', name: 'רון לוי', role: 'נציג מכירות', avatar: 'https://picsum.photos/id/1012/100/100', type: 'rep' },
  { id: 'u4', name: 'דניאל ירון', role: 'נציג מכירות', avatar: 'https://picsum.photos/id/1025/100/100', type: 'rep' },
  { id: 'u5', name: 'נועה בר', role: 'נציגת מכירות', avatar: 'https://picsum.photos/id/1027/100/100', type: 'rep' },
];

// --- MOCK CHAT DATA ---
export const MOCK_CHATS: ChatThread[] = [
  {
    id: 'u1',
    repId: 'u1', // Sarah
    lastMessage: 'תודה דוד, אנסה ליישם בשיחה הבאה.',
    lastMessageTime: '10:45',
    unreadCount: 0,
    messages: [
      { id: 'm1', senderId: 'u1', text: 'דוד, יש לי שאלה לגבי הלקוח "ספקטרה". הוא מתעקש על הנחה של 15%.', timestamp: '10:30', isRead: true, context: { type: 'lead', id: 'l1', label: 'ספקטרה דיינמיקס', subLabel: 'שווי: ₪45,000' } },
      { id: 'm2', senderId: 'u2', text: 'היי שרה. בגלל שזה סוף רבעון, אנחנו יכולים לאשר עד 12% אם הוא סוגר החודש. תנסי למכור לו את הערך של התמיכה המורחבת במקום.', timestamp: '10:35', isRead: true },
      { id: 'm3', senderId: 'u1', text: 'מעולה, רעיון טוב. אציע לו את חבילת ה-Premium Support.', timestamp: '10:36', isRead: true },
      { id: 'm4', senderId: 'u2', text: 'בדיוק. תעדכני איך הלך!', timestamp: '10:40', isRead: true },
      { id: 'm5', senderId: 'u1', text: 'תודה דוד, אנסה ליישם בשיחה הבאה.', timestamp: '10:45', isRead: true },
    ]
  },
  {
    id: 'u3',
    repId: 'u3', // Ron
    lastMessage: 'שים לב לשיחה האחרונה שלי, היה שם משהו מוזר.',
    lastMessageTime: '09:15',
    unreadCount: 1,
    messages: [
      { id: 'm1', senderId: 'u3', text: 'בוקר טוב, מתי יש לנו ישיבת צוות?', timestamp: '09:00', isRead: true },
      { id: 'm2', senderId: 'u2', text: 'ב-14:00, אל תשכח להכין את הדוחות.', timestamp: '09:05', isRead: true },
      { id: 'm3', senderId: 'u3', text: 'שים לב לשיחה האחרונה שלי, היה שם משהו מוזר.', timestamp: '09:15', isRead: false, context: { type: 'call', id: 'c99', label: 'שיחה עם גיל', subLabel: 'ציון איכות: 65' } },
    ]
  },
  {
    id: 'u4',
    repId: 'u4', // Daniel
    lastMessage: 'אין בעיה, מטפל בזה.',
    lastMessageTime: 'אתמול',
    unreadCount: 0,
    messages: [
      { id: 'm1', senderId: 'u2', text: 'דניאל, שים לב שיש לך 3 לידים בסטטוס "חדש" כבר יומיים.', timestamp: 'אתמול', isRead: true },
      { id: 'm2', senderId: 'u4', text: 'אין בעיה, מטפל בזה.', timestamp: 'אתמול', isRead: true },
    ]
  },
  {
    id: 'u5',
    repId: 'u5', // Noa
    lastMessage: 'מעולה תודה!',
    lastMessageTime: 'אתמול',
    unreadCount: 0,
    messages: [
      { id: 'm1', senderId: 'u5', text: 'היי, איך אני מעבירה ליד לארכיון?', timestamp: 'אתמול', isRead: true },
      { id: 'm2', senderId: 'u2', text: 'כפתור ימני על הליד -> ארכיון.', timestamp: 'אתמול', isRead: true },
      { id: 'm3', senderId: 'u5', text: 'מעולה תודה!', timestamp: 'אתמול', isRead: true },
    ]
  }
];

export const MOCK_REP_TARGETS: RepTargets[] = [
  {
    id: 'rt1',
    userId: 'u1', // Sarah
    period: 'day',
    calls: { target: 60, current: 45 },
    connectedCalls: { target: 20, current: 18 },
    talkTime: { target: 120, current: 95 }, // Minutes
    deals: { target: 2, current: 1 },
    revenue: { target: 150000, current: 112000 }, // Monthly Rev Context usually
    productivityScore: 92
  },
  {
    id: 'rt2',
    userId: 'u3', // Ron
    period: 'day',
    calls: { target: 60, current: 55 },
    connectedCalls: { target: 20, current: 12 },
    talkTime: { target: 120, current: 80 },
    deals: { target: 2, current: 0 },
    revenue: { target: 150000, current: 85000 },
    productivityScore: 78
  },
  {
    id: 'rt3',
    userId: 'u4', // Daniel
    period: 'day',
    calls: { target: 50, current: 52 },
    connectedCalls: { target: 15, current: 16 },
    talkTime: { target: 100, current: 110 },
    deals: { target: 1, current: 2 },
    revenue: { target: 120000, current: 135000 },
    productivityScore: 95
  },
  {
    id: 'rt4',
    userId: 'u5', // Noa
    period: 'day',
    calls: { target: 40, current: 15 },
    connectedCalls: { target: 12, current: 4 },
    talkTime: { target: 80, current: 30 },
    deals: { target: 1, current: 0 },
    revenue: { target: 100000, current: 42000 },
    productivityScore: 60
  },
];

export const CURRENT_LEAD: Lead = {
  id: 'l1',
  name: 'מיכאל רוס',
  company: 'ספקטרה דיינמיקס',
  phone: '050-1234567',
  email: 'm.ross@spectra.com',
  status: 'New',
  priority: 'Hot',
  value: '₪45,000'
};

export const MOCK_LEADS: Lead[] = [
  {
    id: 'l1',
    name: 'מיכאל רוס',
    company: 'ספקטרה דיינמיקס',
    phone: '050-1234567',
    email: 'm.ross@spectra.com',
    status: 'New',
    priority: 'Hot',
    value: '₪45,000',
    owner: CURRENT_USER,
    source: 'Website',
    score: 92,
    lastActivity: 'לפני 10 דק׳',
    nextStep: 'שיחת גילוי צרכים',
    tags: ['SaaS', 'High Intent'],
    createdAt: '10/11/2024'
  },
  {
    id: 'l2',
    name: 'ענת גולן',
    company: 'טכנולוגיות מתקדמות',
    phone: '052-9876543',
    email: 'anat@tech-adv.co.il',
    status: 'Discovery',
    priority: 'Warm',
    value: '₪120,000',
    owner: TEAM_MEMBERS[1],
    source: 'LinkedIn',
    score: 78,
    lastActivity: 'אתמול',
    nextStep: 'שליחת מצגת',
    tags: ['Enterprise'],
    createdAt: '08/11/2024'
  },
  {
    id: 'l3',
    name: 'יוסי ברק',
    company: 'ברק השקעות',
    phone: '054-1112223',
    email: 'yossi@barak-inv.com',
    status: 'Negotiation',
    priority: 'Hot',
    value: '₪85,000',
    owner: TEAM_MEMBERS[2],
    source: 'Referral',
    score: 88,
    lastActivity: 'לפני 3 שעות',
    nextStep: 'חתימה על חוזה',
    tags: ['Finance'],
    createdAt: '01/11/2024'
  },
  {
    id: 'l4',
    name: 'דנה שפירא',
    company: 'סטארט-אפ ניישן',
    phone: '053-3334445',
    email: 'dana@startup.io',
    status: 'Proposal',
    priority: 'Warm',
    value: '₪60,000',
    owner: CURRENT_USER,
    source: 'Webinar',
    score: 65,
    lastActivity: 'לפני יומיים',
    nextStep: 'פולואפ הצעת מחיר',
    tags: ['Startup'],
    createdAt: '05/11/2024'
  },
  {
    id: 'l5',
    name: 'אבי כהן',
    company: 'לוגיסטיקה פלוס',
    phone: '050-5556667',
    email: 'avi@logistics.com',
    status: 'Closed',
    priority: 'Cold',
    value: '₪30,000',
    owner: TEAM_MEMBERS[1],
    source: 'Cold Call',
    score: 45,
    lastActivity: 'לפני שבוע',
    nextStep: 'אין - נסגר',
    tags: [],
    createdAt: '20/10/2024'
  },
  {
    id: 'l6',
    name: 'רונית אברהם',
    company: 'משרד עו"ד אברהם',
    phone: '052-2223334',
    email: 'ronit@law.co.il',
    status: 'New',
    priority: 'Hot',
    value: '₪25,000',
    owner: CURRENT_USER,
    source: 'Facebook Ads',
    score: 85,
    lastActivity: 'היום',
    nextStep: 'תיאום פגישה',
    tags: ['Legal', 'SMB'],
    createdAt: '11/11/2024'
  },
  {
    id: 'l7',
    name: 'גיא פלד',
    company: 'סייבר סקיוריטי',
    phone: '054-9998887',
    email: 'guy@cyber.io',
    status: 'Discovery',
    priority: 'Warm',
    value: '₪150,000',
    owner: TEAM_MEMBERS[2],
    source: 'Partner',
    score: 72,
    lastActivity: 'לפני 5 שעות',
    nextStep: 'דמו טכני',
    tags: ['Cyber', 'Global'],
    createdAt: '09/11/2024'
  }
];

export const CALL_STAGES: Stage[] = [
  { id: 's1', label: 'היכרות', description: 'ברכה וסדר יום', status: 'completed' },
  { id: 's2', label: 'גילוי צרכים', description: 'כאבים וצרכים', status: 'completed' },
  { id: 's3', label: 'חזון', description: 'תוצאה רצויה', status: 'current' },
  { id: 's4', label: 'הצעה / ROI', description: 'הצגת הפתרון', status: 'upcoming' },
  { id: 's5', label: 'התנגדויות', description: 'טיפול בחששות', status: 'upcoming' },
  { id: 's6', label: 'סגירה', description: 'הגדרת צעדים הבאים', status: 'upcoming' },
];

export const MOCK_TRANSCRIPT: Message[] = [
  { id: 'm1', speaker: 'agent', text: "היי מיכאל, תודה שהצטרפת לשיחה. עשיתי קצת מחקר על ספקטרה דיינמיקס, אבל אשמח לשמוע במילים שלך מה גרם לך לפנות אלינו היום.", timestamp: '10:02' },
  { id: 'm2', speaker: 'customer', text: "תודה שרה. בגדול, ה-CRM הנוכחי שלנו פשוט מסורבל מדי. הצוות שלי מבזבז יותר זמן על הזנת נתונים מאשר על מכירות.", timestamp: '10:03', sentiment: 'negative' },
  { id: 'm3', speaker: 'agent', text: "אני שומעת את זה הרבה. כשאתה אומר 'מסורבל', הכוונה למהירות הממשק או לכמות השדות הנדרשים?", timestamp: '10:03' },
  { id: 'm4', speaker: 'customer', text: "גם וגם, האמת. והאפליקציה לנייד לא קיימת. יש לנו אנשי שטח שלא יכולים לעדכן עסקאות עד שהם חוזרים למשרד.", timestamp: '10:04', highlight: true },
  { id: 'm5', speaker: 'agent', text: "זה נשמע מתסכל. חוסר נראות בזמן אמת בטח פוגע בתחזיות שלכם.", timestamp: '10:04' },
  { id: 'm6', speaker: 'customer', text: "בדיוק. פספסנו את היעד של הרבעון השלישי בגלל ששלוש עסקאות גדולות התעכבו ואף אחד לא ידע עד השבוע האחרון.", timestamp: '10:05', sentiment: 'negative' },
  { id: 'm7', speaker: 'agent', text: "הבנתי. אז אם יכולנו לפתור את הגישה מהנייד ולפשט את תהליך ההזנה, איזו השפעה הייתה לזה על היעילות של הצוות?", timestamp: '10:06' },
  { id: 'm8', speaker: 'customer', text: "זה יהיה ענק. כנראה יחסוך לכל נציג 5 שעות בשבוע. אבל אני מודאג מהמחיר. יש לנו תקציב קשוח.", timestamp: '10:06', highlight: true },
];

export const AI_COACH_MESSAGES: CoachSuggestion[] = [
  { id: 'c1', text: "שאלה פתוחה מצוינת לגבי ההשפעה.", type: 'info' },
  { id: 'c2', text: "הלקוח הזכיר 'תקציב' - אל תורידי מחיר עדיין. ודאי ערך קודם.", type: 'warning' },
  { id: 'c3', text: "שאלי עכשיו לגבי לוח הזמנים לקבלת החלטה.", type: 'tip' },
];

export const INITIAL_INSIGHTS: Insight[] = [
  { id: 'i1', type: 'key_point', title: 'כאב: ה-CRM הנוכחי איטי וחסר אפליקציה לנייד' },
  { id: 'i2', type: 'key_point', title: 'מטרה: לחסוך לנציגים 5 שעות בשבוע' },
  { id: 'i3', type: 'objection', title: 'חשש ממחיר / תקציב' },
  { id: 'i4', type: 'next_step', title: 'הדגמת יכולות המובייל', completed: false },
  { id: 'i5', type: 'next_step', title: 'שליחת מחשבון ROI ומקרה בוחן', completed: false },
];

// --- DASHBOARD MOCK DATA (REP) ---

export const DASHBOARD_KPIS: KPIMetric[] = [
  { label: 'שיחות מתוכננות', value: '8', trend: 'היום', trendDirection: 'neutral', subtext: '2 ממתינות' },
  { label: 'שיחות שהושלמו', value: '4', trend: '50%', trendDirection: 'up', subtext: 'יעד יומי: 8' },
  { label: 'פגישות שנקבעו', value: '2', trend: '+1', trendDirection: 'up', subtext: 'המרה גבוהה' },
  { label: 'ציון איכות שלי', value: '92', trend: '+4%', trendDirection: 'up', subtext: 'ממוצע שבועי' },
];

export const TODAYS_CALLS: RecentCall[] = [
  { id: 'c1', leadName: 'דנה לוי', status: 'Completed', outcome: 'נקבעה פגישה', time: '09:30', qualityScore: 92 },
  { id: 'c2', leadName: 'רון שחר', status: 'Completed', outcome: 'לא מעוניין', time: '10:15', qualityScore: 65 },
  { id: 'c3', leadName: 'מיכאל רוס', status: 'In Progress', outcome: 'בתהליך', time: 'עכשיו', qualityScore: 88 },
  { id: 'c4', leadName: 'עינת בר', status: 'Scheduled', outcome: 'שיחת היכרות', time: '14:00' },
  { id: 'c5', leadName: 'יוסי כהן', status: 'Scheduled', outcome: 'פולו-אפ הצעת מחיר', time: '15:30' },
  { id: 'c6', leadName: 'תמר גולן', status: 'Scheduled', outcome: 'שיחת סגירה', time: '16:15' },
];

export const DASHBOARD_TASKS: DashboardTask[] = [
  { id: 't1', title: 'הכנת הצעת מחיר', leadName: 'עינת בר', dueDate: '14:00', completed: false },
  { id: 't2', title: 'שיחת מעקב בוואטסאפ', leadName: 'חברת אלפא', dueDate: '15:30', completed: false },
  { id: 't3', title: 'עדכון סטטוס ב-CRM', leadName: 'דנה לוי', dueDate: '16:00', completed: false },
  { id: 't4', title: 'שליחת מצגת סיכום', leadName: 'יונתן גל', dueDate: '17:00', completed: false },
];

export const COACHING_TIPS: DailyTip[] = [
  { id: 'tip1', category: 'Focus', text: 'שאלי על התקציב מוקדם יותר בשיחה.' },
  { id: 'tip2', category: 'Focus', text: 'ודאי צעד הבא ברור לפני הסיום.' },
  { id: 'tip3', category: 'Strength', text: 'בניית כימיה (Rapport) מצוינת בשיחה האחרונה.' },
  { id: 'tip4', category: 'Improve', text: 'זמן דיבור נציג גבוה (65%) בשיחה עם רון שחר.' },
];

export const ATTENTION_CALLS: RecentCall[] = [
  { id: 'ac1', leadName: 'רון שחר', status: 'Completed', outcome: 'התנגדות מחיר', time: 'היום', issueTag: 'התנגדות מחיר חזקה', qualityScore: 65 },
  { id: 'ac2', leadName: 'גלית מור', status: 'Completed', outcome: 'חוסר כימיה', time: 'אתמול', issueTag: 'רמת אמפתיה נמוכה', qualityScore: 58 },
  { id: 'ac3', leadName: 'תומר ירון', status: 'Completed', outcome: 'לא ברור', time: 'אתמול', issueTag: 'אין צעד הבא', qualityScore: 70 },
];

// --- MANAGER MOCK DATA ---

export const MANAGER_KPIS: KPIMetric[] = [
  { label: 'סה"כ שיחות היום', value: '142', trend: '+12%', trendDirection: 'up', subtext: 'צוות של 8 נציגים' },
  { label: 'פגישות השבוע', value: '34', trend: '+5', trendDirection: 'up', subtext: 'יעד: 40' },
  { label: 'אחוז סגירה (צוות)', value: '24%', trend: '-2%', trendDirection: 'down', subtext: '30 יום אחרונים' },
  { label: 'איכות שיחה ממוצעת', value: '81', trend: '+1.5', trendDirection: 'up', subtext: 'עלייה קלה' },
];

export const PIPELINE_STAGES: PipelineStage[] = [
  { name: 'ליד חדש', value: 450000, count: 45, color: '#6366f1' },
  { name: 'גילוי צרכים', value: 320000, count: 32, color: '#8b5cf6' },
  { name: 'הצעת מחיר', value: 180000, count: 18, color: '#ec4899' },
  { name: 'משא ומתן', value: 85000, count: 8, color: '#f59e0b' },
  { name: 'סגירה', value: 120000, count: 12, color: '#10b981' },
];

// --- PIPELINE PAGE MOCK DATA ---

export const PIPELINE_MANAGER_KPIS = [
  { label: 'לידים חדשים (צוות)', value: '45', change: '+12%', positive: true },
  { label: 'לידים בטיפול (צוות)', value: '32', change: '+5%', positive: true },
  { label: 'הצעות שנשלחו (צוות)', value: '18', change: '-2%', positive: false },
  { label: 'עסקאות שנסגרו (צוות)', value: '4', change: '+1', positive: true },
];

export const PIPELINE_FUNNEL: FunnelStage[] = [
  { id: 'f1', label: 'ליד חדש', count: 45, percentage: 100, conversionRate: 72, color: '#6366f1' }, // Indigo-500
  { id: 'f2', label: 'יצירת קשר', count: 32, percentage: 71, conversionRate: 65, color: '#4f46e5' }, // Indigo-600
  { id: 'f3', label: 'בתהליך / פגישה', count: 21, percentage: 46, conversionRate: 50, color: '#4338ca' }, // Indigo-700
  { id: 'f4', label: 'הצעת מחיר', count: 10, percentage: 22, conversionRate: 40, color: '#3730a3' }, // Indigo-800
  { id: 'f5', label: 'סגירה', count: 4, percentage: 9, conversionRate: 0, color: '#312e81' }, // Indigo-900
];

export const PIPELINE_SOURCES: SourceMetric[] = [
  { name: 'פייסבוק / אינסטגרם', leads: 45, deals: 3, conversionRate: 6.6, revenue: 120000 },
  { name: 'גוגל (PPC)', leads: 32, deals: 5, conversionRate: 15.6, revenue: 240000 },
  { name: 'אורגני / SEO', leads: 18, deals: 4, conversionRate: 22.2, revenue: 180000 },
  { name: 'שותפים', leads: 8, deals: 2, conversionRate: 25.0, revenue: 95000 },
  { name: 'הפניות', leads: 5, deals: 3, conversionRate: 60.0, revenue: 150000 },
];

export const AT_RISK_LEADS: LeadAtRisk[] = [
  {
    ...MOCK_LEADS[3], // Dana
    riskReason: 'לא נגעו בו 48 שעות',
    timeSinceActivity: '48 שעות',
    status: 'Proposal',
    priority: 'Hot'
  },
  {
    ...MOCK_LEADS[6], // Guy
    riskReason: 'אין פולואפ עתידי',
    timeSinceActivity: '5 שעות',
    status: 'Discovery',
    priority: 'Warm'
  },
  {
    ...MOCK_LEADS[2], // Yossi
    riskReason: 'AI: סנטימנט שלילי בשיחה',
    timeSinceActivity: '3 שעות',
    status: 'Negotiation',
    priority: 'Hot'
  }
];

export const UNASSIGNED_LEADS: Lead[] = [
  {
    id: 'ul1',
    name: 'יורם כהן',
    company: 'ישראטק',
    phone: '050-0000001',
    email: 'yoram@isratech.co.il',
    status: 'New',
    priority: 'Hot',
    value: '₪30,000',
    source: 'Website',
    score: 85,
    createdAt: 'לפני 2 שעות'
  },
  {
    id: 'ul2',
    name: 'שירה גולן',
    company: 'עיצובים בע"מ',
    phone: '052-0000002',
    email: 'shira@design.com',
    status: 'New',
    priority: 'Warm',
    value: '₪15,000',
    source: 'Facebook Ads',
    score: 65,
    createdAt: 'לפני 4 שעות'
  },
  {
    id: 'ul3',
    name: 'דני דן',
    company: 'לוגיסטיקה מהירה',
    phone: '054-0000003',
    email: 'dani@logistics.co.il',
    status: 'New',
    priority: 'Cold',
    value: '₪50,000',
    source: 'Referral',
    score: 40,
    createdAt: 'לפני 1 יום'
  }
];

export const REP_CAPACITY_STATS: RepCapacity[] = [
  { id: 'u1', user: TEAM_MEMBERS[0], activeLeads: 42, newLeadsToday: 5, status: 'busy' }, // Sarah
  { id: 'u3', user: TEAM_MEMBERS[1], activeLeads: 28, newLeadsToday: 3, status: 'available' }, // Ron
  { id: 'u4', user: TEAM_MEMBERS[2], activeLeads: 35, newLeadsToday: 4, status: 'moderate' }, // Daniel
  { id: 'u5', user: TEAM_MEMBERS[3], activeLeads: 12, newLeadsToday: 1, status: 'available' }, // Noa
];

export const TOP_DEALS: Deal[] = [
  { id: 'd1', company: 'ספקטרה דיינמיקס', owner: 'שרה כהן', ownerAvatar: 'https://picsum.photos/100/100', stage: 'משא ומתן', value: '₪45,000', closeDate: '15/11' },
  { id: 'd2', company: 'גמא טכנולוגיות', owner: 'רון לוי', ownerAvatar: 'https://picsum.photos/id/1012/100/100', stage: 'הצעת מחיר', value: '₪120,000', closeDate: '22/11' },
  { id: 'd3', company: 'אלפא גרופ', owner: 'דניאל ירון', ownerAvatar: 'https://picsum.photos/id/1025/100/100', stage: 'גילוי צרכים', value: '₪85,000', closeDate: '30/11' },
  { id: 'd4', company: 'בית תוכנה בע"מ', owner: 'שרה כהן', ownerAvatar: 'https://picsum.photos/100/100', stage: 'משא ומתן', value: '₪32,000', closeDate: '12/11' },
];

export const TEAM_LEADERBOARD: TeamMember[] = [
  { id: 'tm1', name: 'שרה כהן', avatar: 'https://picsum.photos/100/100', calls: 45, meetings: 8, winRate: 32, qualityScore: 92, trend: 'up' },
  { id: 'tm2', name: 'רון לוי', avatar: 'https://picsum.photos/id/1012/100/100', calls: 38, meetings: 6, winRate: 28, qualityScore: 85, trend: 'neutral' },
  { id: 'tm3', name: 'דניאל ירון', avatar: 'https://picsum.photos/id/1025/100/100', calls: 52, meetings: 4, winRate: 15, qualityScore: 78, trend: 'down' },
  { id: 'tm4', name: 'נועה בר', avatar: 'https://picsum.photos/id/1027/100/100', calls: 41, meetings: 7, winRate: 29, qualityScore: 88, trend: 'up' },
];

export const MANAGER_ATTENTION_CALLS: RecentCall[] = [
  { id: 'mac1', leadName: 'דודו כהן', repName: 'דניאל ירון', repAvatar: 'https://picsum.photos/id/1025/100/100', status: 'Completed', outcome: 'שיחה קשה', time: 'לפני שעתיים', issueTag: 'חוסר סבלנות', qualityScore: 45 },
  { id: 'mac2', leadName: 'חברת מטאור', repName: 'רון לוי', repAvatar: 'https://picsum.photos/id/1012/100/100', status: 'Completed', outcome: 'התנגדות', time: 'הבוקר', issueTag: 'פספוס איתות קנייה', qualityScore: 55 },
  { id: 'mac3', leadName: 'יזמות בע"מ', repName: 'נועה בר', repAvatar: 'https://picsum.photos/id/1027/100/100', status: 'Completed', outcome: 'אין התקדמות', time: 'אתמול', issueTag: 'לא נקבע צעד הבא', qualityScore: 62 },
];

// --- REP SPECIFIC MOCK DATA ---

export const REP_DAILY_GOALS = [
  { id: 'g1', label: 'לידים שהוקצו לי היום', current: 12, target: 15, unit: 'לידים', status: 'warning' },
  { id: 'g2', label: 'לידים שטיפלתי בהם', current: 8, target: 12, unit: 'טופלו', status: 'warning' },
  { id: 'g3', label: 'הצעות ששלחתי', current: 3, target: 5, unit: 'הצעות', status: 'warning' },
  { id: 'g4', label: 'עסקאות שנסגרו', current: 1, target: 2, unit: 'עסקאות', status: 'success' },
];

// Taking a subset of MOCK_LEADS for the queue
export const REP_LEAD_QUEUE = MOCK_LEADS.slice(0, 5);

export const REP_HOT_LEADS = MOCK_LEADS.filter(l => l.priority === 'Hot').slice(0, 3);
export const REP_AT_RISK_LEADS = AT_RISK_LEADS.slice(0, 3); // Reusing at risk

export const REP_FUNNEL_DATA = [
  { name: 'ליד חדש', value: 24, fill: '#6366f1' },
  { name: 'יצירת קשר', value: 18, fill: '#818cf8' },
  { name: 'בתהליך', value: 12, fill: '#a5b4fc' },
  { name: 'הצעת מחיר', value: 6, fill: '#c7d2fe' },
  { name: 'סגירה', value: 2, fill: '#e0e7ff' },
];

// --- SETTINGS MOCK DATA ---

export const SYSTEM_HEALTH_DATA: ServiceStatus[] = [
  { id: 'srv1', name: 'Telephony (Voice)', status: 'operational', latency: '24ms', lastCheck: 'עכשיו' },
  { id: 'srv2', name: 'Transcription (Soniox)', status: 'operational', latency: '120ms', lastCheck: 'לפני דקה' },
  { id: 'srv3', name: 'AI Coach (LLM)', status: 'operational', latency: '450ms', lastCheck: 'לפני דקה' },
  { id: 'srv4', name: 'CRM Sync (Webhooks)', status: 'degraded', latency: 'High', lastCheck: 'לפני 5 דק' },
];

// --- SUPER ADMIN MOCK DATA ---
export const MOCK_ORGANIZATIONS: Organization[] = [
  { 
    id: 'org1', 
    name: 'Asaf Orga', 
    plan: 'Pro', 
    status: 'Active', 
    logo: 'https://ui-avatars.com/api/?name=Asaf+Orga&background=6366f1&color=fff',
    usersCount: 12,
    mrr: 1500,
    estCost: 450,
    gmv: 45000,
    joinedAt: '2024-01-10'
  },
  { 
    id: 'org2', 
    name: 'Tech Solutions Ltd', 
    plan: 'Enterprise', 
    status: 'Active', 
    logo: 'https://ui-avatars.com/api/?name=Tech+Solutions&background=10b981&color=fff',
    usersCount: 45,
    mrr: 8500,
    estCost: 1200,
    gmv: 320000,
    joinedAt: '2023-11-05'
  },
  { 
    id: 'org3', 
    name: 'StartUp Nation', 
    plan: 'Free', 
    status: 'Trial', 
    logo: 'https://ui-avatars.com/api/?name=StartUp&background=f59e0b&color=fff',
    usersCount: 3,
    mrr: 0,
    estCost: 50,
    gmv: 0,
    joinedAt: '2024-11-01'
  },
  { 
    id: 'org4', 
    name: 'Global Finance', 
    plan: 'Enterprise', 
    status: 'Suspended', 
    logo: 'https://ui-avatars.com/api/?name=Global+Finance&background=f43f5e&color=fff',
    usersCount: 120,
    mrr: 12000,
    estCost: 0,
    gmv: 1500000,
    joinedAt: '2023-05-20'
  },
  { 
    id: 'org5', 
    name: 'Creative Agency', 
    plan: 'Pro', 
    status: 'Active', 
    logo: 'https://ui-avatars.com/api/?name=Creative+Agency&background=8b5cf6&color=fff',
    usersCount: 8,
    mrr: 900,
    estCost: 120,
    gmv: 25000,
    joinedAt: '2024-03-15'
  }
];
