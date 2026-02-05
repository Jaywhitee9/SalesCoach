import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';

interface Campaign {
    id: string;
    name: string;
    source_filter: string;
    description?: string;
    is_active: boolean;
}

export const CampaignSettings: React.FC = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [sources, setSources] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [organizationId, setOrganizationId] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [formName, setFormName] = useState('');
    const [formSource, setFormSource] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Get organization ID
    useEffect(() => {
        const getOrg = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) return;

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

    // Fetch campaigns and sources
    useEffect(() => {
        if (!organizationId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [campaignsRes, sourcesRes] = await Promise.all([
                    fetch(`/api/campaigns?organizationId=${organizationId}`),
                    fetch(`/api/leads/sources?organizationId=${organizationId}`)
                ]);

                const campaignsData = await campaignsRes.json();
                const sourcesData = await sourcesRes.json();

                if (campaignsData.success) setCampaigns(campaignsData.campaigns || []);
                if (sourcesData.success) setSources(sourcesData.sources || []);
            } catch (err) {
                console.error('[CampaignSettings] Fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [organizationId]);

    const openAddModal = () => {
        setEditingCampaign(null);
        setFormName('');
        setFormSource('');
        setFormDescription('');
        setIsModalOpen(true);
    };

    const openEditModal = (campaign: Campaign) => {
        setEditingCampaign(campaign);
        setFormName(campaign.name);
        setFormSource(campaign.source_filter);
        setFormDescription(campaign.description || '');
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!organizationId || !formName || !formSource) return;
        setIsSaving(true);

        try {
            if (editingCampaign) {
                // Update
                const res = await fetch(`/api/campaigns/${editingCampaign.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: formName, sourceFilter: formSource, description: formDescription })
                });
                const data = await res.json();
                if (data.success) {
                    setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? data.campaign : c));
                }
            } else {
                // Create
                const res = await fetch('/api/campaigns', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ organizationId, name: formName, sourceFilter: formSource, description: formDescription })
                });
                const data = await res.json();
                if (data.success) {
                    setCampaigns(prev => [data.campaign, ...prev]);
                }
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error('[CampaignSettings] Save error:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('האם למחוק קמפיין זה?')) return;

        try {
            const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setCampaigns(prev => prev.filter(c => c.id !== id));
            }
        } catch (err) {
            console.error('[CampaignSettings] Delete error:', err);
        }
    };

    const sourceTranslations: Record<string, string> = {
        'Website': 'אתר אינטרנט',
        'Google': 'גוגל',
        'Facebook': 'פייסבוק',
        'LinkedIn': 'לינקדאין',
        'Instagram': 'אינסטגרם',
        'Webinar': 'וובינר',
        'Referral': 'הפניה',
        'Landing Page': 'דף נחיתה',
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">ניהול קמפיינים</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">צור קמפיינים לסינון לידים לפי מקור</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    קמפיין חדש
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                </div>
            ) : campaigns.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <p>אין קמפיינים עדיין</p>
                    <p className="text-sm mt-1">לחץ על "קמפיין חדש" כדי להתחיל</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {campaigns.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-white">{c.name}</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    מקור: {sourceTranslations[c.source_filter] || c.source_filter}
                                    {c.description && ` • ${c.description}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openEditModal(c)} className="p-2 text-slate-400 hover:text-brand-500 transition-colors">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {editingCampaign ? 'עריכת קמפיין' : 'קמפיין חדש'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">שם הקמפיין</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    placeholder="לדוגמה: קמפיין דף נחיתה"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">מקור לידים</label>
                                <select
                                    value={formSource}
                                    onChange={(e) => setFormSource(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                >
                                    <option value="">בחר מקור...</option>
                                    {sources.map(s => (
                                        <option key={s} value={s}>{sourceTranslations[s] || s}</option>
                                    ))}
                                    {/* Common sources even if not in DB */}
                                    {!sources.includes('Website') && <option value="Website">אתר אינטרנט</option>}
                                    {!sources.includes('Google') && <option value="Google">גוגל</option>}
                                    {!sources.includes('Facebook') && <option value="Facebook">פייסבוק</option>}
                                    {!sources.includes('Landing Page') && <option value="Landing Page">דף נחיתה</option>}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">תיאור (אופציונלי)</label>
                                <textarea
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                                    rows={2}
                                    placeholder="תיאור קצר של הקמפיין"
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={!formName || !formSource || isSaving}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {editingCampaign ? 'שמור שינויים' : 'צור קמפיין'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignSettings;
