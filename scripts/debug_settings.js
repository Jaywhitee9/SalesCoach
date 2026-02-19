require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Fetching organization settings...');
    const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} settings rows.`);
    data.forEach((row, i) => {
        console.log(`\n--- Row ${i + 1} ---`);
        console.log('Org ID:', row.organization_id);
        console.log('Stages Config (Legacy):', row.stages_config);
        console.log('Pipeline Statuses (New):', row.pipeline_statuses ? JSON.stringify(row.pipeline_statuses).substring(0, 100) + '...' : 'NULL/UNDEFINED');
    });
}

main();
