#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugIssues() {
  console.log('🔍 Debugging Specific Issues Found in Browser Tests\n');
  
  // Issue 1: Admin Login
  console.log('1️⃣ TESTING ADMIN LOGIN FLOW:');
  try {
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'joshuabrenden@gmail.com',
      password: 'jj123!'
    });
    
    if (loginError) {
      console.log('❌ Login failed:', loginError.message);
      return;
    }
    
    console.log('✅ Login successful, user ID:', loginData.user.id);
    
    // Check if user has admin privileges
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', loginData.user.id)
      .single();
    
    if (profileError || !userProfile) {
      console.log('❌ User profile not found:', profileError?.message);
    } else {
      console.log('✅ User profile found:');
      console.log('   - Display name:', userProfile.display_name);
      console.log('   - Is admin:', userProfile.is_admin);
      console.log('   - Email:', userProfile.email);
    }
    
    await supabase.auth.signOut();
  } catch (err) {
    console.log('❌ Admin login test failed:', err.message);
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Issue 2: Message Sending
  console.log('2️⃣ TESTING MESSAGE FUNCTIONALITY:');
  try {
    // Sign in as JJ first
    const { data: jjAuth, error: jjAuthError } = await supabase.auth.signInWithPassword({
      email: 'joshuabrenden@gmail.com',
      password: 'jj123!'
    });
    
    if (jjAuthError) {
      console.log('❌ JJ login failed:', jjAuthError.message);
      return;
    }
    
    console.log('✅ JJ logged in successfully');
    
    // Check conversation access
    const conversationId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    if (convError || !conversation) {
      console.log('❌ Conversation not accessible:', convError?.message);
    } else {
      console.log('✅ Conversation accessible:', conversation.name);
    }
    
    // Check if user is participant
    const { data: participant, error: partError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', jjAuth.user.id)
      .single();
    
    if (partError || !participant) {
      console.log('❌ User not a participant:', partError?.message);
    } else {
      console.log('✅ User is conversation participant');
    }
    
    // Try to send a test message
    const testMessage = `Debug test message - ${Date.now()}`;
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: jjAuth.user.id,
        content: testMessage,
        message_type: 'user'
      })
      .select()
      .single();
    
    if (messageError) {
      console.log('❌ Message insert failed:', messageError.message);
    } else {
      console.log('✅ Message sent successfully:', messageData.id);
      console.log('   Content:', messageData.content);
    }
    
    // Check if message can be retrieved
    const { data: messages, error: retrieveError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (retrieveError) {
      console.log('❌ Message retrieval failed:', retrieveError.message);
    } else {
      console.log('✅ Recent messages retrieved:', messages.length);
      messages.forEach((msg, idx) => {
        console.log(`   ${idx + 1}. ${msg.content.substring(0, 50)}...`);
      });
    }
    
    await supabase.auth.signOut();
  } catch (err) {
    console.log('❌ Message test failed:', err.message);
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Issue 3: AI Integration
  console.log('3️⃣ TESTING AI INTEGRATION:');
  try {
    // Test direct Anthropic API
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      console.log('❌ ANTHROPIC_API_KEY not set');
      return;
    }
    
    console.log('✅ Anthropic API key is set');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 20,
        messages: [{
          role: 'user',
          content: 'Say "API test successful"'
        }]
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const aiResponse = data.content?.[0]?.text || 'No response text';
      console.log('✅ Anthropic API working, response:', aiResponse);
    } else {
      const errorText = await response.text();
      console.log('❌ Anthropic API error:', response.status, errorText);
    }
    
  } catch (err) {
    console.log('❌ AI integration test failed:', err.message);
  }
  
  console.log('\n🎯 Debug complete! Check results above for specific issues.');
}

debugIssues().catch(console.error);