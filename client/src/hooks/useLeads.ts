import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Lead } from '../../types';

export const useLeads = (initialStatus?: string, organizationId?: string, userId?: string) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('leads')
                .select(`
                    *,
                    owner:owner_id (
                        id,
                        full_name,
                        avatar_url,
                        role
                    )
                `)
                .order('created_at', { ascending: false });

            if (organizationId) {
                query = query.eq('organization_id', organizationId);
            }

            // Filter by owner - each user only sees their own leads
            if (userId) {
                query = query.eq('owner_id', userId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Transform DB data to UI Lead Type
            const formattedLeads: Lead[] = (data || []).map((dbLead: any) => ({
                id: dbLead.id,
                name: dbLead.name,
                company: dbLead.company || '',
                phone: dbLead.phone || '',
                email: dbLead.email || '',
                status: dbLead.status || 'New',
                priority: dbLead.priority || 'Warm',
                value: dbLead.value ? `$${dbLead.value.toLocaleString()}` : '$0',
                owner: dbLead.owner ? {
                    id: dbLead.owner.id,
                    name: dbLead.owner.full_name,
                    avatar: dbLead.owner.avatar_url || 'https://ui-avatars.com/api/?name=User',
                    role: dbLead.owner.role,
                    type: dbLead.owner.role === 'platform_admin' ? 'super_admin' : dbLead.owner.role || 'rep'
                } : undefined,
                source: dbLead.source,
                // Use last_activity_at if available, else created_at, relative time string logic could be handled in UI or here
                // For now passing raw date string, UI helper parseRelativeTime handles strings like "2 שעות"
                // customizing to output readable string if needed, but UI parser expects Hebrew strings.
                // We'll pass the ISO string for sorting, but UI might need adjustment if it expects Hebrew.
                // Actually LeadsDashboard.tsx parseRelativeTime expects strings like "2 שעות". 
                // We might need to keep MOCK format or update UI parser. 
                // Let's assume for now we provide ISO and will fix UI parser next step.
                lastActivity: dbLead.last_activity_at || dbLead.created_at,
                tags: dbLead.tags || [],
                createdAt: dbLead.created_at,
                score: dbLead.score || 0, // Map Lead Score from DB
                scoreDetails: dbLead.score_details || null // AI Score details (fit/activity/intent/reasoning)
            }));

            setLeads(formattedLeads);
        } catch (err: any) {
            console.error('Error fetching leads:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addLead = async (newLead: Partial<Lead>) => {
        try {
            setLoading(true);
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            if (authError || !session) throw new Error('No active session');

            // 1. Get User Profile for Organization ID
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', session.user.id)
                .single();

            if (profileError || !profile?.organization_id) {
                throw new Error('Could not fetch user organization details.');
            }

            // 2. Prepare Payload
            // Validate owner_id is a valid UUID (mock IDs like "u1" will fail DB insert)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            let ownerId = newLead.owner?.id;

            if (!ownerId || !uuidRegex.test(ownerId)) {
                // Try auto-distribution first
                try {
                    const distRes = await fetch(`/api/org/next-assignee?organizationId=${profile.organization_id}`);
                    const distJson = await distRes.json();
                    if (distJson.success && distJson.autoDistribute && distJson.assignee?.id) {
                        ownerId = distJson.assignee.id;
                        console.log('[useLeads] Auto-assigned to:', distJson.assignee.name);
                    } else {
                        // Fallback to current user
                        ownerId = session.user.id;
                    }
                } catch (distErr) {
                    console.warn('[useLeads] Auto-distribute failed, using current user:', distErr);
                    ownerId = session.user.id;
                }
            }

            const payload = {
                name: newLead.name,
                company: newLead.company,
                status: newLead.status || 'New',
                source: newLead.source,
                phone: newLead.phone,
                email: newLead.email,
                value: newLead.value ? parseFloat(newLead.value.replace(/[^0-9.]/g, '')) : 0,
                tags: newLead.tags,
                owner_id: ownerId,
                organization_id: profile.organization_id // Critical Multi-Tenant Field
            };

            // 3. Insert
            const { error: insertError } = await supabase
                .from('leads')
                .insert([payload]);

            if (insertError) throw insertError;

            // 4. Refresh List
            await fetchLeads();
            return { success: true };

        } catch (err: any) {
            console.error('Error saving lead:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteLead = async (leadId: string) => {
        try {
            // Optimistic update
            setLeads(prev => prev.filter(l => l.id !== leadId));

            const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
            const json = await res.json();

            if (!json.success) {
                // Revert on failure
                await fetchLeads();
                throw new Error('Delete failed');
            }
            return { success: true };
        } catch (err: any) {
            console.error('Error deleting lead:', err);
            throw err;
        }
    };

    const updateLead = async (leadId: string, updates: Partial<Lead>) => {
        // 1. Snapshot previous state
        const previousLeads = [...leads];

        // 2. Optimistic Update
        setLeads(current => current.map(lead =>
            lead.id === leadId ? { ...lead, ...updates } : lead
        ));

        try {
            const payload: any = {};
            if (updates.name !== undefined) payload.name = updates.name;
            if (updates.company !== undefined) payload.company = updates.company;
            if (updates.phone !== undefined) payload.phone = updates.phone;
            if (updates.email !== undefined) payload.email = updates.email;
            if (updates.status !== undefined) payload.status = updates.status;
            if (updates.priority !== undefined) payload.priority = updates.priority;
            if (updates.value !== undefined) {
                payload.value = typeof updates.value === 'string'
                    ? parseFloat(updates.value.replace(/[^0-9.]/g, ''))
                    : updates.value;
            }
            if (updates.tags !== undefined) payload.tags = updates.tags;
            if (updates.source !== undefined) payload.source = updates.source;
            if ((updates as any).website !== undefined) payload.website = (updates as any).website;

            if (updates.owner?.id) payload.owner_id = updates.owner.id;

            const { error } = await supabase
                .from('leads')
                .update(payload)
                .eq('id', leadId);

            if (error) {
                console.error('DB Update Error:', error);
                throw error;
            }

            if (error) throw error;

            // Success: No need to re-fetch if we are confident, or fetch silently
            // Currently avoiding re-fetch to keep it super smooth as requested
            return { success: true };

        } catch (err: any) {
            console.error('Error updating lead:', err);
            // 3. Revert on Error
            setLeads(previousLeads);
            // Optional: Show toast error here
            throw err;
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [organizationId]);

    // AI Score Generation
    const generateAiScore = async (leadId: string) => {
        try {
            const response = await fetch(`/api/leads/${leadId}/ai-score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();

            // Update local state with the returned lead data
            setLeads(prev => prev.map(l =>
                l.id === leadId ? { ...l, score: data.score, scoreDetails: data.scoreDetails } : l
            ));
            return data;
        } catch (err) {
            console.error('Failed to generate AI score:', err);
            throw err;
        }
    };

    return { leads, loading, error, refreshLeads: fetchLeads, addLead, deleteLead, updateLead, generateAiScore };
};
