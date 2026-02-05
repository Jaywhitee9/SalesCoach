const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[Supabase] Missing credentials in .env');
}

// Service Role client (Admin access)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

let cachedSystemUserId = null;

async function getSystemUserId() {
    if (cachedSystemUserId) return cachedSystemUserId;

    // 1. Try to find existing demo user in profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', 'sarah@demo.com')
        .single();

    if (profiles) {
        cachedSystemUserId = profiles.id;
        return cachedSystemUserId;
    }

    // 2. If not found, create in Auth
    console.log('[Supabase] Creating Demo User...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: 'sarah@demo.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: { full_name: 'Sarah Cohen' }
    });

    if (authError) {
        // user might already exist in Auth but not Profile (edge case)
        console.error('[Supabase] Auth Create Error:', authError.message);
        // Try to fetch ID via admin list
        const { data: users } = await supabase.auth.admin.listUsers();
        const existing = users.users.find(u => u.email === 'sarah@demo.com');
        if (existing) {
            cachedSystemUserId = existing.id;
            // Ensure profile exists
            await supabase.from('profiles').upsert({
                id: existing.id,
                email: existing.email,
                full_name: 'Sarah Cohen',
                role: 'rep'
            });
            return existing.id;
        }
    }

    if (authUser && authUser.user) {
        cachedSystemUserId = authUser.user.id;
        // 3. Create Profile
        await supabase.from('profiles').insert({
            id: authUser.user.id,
            email: 'sarah@demo.com',
            full_name: 'Sarah Cohen',
            role: 'rep'
        });
        console.log('[Supabase] Demo User Created:', cachedSystemUserId);
        return cachedSystemUserId;
    }

    return null;
}

module.exports = {
    supabase,
    getSystemUserId
};
