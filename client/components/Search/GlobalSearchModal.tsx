import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, User as UserIcon, Phone, CheckCircle2, Loader2, FileText, ArrowLeft, Building2, Mail } from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';

interface SearchResult {
    id: string;
    type: 'lead' | 'task' | 'profile';
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    metadata?: {
        status?: string;
        phone?: string;
        email?: string;
    };
}

interface GlobalSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    orgId?: string;
    userId?: string;
    userRole?: string;
    onNavigate: (page: string) => void;
    onSelectLead?: (leadId: string) => void;
    onSelectTask?: (taskId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
    isOpen,
    onClose,
    orgId,
    userId,
    userRole,
    onNavigate,
    onSelectLead,
    onSelectTask
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Search function
    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        const searchResults: SearchResult[] = [];
        const isManager = userRole === 'manager' || userRole === 'sales_manager' || userRole === 'admin' || userRole === 'super_admin' || userRole === 'platform_admin';

        try {
            // Search Leads
            let leadsQuery = supabase
                .from('leads')
                .select('id, name, company, phone, email, status')
                .or(`name.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
                .limit(5);

            if (orgId) {
                leadsQuery = leadsQuery.eq('organization_id', orgId);
            }
            if (userId && !isManager) {
                leadsQuery = leadsQuery.eq('owner_id', userId);
            }

            const { data: leads } = await leadsQuery;
            if (leads) {
                leads.forEach((lead: any) => {
                    searchResults.push({
                        id: lead.id,
                        type: 'lead',
                        title: lead.name,
                        subtitle: lead.company || lead.phone || '',
                        icon: <UserIcon className="w-4 h-4 text-brand-500" />,
                        metadata: {
                            status: lead.status,
                            phone: lead.phone,
                            email: lead.email
                        }
                    });
                });
            }

            // Search Tasks
            let tasksQuery = supabase
                .from('tasks')
                .select('id, title, due_date, status')
                .ilike('title', `%${searchQuery}%`)
                .limit(5);

            if (orgId) {
                tasksQuery = tasksQuery.eq('organization_id', orgId);
            }
            if (userId && !isManager) {
                tasksQuery = tasksQuery.eq('assigned_to', userId);
            }

            const { data: tasks } = await tasksQuery;
            if (tasks) {
                tasks.forEach((task: any) => {
                    searchResults.push({
                        id: task.id,
                        type: 'task',
                        title: task.title,
                        subtitle: task.due_date ? new Date(task.due_date).toLocaleDateString('he-IL') : '',
                        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
                        metadata: { status: task.status }
                    });
                });
            }

            // Search Team Members (for managers)
            if (isManager) {
                let profilesQuery = supabase
                    .from('profiles')
                    .select('id, full_name, email, role')
                    .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
                    .limit(3);

                if (orgId) {
                    profilesQuery = profilesQuery.eq('organization_id', orgId);
                }

                const { data: profiles } = await profilesQuery;
                if (profiles) {
                    profiles.forEach((profile: any) => {
                        searchResults.push({
                            id: profile.id,
                            type: 'profile',
                            title: profile.full_name,
                            subtitle: profile.role === 'manager' ? 'מנהל' : 'נציג',
                            icon: <Building2 className="w-4 h-4 text-slate-500" />
                        });
                    });
                }
            }

            setResults(searchResults);
            setSelectedIndex(0);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    }, [orgId, userId, userRole]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, performSearch]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    // Handle selection
    const handleSelect = (result: SearchResult) => {
        if (result.type === 'lead') {
            onNavigate('leads');
            if (onSelectLead) {
                setTimeout(() => onSelectLead(result.id), 100);
            }
        } else if (result.type === 'task') {
            onNavigate('tasks');
            if (onSelectTask) {
                setTimeout(() => onSelectTask(result.id), 100);
            }
        } else if (result.type === 'profile') {
            onNavigate('settings');
        }
        onClose();
    };

    // Scroll selected item into view
    useEffect(() => {
        if (resultsRef.current) {
            const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-50 overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 dark:border-slate-800">
                    <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="חפש לידים, משימות, אנשי צוות..."
                        className="flex-1 bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400 text-base"
                    />
                    {loading && <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />}
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Results */}
                <div ref={resultsRef} className="max-h-[400px] overflow-y-auto">
                    {query.length >= 2 && results.length === 0 && !loading && (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">לא נמצאו תוצאות עבור "{query}"</p>
                        </div>
                    )}

                    {results.length > 0 && (
                        <div className="p-2">
                            {/* Group by type */}
                            {['lead', 'task', 'profile'].map(type => {
                                const typeResults = results.filter(r => r.type === type);
                                if (typeResults.length === 0) return null;

                                const typeLabels: Record<string, string> = {
                                    lead: 'לידים',
                                    task: 'משימות',
                                    profile: 'אנשי צוות'
                                };

                                return (
                                    <div key={type} className="mb-2">
                                        <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            {typeLabels[type]}
                                        </div>
                                        {typeResults.map((result, idx) => {
                                            const globalIndex = results.indexOf(result);
                                            const isSelected = globalIndex === selectedIndex;

                                            return (
                                                <button
                                                    key={result.id}
                                                    onClick={() => handleSelect(result)}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-right transition-colors ${isSelected
                                                            ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-900 dark:text-brand-100'
                                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
                                                        }`}
                                                >
                                                    <div className={`p-2 rounded-lg flex-shrink-0 ${isSelected ? 'bg-brand-100 dark:bg-brand-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                        {result.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{result.title}</p>
                                                        {result.subtitle && (
                                                            <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                                                        )}
                                                    </div>
                                                    {result.metadata?.status && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hidden sm:block">
                                                            {result.metadata.status}
                                                        </span>
                                                    )}
                                                    <ArrowLeft className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!query && (
                        <div className="p-6 text-center text-slate-400">
                            <p className="text-sm">התחל להקליד לחיפוש...</p>
                            <p className="text-xs mt-2 opacity-60">
                                חפש לפי שם ליד, טלפון, חברה, או כותרת משימה
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-mono">↑↓</kbd>
                            ניווט
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-mono">Enter</kbd>
                            בחירה
                        </span>
                    </div>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-mono">Esc</kbd>
                        סגור
                    </span>
                </div>
            </div>
        </>
    );
};
