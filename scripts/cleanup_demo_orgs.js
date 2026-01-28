
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const KEEP_ORG_ID = '98881ac3-bed5-4fc6-84af-099668c6cc9b'; // The one with data
const DEMO_ORG_NAME = 'Prime Sales Demo';

async function cleanup() {
    try {
        console.log('Starting cleanup of duplicate demo organizations...');

        // 1. Fetch all organizations with the demo name
        const { data: orgs, error } = await supabase
            .from('organizations')
            .select('id, name, created_at')
            .eq('name', DEMO_ORG_NAME);

        if (error) throw error;

        console.log(`Found ${orgs.length} organizations named "${DEMO_ORG_NAME}"`);

        // 2. Filter out the one we want to keep
        const toDelete = orgs.filter(o => o.id !== KEEP_ORG_ID);

        if (toDelete.length === 0) {
            console.log('No duplicates found to delete.');
            return;
        }

        console.log(`Deleting ${toDelete.length} empty organizations...`);

        for (const org of toDelete) {
            console.log(`Deleting org: ${org.id} (${org.created_at})`);

            // Delete related data first (just in case, though they should be empty)
            await supabase.from('profiles').delete().eq('org_id', org.id); // clean profiles using org_id
            await supabase.from('profiles').delete().eq('organization_id', org.id); // clean profiles using organization_id
            await supabase.from('leads').delete().eq('organization_id', org.id);

            // Delete the organization
            const { error: delError } = await supabase
                .from('organizations')
                .delete()
                .eq('id', org.id);

            if (delError) console.error(`Failed to delete ${org.id}:`, delError.message);
            else console.log(`Deleted ${org.id}`);
        }

        console.log('Cleanup complete!');

    } catch (err) {
        console.error('Cleanup failed:', err);
    }
}

cleanup();
