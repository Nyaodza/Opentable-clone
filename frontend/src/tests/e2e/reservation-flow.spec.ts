import { test, expect } from '@playwright/test';

test.describe('Reservation Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
  });

  test('complete reservation flow from search to confirmation', async ({ page }) => {
    // Search for restaurants
    await page.fill('[data-testid="search-input"]', 'Italian');
    await page.selectOption('[data-testid="location-select"]', 'New York');
    await page.click('[data-testid="search-button"]');

    // Wait for search results
    await page.waitForSelector('[data-testid="restaurant-card"]');
    
    // Verify search results are displayed
    const restaurantCards = page.locator('[data-testid="restaurant-card"]');
    await expect(restaurantCards).toHaveCount(3, { timeout: 10000 });

    // Click on the first restaurant
    await restaurantCards.first().click();

    // Wait for restaurant details page
    await page.waitForSelector('[data-testid="restaurant-details"]');
    
    // Verify restaurant details are displayed
    await expect(page.locator('[data-testid="restaurant-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="restaurant-rating"]')).toBeVisible();

    // Make a reservation
    await page.click('[data-testid="make-reservation-button"]');

    // Fill reservation form
    await page.fill('[data-testid="date-input"]', '2024-12-25');
    await page.selectOption('[data-testid="time-select"]', '19:00');
    await page.selectOption('[data-testid="party-size-select"]', '4');
    await page.fill('[data-testid="special-requests"]', 'Window table please');

    // Submit reservation
    await page.click('[data-testid="submit-reservation"]');

    // Wait for confirmation
    await page.waitForSelector('[data-testid="reservation-confirmation"]');
    
    // Verify confirmation details
    await expect(page.locator('[data-testid="confirmation-message"]')).toContainText('Reservation Confirmed');
    await expect(page.locator('[data-testid="confirmation-date"]')).toContainText('December 25, 2024');
    await expect(page.locator('[data-testid="confirmation-time"]')).toContainText('7:00 PM');
    await expect(page.locator('[data-testid="confirmation-party-size"]')).toContainText('4 guests');
  });

  test('user authentication flow', async ({ page }) => {
    // Click login button
    await page.click('[data-testid="login-button"]');

    // Fill login form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="submit-login"]');

    // Wait for dashboard redirect
    await page.waitForURL('**/dashboard');
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome back');
  });

  test('blockchain wallet connection flow', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="submit-login"]');
    
    // Navigate to dashboard
    await page.waitForURL('**/dashboard');
    
    // Click on blockchain tab
    await page.click('[data-testid="blockchain-tab"]');
    
    // Connect wallet
    await page.click('[data-testid="connect-wallet-button"]');
    
    // Mock MetaMask connection (in real test, this would interact with browser extension)
    await page.evaluate(() => {
      // Mock ethereum object
      (window as any).ethereum = {
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          if (method === 'eth_chainId') {
            return '0x89'; // Polygon mainnet
          }
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
    });
    
    // Retry wallet connection
    await page.click('[data-testid="connect-wallet-button"]');
    
    // Verify wallet connection
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();
    await expect(page.locator('[data-testid="token-balance"]')).toBeVisible();
  });

  test('virtual experience booking flow', async ({ page }) => {
    // Login and navigate to virtual tab
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/dashboard');
    await page.click('[data-testid="virtual-tab"]');
    
    // Start VR experience
    await page.click('[data-testid="start-vr-button"]');
    
    // Select restaurant for virtual tour
    await page.click('[data-testid="restaurant-tour-option"]');
    
    // Verify VR interface elements
    await expect(page.locator('[data-testid="vr-controls"]')).toBeVisible();
    await expect(page.locator('[data-testid="360-view"]')).toBeVisible();
    
    // Book table from VR experience
    await page.click('[data-testid="book-from-vr"]');
    
    // Fill booking form
    await page.fill('[data-testid="vr-booking-date"]', '2024-12-30');
    await page.selectOption('[data-testid="vr-booking-time"]', '20:00');
    await page.click('[data-testid="confirm-vr-booking"]');
    
    // Verify booking confirmation
    await expect(page.locator('[data-testid="vr-booking-success"]')).toBeVisible();
  });

  test('voice command interaction', async ({ page }) => {
    // Mock speech recognition
    await page.addInitScript(() => {
      (window as any).SpeechRecognition = class MockSpeechRecognition {
        onresult: ((event: any) => void) | null = null;
        onend: (() => void) | null = null;
        onerror: ((event: any) => void) | null = null;
        
        start() {
          setTimeout(() => {
            if (this.onresult) {
              this.onresult({
                results: [{
                  0: { transcript: 'book a table for tonight' }
                }]
              });
            }
          }, 1000);
        }
        
        stop() {}
      };
      
      (window as any).webkitSpeechRecognition = (window as any).SpeechRecognition;
    });
    
    // Login and navigate to voice tab
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/dashboard');
    await page.click('[data-testid="voice-tab"]');
    
    // Start voice recognition
    await page.click('[data-testid="start-listening-button"]');
    
    // Wait for voice command processing
    await page.waitForTimeout(2000);
    
    // Verify voice command was processed
    await expect(page.locator('[data-testid="voice-transcript"]')).toContainText('book a table for tonight');
    await expect(page.locator('[data-testid="voice-response"]')).toBeVisible();
  });

  test('AI concierge chat interaction', async ({ page }) => {
    // Login and navigate to AI tab
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/dashboard');
    await page.click('[data-testid="ai-tab"]');
    
    // Send message to AI concierge
    await page.fill('[data-testid="ai-chat-input"]', 'What are the best Italian restaurants nearby?');
    await page.click('[data-testid="send-message-button"]');
    
    // Wait for AI response
    await page.waitForSelector('[data-testid="ai-response"]', { timeout: 10000 });
    
    // Verify AI response
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-history"]')).toContainText('What are the best Italian restaurants nearby?');
  });

  test('social dining group creation', async ({ page }) => {
    // Login and navigate to social tab
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/dashboard');
    await page.click('[data-testid="social-tab"]');
    
    // Create dining group
    await page.click('[data-testid="create-group-button"]');
    await page.fill('[data-testid="group-name-input"]', 'Friday Night Foodies');
    await page.fill('[data-testid="group-description"]', 'Weekly dinner group for food enthusiasts');
    await page.click('[data-testid="create-group-submit"]');
    
    // Verify group creation
    await expect(page.locator('[data-testid="group-created-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="group-list"]')).toContainText('Friday Night Foodies');
  });

  test('sustainability metrics tracking', async ({ page }) => {
    // Login and navigate to sustainability tab
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/dashboard');
    await page.click('[data-testid="sustainability-tab"]');
    
    // Verify sustainability metrics are displayed
    await expect(page.locator('[data-testid="carbon-footprint"]')).toBeVisible();
    await expect(page.locator('[data-testid="eco-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="green-restaurants"]')).toBeVisible();
    
    // Check eco-friendly restaurant filter
    await page.click('[data-testid="eco-filter-toggle"]');
    
    // Verify filtered results
    await expect(page.locator('[data-testid="eco-restaurants-list"]')).toBeVisible();
  });

  test('mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to homepage
    await page.goto('http://localhost:3000');
    
    // Verify mobile navigation
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Test mobile search
    await page.fill('[data-testid="mobile-search-input"]', 'Pizza');
    await page.click('[data-testid="mobile-search-button"]');
    
    // Verify mobile search results
    await expect(page.locator('[data-testid="mobile-restaurant-card"]')).toBeVisible();
  });

  test('error handling and recovery', async ({ page }) => {
    // Test network error handling
    await page.route('**/api/restaurants', route => route.abort());
    
    // Attempt to search
    await page.fill('[data-testid="search-input"]', 'Italian');
    await page.click('[data-testid="search-button"]');
    
    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Test retry functionality
    await page.unroute('**/api/restaurants');
    await page.click('[data-testid="retry-button"]');
    
    // Verify recovery
    await expect(page.locator('[data-testid="restaurant-card"]')).toBeVisible();
  });
});
