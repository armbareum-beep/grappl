import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login form validation', async ({ page }) => {
    await page.goto('/login');

    // Find submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("로그인"), button:has-text("Login")').first();

    // Click submit without filling form
    await submitButton.click();

    // Should show validation error or remain on login page
    await expect(page).toHaveURL(/login/);
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login');

    // Fill with invalid credentials
    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit
    await page.click('button[type="submit"], button:has-text("로그인"), button:has-text("Login")');

    // Wait for error message or stay on login page
    await page.waitForTimeout(2000);

    // Should still be on login page or show error
    const url = page.url();
    const hasError = await page.locator('[class*="error"], [role="alert"], .text-red').count();

    expect(url.includes('login') || hasError > 0).toBeTruthy();
  });

  // Skip this test if no test credentials are provided
  test.skip(({ }, testInfo) => !process.env.TEST_USER_EMAIL, 'Skipping: No test credentials');

  test('valid login works', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD!;

    await page.goto('/login');

    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"], button:has-text("로그인"), button:has-text("Login")');

    // Should redirect away from login page
    await expect(page).not.toHaveURL(/login/, { timeout: 10000 });
  });
});

test.describe('Registration', () => {
  test('signup page accessible', async ({ page }) => {
    await page.goto('/signup');

    // Should have signup form
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});
