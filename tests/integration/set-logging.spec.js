import { test, expect } from '@playwright/test';

test.describe('Set Logging Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByRole('button', { name: /dev login/i }).click();
    await page.waitForURL(/workout/);
  });

  test('should open FAB and show routine tree', async ({ page }) => {
    // Click FAB button
    await page.locator('.fab').click();

    // Should see FAB panel with routines
    const fabPanel = page.locator('.fab-panel');
    await expect(fabPanel).toBeVisible();

    // Should see routine headers
    await expect(page.locator('.fab-routine').first()).toBeVisible();
  });

  test('should log set using quick add buttons via FAB', async ({ page }) => {
    // Click FAB
    await page.locator('.fab').click();

    // Expand first routine
    await page.locator('.fab-routine-header').first().click();

    // Click on an exercise
    await page.locator('.fab-exercise').first().click();

    // Should see quick add panel
    const quickAdd = page.locator('.quick-add');
    await expect(quickAdd).toBeVisible();

    // Should see quick add buttons
    await expect(page.locator('.quick-add-btn').first()).toBeVisible();

    // Click +10 button
    await page.locator('.quick-add-btn[data-reps="10"]').click();

    // Should see success toast
    await expect(page.locator('.toast')).toContainText(/logged.*10.*reps/i);

    // FAB panel should close
    await expect(page.locator('.fab-panel')).not.toBeVisible();
  });

  test('should log set using custom reps input', async ({ page }) => {
    // Click FAB
    await page.locator('.fab').click();

    // Expand first routine and click exercise
    await page.locator('.fab-routine-header').first().click();
    await page.locator('.fab-exercise').first().click();

    // Enter custom reps
    const customInput = page.locator('.quick-add-input');
    await customInput.fill('25');

    // Click add button
    await page.locator('.quick-add-submit').click();

    // Should see success toast
    await expect(page.locator('.toast')).toContainText(/logged.*25.*reps/i);
  });

  test('should log set with custom date/time', async ({ page }) => {
    // Click FAB
    await page.locator('.fab').click();

    // Navigate to exercise
    await page.locator('.fab-routine-header').first().click();
    await page.locator('.fab-exercise').first().click();

    // Should see datetime input
    const datetimeInput = page.locator('.quick-add-datetime-input');
    await expect(datetimeInput).toBeVisible();

    // Set to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
    await datetimeInput.fill(dateStr);

    // Log the set
    await page.locator('.quick-add-btn[data-reps="10"]').click();

    // Should succeed
    await expect(page.locator('.toast')).toContainText(/logged/i);
  });

  test('should log set by clicking exercise on workout page', async ({ page }) => {
    // Expand a routine
    await page.locator('.routine-header').first().click();

    // Click on exercise info (not the delete button)
    const exerciseInfo = page.locator('.exercise-info').first();
    await exerciseInfo.click();

    // Should see quick add panel
    await expect(page.locator('.quick-add')).toBeVisible();

    // Log a set
    await page.locator('.quick-add-btn[data-reps="5"]').click();

    // Should see success toast
    await expect(page.locator('.toast')).toContainText(/logged.*5.*reps/i);
  });

  test('should show last logged reps for exercise', async ({ page }) => {
    // Log a set first
    await page.locator('.fab').click();
    await page.locator('.fab-routine-header').first().click();
    await page.locator('.fab-exercise').first().click();
    await page.locator('.quick-add-btn[data-reps="15"]').click();

    // Wait for toast to disappear
    await page.waitForTimeout(1500);

    // Open FAB again for same exercise
    await page.locator('.fab').click();
    await page.locator('.fab-routine-header').first().click();
    await page.locator('.fab-exercise').first().click();

    // Should see "Last: 15 reps" text
    await expect(page.locator('.quick-add-last')).toContainText(/last.*15/i);

    // Should have quick button to repeat last reps (the =15 button)
    await expect(page.getByRole('button', { name: '=15' })).toBeVisible();
  });

  test('should close FAB when clicking backdrop', async ({ page }) => {
    // Open FAB
    await page.locator('.fab').click();
    await expect(page.locator('.fab-panel')).toBeVisible();

    // Click backdrop
    await page.locator('.fab-backdrop').click();

    // Panel should close
    await expect(page.locator('.fab-panel')).not.toBeVisible();
  });

  test('should handle zero reps', async ({ page }) => {
    // Click FAB and navigate to exercise
    await page.locator('.fab').click();
    await page.locator('.fab-routine-header').first().click();
    await page.locator('.fab-exercise').first().click();

    // Enter 0 reps
    await page.locator('.quick-add-input').fill('0');
    await page.locator('.quick-add-submit').click();

    // Should succeed (0 is valid)
    await expect(page.locator('.toast')).toContainText(/logged.*0.*reps/i);
  });

  test('should prevent future date selection', async ({ page }) => {
    // Click FAB and navigate to exercise
    await page.locator('.fab').click();
    await page.locator('.fab-routine-header').first().click();
    await page.locator('.fab-exercise').first().click();

    // Check datetime input has max attribute set to current time
    const datetimeInput = page.locator('.quick-add-datetime-input');
    const maxValue = await datetimeInput.getAttribute('max');

    expect(maxValue).toBeTruthy();

    // Max should be close to current time (within a minute)
    const maxDate = new Date(maxValue);
    const now = new Date();
    const diffMinutes = Math.abs(now.getTime() - maxDate.getTime()) / (1000 * 60);

    expect(diffMinutes).toBeLessThan(2);
  });
});
