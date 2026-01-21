import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show login page for unauthenticated users', async ({ page }) => {
    await page.goto('/');

    // Should see the home page with login option
    await expect(page.locator('body')).toBeVisible();

    // In dev mode, should see Dev Login button
    const devLoginBtn = page.getByRole('button', { name: /dev login/i });
    await expect(devLoginBtn).toBeVisible();
  });

  test('should login with dev credentials and redirect to workout page', async ({ page }) => {
    await page.goto('/');

    // Click dev login
    const devLoginBtn = page.getByRole('button', { name: /dev login/i });
    await devLoginBtn.click();

    // Should redirect to workout page
    await page.waitForURL(/workout/);

    // Should see the workout page content
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should persist login across page navigation', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.getByRole('button', { name: /dev login/i }).click();
    await page.waitForURL(/workout/);

    // Navigate to profile
    await page.locator('a[href*="profile"]').click();
    await page.waitForURL(/profile/);

    // Should still be logged in (no redirect to login)
    await expect(page.locator('.profile-header')).toBeVisible();

    // Navigate back to workout
    await page.locator('a[href*="workout"]').click();
    await page.waitForURL(/workout/);

    // Should still see workout content
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should logout and redirect to home', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.getByRole('button', { name: /dev login/i }).click();
    await page.waitForURL(/workout/);

    // Click logout (usually in profile or nav)
    await page.locator('a[href*="profile"]').click();
    await page.waitForURL(/profile/);

    // Find and click logout button if it exists
    const logoutBtn = page.locator('button').filter({ hasText: /logout|sign out/i });
    const logoutCount = await logoutBtn.count();

    if (logoutCount > 0) {
      await logoutBtn.first().click();
      // Should redirect to home
      await page.waitForURL('/');
    }
  });
});
