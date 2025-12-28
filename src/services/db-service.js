const supabase = require('../lib/supabase'); // Corrected Path

class DBService {

    // --- CALLS ---
    async saveCall(callData) {
        // const userId = await getSystemUserId(); // Removed mock/unused

        try {
            // Update the existing call record created at start
            const { data, error } = await supabase
                .from('calls')
                .update({
                    status: 'completed',
                    duration: Math.floor((Date.now() - callData.startTime) / 1000),
                    transcript: callData.transcripts,
                    // score is in summary table usually, but we can store it here if schema supports
                })
                .eq('id', callData.callSid)
                .select()
                .single();

            if (error) {
                // Determine if error is "not found" (maybe call wasn't created at start?)
                console.warn('[Supabase] Warning during call update:', error.message);
                // Fallback: Insert if missing (Robustness)
                const { error: insertError } = await supabase.from('calls').insert({
                    id: callData.callSid,
                    agent_id: callData.agentId || 'system',
                    lead_id: callData.leadId, // NOW WE HAVE THIS
                    status: 'completed',
                    direction: 'outbound',
                    duration: Math.floor((Date.now() - callData.startTime) / 1000),
                    transcript: callData.transcripts,
                    created_at: new Date(callData.startTime).toISOString()
                });
                if (insertError) throw insertError;
            }

            // Save Summary
            if (callData.summary) {
                // Check if summary already exists? Usually not for a new call.
                await supabase.from('call_summaries').insert({
                    call_id: callData.callSid,
                    summary_text: callData.summary.summary,
                    score: callData.summary.score || 0,
                    successful: callData.summary.success || false
                });
            }

            console.log(`[Supabase] Successfully saved/updated call ${callData.callSid}`);
            return data;
        } catch (err) {
            console.error('[Supabase] Save Call Error:', err);
            return null;
        }
    }

    async getRecentCalls(limit = 10) {
        try {
            const { data, error } = await supabase
                .from('calls')
                .select('*, call_summaries(*)')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('[Supabase] Get Calls Error:', err);
            return [];
        }
    }

    // --- LEADS ---
    async getLeads() {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('[Supabase] Get Leads Error:', err);
            return [];
        }
    }

    async seedLeads(initialLeads) {
        const userId = await getSystemUserId();

        // Transform leads to match Schema
        const dbLeads = initialLeads.map(l => ({
            owner_id: userId,
            name: l.name,
            company: l.company,
            phone: l.phone,
            email: l.email,
            status: l.status,
            priority: l.priority,
            value: parseInt(l.value.replace(/[^0-9]/g, '')) || 0, // Cleanup currency string
            tags: l.tags
        }));

        try {
            const { data, error } = await supabase
                .from('leads')
                .insert(dbLeads)
                .select();

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('[Supabase] Seed Error:', err);
            return false;
        }
    }
}

module.exports = new DBService();
