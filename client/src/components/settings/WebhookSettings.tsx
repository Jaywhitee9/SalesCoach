import React, { useState, useEffect } from 'react';
import { Key, Plus, Copy, Trash2, Check, AlertTriangle, Loader2, Globe, Zap, Repeat2, Webhook, FileText, Facebook, Instagram, Search, ExternalLink, RefreshCw, Smartphone, ShieldCheck, Book } from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';
import { WebhookDocs } from './WebhookDocs';

interface ApiKey {
    id: string;
    key_prefix: string;
    name: string;
    is_active: boolean;
    last_used_at: string | null;
    usage_count: number;
    created_at: string;
}

// Helper to get production URL (automatically adapts to custom domains)
const getBaseUrl = () => {
    if (typeof window === 'undefined') return '';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'https://salescoach-7yul.onrender.com';
    }
    return window.location.origin;
};

export const WebhookSettings: React.FC = () => {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // New key modal
    const [isCreating, setIsCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Show new key (only once!)
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
    const [copiedUrl, setCopiedUrl] = useState(false);

    // Test Connection State
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

    // Advanced Mode Toggle
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Get organization ID
    useEffect(() => {
        const getOrg = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) return;
            setUserId(session.user.id);

            const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', session.user.id).single();
            if (profile?.organization_id) setOrganizationId(profile.organization_id);
        };
        getOrg();
    }, []);

    // Fetch API keys
    useEffect(() => {
        if (!organizationId) return;
        const fetchKeys = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/settings/api-keys?organizationId=${organizationId}`);
                const data = await res.json();
                if (data.success) setApiKeys(data.keys || []);
            } catch (err) { console.error('[WebhookSettings] Fetch error:', err); } finally { setLoading(false); }
        };
        fetchKeys();
    }, [organizationId]);

    const handleCreateKey = async () => {
        if (!organizationId) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/settings/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizationId, name: newKeyName || 'Default Key', userId })
            });
            const data = await res.json();
            if (data.success && data.key) {
                setApiKeys(prev => [{ ...data.key, key_prefix: data.key.key_prefix }, ...prev]);
                setNewlyCreatedKey(data.key.key);
                setIsCreating(false);
                setNewKeyName('');
            }
        } catch (err) { console.error('[WebhookSettings] Create error:', err); } finally { setIsSaving(false); }
    };

    const handleRevokeKey = async (keyId: string) => {
        if (!confirm('האם לבטל מפתח זה?')) return;
        try {
            const res = await fetch(`/api/settings/api-keys/${keyId}?organizationId=${organizationId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) setApiKeys(prev => prev.filter(k => k.id !== keyId));
        } catch (err) { console.error('[WebhookSettings] Revoke error:', err); }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    // --- MAGIC LINK LOGIC ---
    // If we have a newly created key, use that. Otherwise use the first active key.
    // NOTE: For security, we usually don't have the full key after creation. 
    // But for the specific UX request of "Easy Connect", we might need to rely on the user having just created a key
    // OR we accept that we can't show the full Magic Link for existing keys (only prefix).
    // HOWEVER, to make it TRULY easy, we will prompt them to create a key if none exists,
    // and if they have one, we will explain they need the full key. 

    // BUT! The user wants it EASY.
    // Let's assume for the "Magic Link" display for *existing* keys, we can't show it fully because we don't store it raw.
    // We will show the structure and ask them to replace 'YOUR_KEY'.
    // UNLESS it's the `newlyCreatedKey`, then we show it fully!

    const activeKey = apiKeys.find(k => k.is_active);
    const magicLinkBase = `${getBaseUrl()}/api/leads/webhook`;

    // If we just created a key, we have the full string.
    // If not, we have a placeholder.
    const magicLinkUrl = newlyCreatedKey
        ? `${magicLinkBase}?apiKey=${newlyCreatedKey}`
        : `${magicLinkBase}?apiKey=YOUR_API_KEY`;

    const isMagicLinkReady = !!newlyCreatedKey;

    const handleTestConnection = async () => {
        if (!newlyCreatedKey && !activeKey) {
            alert('אנא צור מפתח API תחילה');
            return;
        }

        // We need a REAL key to test. If we don't have one visible (newlyCreatedKey), we can't really test from client-side 
        // without asking user to input it, OR we blindly trust the backend check (but we want to simulate a real external request).
        // Actually, since we are logged in, we can maybe use a simplified check? 
        // No, let's simulates a real webhook POST. We need the key.

        let keyToUse = newlyCreatedKey;
        if (!keyToUse) {
            const keyInput = prompt('כדי לבצע בדיקה, אנא הזן את מפתח ה-API המלא שלך (מסיבות אבטחה הוא לא מוצג כאן):');
            if (!keyInput) return;
            keyToUse = keyInput;
        }

        setIsTesting(true);
        setTestResult(null);

        try {
            // DETECT ENVIRONMENT FOR TESTING
            // If we are on localhost, we MUST test against localhost:5050 because:
            // 1. The production server (Render) might block localhost requests (CORS).
            // 2. The local server has the latest CORS fixes we just added.
            let urlToTest = `${magicLinkBase}?apiKey=${keyToUse}`;

            if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                // Force test against local backend
                urlToTest = `http://localhost:5050/api/leads/webhook?apiKey=${keyToUse}`;
            }

            const res = await fetch(urlToTest, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'ניסיון בדיקה',
                    phone: '0500000000',
                    email: 'test@example.com',
                    source: 'Test Connection',
                    tags: ['Test', 'Webhook']
                })
            });

            if (res.ok) {
                setTestResult('success');
            } else {
                setTestResult('error');
            }
        } catch (e) {
            setTestResult('error');
        } finally {
            setIsTesting(false);
        }
    };


    return (
        <div className="space-y-8 max-w-4xl mx-auto">

            {/* 1. Hero Section: The "Easy Way" */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-gradient-to-r from-brand-600 to-indigo-600 p-6 text-white text-center">
                    <Webhook className="w-12 h-12 mx-auto mb-3 opacity-90" />
                    <h2 className="text-2xl font-bold mb-2">חיבור מהיר (Quick Connect)</h2>
                    <p className="opacity-90 max-w-lg mx-auto">
                        הדרך הקלה ביותר לחבר את האתר שלך. פשוט העתק את הכתובת למטה והדבק בטופס הלידים שלך.
                    </p>
                </div>

                <div className="p-8">
                    {/* The Magic Link Display */}
                    <div className="mb-8">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 text-center">
                            הקישור הייחודי שלך (Magic Link)
                        </label>

                        <div className={`relative flex items-center bg-slate-50 dark:bg-slate-800 border-2 rounded-xl overflow-hidden transition-colors ${isMagicLinkReady ? 'border-brand-500 shadow-brand-100' : 'border-slate-200 dark:border-slate-700 dashed border-dashed'}`}>
                            <div className="px-4 py-3 bg-slate-100 dark:bg-slate-700 border-l border-slate-200 dark:border-slate-600 text-slate-500">
                                <Globe className="w-5 h-5" />
                            </div>
                            <code className="flex-1 px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-300 dir-ltr text-left overflow-x-auto whitespace-nowrap">
                                {magicLinkUrl}
                            </code>
                            <button
                                onClick={() => copyToClipboard(magicLinkUrl)}
                                className="px-6 py-3 bg-white dark:bg-slate-600 hover:bg-slate-50 dark:hover:bg-slate-500 text-brand-600 dark:text-white font-bold transition-colors border-r border-slate-200 dark:border-slate-600 h-full"
                            >
                                {copiedUrl ? 'הועתק!' : 'העתק'}
                            </button>
                        </div>

                        {!isMagicLinkReady && (
                            <div className="text-center mt-3">
                                <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 py-2 px-4 rounded-lg inline-block">
                                    <AlertTriangle className="w-3.5 h-3.5 inline-block ml-1" />
                                    שים לב: עבור אבטחה מירבית, המפתח המלא מוסתר.
                                    <button onClick={() => setIsCreating(true)} className="underline hover:text-amber-800 font-bold mx-1">צור מפתח חדש</button>
                                    כדי לקבל לינק מוכן להעתקה!
                                </p>
                            </div>
                        )}

                        {isMagicLinkReady && (
                            <p className="text-center mt-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                ✨ מעולה! זה הלינק המלא שלך. העתק אותו עכשיו (הוא לא יוצג שוב במלואו).
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={handleTestConnection}
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-medium text-slate-700 dark:text-slate-300"
                        >
                            {isTesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                            בדוק חיבור (Test)
                        </button>

                        <a
                            href="https://zapier.com/apps/webhook/integrations"
                            target="_blank"
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 transition-all font-medium border border-orange-200"
                        >
                            <Zap className="w-5 h-5" />
                            חבר ל-Zapier/Make
                        </a>
                    </div>

                    {/* Test Result Message */}
                    {testResult && (
                        <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${testResult === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                            {testResult === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                            <div>
                                <p className="font-bold">{testResult === 'success' ? 'החיבור הצליח!' : 'החיבור נכשל'}</p>
                                <p className="text-sm opacity-90">{testResult === 'success' ? 'ליד בדיקה נוצר בהצלחה במערכת. הלינק עובד מצוין.' : 'אנא וודא שהמפתח תקין ונסה שוב.'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Platform Guides Grid */}
            <div className="grid grid-cols-2md:grid-cols-4 gap-4">
                {[
                    { name: 'Wordpress / Elementor', icon: 'W', color: 'bg-blue-600' },
                    { name: 'Wix Automations', icon: 'X', color: 'bg-yellow-500' },
                    { name: 'Facebook Lead Ads', icon: 'F', color: 'bg-blue-500' },
                    { name: 'Google Ads', icon: 'G', color: 'bg-green-500' }
                ].map(p => (
                    <div key={p.name} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
                        <div className={`w-8 h-8 rounded-lg ${p.color} text-white flex items-center justify-center font-bold text-sm`}>{p.icon}</div>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {p.name}
                            <span className="block text-[10px] text-slate-400 font-normal">הדבק את הלינק ב-Webhook</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Documentation Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <WebhookDocs
                    webhookUrl={magicLinkBase}
                    apiKey={newlyCreatedKey || 'YOUR_API_KEY'}
                />
            </div>

            {/* 3. Advanced Settings Checkbox */}
            <div className="text-center">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-slate-400 hover:text-slate-600 text-sm flex items-center justify-center gap-2 mx-auto transition-colors"
                >
                    {showAdvanced ? 'הסתר הגדרות מתקדמות' : 'הצג מפתחות API והגדרות מתקדמות'}
                    <Key className="w-3 h-3" />
                </button>
            </div>

            {/* 4. Advanced Section (Hidden by Default) */}
            {showAdvanced && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-700 dark:text-slate-300">ניהול מפתחות API</h3>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-sm border border-slate-200 dark:border-slate-600 transition-colors shadow-sm"
                        >
                            + צור חדש
                        </button>
                    </div>

                    {/* Create Modal - Inline */}
                    {isCreating && (
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                            <h4 className="font-bold text-sm mb-3">יצירת מפתח חדש</h4>
                            <div className="flex gap-2">
                                <input
                                    value={newKeyName}
                                    onChange={e => setNewKeyName(e.target.value)}
                                    placeholder="שם למפתח (למשל: דף נחיתה ראשי)"
                                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm bg-transparent"
                                />
                                <button onClick={handleCreateKey} disabled={isSaving} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                                    {isSaving ? 'יוצר...' : 'צור'}
                                </button>
                                <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-500 text-sm">ביטול</button>
                            </div>
                        </div>
                    )}

                    {apiKeys.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm py-4">אין מפתחות פעילים</p>
                    ) : (
                        <div className="space-y-3">
                            {apiKeys.map(key => (
                                <div key={key.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${key.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                        <div className="text-sm">
                                            <p className="font-bold text-slate-800 dark:text-slate-200">{key.name}</p>
                                            <p className="text-slate-400 font-mono text-xs">{key.key_prefix}****</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <span>{key.usage_count} שימושים</span>
                                        <button onClick={() => handleRevokeKey(key.id)} className="text-rose-500 hover:text-rose-700">בטל</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default WebhookSettings;
