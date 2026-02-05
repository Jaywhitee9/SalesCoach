const { createClient } = require('@supabase/supabase-js');

// CRITICAL: We use SERVICE_ROLE_KEY to bypass RLS policies on the server.
// This allows the server to write calls/transcripts for ANY user.
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('!!! MISSING SUPABASE CREDENTIALS ON SERVER !!!');
    console.error('Ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

module.exports = supabase;
