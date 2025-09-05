#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
🚀 HitMeUp Interactive Testing Guide

Your dev server should be running at: http://localhost:3000

I'll guide you through testing each flow step-by-step. 
Open your browser and follow along!

═══════════════════════════════════════════════════════════════
`);

const tests = [
  {
    name: "🏠 Home Page",
    url: "http://localhost:3000",
    steps: [
      "1. Navigate to http://localhost:3000",
      "2. Check that 'HITMEUP' title is visible",
      "3. Check that 'ADMIN LOGIN' button is visible",
      "4. Check that 'WAITING FOR INVITE' button is disabled"
    ],
    expected: "Home page loads with neobrutalist design and features list"
  },
  {
    name: "🔐 Admin Login Flow",
    url: "http://localhost:3000/login",
    steps: [
      "1. Click 'ADMIN LOGIN' button or navigate to /login",
      "2. Enter email: joshuabrenden@gmail.com",
      "3. Enter password: jj123!",
      "4. Click 'LOGIN AS ADMIN' button",
      "5. Should redirect to admin dashboard"
    ],
    expected: "Successfully logs in and shows admin dashboard with metrics"
  },
  {
    name: "👨‍💼 Admin Dashboard",
    url: "http://localhost:3000/admin",
    steps: [
      "1. After login, you should see 'HITMEUP ADMIN' header",
      "2. Check user stats (total users should show 2)",
      "3. Check conversation stats", 
      "4. Check AI usage stats",
      "5. Check system health (all should be green/active)"
    ],
    expected: "Dashboard shows metrics: 2 users, 1 conversation, system healthy"
  },
  {
    name: "🎟️ JJ Direct Access",
    url: "http://localhost:3000/invite/jj-direct",
    steps: [
      "1. Open new tab/window (or logout first)",
      "2. Navigate to http://localhost:3000/invite/jj-direct",
      "3. Should see 'WELCOME JJ! 👋' message",
      "4. Should automatically redirect to chat room after 1 second",
      "5. Should show 'JJ & CC Chat 🎉' conversation"
    ],
    expected: "Redirects to chat room with JJ logged in automatically"
  },
  {
    name: "💬 Chat Room Functionality",
    url: "http://localhost:3000/chat/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    steps: [
      "1. In the chat room, check that welcome message is visible",
      "2. Type a test message: 'Hello, this is a test message'",
      "3. Press Enter to send",
      "4. Message should appear immediately with JJ badge",
      "5. Check timestamp is correct"
    ],
    expected: "Messages send and appear instantly with proper user badges"
  },
  {
    name: "🤖 AI Assistant (@jimmy)",
    url: "Same chat room",
    steps: [
      "1. Type a message mentioning @jimmy: '@jimmy what is 2+2?'",
      "2. Press Enter to send",
      "3. Your message should appear with JJ badge",
      "4. AI response should appear after a few seconds",
      "5. AI message should have 'JIMMY' badge and different background"
    ],
    expected: "AI responds appropriately with proper formatting"
  },
  {
    name: "🎟️ CC Direct Access",
    url: "http://localhost:3000/invite/cc-direct",
    steps: [
      "1. Open new incognito/private window",
      "2. Navigate to http://localhost:3000/invite/cc-direct",
      "3. Should see 'WELCOME CC! 👋' message",
      "4. Should redirect to same chat room",
      "5. Should show CC as the current user"
    ],
    expected: "CC can access same chat room (may have auth issues)"
  },
  {
    name: "🔄 Real-time Messaging",
    url: "Two browser windows",
    steps: [
      "1. Have JJ logged in in one window",
      "2. Have CC logged in in another window (if CC auth works)",
      "3. Send a message from one window",
      "4. Check if it appears in the other window instantly",
      "5. Test both directions"
    ],
    expected: "Messages sync in real-time between users"
  },
  {
    name: "❌ Invalid Invite Code",
    url: "http://localhost:3000/invite/invalid-code",
    steps: [
      "1. Navigate to http://localhost:3000/invite/invalid-code",
      "2. Should see 'INVALID CODE' message",
      "3. Should redirect to home page after 2 seconds"
    ],
    expected: "Proper error handling for invalid invites"
  }
];

async function runTest(test, index) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST ${index + 1}/9: ${test.name}`);
    console.log(`URL: ${test.url}`);
    console.log(`${'='.repeat(60)}\n`);
    
    console.log("STEPS TO FOLLOW:");
    test.steps.forEach(step => console.log(`   ${step}`));
    
    console.log(`\nEXPECTED RESULT:`);
    console.log(`   ${test.expected}\n`);
    
    rl.question('Press Enter when ready to continue, or type "skip" to skip this test: ', (answer) => {
      if (answer.toLowerCase() === 'skip') {
        console.log('⏭️  Skipped');
      } else {
        console.log('');
        rl.question('Did this test PASS or FAIL? (p/f): ', (result) => {
          const status = result.toLowerCase().startsWith('p') ? '✅ PASS' : '❌ FAIL';
          console.log(`Result: ${status}`);
          
          if (result.toLowerCase().startsWith('f')) {
            rl.question('What went wrong? (optional): ', (issue) => {
              if (issue) {
                console.log(`Issue noted: ${issue}`);
              }
              resolve({ passed: false, issue });
            });
          } else {
            resolve({ passed: true });
          }
        });
      }
    });
  });
}

async function runAllTests() {
  console.log("Ready to start testing? Make sure your dev server is running!");
  
  await new Promise(resolve => {
    rl.question('\nPress Enter to begin testing: ', resolve);
  });

  const results = [];
  
  for (let i = 0; i < tests.length; i++) {
    const result = await runTest(tests[i], i);
    results.push({ test: tests[i].name, ...result });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TESTING COMPLETE - RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.test}`);
    if (result.issue) {
      console.log(`    Issue: ${result.issue}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`OVERALL: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! HitMeUp is working perfectly!');
  } else {
    console.log('⚠️  Some tests failed. Issues need to be fixed.');
    
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      console.log('\nFailed tests that need fixing:');
      failedTests.forEach(test => {
        console.log(`• ${test.test}: ${test.issue || 'No details provided'}`);
      });
    }
  }
  
  rl.close();
}

runAllTests().catch(console.error);