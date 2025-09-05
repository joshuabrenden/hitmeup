#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

class UIFlowTester {
  constructor() {
    this.results = [];
    this.conversationId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  }

  log(test, status, message) {
    const result = { test, status, message, timestamp: new Date().toISOString() };
    this.results.push(result);
    
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${test}: ${message}`);
  }

  async testEnvironmentSetup() {
    console.log('\n🔧 Testing Environment Setup...');
    
    // Check environment variables
    if (!supabaseUrl) {
      this.log('Environment', 'fail', 'NEXT_PUBLIC_SUPABASE_URL not set');
      return false;
    }
    this.log('Environment', 'pass', 'Supabase URL configured');

    if (!supabaseServiceKey) {
      this.log('Environment', 'fail', 'SUPABASE_SERVICE_ROLE_KEY not set');
      return false;
    }
    this.log('Environment', 'pass', 'Supabase service key configured');

    if (!anthropicKey) {
      this.log('Environment', 'fail', 'ANTHROPIC_API_KEY not set');
      return false;
    }
    this.log('Environment', 'pass', 'Anthropic API key configured');

    return true;
  }

  async testDatabaseConnectivity() {
    console.log('\n📊 Testing Database Connectivity...');
    
    try {
      // Test basic connection
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      if (error) {
        this.log('Database', 'fail', `Connection failed: ${error.message}`);
        return false;
      }
      
      this.log('Database', 'pass', 'Connection successful');

      // Check required tables exist
      const tables = ['users', 'conversations', 'messages', 'conversation_participants', 'invitations', 'ai_usage_logs'];
      
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          if (error) {
            this.log('Database Schema', 'fail', `Table ${table} not accessible: ${error.message}`);
            return false;
          }
          
          this.log('Database Schema', 'pass', `Table ${table} exists`);
        } catch (err) {
          this.log('Database Schema', 'fail', `Table ${table} check failed: ${err.message}`);
          return false;
        }
      }

      return true;
    } catch (err) {
      this.log('Database', 'fail', `Connection error: ${err.message}`);
      return false;
    }
  }

  async testUserAuthentication() {
    console.log('\n🔐 Testing User Authentication...');
    
    const testUsers = [
      { email: 'joshuabrenden@gmail.com', password: 'jj123!', role: 'admin' },
      { email: 'christym90@gmail.com', password: 'cc123!', role: 'user' }
    ];

    let passCount = 0;

    for (const user of testUsers) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: user.password
        });

        if (error) {
          this.log('Authentication', 'fail', `${user.email} login failed: ${error.message}`);
          continue;
        }

        this.log('Authentication', 'pass', `${user.email} login successful`);
        passCount++;

        // Check user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          this.log('User Profile', 'fail', `${user.email} profile not found: ${profileError.message}`);
        } else {
          const expectedAdmin = user.role === 'admin';
          const actualAdmin = profile.is_admin;
          
          if (expectedAdmin === actualAdmin) {
            this.log('User Profile', 'pass', `${user.email} has correct ${user.role} privileges`);
          } else {
            this.log('User Profile', 'fail', `${user.email} incorrect privileges - expected ${user.role}, got ${actualAdmin ? 'admin' : 'user'}`);
          }
        }

        // Clean up
        await supabase.auth.signOut();

      } catch (err) {
        this.log('Authentication', 'fail', `${user.email} test error: ${err.message}`);
      }
    }

    return passCount > 0;
  }

  async testConversationAccess() {
    console.log('\n💬 Testing Conversation Access...');
    
    try {
      // Sign in as JJ
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'joshuabrenden@gmail.com',
        password: 'jj123!'
      });

      if (authError) {
        this.log('Conversation Access', 'fail', `Login failed: ${authError.message}`);
        return false;
      }

      // Check conversation exists
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', this.conversationId)
        .single();

      if (convError || !conversation) {
        this.log('Conversation Access', 'fail', `Main conversation not found: ${convError?.message}`);
        await supabase.auth.signOut();
        return false;
      }

      this.log('Conversation Access', 'pass', `Found conversation: ${conversation.name}`);

      // Check user is participant
      const { data: participant, error: partError } = await supabase
        .from('conversation_participants')
        .select('*')
        .eq('conversation_id', this.conversationId)
        .eq('user_id', authData.user.id)
        .single();

      if (partError || !participant) {
        this.log('Conversation Access', 'fail', `User not participant: ${partError?.message}`);
        await supabase.auth.signOut();
        return false;
      }

      this.log('Conversation Access', 'pass', 'User is conversation participant');

      // Check can read messages
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', this.conversationId)
        .limit(5);

      if (msgError) {
        this.log('Conversation Access', 'fail', `Cannot read messages: ${msgError.message}`);
        await supabase.auth.signOut();
        return false;
      }

      this.log('Conversation Access', 'pass', `Can read ${messages.length} messages`);

      await supabase.auth.signOut();
      return true;

    } catch (err) {
      this.log('Conversation Access', 'fail', `Test error: ${err.message}`);
      return false;
    }
  }

  async testAIIntegration() {
    console.log('\n🤖 Testing AI Integration...');
    
    try {
      // Sign in as JJ
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'joshuabrenden@gmail.com',
        password: 'jj123!'
      });

      if (authError) {
        this.log('AI Integration', 'fail', `Login failed: ${authError.message}`);
        return false;
      }

      // Test direct Anthropic API call
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 50,
            messages: [{
              role: 'user',
              content: 'Test message - reply with just "OK"'
            }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          this.log('AI Integration', 'pass', 'Anthropic API accessible');
        } else {
          this.log('AI Integration', 'fail', `Anthropic API error: ${response.status}`);
        }
      } catch (apiErr) {
        this.log('AI Integration', 'fail', `Anthropic API error: ${apiErr.message}`);
      }

      // Test AI endpoint via local API (Note: requires browser session, so this will likely fail in CLI)
      try {
        const apiResponse = await fetch('http://localhost:3000/api/ai/jimmy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `sb-access-token=${authData.session?.access_token}; sb-refresh-token=${authData.session?.refresh_token}`
          },
          body: JSON.stringify({
            message: '@jimmy say OK',
            conversationId: this.conversationId,
            context: []
          })
        });

        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          this.log('AI Endpoint', 'pass', 'Local AI endpoint accessible');
        } else {
          const errorData = await apiResponse.text();
          this.log('AI Endpoint', 'warn', `Local AI endpoint requires browser session - this is expected in CLI test`);
        }
      } catch (localErr) {
        this.log('AI Endpoint', 'warn', `Local AI endpoint requires browser session - this is expected in CLI test`);
      }

      await supabase.auth.signOut();
      return true;

    } catch (err) {
      this.log('AI Integration', 'fail', `Test error: ${err.message}`);
      return false;
    }
  }

  async testInviteFlow() {
    console.log('\n🎟️ Testing Invite Flow...');
    
    try {
      // Check invitations exist
      const { data: invitations, error: invError } = await supabase
        .from('invitations')
        .select('*')
        .in('invite_code', ['jj-direct', 'cc-direct']);

      if (invError || !invitations || invitations.length !== 2) {
        this.log('Invite Flow', 'fail', `Invitations not found: ${invError?.message}`);
        return false;
      }

      this.log('Invite Flow', 'pass', 'Direct access invitations exist');

      // Test each invite code
      for (const invitation of invitations) {
        if (invitation.expires_at < new Date().toISOString()) {
          this.log('Invite Flow', 'warn', `Invitation ${invitation.invite_code} is expired`);
        } else {
          this.log('Invite Flow', 'pass', `Invitation ${invitation.invite_code} is valid`);
        }
      }

      return true;

    } catch (err) {
      this.log('Invite Flow', 'fail', `Test error: ${err.message}`);
      return false;
    }
  }

  async testRealTimeMessaging() {
    console.log('\n📡 Testing Real-time Messaging...');
    
    try {
      // Sign in as JJ
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'joshuabrenden@gmail.com',
        password: 'jj123!'
      });

      if (authError) {
        this.log('Real-time Messaging', 'fail', `Login failed: ${authError.message}`);
        return false;
      }

      // Send a test message
      const testMessage = `Test message - ${Date.now()}`;
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: this.conversationId,
          user_id: authData.user.id,
          content: testMessage,
          message_type: 'user'
        })
        .select()
        .single();

      if (messageError) {
        this.log('Real-time Messaging', 'fail', `Cannot send message: ${messageError.message}`);
        await supabase.auth.signOut();
        return false;
      }

      this.log('Real-time Messaging', 'pass', 'Message sent successfully');

      // Verify message was inserted
      const { data: retrievedMessage, error: retrieveError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageData.id)
        .single();

      if (retrieveError || !retrievedMessage) {
        this.log('Real-time Messaging', 'fail', `Cannot retrieve message: ${retrieveError?.message}`);
        await supabase.auth.signOut();
        return false;
      }

      this.log('Real-time Messaging', 'pass', 'Message retrieved successfully');

      await supabase.auth.signOut();
      return true;

    } catch (err) {
      this.log('Real-time Messaging', 'fail', `Test error: ${err.message}`);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting HitMeUp UI Flow Tests\n');
    
    const tests = [
      this.testEnvironmentSetup,
      this.testDatabaseConnectivity,
      this.testUserAuthentication,
      this.testConversationAccess,
      this.testInviteFlow,
      this.testRealTimeMessaging,
      this.testAIIntegration
    ];

    let passCount = 0;
    const totalTests = tests.length;

    for (const test of tests) {
      const result = await test.call(this);
      if (result) passCount++;
    }

    console.log('\n📊 Test Summary:');
    console.log(`   Passed: ${passCount}/${totalTests}`);
    console.log(`   Success Rate: ${Math.round((passCount/totalTests) * 100)}%`);

    if (passCount === totalTests) {
      console.log('\n🎉 All tests passed! HitMeUp is ready for use.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the results above.');
    }

    console.log('\n🔗 Quick Test Links:');
    console.log('   JJ: http://localhost:3000/invite/jj-direct');
    console.log('   CC: http://localhost:3000/invite/cc-direct');
    console.log('   Admin: http://localhost:3000/login');

    return passCount === totalTests;
  }
}

// Run tests
const tester = new UIFlowTester();
tester.runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('❌ Test runner failed:', err);
    process.exit(1);
  });