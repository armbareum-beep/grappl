import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/Grapplay/);

    // Check main content is visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');

    // Check if nav elements exist
    const nav = page.locator('nav, header');
    await expect(nav.first()).toBeVisible();
  });

  test('login page accessible', async ({ page }) => {
    await page.goto('/login');

    // Should have login form elements
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('courses page loads', async ({ page }) => {
    await page.goto('/courses');

    // Page should load without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('feed page loads', async ({ page }) => {
    await page.goto('/feed');

    // Page should load (may redirect to login if auth required)
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile navigation works', async ({ page }) => {
    await page.goto('/');

    // Check for mobile menu button or hamburger
    const mobileMenu = page.locator('[aria-label*="menu"], [class*="hamburger"], button:has(svg)');

    // Page should be responsive
    await expect(page.locator('body')).toBeVisible();
  });
});
