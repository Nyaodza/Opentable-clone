import { test, expect, Page } from '@playwright/test';

/**
 * Payment Flow E2E Tests
 * Tests the complete payment flow including deposits, refunds, and error handling
 */

test.describe('Payment Flow', () => {
  // Test user credentials
  const testUser = {
    email: 'test-payment@example.com',
    password: 'TestPassword123!',
  };

  // Helper function to login
  async function loginUser(page: Page) {
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"], [name="email"]', testUser.email);
    await page.fill('[data-testid="password-input"], [name="password"]', testUser.password);
    await page.click('[data-testid="login-button"], button:has-text("Sign In"), button:has-text("Log in")');
    await page.waitForURL(/\/(dashboard|$)/);
  }

  // Helper function to fill Stripe card details
  async function fillStripeCard(page: Page, cardNumber: string = '4242424242424242') {
    // Wait for Stripe iframe to load
    const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"], iframe[title*="Stripe"]').first();
    
    // Fill card details - handle different Stripe element configurations
    try {
      // Try combined card element first
      const cardInput = stripeFrame.locator('[name="cardnumber"], [placeholder*="Card number"]');
      if (await cardInput.isVisible({ timeout: 3000 })) {
        await cardInput.fill(cardNumber);
        await stripeFrame.locator('[name="exp-date"], [placeholder*="MM"]').fill('12/28');
        await stripeFrame.locator('[name="cvc"], [placeholder*="CVC"]').fill('123');
        const zipField = stripeFrame.locator('[name="postal"], [placeholder*="ZIP"]');
        if (await zipField.isVisible({ timeout: 1000 })) {
          await zipField.fill('12345');
        }
      }
    } catch {
      // Fallback: Try separate card elements
      await stripeFrame.locator('input').first().fill(cardNumber);
    }
  }

  // Helper to navigate to restaurant and start reservation
  async function startReservation(page: Page, restaurantId: string = '1') {
    await page.goto(`/restaurants/${restaurantId}`);
    await page.waitForLoadState('networkidle');
    
    // Select date (tomorrow)
    const datePicker = page.locator('[data-testid="date-picker"], [aria-label*="date"]').first();
    if (await datePicker.isVisible({ timeout: 3000 })) {
      await datePicker.click();
      await page.locator('[data-testid="date-tomorrow"], [aria-label*="tomorrow"], button:has-text("Tomorrow")').first().click();
    }
    
    // Select time
    const timeSelect = page.locator('[data-testid="time-select"], select[name*="time"]').first();
    if (await timeSelect.isVisible({ timeout: 2000 })) {
      await timeSelect.selectOption({ index: 2 }); // Select third option (usually 7:00 PM)
    }
    
    // Select party size
    const partySizeSelect = page.locator('[data-testid="party-size"], select[name*="party"], select[name*="guests"]').first();
    if (await partySizeSelect.isVisible({ timeout: 2000 })) {
      await partySizeSelect.selectOption('4');
    }
    
    // Click find table
    await page.click('[data-testid="find-table-btn"], button:has-text("Find a Table"), button:has-text("Search")');
  }

  test.beforeEach(async ({ page }) => {
    // Set up test data via API if needed
    await page.goto('/');
  });

  test('should complete full payment flow with valid card', async ({ page }) => {
    await loginUser(page);
    await startReservation(page);
    
    // Wait for time slots and select one
    await page.waitForSelector('[data-testid="time-slot"], [data-testid="available-time"]', { timeout: 10000 });
    await page.click('[data-testid="time-slot"]:first-child, [data-testid="available-time"]:first-child');
    
    // Fill reservation form
    await page.fill('[name="firstName"], [data-testid="first-name"]', 'John');
    await page.fill('[name="lastName"], [data-testid="last-name"]', 'Doe');
    await page.fill('[name="email"], [data-testid="email"]', 'john.doe@example.com');
    await page.fill('[name="phone"], [data-testid="phone"]', '+1234567890');
    
    // Add special request
    const specialRequestField = page.locator('[name="specialRequests"], [data-testid="special-requests"]');
    if (await specialRequestField.isVisible({ timeout: 2000 })) {
      await specialRequestField.fill('Window seat please, celebrating anniversary');
    }
    
    // Check if payment is required (some restaurants require deposits)
    const paymentSection = page.locator('[data-testid="payment-section"], .payment-form, #payment-element');
    if (await paymentSection.isVisible({ timeout: 3000 })) {
      await fillStripeCard(page, '4242424242424242');
    }
    
    // Complete reservation
    await page.click('[data-testid="complete-reservation"], button:has-text("Complete Reservation"), button:has-text("Confirm")');
    
    // Wait for confirmation
    await page.waitForURL(/\/(reservations\/confirmation|confirmation|success)/, { timeout: 15000 });
    
    // Verify confirmation elements
    await expect(page.locator('[data-testid="confirmation-number"], .confirmation-code, h1:has-text("Confirmed")')).toBeVisible();
  });

  test('should handle declined card gracefully', async ({ page }) => {
    await loginUser(page);
    await startReservation(page);
    
    await page.waitForSelector('[data-testid="time-slot"], [data-testid="available-time"]', { timeout: 10000 });
    await page.click('[data-testid="time-slot"]:first-child, [data-testid="available-time"]:first-child');
    
    // Fill form
    await page.fill('[name="firstName"], [data-testid="first-name"]', 'John');
    await page.fill('[name="lastName"], [data-testid="last-name"]', 'Doe');
    await page.fill('[name="email"], [data-testid="email"]', 'john.doe@example.com');
    await page.fill('[name="phone"], [data-testid="phone"]', '+1234567890');
    
    // Fill with declined card number
    const paymentSection = page.locator('[data-testid="payment-section"], .payment-form, #payment-element');
    if (await paymentSection.isVisible({ timeout: 3000 })) {
      await fillStripeCard(page, '4000000000000002'); // Stripe test card that always declines
    }
    
    await page.click('[data-testid="complete-reservation"], button:has-text("Complete Reservation"), button:has-text("Confirm")');
    
    // Verify error message
    await expect(
      page.locator('[data-testid="payment-error"], .error-message, [role="alert"]:has-text("declined")')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should handle 3D Secure authentication', async ({ page }) => {
    await loginUser(page);
    await startReservation(page);
    
    await page.waitForSelector('[data-testid="time-slot"], [data-testid="available-time"]', { timeout: 10000 });
    await page.click('[data-testid="time-slot"]:first-child, [data-testid="available-time"]:first-child');
    
    await page.fill('[name="firstName"], [data-testid="first-name"]', 'John');
    await page.fill('[name="lastName"], [data-testid="last-name"]', 'Doe');
    await page.fill('[name="email"], [data-testid="email"]', 'john.doe@example.com');
    await page.fill('[name="phone"], [data-testid="phone"]', '+1234567890');
    
    // Use 3D Secure test card
    const paymentSection = page.locator('[data-testid="payment-section"], .payment-form, #payment-element');
    if (await paymentSection.isVisible({ timeout: 3000 })) {
      await fillStripeCard(page, '4000000000003220'); // Requires 3DS
    }
    
    await page.click('[data-testid="complete-reservation"], button:has-text("Complete Reservation"), button:has-text("Confirm")');
    
    // Handle 3DS modal - wait for Stripe's 3DS test frame
    const threeDSFrame = page.frameLocator('iframe[name*="stripe"], iframe[src*="stripe"]').last();
    try {
      await threeDSFrame.locator('button:has-text("Complete"), button:has-text("Authorize"), #test-source-authorize-3ds').click({ timeout: 10000 });
    } catch {
      // 3DS might auto-complete in test mode
    }
    
    // Should eventually succeed after 3DS
    await page.waitForURL(/\/(reservations\/confirmation|confirmation|success)/, { timeout: 20000 });
  });

  test('should handle insufficient funds error', async ({ page }) => {
    await loginUser(page);
    await startReservation(page);
    
    await page.waitForSelector('[data-testid="time-slot"], [data-testid="available-time"]', { timeout: 10000 });
    await page.click('[data-testid="time-slot"]:first-child, [data-testid="available-time"]:first-child');
    
    await page.fill('[name="firstName"], [data-testid="first-name"]', 'John');
    await page.fill('[name="lastName"], [data-testid="last-name"]', 'Doe');
    await page.fill('[name="email"], [data-testid="email"]', 'john.doe@example.com');
    await page.fill('[name="phone"], [data-testid="phone"]', '+1234567890');
    
    // Use insufficient funds test card
    const paymentSection = page.locator('[data-testid="payment-section"], .payment-form, #payment-element');
    if (await paymentSection.isVisible({ timeout: 3000 })) {
      await fillStripeCard(page, '4000000000009995');
    }
    
    await page.click('[data-testid="complete-reservation"], button:has-text("Complete Reservation"), button:has-text("Confirm")');
    
    await expect(
      page.locator('[data-testid="payment-error"], .error-message, [role="alert"]')
    ).toContainText(/insufficient|funds|declined/i, { timeout: 10000 });
  });

  test('should save and reuse payment method', async ({ page }) => {
    await loginUser(page);
    await startReservation(page);
    
    await page.waitForSelector('[data-testid="time-slot"], [data-testid="available-time"]', { timeout: 10000 });
    await page.click('[data-testid="time-slot"]:first-child, [data-testid="available-time"]:first-child');
    
    await page.fill('[name="firstName"], [data-testid="first-name"]', 'John');
    await page.fill('[name="lastName"], [data-testid="last-name"]', 'Doe');
    await page.fill('[name="email"], [data-testid="email"]', 'john.doe@example.com');
    await page.fill('[name="phone"], [data-testid="phone"]', '+1234567890');
    
    // Fill card and check save option
    const paymentSection = page.locator('[data-testid="payment-section"], .payment-form, #payment-element');
    if (await paymentSection.isVisible({ timeout: 3000 })) {
      await fillStripeCard(page);
      
      const saveCardCheckbox = page.locator('[data-testid="save-card"], input[name*="save"], label:has-text("Save")');
      if (await saveCardCheckbox.isVisible({ timeout: 2000 })) {
        await saveCardCheckbox.check();
      }
    }
    
    await page.click('[data-testid="complete-reservation"], button:has-text("Complete Reservation"), button:has-text("Confirm")');
    await page.waitForURL(/\/(reservations\/confirmation|confirmation|success)/, { timeout: 15000 });
    
    // Make another reservation to verify saved card appears
    await startReservation(page, '2');
    await page.waitForSelector('[data-testid="time-slot"], [data-testid="available-time"]', { timeout: 10000 });
    await page.click('[data-testid="time-slot"]:first-child, [data-testid="available-time"]:first-child');
    
    // Check if saved card option appears
    const savedCardOption = page.locator('[data-testid="saved-card"], .saved-payment-method, [data-testid="payment-method-card"]');
    if (await savedCardOption.isVisible({ timeout: 5000 })) {
      await expect(savedCardOption).toContainText(/4242|ending in/i);
    }
  });

  test('should process refund for cancelled reservation', async ({ page }) => {
    // First create a reservation with payment
    await loginUser(page);
    await startReservation(page);
    
    await page.waitForSelector('[data-testid="time-slot"], [data-testid="available-time"]', { timeout: 10000 });
    await page.click('[data-testid="time-slot"]:first-child, [data-testid="available-time"]:first-child');
    
    await page.fill('[name="firstName"], [data-testid="first-name"]', 'John');
    await page.fill('[name="lastName"], [data-testid="last-name"]', 'Doe');
    await page.fill('[name="email"], [data-testid="email"]', 'john.doe@example.com');
    await page.fill('[name="phone"], [data-testid="phone"]', '+1234567890');
    
    const paymentSection = page.locator('[data-testid="payment-section"], .payment-form, #payment-element');
    if (await paymentSection.isVisible({ timeout: 3000 })) {
      await fillStripeCard(page);
    }
    
    await page.click('[data-testid="complete-reservation"], button:has-text("Complete Reservation"), button:has-text("Confirm")');
    await page.waitForURL(/\/(reservations\/confirmation|confirmation|success)/, { timeout: 15000 });
    
    // Get confirmation number and navigate to manage reservation
    const confirmationNumber = await page.locator('[data-testid="confirmation-number"], .confirmation-code').textContent();
    
    // Go to reservations page
    await page.goto('/reservations');
    await page.waitForLoadState('networkidle');
    
    // Find and cancel the reservation
    const reservationCard = page.locator(`[data-testid="reservation-card"]:has-text("${confirmationNumber}"), .reservation-item`).first();
    await reservationCard.locator('[data-testid="cancel-reservation"], button:has-text("Cancel")').click();
    
    // Confirm cancellation
    await page.click('[data-testid="confirm-cancel"], button:has-text("Yes"), button:has-text("Confirm")');
    
    // Verify refund message
    await expect(
      page.locator('[data-testid="refund-message"], .success-message, [role="alert"]:has-text("refund")')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await loginUser(page);
    await startReservation(page);
    
    await page.waitForSelector('[data-testid="time-slot"], [data-testid="available-time"]', { timeout: 10000 });
    await page.click('[data-testid="time-slot"]:first-child, [data-testid="available-time"]:first-child');
    
    await page.fill('[name="firstName"], [data-testid="first-name"]', 'John');
    await page.fill('[name="lastName"], [data-testid="last-name"]', 'Doe');
    await page.fill('[name="email"], [data-testid="email"]', 'john.doe@example.com');
    await page.fill('[name="phone"], [data-testid="phone"]', '+1234567890');
    
    const paymentSection = page.locator('[data-testid="payment-section"], .payment-form, #payment-element');
    if (await paymentSection.isVisible({ timeout: 3000 })) {
      await fillStripeCard(page);
    }
    
    // Simulate network failure
    await page.route('**/api/payments/**', route => route.abort());
    await page.route('**/api/reservations/**', route => route.abort());
    
    await page.click('[data-testid="complete-reservation"], button:has-text("Complete Reservation"), button:has-text("Confirm")');
    
    // Should show network error
    await expect(
      page.locator('[data-testid="network-error"], .error-message, [role="alert"]')
    ).toBeVisible({ timeout: 10000 });
    
    // Should show retry option
    const retryButton = page.locator('[data-testid="retry-payment"], button:has-text("Retry"), button:has-text("Try again")');
    await expect(retryButton).toBeVisible();
  });

  test('should validate card expiry date', async ({ page }) => {
    await loginUser(page);
    await startReservation(page);
    
    await page.waitForSelector('[data-testid="time-slot"], [data-testid="available-time"]', { timeout: 10000 });
    await page.click('[data-testid="time-slot"]:first-child, [data-testid="available-time"]:first-child');
    
    await page.fill('[name="firstName"], [data-testid="first-name"]', 'John');
    await page.fill('[name="lastName"], [data-testid="last-name"]', 'Doe');
    await page.fill('[name="email"], [data-testid="email"]', 'john.doe@example.com');
    await page.fill('[name="phone"], [data-testid="phone"]', '+1234567890');
    
    // Use expired card test number
    const paymentSection = page.locator('[data-testid="payment-section"], .payment-form, #payment-element');
    if (await paymentSection.isVisible({ timeout: 3000 })) {
      await fillStripeCard(page, '4000000000000069'); // Expired card
    }
    
    await page.click('[data-testid="complete-reservation"], button:has-text("Complete Reservation"), button:has-text("Confirm")');
    
    await expect(
      page.locator('[data-testid="payment-error"], .error-message, [role="alert"]')
    ).toContainText(/expired|expir/i, { timeout: 10000 });
  });

  test('should display payment breakdown correctly', async ({ page }) => {
    await loginUser(page);
    await startReservation(page);
    
    await page.waitForSelector('[data-testid="time-slot"], [data-testid="available-time"]', { timeout: 10000 });
    await page.click('[data-testid="time-slot"]:first-child, [data-testid="available-time"]:first-child');
    
    // Check payment breakdown
    const paymentBreakdown = page.locator('[data-testid="payment-breakdown"], .price-breakdown, .order-summary');
    if (await paymentBreakdown.isVisible({ timeout: 5000 })) {
      // Verify subtotal
      await expect(paymentBreakdown.locator('[data-testid="subtotal"], .subtotal')).toBeVisible();
      
      // Verify tax if applicable
      const taxLine = paymentBreakdown.locator('[data-testid="tax"], .tax-amount');
      if (await taxLine.isVisible({ timeout: 1000 })) {
        await expect(taxLine).toContainText(/\$/);
      }
      
      // Verify total
      await expect(paymentBreakdown.locator('[data-testid="total"], .total-amount')).toBeVisible();
    }
  });

  test('should apply promo code correctly', async ({ page }) => {
    await loginUser(page);
    await startReservation(page);
    
    await page.waitForSelector('[data-testid="time-slot"], [data-testid="available-time"]', { timeout: 10000 });
    await page.click('[data-testid="time-slot"]:first-child, [data-testid="available-time"]:first-child');
    
    // Look for promo code field
    const promoInput = page.locator('[data-testid="promo-code-input"], input[name*="promo"], input[placeholder*="code"]');
    if (await promoInput.isVisible({ timeout: 3000 })) {
      await promoInput.fill('TESTDISCOUNT10');
      await page.click('[data-testid="apply-promo"], button:has-text("Apply")');
      
      // Verify discount applied
      await expect(
        page.locator('[data-testid="discount-applied"], .discount-line, .promo-success')
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Gift Card Payment', () => {
  test('should pay with gift card', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'test-payment@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button:has-text("Sign In"), button:has-text("Log in")');
    await page.waitForURL(/\/(dashboard|$)/);
    
    await page.goto('/restaurants/1');
    await page.waitForLoadState('networkidle');
    
    const datePicker = page.locator('[data-testid="date-picker"]').first();
    if (await datePicker.isVisible({ timeout: 3000 })) {
      await datePicker.click();
      await page.click('[data-testid="date-tomorrow"]');
    }
    
    await page.click('[data-testid="find-table-btn"], button:has-text("Find a Table")');
    await page.waitForSelector('[data-testid="time-slot"]', { timeout: 10000 });
    await page.click('[data-testid="time-slot"]:first-child');
    
    await page.fill('[name="firstName"]', 'John');
    await page.fill('[name="lastName"]', 'Doe');
    await page.fill('[name="email"]', 'john.doe@example.com');
    await page.fill('[name="phone"]', '+1234567890');
    
    // Select gift card payment
    const giftCardOption = page.locator('[data-testid="gift-card-payment"], button:has-text("Gift Card"), label:has-text("Gift Card")');
    if (await giftCardOption.isVisible({ timeout: 3000 })) {
      await giftCardOption.click();
      
      await page.fill('[data-testid="gift-card-number"], input[name*="giftcard"]', 'GC1234567890');
      await page.fill('[data-testid="gift-card-pin"], input[name*="pin"]', '1234');
      
      await page.click('[data-testid="apply-gift-card"], button:has-text("Apply")');
      
      await expect(
        page.locator('[data-testid="gift-card-applied"], .gift-card-balance')
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Split Payment', () => {
  test('should split payment between multiple cards', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'test-payment@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/\/(dashboard|$)/);
    
    await page.goto('/restaurants/1');
    await page.waitForLoadState('networkidle');
    
    // Start reservation for large party (more likely to have high deposit)
    const partySizeSelect = page.locator('[data-testid="party-size"]');
    if (await partySizeSelect.isVisible({ timeout: 2000 })) {
      await partySizeSelect.selectOption('8');
    }
    
    await page.click('[data-testid="find-table-btn"], button:has-text("Find a Table")');
    await page.waitForSelector('[data-testid="time-slot"]', { timeout: 10000 });
    await page.click('[data-testid="time-slot"]:first-child');
    
    await page.fill('[name="firstName"]', 'John');
    await page.fill('[name="lastName"]', 'Doe');
    await page.fill('[name="email"]', 'john.doe@example.com');
    await page.fill('[name="phone"]', '+1234567890');
    
    // Check for split payment option
    const splitPaymentOption = page.locator('[data-testid="split-payment"], button:has-text("Split"), label:has-text("Split")');
    if (await splitPaymentOption.isVisible({ timeout: 3000 })) {
      await splitPaymentOption.click();
      
      // Add second payment method
      await page.click('[data-testid="add-payment-method"], button:has-text("Add")');
      
      // Fill amounts
      await page.fill('[data-testid="split-amount-1"]', '50.00');
      await page.fill('[data-testid="split-amount-2"]', '50.00');
      
      await expect(page.locator('[data-testid="payment-method-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-method-2"]')).toBeVisible();
    }
  });
});

