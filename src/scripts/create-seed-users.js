const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Load .env from current working directory

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUsers() {
    console.log('Seeding Users...');

    const users = [
        {
            email: 'manager@salesflow.ai',
            password: 'password123',
            data: { full_name: 'Manager Mike', avatar_url: 'https://ui-avatars.com/api/?name=Manager+Mike' },
            role: 'manager'
        },
        {
            email: 'rep@salesflow.ai',
            password: 'password123',
            data: { full_name: 'Rep Rachel', avatar_url: 'https://ui-avatars.com/api/?name=Rep+Rachel' },
            role: 'rep'
        }
    ];

    for (const u of users) {
        // 1. Create User in Auth
        // We use admin.createUser to bypass email confirmation if possible, or just standard signUp
        const { data, error } = await supabase.auth.admin.createUser({
            email: u.email,
            password: u.password,
            user_metadata: u.data,
            email_confirm: true
        });

        if (error) {
            console.log(`User ${u.email} might already exist or error:`, error.message);
            // If user exists, we might want to update their role in profiles just in case
            // But we need their ID. Let's try to fetch by email? Admin API usually allows listUsers but might be overkill.
            // Let's assume if it exists, the user knows the password or we can't easily reset it without more logic.
        } else {
            console.log(`Created Auth User: ${u.email}`);
            const userId = data.user.id;

            // 2. Ensure Profile exists with correct Role
            // (The Trigger might have created it as 'rep', so we upsert to fix the role)
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    email: u.email,
                    full_name: u.data.full_name,
                    avatar_url: u.data.avatar_url,
                    role: u.role
                });

            if (profileError) {
                console.error(`Error creating profile for ${u.email}:`, profileError);
            } else {
                console.log(`Verified Profile for ${u.email} as [${u.role}]`);
            }
        }
    }

    console.log('Done.');
}

createUsers();
