import { test, expect } from '@playwright/test';

test.describe('Restaurant Reservation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should complete full reservation flow', async ({ page }) => {
    // Search for a restaurant
    await page.fill('[placeholder="Location, Restaurant, or Cuisine"]', 'Italian');
    await page.click('button:has-text("Search")');

    // Wait for search results
    await page.waitForURL(/\/search/);
    await expect(page.locator('[data-testid="restaurant-card"]')).toHaveCount(10);

    // Click on first restaurant
    await page.click('[data-testid="restaurant-card"]:first-child');

    // Wait for restaurant page
    await page.waitForURL(/\/restaurants\/\d+/);
    await expect(page.locator('h1')).toContainText('Restaurant');

    // Select date and time
    await page.click('[data-testid="date-picker"]');
    await page.click('[data-testid="date-tomorrow"]');
    
    await page.selectOption('[data-testid="time-select"]', '7:00 PM');
    await page.selectOption('[data-testid="party-size"]', '4');

    // Click find table
    await page.click('button:has-text("Find a Table")');

    // Select available time slot
    await page.waitForSelector('[data-testid="time-slot"]');
    await page.click('[data-testid="time-slot"]:first-child');

    // Fill reservation form
    await page.fill('[name="firstName"]', 'John');
    await page.fill('[name="lastName"]', 'Doe');
    await page.fill('[name="email"]', 'john.doe@example.com');
    await page.fill('[name="phone"]', '1234567890');

    // Add special request
    await page.fill('[name="specialRequests"]', 'Window seat please');

    // Complete reservation
    await page.click('button:has-text("Complete Reservation")');

    // Verify confirmation
    await page.waitForURL(/\/reservations\/confirmation/);
    await expect(page.locator('h1')).toContainText('Reservation Confirmed');
    await expect(page.locator('[data-testid="confirmation-number"]')).toBeVisible();
  });

  test('should handle authentication during reservation', async ({ page }) => {
    // Navigate to restaurant page directly
    await page.goto('http://localhost:3000/restaurants/1');

    // Try to make reservation
    await page.click('button:has-text("Find a Table")');

    // Should redirect to login
    await page.waitForURL(/\/auth\/signin/);
    
    // Login
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    // Should redirect back to restaurant
    await page.waitForURL(/\/restaurants\/1/);
    
    // Continue with reservation
    await page.click('button:has-text("Find a Table")');
    await expect(page.locator('[data-testid="time-slot"]')).toBeVisible();
  });

  test('should show availability calendar', async ({ page }) => {
    await page.goto('http://localhost:3000/restaurants/1');

    // Open calendar view
    await page.click('button:has-text("View Calendar")');

    // Check calendar is visible
    await expect(page.locator('[data-testid="availability-calendar"]')).toBeVisible();

    // Navigate months
    await page.click('button[aria-label="Next month"]');
    await page.click('button[aria-label="Previous month"]');

    // Select a date
    await page.click('[data-testid="calendar-date-available"]:first-child');

    // Should show times for selected date
    await expect(page.locator('[data-testid="time-slots-list"]')).toBeVisible();
  });

  test('should modify existing reservation', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    // Go to reservations
    await page.goto('http://localhost:3000/dashboard/reservations');

    // Click modify on first reservation
    await page.click('[data-testid="modify-reservation"]:first-child');

    // Change party size
    await page.selectOption('[data-testid="party-size"]', '6');

    // Update reservation
    await page.click('button:has-text("Update Reservation")');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Reservation updated');
  });

  test('should cancel reservation', async ({ page }) => {
    // Login and navigate to reservations
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    await page.goto('http://localhost:3000/dashboard/reservations');

    // Click cancel on first reservation
    await page.click('[data-testid="cancel-reservation"]:first-child');

    // Confirm cancellation
    await page.click('button:has-text("Yes, Cancel")');

    // Verify cancellation
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Reservation cancelled');
  });

  test('should validate form inputs', async ({ page }) => {
    await page.goto('http://localhost:3000/restaurants/1');

    // Try to submit without required fields
    await page.click('button:has-text("Find a Table")');
    await page.click('[data-testid="time-slot"]:first-child');

    // Submit empty form
    await page.click('button:has-text("Complete Reservation")');

    // Check validation messages
    await expect(page.locator('text="First name is required"')).toBeVisible();
    await expect(page.locator('text="Last name is required"')).toBeVisible();
    await expect(page.locator('text="Email is required"')).toBeVisible();
    await expect(page.locator('text="Phone is required"')).toBeVisible();

    // Test invalid email
    await page.fill('[name="email"]', 'invalid-email');
    await page.click('button:has-text("Complete Reservation")');
    await expect(page.locator('text="Invalid email address"')).toBeVisible();
  });
});