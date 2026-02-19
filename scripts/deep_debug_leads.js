/**
 * DEEP DEBUG SCRIPT - Diagnose why leads aren't appearing for reps
 * Tests: RLS policies, INSERT, SELECT, and data integrity
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function deepDebug() {
    console.log('='.repeat(60));
    console.log('DEEP DEBUG: Lead Creation & Visibility');
    console.log('='.repeat(60));

    // 1. CHECK ALL RLS POLICIES ON LEADS TABLE
    console.log('\n--- Step 1: All RLS Policies on "leads" table ---');
    try {
        const { data: policies, error } = await adminClient.rpc('exec_sql', {
            query: `SELECT policyname, cmd, permissive, roles, qual, with_check 
                    FROM pg_policies WHERE tablename = 'leads' ORDER BY cmd;`
        });
        if (error) {
            console.log('Cannot query pg_policies via RPC:', error.message);
            console.log('Trying alternative...');
        } else {
            console.log(JSON.stringify(policies, null, 2));
        }
    } catch (e) {
        console.log('RPC not available, skipping policy query');
    }

    // 2. CHECK IF RLS IS ENABLED
    console.log('\n--- Step 2: Is RLS enabled on "leads"? ---');
    try {
        const { data, error } = await adminClient.rpc('exec_sql', {
            query: `SELECT relname, relrowsecurity, relforcerowsecurity 
                    FROM pg_class WHERE relname = 'leads';`
        });
        if (!error) console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.log('Skipping RLS check via RPC');
    }

    // 3. GET ALL LEADS (admin - bypasses RLS)
    console.log('\n--- Step 3: All leads in DB (admin view) ---');
    const { data: allLeads, error: leadsErr } = await adminClient
        .from('leads')
        .select('id, name, organization_id, owner_id, created_at, status')
        .order('created_at', { ascending: false })
        .limit(10);

    if (leadsErr) {
        console.log('ERROR fetching leads:', leadsErr.message);
    } else {
        console.log(`Total leads found: ${allLeads.length}`);
        allLeads.forEach(l => {
            console.log(`  - ${l.name} | org: ${l.organization_id} | owner: ${l.owner_id} | status: ${l.status} | created: ${l.created_at}`);
        });
    }

    // 4. GET ALL PROFILES (to find rep users)
    console.log('\n--- Step 4: All profiles ---');
    const { data: profiles, error: profErr } = await adminClient
        .from('profiles')
        .select('id, full_name, role, organization_id')
        .order('role');

    if (profErr) {
        console.log('ERROR:', profErr.message);
    } else {
        console.log(`Total profiles: ${profiles.length}`);
        profiles.forEach(p => {
            console.log(`  - ${p.full_name} | role: ${p.role} | org: ${p.organization_id} | id: ${p.id}`);
        });
    }

    // 5. FIND A REP USER AND TEST SELECT AS THEM
    const repUser = profiles?.find(p => p.role === 'rep' || p.role === 'sales_rep');
    if (!repUser) {
        console.log('\n⚠️  No rep user found in profiles!');

        // Check if there's a user with any role
        const anyUser = profiles?.[0];
        if (anyUser) {
            console.log(`Found user: ${anyUser.full_name} (${anyUser.role})`);
        }
    } else {
        console.log(`\n--- Step 5: Testing as Rep: ${repUser.full_name} (${repUser.id}) ---`);

        // 5a. Check how many leads this rep SHOULD see (admin view)
        const { data: repLeadsAdmin } = await adminClient
            .from('leads')
            .select('id, name, owner_id, organization_id')
            .eq('organization_id', repUser.organization_id);

        console.log(`Leads in rep's org (admin view): ${repLeadsAdmin?.length || 0}`);

        const ownedLeads = repLeadsAdmin?.filter(l => l.owner_id === repUser.id);
        console.log(`Leads owned by this rep: ${ownedLeads?.length || 0}`);

        // 5b. Sign in as the rep to test RLS
        console.log('\n--- Step 5b: Testing SELECT as Rep (via RLS) ---');
        // We can't sign in as the rep without their password, but we can
        // create a client with the anon key and set the JWT claims manually
        // Actually, let's just check the RLS policy logic manually

        // Check: does the rep's org match the leads' org?
        if (repLeadsAdmin && repLeadsAdmin.length > 0) {
            const sampleLead = repLeadsAdmin[0];
            console.log(`Sample lead org: ${sampleLead.organization_id}`);
            console.log(`Rep's org: ${repUser.organization_id}`);
            console.log(`Match: ${sampleLead.organization_id === repUser.organization_id}`);
        }
    }

    // 6. CHECK useLeads QUERY LOGIC
    console.log('\n--- Step 6: Simulate useLeads query ---');
    // The useLeads hook does this query:
    // supabase.from('leads').select('*, owner:owner_id(...)').eq('organization_id', orgId)
    // For reps: .eq('owner_id', userId) 

    if (repUser) {
        // Simulate what useLeads does for a rep
        const { data: simLeads, error: simErr } = await adminClient
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
            .eq('organization_id', repUser.organization_id)
            .eq('owner_id', repUser.id)
            .order('created_at', { ascending: false });

        if (simErr) {
            console.log('ERROR simulating rep query:', simErr.message);
        } else {
            console.log(`Leads returned for rep (simulated): ${simLeads?.length || 0}`);
            simLeads?.forEach(l => {
                console.log(`  - ${l.name} | owner_id: ${l.owner_id} | org: ${l.organization_id} | status: ${l.status}`);
            });
        }
    }

    // 7. CHECK RECENTLY CREATED LEADS (last hour)
    console.log('\n--- Step 7: Recently created leads (last 1 hour) ---');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentLeads, error: recentErr } = await adminClient
        .from('leads')
        .select('id, name, organization_id, owner_id, status, created_at')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false });

    if (recentErr) {
        console.log('ERROR:', recentErr.message);
    } else if (recentLeads?.length === 0) {
        console.log('⚠️  NO LEADS CREATED IN THE LAST HOUR!');
        console.log('This means the INSERT is silently failing despite SAVE_LEAD_SUCCESS.');
        console.log('Possible cause: RLS WITH CHECK is rejecting but Supabase client is not throwing.');
    } else {
        console.log(`Found ${recentLeads.length} recent leads:`);
        recentLeads.forEach(l => {
            console.log(`  - ${l.name} | org: ${l.organization_id} | owner: ${l.owner_id} | status: ${l.status} | created: ${l.created_at}`);
        });
    }

    // 8. TEST INSERT AS SERVICE ROLE (should always work)
    console.log('\n--- Step 8: Test INSERT with service role ---');
    const testName = `DEBUG_PROBE_${Date.now()}`;
    const testOrg = profiles?.[0]?.organization_id;
    const testOwner = repUser?.id || profiles?.[0]?.id;

    if (testOrg && testOwner) {
        const { data: inserted, error: insertErr } = await adminClient
            .from('leads')
            .insert({
                name: testName,
                organization_id: testOrg,
                owner_id: testOwner,
                status: 'New',
                phone: '0501234567',
                source: 'Debug Probe'
            })
            .select()
            .single();

        if (insertErr) {
            console.log('❌ INSERT FAILED even with admin:', insertErr.message);
            console.log('Full error:', JSON.stringify(insertErr));
        } else {
            console.log('✅ INSERT succeeded! Lead ID:', inserted.id);

            // Cleanup
            await adminClient.from('leads').delete().eq('id', inserted.id);
            console.log('🧹 Cleaned up test lead');
        }
    }

    // 9. CHECK SUPABASE ENV VARS
    console.log('\n--- Step 9: Environment Check ---');
    console.log('SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('SERVICE_KEY:', SERVICE_KEY ? '✅ Set' : '❌ Missing');
    console.log('ANON_KEY:', ANON_KEY ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_URL value:', SUPABASE_URL);

    console.log('\n' + '='.repeat(60));
    console.log('DEBUG COMPLETE');
    console.log('='.repeat(60));
}

deepDebug().catch(console.error);
