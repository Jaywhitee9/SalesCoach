import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface PipelineStatus {
    id: string;
    label: string;
    color: string;
}

export interface OrganizationSettings {
    id: string;
    organization_id: string;
    pipeline_statuses: PipelineStatus[];
}

export const useOrganizationSettings = (orgId?: string) => {
    const [settings, setSettings] = useState<OrganizationSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const defaultStatuses: PipelineStatus[] = [
        { id: 'New', label: 'ליד חדש', color: '#3B82F6' },
        { id: 'Discovery', label: 'גילוי צרכים', color: '#8B5CF6' },
        { id: 'Proposal', label: 'הצעת מחיר', color: '#10B981' },
        { id: 'Negotiation', label: 'משא ומתן', color: '#EC4899' },
        { id: 'Follow Up', label: 'פולואפ', color: '#F59E0B' },
        { id: 'Closed', label: 'סגור - הצלחה', color: '#059669' },
        { id: 'Lost', label: 'סגירה - הפסד', color: '#EF4444' }
    ];

    useEffect(() => {
        if (!orgId) {
            setLoading(false);
            return;
        }

        const fetchSettings = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('organization_settings')
                    .select('*')
                    .eq('organization_id', orgId)
                    .single();

                if (error) {
                    // Log warning but fallback gracefully
                    console.warn('Fetching org settings info (using defaults):', error.message);
                    setSettings({
                        id: 'default_fallback',
                        organization_id: orgId,
                        pipeline_statuses: defaultStatuses
                    });
                } else {
                    const statuses = data.pipeline_statuses || defaultStatuses;
                    setSettings({ ...data, pipeline_statuses: statuses });
                }
            } catch (err) {
                console.error('Unexpected error in useOrganizationSettings:', err);
                setError('Failed to load settings');
                // Ensure app doesn't crash
                setSettings({
                    id: 'error_fallback',
                    organization_id: orgId,
                    pipeline_statuses: defaultStatuses
                });
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [orgId]);

    const updateSettings = async (newSettings: Partial<OrganizationSettings>) => {
        if (!orgId) return { success: false, error: 'Missing Organization ID' };

        try {
            // Check if row exists
            const { count } = await supabase
                .from('organization_settings')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', orgId);

            let result;

            if (count === 0) {
                // Insert new row if missing
                result = await supabase
                    .from('organization_settings')
                    .insert({
                        organization_id: orgId,
                        ...newSettings,
                        calls_config: {}, // Default empty config
                        stages_config: []
                    });
            } else {
                // Update existing row
                result = await supabase
                    .from('organization_settings')
                    .update(newSettings)
                    .eq('organization_id', orgId);
            }

            if (result.error) throw result.error;

            // Optimistically update local state
            setSettings(prev => prev ? { ...prev, ...newSettings } : null);
            return { success: true };
        } catch (err: any) {
            console.error('Error updating settings details:', err);
            return { success: false, error: err.message || 'Update failed' };
        }
    };

    return { settings, loading, error, updateSettings };
};
