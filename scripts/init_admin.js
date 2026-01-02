
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function initAdmin() {
    console.log("🚀 Initializing Super Admin & Organization...");

    // 1. Get or Create Organization
    let orgId;
    const { data: existingOrgs } = await supabase.from('organizations').select('*').eq('name', 'SalesFlow HQ');

    if (existingOrgs && existingOrgs.length > 0) {
        orgId = existingOrgs[0].id;
        console.log("✅ Organization Exists:", existingOrgs[0].name, orgId);
    } else {
        // Remove 'status' field as it caused constraint violation (let DB default handle it)
        const { data: newOrg, error: createOrgError } = await supabase
            .from('organizations')
            .insert({
                name: 'SalesFlow HQ',
                plan: 'enterprise'
            })
            .select()
            .single();

        if (createOrgError) {
            console.error("❌ Error creating Organization:", createOrgError.message);
            return; // STOP HERE
        }
        orgId = newOrg.id;
        console.log("✅ Organization Created:", newOrg.name);
    }

    if (!orgId) return;

    // 2. Create Users
    const users = [
        { email: 'admin@salesflow.ai', pass: 'admin123', role: 'platform_admin', name: 'Super Admin' },
        { email: 'manager@salesflow.ai', pass: 'manager123', role: 'manager', name: 'Michael Ross' },
        { email: 'rep@salesflow.ai', pass: 'rep123', role: 'rep', name: 'David Sales' }
    ];

    for (const u of users) {
        // Check Auth
        let { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
        let user = existingUsers.find(eu => eu.email === u.email);

        if (!user) {
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: u.email,
                password: u.pass,
                email_confirm: true,
                user_metadata: { full_name: u.name }
            });
            if (createError) {
                console.error(`❌ Error creating user ${u.email}:`, createError.message);
                continue;
            }
            user = newUser.user;
            console.log(`✅ User Created: ${u.email}`);
        } else {
            console.log(`ℹ️ User already exists: ${u.email}`);
        }

        // Upsert Profile
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                email: u.email,
                full_name: u.name,
                role: u.role,
                org_id: orgId
            });

        if (profileError) {
            console.error(`❌ Error updating profile for ${u.email}:`, profileError.message);
            console.error("DEBUG: Check if 'platform_admin' is in the check constraint of 'role' column in profiles table.");
        } else {
            console.log(`✅ Profile Linked: ${u.email} -> ${u.role}`);
        }
    }
}

initAdmin();
