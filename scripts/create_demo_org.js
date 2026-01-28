
require('dotenv').config({ path: '../.env' }); // Load from parent directory
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const DEMO_ORG_NAME = 'Prime Sales Demo';
const MANAGER_EMAIL = 'manager@demo.com';
const MANAGER_PASSWORD = 'password123';

const REPS = [
    { name: 'David Cohen', email: 'david@demo.com' },
    { name: 'Sarah Levy', email: 'sarah@demo.com' },
    { name: 'Ron Golan', email: 'ron@demo.com' }
];

const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation'];
const PIPELINE_STAGES = ['Lead', 'Discovery', 'Demo', 'Proposal', 'Close'];

const COMPANIES = ['TechFlow', 'DataSystems', 'CloudNet', 'CyberShield', 'GreenEnergy', 'SmartHome', 'FutureAI', 'BioMed', 'FinTech', 'EduLearn'];
const FIRST_NAMES = ['Danny', 'Michal', 'Yossi', 'Dana', 'Avi', 'Noa', 'Eyal', 'Tamar', 'Omer', 'Roni'];
const LAST_NAMES = ['Shapira', 'Mizrahi', 'Perednik', 'Friedman', 'Azoulay', 'Ben-David', 'Katz', 'Levin', 'Bar-Lev', 'Segal'];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function createUser(email, password, fullName, role, orgId) {
    console.log(`Creating user: ${email} (${role})...`);

    // 1. Create in Auth
    // Try to find if exists first to avoid error
    const { data: { users } } = await supabase.auth.admin.listUsers();
    let authUser = users.find(u => u.email === email);
    let userId;

    if (authUser) {
        console.log(`User ${email} already exists in Auth, using existing ID.`);
        userId = authUser.id;
        // Verify password update if needed? Skip for now.
    } else {
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });
        if (error) throw error;
        userId = data.user.id;
    }

    // 2. Create/Update Profile
    const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: email,
        full_name: fullName,
        role: role,
        org_id: orgId,
        organization_id: orgId,
        created_at: new Date().toISOString()
    });

    if (profileError) throw profileError;

    return userId;
}

async function main() {
    try {
        console.log('Starting Demo Data Generation...');

        // 1. Create Organization
        console.log(`Creating Organization: ${DEMO_ORG_NAME}...`);
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({ name: DEMO_ORG_NAME, center_type: 'sales' })
            .select()
            .single();

        // Handle case where org might create duplicate if run multiple times? 
        // For simplicity, we assume new or we check.
        // If error (e.g. strict constraint), we might need to query first.
        let organizationId;
        if (orgError) {
            console.log('Organization creation failed (maybe duplicate?), trying to find existing...');
            const { data: existingOrg } = await supabase.from('organizations').select().eq('name', DEMO_ORG_NAME).single();
            if (!existingOrg) throw orgError;
            organizationId = existingOrg.id;
            console.log(`Found existing organization: ${organizationId}`);
        } else {
            organizationId = org.id;
            console.log(`Created organization: ${organizationId}`);
        }

        // 2. Create Manager
        await createUser(MANAGER_EMAIL, MANAGER_PASSWORD, 'Demo Manager', 'manager', organizationId);

        // 3. Create Reps & Leads
        for (const rep of REPS) {
            const repId = await createUser(rep.email, 'password123', rep.name, 'rep', organizationId);

            // Create 15-20 leads for each rep
            const numLeads = Math.floor(Math.random() * 6) + 15;
            console.log(`Generating ${numLeads} leads for ${rep.name}...`);

            const leads = [];
            for (let i = 0; i < numLeads; i++) {
                const firstName = getRandomItem(FIRST_NAMES);
                const lastName = getRandomItem(LAST_NAMES);
                const company = getRandomItem(COMPANIES);
                const status = getRandomItem(LEAD_STATUSES);

                leads.push({
                    organization_id: organizationId,
                    org_id: organizationId,
                    name: `${firstName} ${lastName}`,
                    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase()}.com`,
                    phone: `+9725${Math.floor(Math.random() * 100000000)}`,
                    company: company,
                    status: status,
                    source: getRandomItem(['Linkedin', 'Website', 'Referral', 'Cold Call']),
                    owner_id: repId,
                    created_at: getRandomDate(new Date(2025, 0, 1), new Date()).toISOString(),
                    last_activity_at: Math.random() > 0.3 ? getRandomDate(new Date(2025, 0, 1), new Date()).toISOString() : null,
                    value: Math.floor(Math.random() * 50000) + 5000
                });
            }

            const { error: leadsError } = await supabase.from('leads').insert(leads);
            if (leadsError) throw leadsError;
        }

        console.log('✅ Demo Data Generation Complete!');
        console.log('------------------------------------------------');
        console.log('Organization:', DEMO_ORG_NAME);
        console.log(`Manager Login: ${MANAGER_EMAIL} / ${MANAGER_PASSWORD}`);
        console.log('Reps:', REPS.map(r => r.email).join(', '));
        console.log('Password for all:', 'password123');
        console.log('------------------------------------------------');

    } catch (err) {
        console.error('Error generating data:', err);
    }
}

main();
