#!/usr/bin/env node

// Test login authentication
const puppeteer = require('puppeteer');

(async () => {
  console.log('🔐 Testing Admin Login Flow...');
  
  let browser;
  try {
    // Launch browser in headed mode so user can see what's happening
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: false,
      defaultViewport: { width: 1200, height: 800 }
    });
    
    const page = await browser.newPage();
    
    console.log('📄 Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    
    // Wait for page to load
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    console.log('✅ Login page loaded');
    
    // Fill in credentials
    console.log('📝 Entering credentials...');
    await page.type('input[type="email"]', 'joshuabrenden@gmail.com');
    await page.type('input[type="password"]', 'jj123!');
    
    console.log('🚀 Clicking login button...');
    await page.click('button:has-text("LOGIN AS ADMIN")');
    
    // Wait for either success (redirect to /admin) or error message
    try {
      await page.waitForURL('**/admin', { timeout: 10000 });
      console.log('✅ Successfully redirected to admin dashboard');
      
      // Check if dashboard loaded
      await page.waitForSelector('text=HITMEUP ADMIN', { timeout: 5000 });
      console.log('✅ Admin dashboard loaded correctly');
      
      // Keep browser open for 10 seconds so user can see
      console.log('🔍 Dashboard visible - keeping browser open for inspection...');
      await page.waitForTimeout(10000);
      
    } catch (redirectErr) {
      console.log('❌ Login failed or redirect didn\'t happen');
      
      // Check for error message
      const errorText = await page.$eval('.bg-brutal-red', el => el.textContent).catch(() => null);
      if (errorText) {
        console.log(`❌ Error message: ${errorText}`);
      }
      
      // Keep browser open for inspection
      console.log('🔍 Keeping browser open for 10 seconds to inspect...');
      await page.waitForTimeout(10000);
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();