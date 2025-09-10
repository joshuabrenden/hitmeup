import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/')
  })

  test('should display home page with navigation to auth pages', async ({ page }) => {
    // Verify home page loads
    await expect(page.locator('h1')).toContainText('HitMeUp')
    
    // Verify auth navigation exists
    await expect(page.locator('a[href="/login"]')).toBeVisible()
    await expect(page.locator('a[href="/signup"]')).toBeVisible()
    
    // Verify chat link exists but may require auth
    await expect(page.locator('a[href="/chat"]')).toBeVisible()
  })

  test('should navigate to login page and display form', async ({ page }) => {
    // Navigate to login page
    await page.click('a[href="/login"]')
    await expect(page).toHaveURL('/login')
    
    // Verify login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    
    // Verify form validation
    await page.click('button[type="submit"]')
    // Should show validation errors for empty fields
    await expect(page.locator('text=required')).toBeVisible()
  })

  test('should navigate to signup page and display form', async ({ page }) => {
    // Navigate to signup page
    await page.click('a[href="/signup"]')
    await expect(page).toHaveURL('/signup')
    
    // Verify signup form elements
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should validate signup form fields', async ({ page }) => {
    await page.goto('/signup')
    
    // Test password mismatch validation
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.fill('input[name="confirmPassword"]', 'differentpassword')
    
    await page.click('button[type="submit"]')
    
    // Should show password mismatch error
    await expect(page.locator('text=Passwords do not match')).toBeVisible()
  })

  // Note: These tests will need a test Supabase instance to work properly
  // For now, they test the UI behavior
  
  test('should handle login form submission', async ({ page }) => {
    await page.goto('/login')
    
    // Fill in login form
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'testpassword')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should either redirect to chat or show error message
    // (Depends on whether test user exists in database)
    await page.waitForLoadState('networkidle')
    
    // Check if we're redirected or if there's an error message
    const currentUrl = page.url()
    const hasError = await page.locator('text=Invalid').isVisible()
    
    // One of these should be true
    expect(currentUrl.includes('/chat') || hasError).toBeTruthy()
  })
})