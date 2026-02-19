#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Extract project reference from URL
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

// Construct PostgreSQL connection string
// Note: For direct DB access, you need the database password from Supabase dashboard
// This script will show you the SQL to run manually instead

async function applyMigration() {
  try {
    console.log('📊 Performance Optimization Migration');
    console.log('=====================================\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '48_optimize_pipeline_performance.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Migration SQL ready to apply.\n');
    console.log('⚠️  To apply this migration, please:');
    console.log('\n1. Go to your Supabase Dashboard:');
    console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql\n`);
    console.log('2. Open the SQL Editor');
    console.log('\n3. Copy and paste the following SQL:\n');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    console.log('\n4. Click "Run" to execute the migration\n');
    console.log('✨ Expected result: 3-10x faster Pipeline Dashboard loading!\n');

  } catch (error) {
    console.error('❌ Error reading migration file:', error.message);
    process.exit(1);
  }
}

applyMigration();
