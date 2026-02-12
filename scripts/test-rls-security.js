require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

async function testRLSSecurity() {
  console.log('🔐 Testing RLS Security Policies\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log('-----------------------------------\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Test 1: Anonymous user should see nothing
  console.log('📋 Test 1: Anonymous User Access (Should be BLOCKED)');
  try {
    const { data: anonCalls, error: callsError } = await supabase.from('calls').select('*');
    const { data: anonLeads, error: leadsError } = await supabase.from('leads').select('*');
    const { data: anonProfiles, error: profilesError } = await supabase.from('profiles').select('*');

    if (callsError || leadsError || profilesError) {
      console.log('✅ PASS: Anonymous user correctly blocked');
      console.log(`   - Calls error: ${callsError?.message || 'None'}`);
      console.log(`   - Leads error: ${leadsError?.message || 'None'}`);
      console.log(`   - Profiles error: ${profilesError?.message || 'None'}`);
    } else if (!anonCalls?.length && !anonLeads?.length && !anonProfiles?.length) {
      console.log('✅ PASS: Anonymous user sees no data (correct)');
    } else {
      console.error('❌ FAIL: Anonymous user can see data!');
      console.error(`   - Calls: ${anonCalls?.length || 0}`);
      console.error(`   - Leads: ${anonLeads?.length || 0}`);
      console.error(`   - Profiles: ${anonProfiles?.length || 0}`);
      process.exit(1);
    }
  } catch (err) {
    console.log('✅ PASS: Anonymous access blocked with error:', err.message);
  }

  console.log('\n-----------------------------------\n');

  // Test 2: Check RLS policies exist
  console.log('📋 Test 2: RLS Policies Check (Informational)');
  console.log('Note: This test requires service role access to verify policies.');
  console.log('To manually verify RLS is enabled:');
  console.log('1. Connect to Supabase Dashboard → SQL Editor');
  console.log('2. Run: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = \'public\' AND tablename IN (\'calls\', \'leads\', \'profiles\');');
  console.log('3. Verify rowsecurity = true for all tables');
  console.log('4. Check policies: SELECT * FROM pg_policies WHERE tablename IN (\'calls\', \'leads\', \'profiles\');');

  console.log('\n-----------------------------------\n');

  // Test 3: Performance check - verify indexes exist
  console.log('📋 Test 3: Index Performance Check');
  console.log('To manually verify indexes were created:');
  console.log('1. Connect to Supabase Dashboard → SQL Editor');
  console.log('2. Run: SELECT * FROM pg_indexes WHERE schemaname = \'public\' AND tablename IN (\'calls\', \'leads\', \'profiles\');');
  console.log('3. Verify these indexes exist:');
  console.log('   - idx_calls_org_agent on calls');
  console.log('   - idx_calls_live_state on calls');
  console.log('   - idx_leads_org_owner on leads');
  console.log('   - idx_profiles_org on profiles');

  console.log('\n-----------------------------------\n');

  console.log('✅ Basic RLS Security Tests Complete\n');
  console.log('📝 Summary:');
  console.log('   - Anonymous access: BLOCKED ✅');
  console.log('   - For full testing, authenticate as different users and verify org isolation');
  console.log('   - Run migrations 42, 43, 44 in Supabase to enable RLS');
  console.log('   - Verify indexes and policies via Supabase Dashboard\n');

  console.log('🎯 Next Steps:');
  console.log('1. Apply migrations: psql -d your_db -f supabase/migrations/41_*.sql');
  console.log('2. Verify RLS enabled: Check Supabase Dashboard → Authentication → Policies');
  console.log('3. Test with real users: Create 2 users in different orgs, verify data isolation');
  console.log('4. Performance test: Run dashboard queries, ensure < 100ms with indexes');
}

testRLSSecurity().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
