import React, { useState, useEffect } from 'react';
import { BookOpen, Target, Shield, Save, Plus, Edit2, Trash2, Check, X, Loader2 } from 'lucide-react';
import { Button } from '../Common/Button';
import { User } from '../../types';

interface KnowledgeBaseProps {
    user: User;
}

interface KnowledgeItem {
    id?: string;
    knowledge_type: string;
    title: string;
    content: any;
    domain: string;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [domain, setDomain] = useState<'sales' | 'support' | 'success'>('sales');
    const [activeTab, setActiveTab] = useState<'product' | 'objections' | 'competitors'>('product');

    // Knowledge state
    const [productInfo, setProductInfo] = useState('');
    const [objections, setObjections] = useState<any[]>([]);
    const [competitors, setCompetitors] = useState<any[]>([]);

    // Form states
    const [editingObjection, setEditingObjection] = useState<any>(null);
    const [editingCompetitor, setEditingCompetitor] = useState<any>(null);

    const orgId = user.organization_id || 'org1';

    // Load knowledge on mount/domain change
    useEffect(() => {
        loadKnowledge();
    }, [domain, orgId]);

    const loadKnowledge = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/knowledge?organizationId=${orgId}&domain=${domain}`);
            const data = await res.json();

            if (data.success) {
                // Organize by type
                data.knowledge.forEach((item: KnowledgeItem) => {
                    if (item.knowledge_type === 'product_info') {
                        setProductInfo(item.content.description || '');
                    } else if (item.knowledge_type === 'objections') {
                        setObjections(prev => [...prev, { ...item.content, id: item.id }]);
                    } else if (item.knowledge_type === 'competitors') {
                        setCompetitors(prev => [...prev, { ...item.content, id: item.id }]);
                    }
                });
            }
        } catch (err) {
            console.error('Failed to load knowledge:', err);
        } finally {
            setLoading(false);
        }
    };

    const saveProductInfo = async () => {
        setSaving(true);
        try {
            await fetch('/api/knowledge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationId: orgId,
                    domain,
                    knowledge_type: 'product_info',
                    title: 'Product Information',
                    content: { description: productInfo }
                })
            });
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setSaving(false);
        }
    };

    const saveObjection = async (objection: any) => {
        try {
            await fetch('/api/knowledge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: objection.id,
                    organizationId: orgId,
                    domain,
                    knowledge_type: 'objections',
                    title: objection.objection_text,
                    content: objection
                })
            });
            setEditingObjection(null);
            loadKnowledge();
        } catch (err) {
            console.error('Failed to save objection:', err);
        }
    };

    const deleteItem = async (id: string) => {
        try {
            await fetch(`/api/knowledge/${id}?organizationId=${orgId}`, {
                method: 'DELETE'
            });
            loadKnowledge();
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    if (loading) return <div className="p-8 text-center">טוען בסיס ידע...</div>;

    return (
        <div className="space-y-6">

            {/* Domain Selector */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                    תחום פעילות (Domain)
                </label>
                <div className="flex gap-2">
                    {[
                        { value: 'sales', label: '💼 מכירות', desc: 'אימון נציגי מכירות' },
                        { value: 'support', label: '🎧 תמיכה', desc: 'שירות לקוחות וטכני' },
                        { value: 'success', label: '⭐ Success', desc: 'שימור והרחבה' }
                    ].map(d => (
                        <button
                            key={d.value}
                            onClick={() => setDomain(d.value as any)}
                            className={`flex-1 p-4 rounded-lg border-2 transition-all ${domain === d.value
                                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                }`}
                        >
                            <div className="font-bold text-sm">{d.label}</div>
                            <div className="text-xs text-slate-500 mt-1">{d.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex border-b border-slate-200 dark:border-slate-800">
                    {[
                        { id: 'product', label: 'מידע על המוצר', icon: BookOpen },
                        { id: 'objections', label: 'התנגדויות נפוצות', icon: Target },
                        { id: 'competitors', label: 'מתחרים', icon: Shield }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id
                                    ? 'border-brand-500 text-brand-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* Product Info Tab */}
                    {activeTab === 'product' && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600">תאר את המוצר/שירות שלך - המאמן ישתמש במידע הזה בזמן אמת</p>
                            <textarea
                                value={productInfo}
                                onChange={(e) => setProductInfo(e.target.value)}
                                placeholder="לדוגמה: מערכת AI Coach לנציגי מכירות... תכונות ייחודיות: תמלול בעברית, feedback בזמן אמת..."
                                className="w-full h-64 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none resize-none"
                            />
                            <Button onClick={saveProductInfo} disabled={saving}>
                                {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                                שמור
                            </Button>
                        </div>
                    )}

                    {/* Objections Tab */}
                    {activeTab === 'objections' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-slate-600">הגדר תגובות להתנגדויות נפוצות</p>
                                <Button size="sm" onClick={() => setEditingObjection({})}>
                                    <Plus className="w-4 h-4 ml-1" /> הוסף התנגדות
                                </Button>
                            </div>

                            {/* Objections List */}
                            <div className="space-y-2">
                                {objections.map((obj, idx) => (
                                    <div key={idx} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="font-bold text-sm">{obj.objection_text}</div>
                                                <div className="text-xs text-slate-600 mt-1">תגובה: {obj.response}</div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => setEditingObjection(obj)} className="p-1 text-slate-400 hover:text-blue-500">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteItem(obj.id)} className="p-1 text-slate-400 hover:text-red-500">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Edit Form */}
                            {editingObjection && (
                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-lg w-full mx-4">
                                        <h3 className="font-bold text-lg mb-4">
                                            {editingObjection.id ? 'ערוך התנגדות' : 'התנגדות חדשה'}
                                        </h3>
                                        <div className="space-y-4">
                                            <input
                                                placeholder='ההתנגדות (למשל: "יקר מדי")'
                                                value={editingObjection.objection_text || ''}
                                                onChange={(e) => setEditingObjection({ ...editingObjection, objection_text: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                            />
                                            <textarea
                                                placeholder="התגובה המומלצת..."
                                                value={editingObjection.response || ''}
                                                onChange={(e) => setEditingObjection({ ...editingObjection, response: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg h-24"
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="ghost" onClick={() => setEditingObjection(null)}>ביטול</Button>
                                                <Button onClick={() => saveObjection(editingObjection)}>שמור</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Competitors Tab */}
                    {activeTab === 'competitors' && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600">הגדר Battle Cards מול מתחרים</p>
                            <Button size="sm" onClick={() => setEditingCompetitor({})}>
                                <Plus className="w-4 h-4 ml-1" /> הוסף מתחרה
                            </Button>

                            {/* Similar structure to objections */}
                            <div className="text-slate-500 text-center py-8">
                                בקרוב: ניהול מתחרים
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
