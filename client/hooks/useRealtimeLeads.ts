import { useEffect } from 'react';
import { supabase } from '../src/lib/supabaseClient';

export const useRealtimeLeads = (organizationId: string | undefined, onLeadChange: () => void) => {
    useEffect(() => {
        if (!organizationId) return;

        // Create a channel for real-time updates on the 'leads' table
        // Filter by organization_id to avoid receiving events for other orgs
        const channel = supabase
            .channel(`leads-changes-${organizationId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'leads',
                    filter: `organization_id=eq.${organizationId}`,
                },
                (payload) => {
                    console.log('[Realtime] Lead changed:', payload.eventType);
                    onLeadChange(); // Trigger refetch or state update
                }
            )
            .subscribe();

        // Cleanup subscription on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, [organizationId, onLeadChange]);
};
