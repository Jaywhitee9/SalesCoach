require('dotenv').config();
const supabase = require('./src/lib/supabase');

async function debugQueue() {
    console.log('--- DEBUGGING SMART QUEUE ---');

    // 1. Check Total Leads
    const { count: total, error: countErr } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

    if (countErr) {
        console.error('Count Error:', countErr);
        return;
    }
    console.log('Total Leads in DB:', total);

    // 2. Check Leads by Status
    const { data: statusStats, error: statusErr } = await supabase
        .from('leads')
        .select('status, organization_id');

    if (statusErr) console.error('Status Stats Error:', statusErr);
    else {
        const stats = {};
        const orgs = {};
        statusStats.forEach(l => {
            stats[l.status] = (stats[l.status] || 0) + 1;
            orgs[l.organization_id] = (orgs[l.organization_id] || 0) + 1;
        });
        console.log('Leads by Status:', stats);
        console.log('Leads by Org:', orgs);
    }

    // 3. Simulate Smart Queue Query
    // We need a valid organizationId to test. Let's pick one from the stats.
    // If stats is empty, we have no leads.

    // User Session Org from Logs: d55ed7e3-3ec7-4b48-bc77-9e545c1aeb06
    const targetOrgId = 'd55ed7e3-3ec7-4b48-bc77-9e545c1aeb06';
    console.log('\n--- SIMULATING FOR ORG:', targetOrgId);

    const { data: queue, error: qErr } = await supabase
        .from('leads')
        .select('id, name, status, follow_up_at, priority')
        .eq('organization_id', targetOrgId)
        .neq('status', 'Closed')
        .neq('status', 'Lost')
        .limit(10);

    if (qErr) console.error('Queue Query Error:', qErr);
    else {
        console.log(`Queue Result Count: ${queue.length}`);
        if (queue.length === 0) {
            // Why empty? Check if leads exist for this org at all
            const { count: orgCount } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', targetOrgId);
            console.log(`Total Leads for this Org (including Closed): ${orgCount}`);
        } else {
            console.log('First 3 leads in queue:', queue.slice(0, 3));
        }
    }
}

debugQueue();
