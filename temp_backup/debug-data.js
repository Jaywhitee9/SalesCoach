require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectRon() {
    // 1. Find Ron
    const { data: leads } = await supabase
        .from('leads')
        .select('id, name')
        .ilike('name', '%Ron%')
        .limit(1);

    if (!leads || leads.length === 0) {
        // Try searching all if ILIKE fails (though it worked before for the list)
        // Earlier log showed 'רון חקים (695f...)'
        console.log('Using hardcoded ID for Ron Hakim');
        // From previous log: 695f42f4-c145-4b74-8043-3ebf8f53d0cc
    }

    const leadId = leads?.[0]?.id || '695f42f4-c145-4b74-8043-3ebf8f53d0cc';
    const name = leads?.[0]?.name || 'Ron Hakim (Hardcoded)';

    console.log(`Inspecting calls for lead ${leadId} (${name})...`);

    const { data: calls, error: callsError } = await supabase
        .from('calls')
        .select(`
            id, 
            created_at, 
            transcript,
            status,
            call_summaries (summary_text)
        `)
        .eq('lead_id', leadId);

    if (callsError) {
        console.error('Error fetching calls:', callsError);
        return;
    }

    console.log(`Found ${calls.length} calls.`);
    calls.forEach((c, i) => {
        console.log(`\nCall #${i + 1} (${c.created_at}):`);
        console.log(`Status: ${c.status}`);

        if (c.transcript && typeof c.transcript === 'object') {
            const keys = Object.keys(c.transcript);
            console.log(`Transcript Keys: [${keys.join(', ')}]`);

            // Check content length
            if (c.transcript.agent) console.log(`Agent segments: ${c.transcript.agent.length}`);
            if (c.transcript.user) console.log(`User segments: ${c.transcript.user.length}`);
            if (c.transcript.customer) console.log(`Customer segments: ${c.transcript.customer.length}`);

            // Sample
            console.log(`Transcript Preview:`, JSON.stringify(c.transcript).substring(0, 300) + '...');
        } else {
            console.log(`Transcript is empty or invalid.`);
        }
    });
}

inspectRon();
