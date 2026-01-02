import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface LeadActivity {
    id: string;
    lead_id: string;
    org_id: string;
    type: 'call_start' | 'call_end' | 'note' | 'follow_up' | 'deal_closed' | 'not_relevant' | 'summary_ready' | 'status_change' | 'lead_created' | 'email_sent';
    data: {
        note?: string;
        summary?: string;
        duration?: number;
        old_status?: string;
        new_status?: string;
        source?: string;
        file_name?: string;
        [key: string]: any;
    };
    call_session_id?: string;
    created_by?: string;
    created_at: string;
}

export const useLeadActivities = (leadId: string | undefined) => {
    const [activities, setActivities] = useState<LeadActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchActivities = useCallback(async () => {
        if (!leadId) {
            setActivities([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('lead_activities')
                .select('*')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            setActivities(data || []);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching activities:', err);
            setError(err.message);
            setActivities([]);
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    const addActivity = async (type: LeadActivity['type'], data: LeadActivity['data'] = {}) => {
        if (!leadId) return { success: false, error: 'No lead ID' };

        try {
            // Get current user's org_id
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) throw new Error('No organization found');

            const newActivity = {
                lead_id: leadId,
                org_id: profile.organization_id,
                type,
                data,
                created_by: user.id
            };

            const { data: created, error: insertError } = await supabase
                .from('lead_activities')
                .insert(newActivity)
                .select()
                .single();

            if (insertError) throw insertError;

            // Add to local state
            setActivities(prev => [created, ...prev]);

            return { success: true, activity: created };
        } catch (err: any) {
            console.error('Error adding activity:', err);
            return { success: false, error: err.message };
        }
    };

    return {
        activities,
        loading,
        error,
        refreshActivities: fetchActivities,
        addActivity
    };
};
