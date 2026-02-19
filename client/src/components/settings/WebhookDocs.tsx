import React, { useState } from 'react';
import {
    Book,
    Copy,
    Check,
    ChevronDown,
    ChevronUp,
    Zap,
    Globe,
    Code,
    FileJson,
    ExternalLink,
    Info,
    CheckCircle2,
    XCircle,
    Sparkles
} from 'lucide-react';

interface WebhookDocsProps {
    webhookUrl: string;
    apiKey: string;
}

export const WebhookDocs: React.FC<WebhookDocsProps> = ({ webhookUrl, apiKey }) => {
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [expandedSection, setExpandedSection] = useState<string | null>('fields');

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const fullUrl = `${webhookUrl}?apiKey=${apiKey}`;

    const fields = [
        { name: 'name', type: 'string', required: true, description: 'שם הליד', example: '"ישראל ישראלי"' },
        { name: 'phone', type: 'string', required: true, description: 'מספר טלפון', example: '"0501234567"' },
        { name: 'email', type: 'string', required: false, description: 'כתובת אימייל', example: '"email@example.com"' },
        { name: 'company', type: 'string', required: false, description: 'שם החברה/עסק', example: '"חברה בע״מ"' },
        { name: 'source', type: 'string', required: false, description: 'מקור הגעת הליד', example: '"Facebook Ads", "Google", "אתר"' },
        { name: 'status', type: 'string', required: false, description: 'סטטוס התחלתי', example: '"New", "Contacted", "Qualified"' },
        { name: 'priority', type: 'string', required: false, description: 'עדיפות הליד', example: '"Hot", "Warm", "Cold"' },
        { name: 'value', type: 'number', required: false, description: 'שווי עסקה משוער (₪)', example: '5000' },
        { name: 'tags', type: 'array', required: false, description: 'תגיות לסינון', example: '["VIP", "קמפיין-חורף"]' },
    ];

    const examples = {
        minimal: {
            title: 'דוגמה בסיסית (מינימום)',
            description: 'רק השדות החובה',
            code: `{
  "name": "ישראל ישראלי",
  "phone": "0501234567"
}`
        },
        full: {
            title: 'דוגמה מלאה',
            description: 'כל השדות האפשריים',
            code: `{
  "name": "ישראל ישראלי",
  "phone": "0501234567",
  "email": "israel@example.com",
  "company": "חברה בע״מ",
  "source": "Facebook Ads",
  "status": "New",
  "priority": "Hot",
  "value": 15000,
  "tags": ["VIP", "קמפיין-חורף", "B2B"]
}`
        },
        facebook: {
            title: 'Facebook Lead Ads',
            description: 'חיבור לטפסי לידים של פייסבוק',
            code: `{
  "name": "{{full_name}}",
  "phone": "{{phone_number}}",
  "email": "{{email}}",
  "source": "Facebook Lead Ad",
  "tags": ["פייסבוק", "{{ad_name}}"]
}`
        },
        elementor: {
            title: 'WordPress / Elementor',
            description: 'חיבור לטפסי Elementor',
            code: `{
  "name": "{{form.name}}",
  "phone": "{{form.phone}}",
  "email": "{{form.email}}",
  "source": "אתר - טופס יצירת קשר",
  "tags": ["אתר", "אורגני"]
}`
        },
        google: {
            title: 'Google Ads Lead Form',
            description: 'חיבור ל-Google Lead Form Extensions',
            code: `{
  "name": "{{lead.user_column_data.FULL_NAME}}",
  "phone": "{{lead.user_column_data.PHONE_NUMBER}}",
  "email": "{{lead.user_column_data.EMAIL}}",
  "source": "Google Ads",
  "tags": ["גוגל", "{{lead.campaign_id}}"]
}`
        }
    };

    const integrations = [
        {
            name: 'Zapier',
            icon: <Zap className="w-5 h-5" />,
            color: 'bg-orange-500',
            steps: [
                'צור Zap חדש',
                'בחר את הטריגר (Facebook Lead Ads, Google Sheets, וכו\')',
                'הוסף Action: "Webhooks by Zapier" → "POST"',
                'הדבק את ה-URL המלא שלך',
                'בחר "JSON" בפורמט',
                'מפה את השדות לפי הטבלה למעלה'
            ]
        },
        {
            name: 'Make (Integromat)',
            icon: <Sparkles className="w-5 h-5" />,
            color: 'bg-purple-500',
            steps: [
                'צור Scenario חדש',
                'הוסף את המודול של המקור (Facebook, Google וכו\')',
                'הוסף מודול HTTP → Make a request',
                'URL: הדבק את הקישור המלא שלך',
                'Method: POST',
                'Body type: JSON',
                'הגדר את השדות לפי המיפוי'
            ]
        },
        {
            name: 'WordPress / Elementor',
            icon: <Globe className="w-5 h-5" />,
            color: 'bg-blue-500',
            steps: [
                'ערוך את הטופס ב-Elementor',
                'לך ל-Actions After Submit',
                'הוסף "Webhook"',
                'הדבק את ה-URL המלא',
                'Advanced: הגדר את מיפוי השדות'
            ]
        },
        {
            name: 'קוד מותאם (cURL)',
            icon: <Code className="w-5 h-5" />,
            color: 'bg-slate-700',
            code: `curl -X POST "${fullUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "ליד לדוגמה",
    "phone": "0501234567",
    "source": "API Test"
  }'`
        }
    ];

    const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => {
        const isExpanded = expandedSection === id;
        return (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <button
                    onClick={() => setExpandedSection(isExpanded ? null : id)}
                    className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                </button>
                {isExpanded && (
                    <div className="p-5 bg-white dark:bg-slate-900">
                        {children}
                    </div>
                )}
            </div>
        );
    };

    const CodeBlock = ({ code, label }: { code: string; label: string }) => (
        <div className="relative">
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto font-mono" dir="ltr">
                {code}
            </pre>
            <button
                onClick={() => copyToClipboard(code, label)}
                className="absolute top-2 left-2 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
                {copiedField === label ? (
                    <Check className="w-4 h-4 text-green-400" />
                ) : (
                    <Copy className="w-4 h-4 text-slate-300" />
                )}
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-xl">
                    <Book className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">מדריך חיבור Webhook</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">איך לחבר לידים מכל מקור לתוך המערכת</p>
                </div>
            </div>

            {/* Quick URL Copy */}
            <div className="p-4 bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 rounded-xl border border-brand-100 dark:border-brand-800">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">הקישור שלך:</p>
                        <code className="text-xs text-slate-600 dark:text-slate-400 break-all" dir="ltr">{fullUrl}</code>
                    </div>
                    <button
                        onClick={() => copyToClipboard(fullUrl, 'url')}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
                    >
                        {copiedField === 'url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        העתק
                    </button>
                </div>
            </div>

            {/* Fields Reference */}
            <Section id="fields" title="📋 שדות נתמכים">
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                    <div className="flex gap-2">
                        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            <strong>שים לב:</strong> רק <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">name</code> ו-<code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">phone</code> הם שדות חובה.
                            כל השאר אופציונלי ותלוי בצרכים שלך.
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">שדה</th>
                                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">סוג</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">חובה</th>
                                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">תיאור</th>
                                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">דוגמה</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fields.map((field, idx) => (
                                <tr key={field.name} className={idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/30' : ''}>
                                    <td className="py-3 px-4">
                                        <code className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-brand-600 dark:text-brand-400 font-mono text-xs">
                                            {field.name}
                                        </code>
                                    </td>
                                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{field.type}</td>
                                    <td className="py-3 px-4 text-center">
                                        {field.required ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                                        ) : (
                                            <span className="text-slate-400">—</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{field.description}</td>
                                    <td className="py-3 px-4">
                                        <code className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">{field.example}</code>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            {/* Code Examples */}
            <Section id="examples" title="💻 דוגמאות קוד">
                <div className="grid gap-4">
                    {Object.entries(examples).map(([key, example]) => (
                        <div key={key} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-slate-900 dark:text-white">{example.title}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{example.description}</p>
                            </div>
                            <div className="p-4">
                                <CodeBlock code={example.code} label={key} />
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Integration Guides */}
            <Section id="integrations" title="🔌 מדריכי חיבור">
                <div className="grid gap-4 md:grid-cols-2">
                    {integrations.map((integration) => (
                        <div key={integration.name} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <div className={`px-4 py-3 ${integration.color} text-white flex items-center gap-2`}>
                                {integration.icon}
                                <span className="font-bold">{integration.name}</span>
                            </div>
                            <div className="p-4">
                                {integration.steps ? (
                                    <ol className="space-y-2">
                                        {integration.steps.map((step, idx) => (
                                            <li key={idx} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                <span className="w-5 h-5 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
                                                    {idx + 1}
                                                </span>
                                                {step}
                                            </li>
                                        ))}
                                    </ol>
                                ) : integration.code ? (
                                    <CodeBlock code={integration.code} label={integration.name} />
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Tips */}
            <Section id="tips" title="💡 טיפים והמלצות">
                <div className="space-y-3">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                        <p className="text-sm text-green-700 dark:text-green-300">
                            <strong>✅ השתמש ב-source:</strong> תמיד הגדר מקור הגעה ברור (Facebook, Google, אתר) - זה יעזור לך לנתח מאיפה מגיעים הלידים הטובים.
                        </p>
                    </div>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            <strong>⚡ השתמש ב-tags:</strong> תגיות מאפשרות סינון מהיר. לדוגמה: ["קמפיין-חורף", "B2B", "עדיפות-גבוהה"]
                        </p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                            <strong>🔥 עדיפות אוטומטית:</strong> שלח priority: "Hot" ללידים מקמפיינים יקרים כדי שיטופלו קודם.
                        </p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            <strong>📊 שווי עסקה:</strong> אם יש לך מידע על גודל העסקה הפוטנציאלי, שלח אותו ב-value לחישוב ה-pipeline.
                        </p>
                    </div>
                </div>
            </Section>

            {/* Support */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    צריך עזרה בחיבור? פנה לתמיכה ונשמח לעזור 🙂
                </p>
            </div>
        </div>
    );
};

export default WebhookDocs;
