require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
// Prefer Service Role for admin check, but try anon to test RLS if only key available.

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDB() {
    console.log('--- DB Verification ---');

    // 1. Check Messages Count
    const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('❌ Error checking messages table:', countError);
    } else {
        console.log(`✅ Messages Table Exists. Total Records: ${count}`);
    }

    // 2. Check a recent message
    const { data: messages, error: selectError } = await supabase
        .from('messages')
        .select('*')
        .limit(5)
        .order('created_at', { ascending: false });

    if (selectError) {
        console.error('❌ Error selecting messages:', selectError);
    } else {
        console.log('✅ Recent Messages:', messages);
    }

    // 3. Check Calls with Transcripts (for potential backfill)
    const { data: calls, error: callError } = await supabase
        .from('calls')
        .select('id, transcript')
        .not('transcript', 'is', null)
        .limit(5);

    if (callError) {
        console.error('❌ Error checking calls:', callError);
    } else {
        console.log(`ℹ️ Found ${calls.length} calls with JSON transcripts.`);
        if (calls.length > 0) {
            console.log('Sample transcript structure:', JSON.stringify(calls[0].transcript).substring(0, 100));
        }
    }
}

checkDB();
