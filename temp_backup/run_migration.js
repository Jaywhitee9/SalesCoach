const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres',
});

async function run() {
    await client.connect();

    const sqlPath = path.join(__dirname, 'supabase', 'add_targets_and_tasks.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        const res = await client.query(sql);
        console.log('Migration executed successfully:', res);
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
