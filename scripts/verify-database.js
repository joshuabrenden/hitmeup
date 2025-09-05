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

async function verifyDatabase() {
  console.log('🔍 Verifying database state...\n');
  
  try {
    // Check all users in auth.users
    console.log('👥 Checking auth.users...');
    const { data: authUsers, error: authError } = await supabase
      .rpc('exec_sql', { 
        sql: 'SELECT id, email, raw_user_meta_data->\'display_name\' as display_name FROM auth.users' 
      });
    
    if (authError) {
      console.log('❌ Cannot check auth users (expected for security)');
    } else {
      console.log('Auth users:', authUsers);
    }
    
    // Check public.users
    console.log('\n👥 Checking public.users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.error('❌ Users error:', usersError);
    } else {
      console.log('Users:', users);
      
      const adminUser = users.find(u => u.is_admin);
      const jjUser = users.find(u => u.email === 'joshuabrenden@gmail.com');
      const ccUser = users.find(u => u.email === 'christym90@gmail.com');
      
      console.log('\n📊 User Analysis:');
      console.log(`  Admin user: ${adminUser ? '✅ Found' : '❌ Missing'}`);
      console.log(`  JJ user: ${jjUser ? '✅ Found' : '❌ Missing'}`);  
      console.log(`  CC user: ${ccUser ? '✅ Found' : '❌ Missing'}`);
    }
    
    // Check conversations
    console.log('\n💬 Checking conversations...');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*');
    
    if (convError) {
      console.error('❌ Conversations error:', convError);
    } else {
      console.log('Conversations:', conversations);
    }
    
    // Check participants
    console.log('\n👥 Checking participants...');
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants')
      .select('*');
    
    if (partError) {
      console.error('❌ Participants error:', partError);
    } else {
      console.log('Participants:', participants);
    }
    
    // Check invitations
    console.log('\n🎟️ Checking invitations...');
    const { data: invitations, error: invError } = await supabase
      .from('invitations')
      .select('*');
    
    if (invError) {
      console.error('❌ Invitations error:', invError);
    } else {
      console.log('Invitations:', invitations);
    }
    
    // Check messages
    console.log('\n📩 Checking messages...');
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*');
    
    if (msgError) {
      console.error('❌ Messages error:', msgError);
    } else {
      console.log('Messages:', messages);
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
    
    console.log('\n🎯 Summary:');
    console.log('Database verification complete!');
    
  } catch (err) {
    console.error('❌ Verification failed:', err);
  }
}

verifyDatabase();