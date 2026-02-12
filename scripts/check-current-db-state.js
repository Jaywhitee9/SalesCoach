require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkDatabaseState() {
  console.log('🔍 Checking current database state...\n');

  // Try to query each table to see if RLS is blocking
  console.log('📋 1. Testing Table Access (with SERVICE_ROLE):');
  
  console.log('   - Testing calls table...');
  const { data: calls, error: callsError } = await supabase.from('calls').select('count', { count: 'exact', head: true });
  if (callsError) {
    console.log(`     ❌ Error: ${callsError.message}`);
  } else {
    console.log(`     ✅ Accessible (${calls || 0} rows)`);
  }

  console.log('   - Testing leads table...');
  const { data: leads, error: leadsError } = await supabase.from('leads').select('count', { count: 'exact', head: true });
  if (leadsError) {
    console.log(`     ❌ Error: ${leadsError.message}`);
  } else {
    console.log(`     ✅ Accessible (${leads || 0} rows)`);
  }

  console.log('   - Testing profiles table...');
  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
  if (profilesError) {
    console.log(`     ❌ Error: ${profilesError.message}`);
  } else {
    console.log(`     ✅ Accessible (${profiles || 0} rows)`);
  }

  // Check if live_state column exists
  console.log('\n📋 2. Checking new columns (from migration 41):');
  const { data: callsSample, error: sampleError } = await supabase.from('calls').select('live_state, last_heartbeat').limit(1);
  
  if (sampleError) {
    console.log('   ❌ Error checking columns:', sampleError.message);
  } else if (callsSample && callsSample.length > 0) {
    const hasLiveState = 'live_state' in callsSample[0];
    const hasHeartbeat = 'last_heartbeat' in callsSample[0];
    console.log(`   ${hasLiveState ? '✅' : '❌'} live_state column exists`);
    console.log(`   ${hasHeartbeat ? '✅' : '❌'} last_heartbeat column exists`);
  } else {
    console.log('   ⚠️  No data in calls table to verify columns');
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY:');
  console.log('='.repeat(60));
  
  if (!callsError && !leadsError && !profilesError) {
    console.log('✅ All tables are accessible with service role');
    console.log('✅ SAFE to run rollback migration');
  } else {
    console.log('⚠️  Some tables have errors - review above');
    console.log('⚠️  Rollback migration should fix these issues');
  }
  
  console.log('\n💡 Next steps:');
  console.log('1. If tables are accessible: Rollback will remove policies (safe)');
  console.log('2. If tables are blocked: Rollback will fix the blocking (necessary)');
  console.log('3. The rollback will NOT delete any data, only remove policies\n');
}

checkDatabaseState().catch(err => {
  console.error('❌ Script error:', err.message);
  process.exit(1);
});
