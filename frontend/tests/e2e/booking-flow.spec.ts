/**
 * End-to-End Test: Complete Booking Flow
 * Tests the critical user journey from search to reservation confirmation
 */

import { test, expect } from '@playwright/test';

test.describe('Critical Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
  });

  test('Complete restaurant search and booking flow', async ({ page }) => {
    // Step 1: Homepage loads successfully
    await expect(page).toHaveTitle(/OpenTable Clone/);
    await expect(page.locator('h1')).toContainText(/Find Your Table|Discover/);

    // Step 2: Search for restaurants
    await page.click('text=Find Restaurants');
    await page.waitForURL('**/restaurants');
    
    // Verify search page loaded
    await expect(page.locator('h1')).toContainText(/Find Your Table/);
    
    // Step 3: Apply filters
    const dateInput = page.locator('input[type="date"]');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await dateInput.fill(dateString);
    
    await page.selectOption('select', { label: '7:00 PM' });
    await page.selectOption('text=2 People', { label: '4 People' });
    
    // Select cuisine filter
    await page.selectOption('text=/.*Cuisine.*/', { label: 'Italian' });
    
    // Step 4: Search results displayed
    await expect(page.locator('.restaurant-card, [class*="restaurant"]').first()).toBeVisible();
    
    // Step 5: Click on first restaurant
    const firstRestaurant = page.locator('.restaurant-card, [class*="restaurant"]').first();
    await firstRestaurant.click();
    
    // Wait for restaurant detail page
    await page.waitForURL('**/restaurants/**');
    
    // Step 6: Verify restaurant details page
    await expect(page.locator('h1, h2').first()).toBeVisible();
    
    // Step 7: Select time slot (if not already selected)
    const timeSlots = page.locator('[class*="time"], button:has-text("PM")');
    if (await timeSlots.count() > 0) {
      await timeSlots.first().click();
    }
    
    // Step 8: Click "Reserve" or "Book Now" button
    const reserveButton = page.locator('button:has-text("Reserve"), button:has-text("Book")').first();
    await expect(reserveButton).toBeEnabled();
    await reserveButton.click();
    
    // Step 9: Fill in reservation details (if modal appears)
    const guestNameInput = page.locator('input[name="name"], input[placeholder*="name" i]');
    if (await guestNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await guestNameInput.fill('John Doe');
      
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      await emailInput.fill('john.doe@example.com');
      
      const phoneInput = page.locator('input[type="tel"], input[name="phone"]');
      await phoneInput.fill('555-123-4567');
      
      // Submit reservation
      const submitButton = page.locator('button:has-text("Confirm"), button[type="submit"]').last();
      await submitButton.click();
    }
    
    // Step 10: Verify confirmation
    // Look for success message or confirmation page
    await expect(
      page.locator('text=/confirmed|success|thank you/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('User registration and first booking flow', async ({ page }) => {
    // Step 1: Navigate to registration
    await page.click('text=/Sign Up|Register/i');
    await page.waitForURL('**/register');
    
    // Step 2: Fill registration form
    const timestamp = Date.now();
    await page.fill('input[name="name"]', `Test User ${timestamp}`);
    await page.fill('input[type="email"]', `testuser${timestamp}@example.com`);
    await page.fill('input[type="password"]', 'SecurePass123!');
    
    // Accept terms if checkbox exists
    const termsCheckbox = page.locator('input[type="checkbox"]');
    if (await termsCheckbox.count() > 0) {
      await termsCheckbox.first().check();
    }
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Step 3: Verify registration success
    // Should redirect to dashboard or home
    await page.waitForURL(/\/(dashboard|\/)/);
    
    // Step 4: Navigate to restaurants
    await page.goto('/restaurants');
    
    // Step 5: Make first booking (same flow as above)
    await page.locator('.restaurant-card').first().click();
    
    const reserveButton = page.locator('button:has-text("Reserve")').first();
    await reserveButton.click();
    
    // Verify booking initiated
    await expect(page.locator('text=/reservation|booking/i')).toBeVisible();
  });

  test('Guest booking flow (no authentication)', async ({ page }) => {
    // Navigate to guest booking
    await page.goto('/guest-booking');
    
    // Should load guest booking form
    await expect(page.locator('h1, h2').first()).toBeVisible();
    
    // Fill in guest details
    await page.fill('input[placeholder*="name" i]', 'Guest User');
    await page.fill('input[type="email"]', 'guest@example.com');
    await page.fill('input[type="tel"]', '555-987-6543');
    
    // Select restaurant (if dropdown exists)
    const restaurantSelect = page.locator('select, [role="combobox"]').first();
    if (await restaurantSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await restaurantSelect.click();
      await page.locator('option, [role="option"]').first().click();
    }
    
    // Select date and time
    const dateInput = page.locator('input[type="date"]').first();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await dateInput.fill(tomorrow.toISOString().split('T')[0]);
    
    // Submit guest booking
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Verify submission
    await expect(
      page.locator('text=/submitted|confirmed|received/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('Responsive design - mobile booking flow', async ({ page, viewport }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to restaurants
    await page.goto('/restaurants');
    
    // Verify mobile layout
    const restaurants = page.locator('.restaurant-card, [class*="restaurant"]');
    await expect(restaurants.first()).toBeVisible();
    
    // Check touch target size (minimum 44x44 for WCAG)
    const firstCard = restaurants.first();
    const box = await firstCard.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    
    // Test mobile navigation
    const menuButton = page.locator('button[aria-label*="menu" i], button:has-text("☰")');
    if (await menuButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await menuButton.click();
      // Verify menu opened
      await expect(page.locator('nav, [role="navigation"]')).toBeVisible();
    }
  });

  test('Accessibility - keyboard navigation', async ({ page }) => {
    await page.goto('/restaurants');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    // Verify focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Navigate to first restaurant using keyboard
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focus');
      const text = await focused.textContent().catch(() => '');
      
      // If we find a restaurant link, press Enter
      if (text && text.toLowerCase().includes('restaurant') || 
          await focused.getAttribute('href').then(h => h?.includes('/restaurants/')).catch(() => false)) {
        await page.keyboard.press('Enter');
        break;
      }
    }
    
    // Should navigate to restaurant detail
    await page.waitForURL('**/restaurants/**', { timeout: 5000 });
  });

  test('Error handling - invalid booking data', async ({ page }) => {
    await page.goto('/restaurants');
    
    // Click first restaurant
    await page.locator('.restaurant-card').first().click();
    
    // Try to book with invalid data
    const reserveButton = page.locator('button:has-text("Reserve")').first();
    await reserveButton.click();
    
    // Fill invalid email
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill('invalid-email');
      
      const submitButton = page.locator('button[type="submit"]').last();
      await submitButton.click();
      
      // Should show validation error
      await expect(
        page.locator('text=/invalid|error/i')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('Performance - page load times', async ({ page }) => {
    // Measure homepage load time
    const homeStart = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const homeTime = Date.now() - homeStart;
    
    // Should load in under 3 seconds
    expect(homeTime).toBeLessThan(3000);
    
    // Measure restaurants page load time
    const restaurantsStart = Date.now();
    await page.goto('/restaurants');
    await page.waitForLoadState('networkidle');
    const restaurantsTime = Date.now() - restaurantsStart;
    
    // Should load in under 3 seconds
    expect(restaurantsTime).toBeLessThan(3000);
  });

  test('Cookie consent - GDPR compliance', async ({ page }) => {
    await page.goto('/');
    
    // Cookie banner should appear
    const cookieBanner = page.locator('text=/cookie|privacy/i').first();
    await expect(cookieBanner).toBeVisible({ timeout: 5000 });
    
    // Click "Accept All" button
    const acceptButton = page.locator('button:has-text(/accept/i)').first();
    await acceptButton.click();
    
    // Banner should disappear
    await expect(cookieBanner).not.toBeVisible({ timeout: 2000 });
    
    // Reload page - banner should not appear again
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Cookie banner should not be visible
    const bannerAfterReload = page.locator('text=/cookie|privacy/i').first();
    const isVisible = await bannerAfterReload.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isVisible).toBe(false);
  });
});
