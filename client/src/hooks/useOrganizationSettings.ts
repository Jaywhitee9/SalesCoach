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
    // Add other settings fields here as needed
}

export const useOrganizationSettings = (orgId?: string) => {
    const [settings, setSettings] = useState<OrganizationSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const defaultStatuses: PipelineStatus[] = [
        { id: 'New', label: 'ליד חדש', color: '#3B82F6' },
        { id: 'Contacted', label: 'נוצר קשר', color: '#F59E0B' },
        { id: 'Qualified', label: 'ליד איכותי', color: '#8B5CF6' },
        { id: 'Proposal', label: 'הצעת מחיר', color: '#10B981' },
        { id: 'Negotiation', label: 'משא ומתן', color: '#EC4899' },
        { id: 'Won', label: 'סגירה - זכייה', color: '#059669' },
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
                    // If no settings found, implementation might vary (create default or just return null)
                    console.error('Error fetching org settings:', error);
                    // Fallback to default if error (or not found)
                    setSettings({
                        id: 'temp',
                        organization_id: orgId,
                        pipeline_statuses: defaultStatuses
                    });
                } else {
                    // Ensure pipeline_statuses exists, fallback to default if null
                    const statuses = data.pipeline_statuses || defaultStatuses;
                    setSettings({ ...data, pipeline_statuses: statuses });
                }
            } catch (err) {
                console.error('Unexpected error in useOrganizationSettings:', err);
                setError('Failed to load settings');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [orgId]);

    return { settings, loading, error };
};
