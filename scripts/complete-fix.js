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

async function completeFix() {
  console.log('🔧 Completing database fix...\n');
  
  try {
    // First, sign in as JJ to get his auth ID
    console.log('🔐 Signing in as JJ to get auth info...');
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'joshuabrenden@gmail.com',
      password: 'jj123!'
    });
    
    if (signInError || !authData.user) {
      console.error('❌ Failed to sign in as JJ:', signInError);
      return;
    }
    
    const jjAuthId = authData.user.id;
    console.log('✅ JJ auth ID:', jjAuthId);
    
    // Add JJ to public.users with his actual auth ID
    console.log('\n👤 Adding JJ to public.users...');
    const { data: jjUser, error: jjError } = await supabase
      .from('users')
      .upsert({
        id: jjAuthId,
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
    
    // Update conversation created_by to use JJ's real ID
    console.log('\n💬 Updating conversation ownership...');
    const { data: convUpdate, error: convError } = await supabase
      .from('conversations')
      .update({ created_by: jjAuthId })
      .eq('id', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    
    if (convError) {
      console.error('❌ Conversation update error:', convError);
    } else {
      console.log('✅ Conversation ownership updated');
    }
    
    // Update participants to use JJ's real ID
    console.log('\n👥 Updating participant records...');
    const { data: partUpdate, error: partError } = await supabase
      .from('conversation_participants')
      .update({ user_id: jjAuthId })
      .eq('user_id', '12345678-1234-1234-1234-123456789012');
    
    if (partError) {
      console.error('❌ Participant update error:', partError);
    } else {
      console.log('✅ Participant records updated');
    }
    
    // Update invitations to use JJ's real ID
    console.log('\n🎟️ Updating invitation records...');
    const { data: invUpdate1, error: invError1 } = await supabase
      .from('invitations')
      .update({ 
        created_by: jjAuthId,
        used_by: jjAuthId 
      })
      .eq('invite_code', 'jj-direct');
    
    const { data: invUpdate2, error: invError2 } = await supabase
      .from('invitations')
      .update({ 
        created_by: jjAuthId
      })
      .eq('invite_code', 'cc-direct');
    
    if (invError1 || invError2) {
      console.error('❌ Invitation update errors:', invError1, invError2);
    } else {
      console.log('✅ Invitation records updated');
    }
    
    // Update messages to use JJ's real ID
    console.log('\n📩 Updating message records...');
    const { data: msgUpdate, error: msgError } = await supabase
      .from('messages')
      .update({ user_id: jjAuthId })
      .eq('user_id', '12345678-1234-1234-1234-123456789012');
    
    if (msgError) {
      console.error('❌ Message update error:', msgError);
    } else {
      console.log('✅ Message records updated');
    }
    
    // Sign out
    await supabase.auth.signOut();
    
    // Try to fix CC auth as well
    console.log('\n🔐 Attempting to create CC auth user...');
    try {
      const { data: authCC, error: authCCError } = await supabase.auth.admin.createUser({
        email: 'christym90@gmail.com', 
        password: 'cc123!',
        email_confirm: true,
        user_metadata: { display_name: 'CC' }
      });
      
      if (authCCError) {
        console.log('⚠️ CC auth user creation failed (might already exist):', authCCError.message);
      } else {
        console.log('✅ CC auth user created');
      }
    } catch (err) {
      console.log('⚠️ CC auth creation error:', err.message);
    }
    
    // Final verification
    console.log('\n🔍 Final verification...');
    
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
      
      console.log('\n📊 Final Status:');
      console.log(`  Admin user: ${adminUser ? '✅ Found' : '❌ Missing'}`);
      console.log(`  JJ user: ${jjUser ? '✅ Found' : '❌ Missing'}`);  
      console.log(`  CC user: ${ccUser ? '✅ Found' : '❌ Missing'}`);
    }
    
    // Test both logins
    console.log('\n🔐 Testing both logins...');
    
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
    
    console.log('\n🎉 Database fix completed!');
    console.log('\n🔗 Ready to Test:');
    console.log('   JJ: http://localhost:3000/invite/jj-direct');
    console.log('   CC: http://localhost:3000/invite/cc-direct');
    console.log('   Admin: http://localhost:3000/login (joshuabrenden@gmail.com:jj123!)');
    
  } catch (err) {
    console.error('❌ Complete fix failed:', err);
  }
}

completeFix();