#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('🚀 Setting up HitMeUp database...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '000_complete_setup.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📁 Read migration file');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully');
    
    // Verify setup
    console.log('🔍 Verifying setup...');
    
    // Check users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, display_name, is_admin');
    
    if (usersError) {
      console.error('❌ Failed to verify users:', usersError);
      process.exit(1);
    }
    
    console.log('👥 Users:', users);
    
    // Check conversations  
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, name, invite_code');
    
    if (convError) {
      console.error('❌ Failed to verify conversations:', convError);
      process.exit(1);
    }
    
    console.log('💬 Conversations:', conversations);
    
    // Check invitations
    const { data: invitations, error: invError } = await supabase
      .from('invitations')
      .select('invite_code, used_by');
    
    if (invError) {
      console.error('❌ Failed to verify invitations:', invError);
      process.exit(1);
    }
    
    console.log('🎟️ Invitations:', invitations);
    
    console.log('');
    console.log('🎉 Database setup complete!');
    console.log('');
    console.log('🔗 Test Links:');
    console.log('   JJ: http://localhost:3000/invite/jj-direct');
    console.log('   CC: http://localhost:3000/invite/cc-direct');
    console.log('   Admin: http://localhost:3000/login');
    console.log('');
    console.log('🔑 Admin Credentials:');
    console.log('   Email: joshuabrenden@gmail.com');
    console.log('   Password: jj123!');
    
  } catch (err) {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  }
}

// Alternative approach: execute SQL directly
async function runMigrationDirect() {
  try {
    console.log('🚀 Setting up HitMeUp database (direct SQL)...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '000_complete_setup.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📁 Read migration file');
    
    // Split into individual statements and execute
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error && !error.message.includes('already exists')) {
          console.warn(`⚠️ Statement ${i + 1} warning:`, error.message);
        }
      } catch (err) {
        console.warn(`⚠️ Statement ${i + 1} error:`, err.message);
      }
    }
    
    console.log('✅ Migration statements executed');
    
    // Verify setup (same as above)
    await verifySetup();
    
  } catch (err) {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  }
}

async function verifySetup() {
  console.log('🔍 Verifying setup...');
  
  try {
    // Check users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, display_name, is_admin');
    
    if (usersError) {
      console.error('❌ Failed to verify users:', usersError);
      return false;
    }
    
    console.log('👥 Users:', users);
    
    // Check conversations  
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, name, invite_code');
    
    if (convError) {
      console.error('❌ Failed to verify conversations:', convError);
      return false;
    }
    
    console.log('💬 Conversations:', conversations);
    
    // Check invitations
    const { data: invitations, error: invError } = await supabase
      .from('invitations')
      .select('invite_code, used_by');
    
    if (invError) {
      console.error('❌ Failed to verify invitations:', invError);
      return false;
    }
    
    console.log('🎟️ Invitations:', invitations);
    
    console.log('');
    console.log('🎉 Database setup verified!');
    console.log('');
    console.log('🔗 Test Links:');
    console.log('   JJ: http://localhost:3000/invite/jj-direct');
    console.log('   CC: http://localhost:3000/invite/cc-direct');
    console.log('   Admin: http://localhost:3000/login');
    console.log('');
    console.log('🔑 Admin Credentials:');
    console.log('   Email: joshuabrenden@gmail.com');
    console.log('   Password: jj123!');
    
    return true;
    
  } catch (err) {
    console.error('❌ Verification failed:', err);
    return false;
  }
}

// Try direct approach since rpc might not be available
runMigrationDirect();