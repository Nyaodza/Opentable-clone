// End-to-End Tests for OpenTable Clone
describe('OpenTable Clone E2E Tests', () => {
    beforeEach(async () => {
        await page.goto('http://localhost:8081');
        await page.waitForSelector('[data-testid="app"]');
    });

    test('complete user journey: registration to dining', async () => {
        // Landing page
        await expect(page.locator('h1')).toContainText('OpenTable Clone');
        
        // Navigate to restaurants
        await page.click('[data-page="restaurants"]');
        await page.waitForSelector('[data-testid="restaurant-list"]');
        
        // Filter restaurants
        await page.fill('[data-testid="search-input"]', 'Italian');
        await page.click('[data-testid="search-button"]');
        
        // Select restaurant
        await page.click('[data-testid="restaurant-card"]:first-child');
        await page.waitForSelector('[data-testid="restaurant-detail"]');
        
        // Make reservation
        await page.fill('[data-testid="date-input"]', '2024-08-25');
        await page.selectOption('[data-testid="time-select"]', '19:00');
        await page.selectOption('[data-testid="guests-select"]', '2');
        await page.click('[data-testid="check-availability"]');
        
        // Confirm reservation
        await page.waitForSelector('[data-testid="available-times"]');
        await page.click('[data-testid="time-slot"]:first-child');
        await page.click('[data-testid="confirm-reservation"]');
        
        // Verify success and token reward
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="token-reward"]')).toContainText('50 tokens earned');
    });

    test('blockchain loyalty dashboard interaction', async () => {
        // Navigate to dashboard
        await page.click('[data-page="dashboard"]');
        await page.waitForSelector('[data-testid="dashboard"]');
        
        // Check blockchain tab
        await page.click('[data-tab="blockchain"]');
        await expect(page.locator('[data-testid="token-balance"]')).toContainText('1250');
        
        // Test staking interface
        await page.fill('[data-testid="stake-amount"]', '100');
        await page.selectOption('[data-testid="stake-duration"]', '90 days (8% APY)');
        await page.click('[data-testid="stake-tokens"]');
        
        // Verify staking confirmation
        await expect(page.locator('[data-testid="stake-confirmation"]')).toBeVisible();
    });

    test('VR experience booking flow', async () => {
        await page.click('[data-page="dashboard"]');
        await page.click('[data-tab="vr"]');
        
        // Preview VR experience
        await page.click('[data-testid="preview-experience"]:first-child');
        await page.waitForSelector('[data-testid="vr-preview"]');
        
        // Book experience
        await page.click('[data-testid="book-experience"]');
        await page.fill('[data-testid="booking-date"]', '2024-08-26');
        await page.selectOption('[data-testid="booking-time"]', '15:00');
        await page.click('[data-testid="confirm-vr-booking"]');
        
        // Verify booking success
        await expect(page.locator('[data-testid="vr-booking-success"]')).toBeVisible();
    });

    test('AI concierge conversation', async () => {
        await page.click('[data-page="dashboard"]');
        await page.click('[data-tab="ai"]');
        
        // Send message to AI
        await page.fill('[data-testid="chat-input"]', 'I want a romantic dinner for two');
        await page.click('[data-testid="chat-send"]');
        
        // Verify message appears
        await expect(page.locator('[data-testid="user-message"]').last()).toContainText('romantic dinner for two');
        
        // Wait for AI response (simulated)
        await page.waitForSelector('[data-testid="ai-response"]', { timeout: 3000 });
        await expect(page.locator('[data-testid="ai-response"]').last()).toBeVisible();
    });

    test('social dining group management', async () => {
        await page.click('[data-page="dashboard"]');
        await page.click('[data-tab="social"]');
        
        // Create new group
        await page.click('[data-testid="create-group"]');
        await page.fill('[data-testid="group-name"]', 'E2E Test Group');
        await page.fill('[data-testid="group-description"]', 'Testing group creation');
        await page.selectOption('[data-testid="cuisine-preference"]', 'Italian');
        await page.fill('[data-testid="max-members"]', '6');
        await page.click('[data-testid="submit-group"]');
        
        // Verify group creation
        await expect(page.locator('[data-testid="group-list"]')).toContainText('E2E Test Group');
        
        // Test voting functionality
        await page.click('[data-testid="vote-button"]:first-child');
        await page.waitForSelector('[data-testid="voting-modal"]');
        await page.click('[data-testid="restaurant-option"]:first-child');
        await page.click('[data-testid="submit-vote"]');
        
        // Verify vote recorded
        await expect(page.locator('[data-testid="vote-confirmation"]')).toBeVisible();
    });

    test('voice device management', async () => {
        await page.click('[data-page="dashboard"]');
        await page.click('[data-tab="voice"]');
        
        // Add new device
        await page.click('[data-testid="add-device"]');
        await page.fill('[data-testid="device-name"]', 'Test Echo');
        await page.selectOption('[data-testid="device-type"]', 'alexa');
        await page.click('[data-testid="connect-device"]');
        
        // Verify device appears in list
        await expect(page.locator('[data-testid="device-list"]')).toContainText('Test Echo');
        
        // Test device configuration
        await page.click('[data-testid="configure-device"]:last-child');
        await page.waitForSelector('[data-testid="device-settings"]');
        await page.selectOption('[data-testid="wake-word"]', 'Hey OpenTable');
        await page.click('[data-testid="save-settings"]');
        
        // Verify settings saved
        await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();
    });

    test('sustainability tracking', async () => {
        await page.click('[data-page="dashboard"]');
        await page.click('[data-tab="sustainability"]');
        
        // Verify initial metrics
        await expect(page.locator('[data-testid="carbon-footprint"]')).toContainText('2.4 kg');
        await expect(page.locator('[data-testid="local-sourcing"]')).toContainText('85%');
        
        // Check achievements
        await expect(page.locator('[data-testid="achievements"]')).toContainText('Green Diner');
        
        // Test goal setting
        await page.click('[data-testid="set-goal"]');
        await page.fill('[data-testid="monthly-goal"]', '35');
        await page.click('[data-testid="save-goal"]');
        
        // Verify goal updated
        await expect(page.locator('[data-testid="monthly-goal-display"]')).toContainText('35');
    });

    test('responsive design on mobile', async () => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        
        // Test mobile navigation
        await page.click('[data-testid="mobile-menu-toggle"]');
        await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
        
        // Navigate to dashboard
        await page.click('[data-testid="mobile-dashboard-link"]');
        await page.waitForSelector('[data-testid="dashboard"]');
        
        // Test tab scrolling on mobile
        await page.click('[data-tab="blockchain"]');
        await expect(page.locator('[data-testid="token-balance"]')).toBeVisible();
        
        // Test mobile-optimized components
        await page.click('[data-tab="vr"]');
        await expect(page.locator('[data-testid="vr-experience-card"]')).toBeVisible();
    });

    test('error handling and recovery', async () => {
        // Test network error handling
        await page.route('**/api/**', route => route.abort());
        
        await page.click('[data-page="restaurants"]');
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
        
        // Test retry functionality
        await page.unroute('**/api/**');
        await page.click('[data-testid="retry-button"]');
        await page.waitForSelector('[data-testid="restaurant-list"]');
    });

    test('accessibility compliance', async () => {
        // Test keyboard navigation
        await page.keyboard.press('Tab');
        await expect(page.locator(':focus')).toBeVisible();
        
        // Test ARIA labels
        const buttons = await page.locator('button').all();
        for (const button of buttons) {
            const ariaLabel = await button.getAttribute('aria-label');
            const text = await button.textContent();
            expect(ariaLabel || text).toBeTruthy();
        }
        
        // Test color contrast (basic check)
        const elements = await page.locator('[data-testid*="button"]').all();
        for (const element of elements) {
            const styles = await element.evaluate(el => getComputedStyle(el));
            expect(styles.color).toBeTruthy();
            expect(styles.backgroundColor).toBeTruthy();
        }
    });

    test('performance metrics', async () => {
        // Measure page load time
        const startTime = Date.now();
        await page.goto('http://localhost:8081');
        await page.waitForSelector('[data-testid="app"]');
        const loadTime = Date.now() - startTime;
        
        expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
        
        // Test dashboard switching performance
        const dashboardStart = Date.now();
        await page.click('[data-page="dashboard"]');
        await page.waitForSelector('[data-testid="dashboard"]');
        const dashboardTime = Date.now() - dashboardStart;
        
        expect(dashboardTime).toBeLessThan(1000); // Should switch within 1 second
    });
});
