const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Use the connection string for the local database
const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres',
});

async function run() {
    await client.connect();

    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '37_add_phone_rotator.sql');

    if (!fs.existsSync(sqlPath)) {
        console.error('Migration file not found:', sqlPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log('Running migration: 37_add_phone_rotator.sql');
        const res = await client.query(sql);
        console.log('Migration executed successfully:', res);
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
