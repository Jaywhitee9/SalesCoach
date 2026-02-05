const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setManagerRole() {
    const email = 'manager@salesflow.ai';
    console.log(`Updating role for ${email}...`);

    // 1. Get User ID
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        console.error('Error fetching users:', userError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error('User not found!');
        return;
    }

    console.log(`Found user ${user.id}`);

    // 2. Update Profile to 'manager'
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'manager' })
        .eq('id', user.id)
        .select();

    if (error) {
        console.error('Failed to update profile:', error);
    } else {
        console.log('Success! Updated Data:', data);
    }
}

setManagerRole();
