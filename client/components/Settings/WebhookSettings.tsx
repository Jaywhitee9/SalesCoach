import React, { useState, useEffect } from 'react';
import { Key, Plus, Copy, Trash2, Check, AlertTriangle, ExternalLink, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';

interface ApiKey {
    id: string;
    key_prefix: string;
    name: string;
    is_active: boolean;
    last_used_at: string | null;
    usage_count: number;
    created_at: string;
}

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
    const [copied, setCopied] = useState(false);

    // Get organization ID
    useEffect(() => {
        const getOrg = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) return;

            setUserId(session.user.id);

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', session.user.id)
                .single();

            if (profile?.organization_id) {
                setOrganizationId(profile.organization_id);
            }
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
                if (data.success) {
                    setApiKeys(data.keys || []);
                }
            } catch (err) {
                console.error('[WebhookSettings] Fetch error:', err);
            } finally {
                setLoading(false);
            }
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
                body: JSON.stringify({
                    organizationId,
                    name: newKeyName || 'Default Key',
                    userId
                })
            });
            const data = await res.json();

            if (data.success && data.key) {
                // Add to list (without the full key)
                setApiKeys(prev => [{
                    ...data.key,
                    key_prefix: data.key.key_prefix
                }, ...prev]);

                // Show the full key (only once!)
                setNewlyCreatedKey(data.key.key);
                setIsCreating(false);
                setNewKeyName('');
            }
        } catch (err) {
            console.error('[WebhookSettings] Create error:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRevokeKey = async (keyId: string) => {
        if (!confirm('האם לבטל מפתח זה? לא ניתן לשחזר אותו.')) return;

        try {
            const res = await fetch(`/api/settings/api-keys/${keyId}?organizationId=${organizationId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setApiKeys(prev => prev.filter(k => k.id !== keyId));
            }
        } catch (err) {
            console.error('[WebhookSettings] Revoke error:', err);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const webhookUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/leads/webhook`
        : '/api/leads/webhook';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                        <Key className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Webhook & API Keys</h3>
                        <p className="text-sm text-slate-500">קבל לידים מדפי נחיתה, פייסבוק, גוגל ועוד</p>
                    </div>
                </div>

                {/* Webhook URL */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mb-4">
                    <label className="text-xs font-medium text-slate-500 mb-2 block">Webhook URL</label>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm font-mono bg-white dark:bg-slate-800 px-3 py-2 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                            {webhookUrl}
                        </code>
                        <button
                            onClick={() => copyToClipboard(webhookUrl)}
                            className="p-2 text-slate-400 hover:text-brand-500 transition-colors"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* New Key Created Modal */}
            {newlyCreatedKey && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-bold text-amber-800 dark:text-amber-200 mb-2">שמור את המפתח עכשיו!</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                                זו הפעם היחידה שתראה את המפתח המלא. העתק אותו למקום בטוח.
                            </p>
                            <div className="flex items-center gap-2 mb-4">
                                <code className="flex-1 text-sm font-mono bg-amber-100 dark:bg-amber-900/30 px-3 py-2 rounded text-amber-900 dark:text-amber-100 break-all">
                                    {newlyCreatedKey}
                                </code>
                                <button
                                    onClick={() => copyToClipboard(newlyCreatedKey)}
                                    className={`p-2 rounded transition-colors ${copied ? 'bg-emerald-500 text-white' : 'bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-200 hover:bg-amber-300'}`}
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <button
                                onClick={() => setNewlyCreatedKey(null)}
                                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                            >
                                הבנתי, שמרתי את המפתח ✓
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* API Keys List */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-slate-900 dark:text-white">מפתחות API</h4>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        מפתח חדש
                    </button>
                </div>

                {/* Create Key Modal */}
                {isCreating && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-200 dark:border-slate-700">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 block">שם המפתח (אופציונלי)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                placeholder="לדוגמה: Facebook Leads"
                                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                            />
                            <button
                                onClick={handleCreateKey}
                                disabled={isSaving}
                                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'צור'}
                            </button>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 transition-colors text-sm"
                            >
                                ביטול
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                    </div>
                ) : apiKeys.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <Key className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>אין מפתחות עדיין</p>
                        <p className="text-sm">צור מפתח כדי להתחיל לקבל לידים</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {apiKeys.map(key => (
                            <div key={key.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${key.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white text-sm">{key.name}</p>
                                        <p className="text-xs text-slate-500 font-mono">{key.key_prefix}...</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-left text-xs text-slate-400">
                                        <p>שימושים: {key.usage_count || 0}</p>
                                        {key.last_used_at && (
                                            <p>אחרון: {new Date(key.last_used_at).toLocaleDateString('he-IL')}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleRevokeKey(key.id)}
                                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                                        title="בטל מפתח"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Integration Examples */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4">איך לחבר?</h4>

                <div className="space-y-4">
                    {/* cURL Example */}
                    <div>
                        <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">דוגמת cURL:</h5>
                        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                            {`curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: org_sk_YOUR_KEY_HERE" \\
  -d '{
    "name": "ישראל ישראלי",
    "phone": "+972501234567",
    "email": "israel@example.com",
    "source": "Landing Page"
  }'`}
                        </pre>
                    </div>

                    {/* Zapier/Make */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <h5 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                <span className="text-orange-500">⚡</span> Zapier
                            </h5>
                            <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-decimal list-inside">
                                <li>בחר Action: Webhooks by Zapier → POST</li>
                                <li>הכנס את ה-URL למעלה</li>
                                <li>הוסף Header: X-API-Key עם המפתח שלך</li>
                                <li>מפה את השדות (name, phone, source)</li>
                            </ol>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <h5 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                <span className="text-purple-500">🔄</span> Make (Integromat)
                            </h5>
                            <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-decimal list-inside">
                                <li>הוסף HTTP Module → Make a request</li>
                                <li>Method: POST, URL: הכתובת למעלה</li>
                                <li>Headers: X-API-Key + Content-Type</li>
                                <li>Body type: JSON</li>
                            </ol>
                        </div>
                    </div>

                    {/* HTML Form */}
                    <div>
                        <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">WordPress / טופס HTML:</h5>
                        <p className="text-xs text-slate-500 mb-2">לא מומלץ להשתמש ב-API key בצד לקוח! השתמש ב-Zapier או שרת צד שלך.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebhookSettings;
