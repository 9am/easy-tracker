import { test, expect } from '@playwright/test';

test.describe('Routine Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByRole('button', { name: /dev login/i }).click();
    await page.waitForURL(/workout/);
  });

  test('should display existing routines', async ({ page }) => {
    // Should see routines container
    const routinesContainer = page.locator('#routines-container');
    await expect(routinesContainer).toBeVisible();

    // Should see at least one routine card (from seed data)
    const routineCards = page.locator('.routine-card');
    await expect(routineCards.first()).toBeVisible();
  });

  test.skip('should create a new routine', async ({ page }) => {
    const uniqueName = `Test Routine ${Date.now()}`;

    // Click add routine button
    await page.locator('#add-routine-btn').click();

    // Modal should appear
    const modal = page.locator('#routine-modal');
    await expect(modal).not.toHaveClass(/hidden/);

    // Fill in routine name
    await page.locator('#routine-name').fill(uniqueName);

    // Submit the form
    await page.locator('#routine-form button[type="submit"]').click();

    // Modal should close
    await expect(modal).toHaveClass(/hidden/);

    // New routine should appear in the list
    await expect(page.locator('.routine-card')).toContainText(uniqueName);
  });

  test('should expand routine to show exercises', async ({ page }) => {
    // Click on the first routine header to expand
    const routineHeader = page.locator('.routine-header').first();
    await routineHeader.click();

    // Routine should be expanded
    const routineCard = page.locator('.routine-card').first();
    await expect(routineCard).toHaveClass(/expanded/);

    // Should see the exercises list or empty state
    const routineBody = routineCard.locator('.routine-body');
    await expect(routineBody).toBeVisible();
  });

  test.skip('should add predefined exercise to routine', async ({ page }) => {
    // Expand first routine
    await page.locator('.routine-header').first().click();
    await page.waitForTimeout(200);

    // Click add exercise button
    await page.locator('.add-exercise-btn').first().click();

    // Exercise modal should appear
    const modal = page.locator('#exercise-modal');
    await expect(modal).not.toHaveClass(/hidden/);

    // Should see predefined exercises tab (should be active by default)
    const muscleGroups = page.locator('#muscle-groups-list');
    await expect(muscleGroups).toBeVisible();

    // Expand a muscle group and click on an exercise
    const muscleGroupHeader = muscleGroups.locator('[data-expand]').first();
    await muscleGroupHeader.click();
    await page.waitForTimeout(200);

    // Click on a predefined exercise
    const predefinedExercise = muscleGroups.locator('.predefined-exercise').first();
    const exerciseName = await predefinedExercise.locator('.exercise-name').textContent();
    await predefinedExercise.click();

    // Modal should close
    await expect(modal).toHaveClass(/hidden/);

    // Exercise should appear in the routine
    const routineCard = page.locator('.routine-card.expanded').first();
    await expect(routineCard.locator('.exercise-item')).toContainText(exerciseName);
  });

  test.skip('should add custom exercise to routine', async ({ page }) => {
    const customExerciseName = `Custom Exercise ${Date.now()}`;

    // Expand first routine
    await page.locator('.routine-header').first().click();

    // Click add exercise button
    await page.locator('.add-exercise-btn').first().click();

    // Switch to custom tab
    await page.locator('.stats-tab[data-tab="custom"]').click();

    // Fill in custom exercise name
    await page.locator('#custom-exercise-name').fill(customExerciseName);

    // Submit
    await page.locator('#custom-exercise-form button[type="submit"]').click();

    // Modal should close
    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // Custom exercise should appear in the routine
    const routineCard = page.locator('.routine-card.expanded').first();
    await expect(routineCard.locator('.exercise-item')).toContainText(customExerciseName);
  });

  test.skip('should edit routine name', async ({ page }) => {
    const newName = `Edited Routine ${Date.now()}`;

    // Expand first routine
    await page.locator('.routine-header').first().click();

    // Click edit button
    await page.locator('.edit-routine-btn').first().click();

    // Modal should appear with current name
    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible();

    // Clear and enter new name
    await page.locator('#routine-name').clear();
    await page.locator('#routine-name').fill(newName);

    // Save
    await page.getByRole('button', { name: /save|update/i }).click();

    // Modal should close and name should be updated
    await expect(modal).not.toBeVisible();
    await expect(page.locator('.routine-card').first()).toContainText(newName);
  });

  test.skip('should delete exercise from routine', async ({ page }) => {
    // Expand first routine
    await page.locator('.routine-header').first().click();

    // Get exercise count before deletion
    const exercisesBefore = await page.locator('.routine-card.expanded .exercise-item').count();

    if (exercisesBefore > 0) {
      // Click delete on first exercise
      page.on('dialog', dialog => dialog.accept()); // Accept confirmation
      await page.locator('.delete-exercise').first().click();

      // Wait for deletion
      await page.waitForTimeout(500);

      // Exercise count should decrease
      const exercisesAfter = await page.locator('.routine-card.expanded .exercise-item').count();
      expect(exercisesAfter).toBeLessThan(exercisesBefore);
    }
  });

  test('should not allow duplicate routine names', async ({ page }) => {
    // Get existing routine name
    const existingName = await page.locator('.routine-name').first().textContent();

    // Try to create routine with same name
    await page.getByRole('button', { name: /add routine|\+ routine/i }).click();
    await page.locator('#routine-name').fill(existingName);
    await page.getByRole('button', { name: /save|create|add/i }).click();

    // Should show error (toast or inline)
    const errorMessage = page.locator('.toast, .error-message');
    await expect(errorMessage).toContainText(/already exists/i);
  });
});
