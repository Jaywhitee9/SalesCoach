const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPolicies() {
    const { data, error } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'leads');

    if (error) {
        // If we can't query pg_policies directly via postgrest (often restricted), 
        // we'll try to just INSERT as a rep user to see if it fails.
        console.log('Cannot query pg_policies directly:', error.message);
        testInsertAsRep();
    } else {
        console.log('Policies on leads table:');
        data.forEach(p => console.log(`- ${p.policyname} (${p.cmd}): ${p.qual} (Start), ${p.with_check} (End)`));
    }
}

async function testInsertAsRep() {
    console.log('\nTesting INSERT as a Rep user...');
    // We need a valid Rep user ID. I'll pick one from profiles.
    const { data: reps } = await supabase.from('profiles').select('*').eq('role', 'rep').limit(1);
    if (!reps || reps.length === 0) {
        console.log('No rep users found to test with.');
        return;
    }
    const rep = reps[0];
    console.log(`Testing with Rep: ${rep.email} (${rep.id})`);

    // To truly test RLS, we need to sign in as this user or use `auth.uid()` mocking which is hard via JS client alone 
    // without a password. 
    // However, we can inspect the policies from migration files if this fails.
    // Let's rely on the user's report: "Rep cannot create leads".
    // This usually means the "INSERT" policy is missing or too restrictive (e.g. only allows Admins).
}

checkPolicies();
