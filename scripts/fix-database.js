#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixDatabase() {
  console.log('🔧 Fixing database issues...\n');
  
  try {
    // Add missing JJ user to public.users
    console.log('👤 Adding JJ user to public.users...');
    const { data: jjUser, error: jjError } = await supabase
      .from('users')
      .upsert({
        id: '12345678-1234-1234-1234-123456789012',
        email: 'joshuabrenden@gmail.com',
        display_name: 'JJ',
        is_admin: true,
        created_at: new Date().toISOString()
      });
    
    if (jjError) {
      console.error('❌ JJ user error:', jjError);
    } else {
      console.log('✅ JJ user added successfully');
    }
    
    // Create auth users using admin API (this might not work with client, but let's try)
    console.log('\n🔐 Attempting to create auth users...');
    
    // Try to create JJ auth user
    const { data: authJJ, error: authJJError } = await supabase.auth.admin.createUser({
      email: 'joshuabrenden@gmail.com',
      password: 'jj123!',
      email_confirm: true,
      user_metadata: { display_name: 'JJ' }
    });
    
    if (authJJError) {
      console.log('⚠️ JJ auth user creation failed:', authJJError.message);
    } else {
      console.log('✅ JJ auth user created');
    }
    
    // Try to create CC auth user
    const { data: authCC, error: authCCError } = await supabase.auth.admin.createUser({
      email: 'christym90@gmail.com', 
      password: 'cc123!',
      email_confirm: true,
      user_metadata: { display_name: 'CC' }
    });
    
    if (authCCError) {
      console.log('⚠️ CC auth user creation failed:', authCCError.message);
    } else {
      console.log('✅ CC auth user created');
    }
    
    // Verify the fix
    console.log('\n🔍 Verifying fixes...');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.error('❌ Users check failed:', usersError);
    } else {
      console.log('Users:', users);
      
      const adminUser = users.find(u => u.is_admin);
      const jjUser = users.find(u => u.email === 'joshuabrenden@gmail.com');
      const ccUser = users.find(u => u.email === 'christym90@gmail.com');
      
      console.log('\n📊 User Status:');
      console.log(`  Admin user: ${adminUser ? '✅ Found' : '❌ Missing'}`);
      console.log(`  JJ user: ${jjUser ? '✅ Found' : '❌ Missing'}`);  
      console.log(`  CC user: ${ccUser ? '✅ Found' : '❌ Missing'}`);
    }
    
    // Test authentication
    console.log('\n🔐 Testing authentication...');
    
    const testUsers = [
      { email: 'joshuabrenden@gmail.com', password: 'jj123!' },
      { email: 'christym90@gmail.com', password: 'cc123!' }
    ];
    
    for (const testUser of testUsers) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });
      
      if (error) {
        console.log(`  ${testUser.email}: ❌ ${error.message}`);
      } else {
        console.log(`  ${testUser.email}: ✅ Login successful`);
        await supabase.auth.signOut(); // Clean up
      }
    }
    
    console.log('\n🎯 Database fix completed!');
    console.log('\n🔗 Test Links:');
    console.log('   JJ: http://localhost:3000/invite/jj-direct');
    console.log('   CC: http://localhost:3000/invite/cc-direct');
    console.log('   Admin: http://localhost:3000/login');
    
  } catch (err) {
    console.error('❌ Fix failed:', err);
  }
}

fixDatabase();