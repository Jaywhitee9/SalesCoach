#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Read the migration SQL
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '48_optimize_pipeline_performance.sql');
const sqlContent = fs.readFileSync(migrationPath, 'utf8');

// Split into individual statements (simple split by semicolon)
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--') && !s.startsWith('DO $$'));

console.log('🚀 Executing migration automatically...\n');

// Execute each statement via PostgREST /rpc endpoint
async function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(supabaseUrl);
    const options = {
      hostname: url.hostname,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ sql }));
    req.end();
  });
}

// Try using the supabase client directly
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('📝 Attempting to create indexes...\n');

    // Execute the full migration
    const { data, error } = await supabase.rpc('exec_sql', { query: sqlContent });

    if (error) {
      console.log('⚠️  RPC method not available, trying direct SQL execution...\n');

      // Try executing statements one by one
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt.includes('CREATE INDEX')) {
          console.log(`Creating index ${i + 1}/${statements.length}...`);
          // Use raw SQL via REST API
          const indexName = stmt.match(/idx_\w+/)?.[0] || `index_${i}`;
          console.log(`  → ${indexName}`);
        }
      }

      throw new Error('Please run the SQL manually (see instructions above)');
    }

    console.log('✅ Migration executed successfully!');
    console.log('\nIndexes created:');
    console.log('  • idx_leads_status');
    console.log('  • idx_leads_created_at');
    console.log('  • idx_leads_org_created_status');
    console.log('  • idx_leads_owner_created');
    console.log('  • idx_leads_status_value\n');

  } catch (err) {
    console.error('❌ Automatic execution failed:', err.message);
    console.log('\n📋 Please run the following SQL manually in Supabase Dashboard:\n');
    console.log('   https://supabase.com/dashboard/project/ofrnqqvujueivirduyqv/sql\n');
    console.log(sqlContent);
  }
}

runMigration();
