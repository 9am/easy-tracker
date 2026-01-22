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

  test('should create a new routine', async ({ page }) => {
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
    await expect(page.locator('#routines-container')).toContainText(uniqueName);
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

  test('should add predefined exercise to routine', async ({ page }) => {
    // Create a fresh routine for this test to avoid conflicts with previous exercises
    const routineName = `Test Routine ${Date.now()}`;
    await page.locator('#add-routine-btn').click();
    await page.locator('#routine-name').fill(routineName);
    await page.locator('#routine-form button[type="submit"]').click();
    await expect(page.locator('#routine-modal')).toHaveClass(/hidden/);

    // Find and expand the new routine
    const newRoutine = page.locator('#routines-container .routine-card').filter({ hasText: routineName });
    await newRoutine.locator('.routine-header').click();
    await expect(newRoutine).toHaveClass(/expanded/);

    // Click add exercise button
    await newRoutine.locator('.add-exercise-btn').click();

    // Exercise modal should appear
    const modal = page.locator('#exercise-modal');
    await expect(modal).not.toHaveClass(/hidden/);

    // Should see predefined exercises tab (should be active by default)
    const muscleGroups = page.locator('#muscle-groups-list');
    await expect(muscleGroups).toBeVisible();

    // Expand Shoulders muscle group
    const shouldersGroup = muscleGroups.locator('.routine-card').filter({ hasText: 'Shoulders' });
    await shouldersGroup.locator('[data-expand]').click();
    await expect(shouldersGroup).toHaveClass(/expanded/, { timeout: 5000 });

    // Wait for the routine-body to be visible within expanded group
    const exerciseList = shouldersGroup.locator('.routine-body');
    await expect(exerciseList).toBeVisible();

    // Click on Front Raise
    const frontRaiseExercise = exerciseList.locator('.predefined-exercise', { hasText: 'Front Raise' });
    await expect(frontRaiseExercise).toBeVisible();
    const exerciseName = 'Front Raise';
    await frontRaiseExercise.click();

    // Wait for modal to close (has hidden class)
    await expect(modal).toHaveClass(/hidden/, { timeout: 10000 });

    // Exercise should appear in the routine
    await expect(newRoutine).toContainText(exerciseName);
  });

  test('should add custom exercise to routine', async ({ page }) => {
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

    // Modal should close (has hidden class)
    await expect(page.locator('#exercise-modal')).toHaveClass(/hidden/, { timeout: 10000 });

    // Custom exercise should appear in the routine
    const routineCard = page.locator('.routine-card.expanded').first();
    await expect(routineCard).toContainText(customExerciseName);
  });

  test('should edit routine name', async ({ page }) => {
    const newName = `Edited Routine ${Date.now()}`;

    // Expand first routine
    await page.locator('.routine-header').first().click();

    // Click edit button
    await page.locator('.edit-routine-btn').first().click();

    // Modal should appear with current name
    const modal = page.locator('#routine-modal');
    await expect(modal).not.toHaveClass(/hidden/);

    // Clear and enter new name
    await page.locator('#routine-name').clear();
    await page.locator('#routine-name').fill(newName);

    // Save
    await page.getByRole('button', { name: /save|update/i }).click();

    // Modal should close (has hidden class)
    await expect(modal).toHaveClass(/hidden/, { timeout: 10000 });

    // Name should be updated
    await expect(page.locator('.routine-card').first()).toContainText(newName);
  });

  test('should delete exercise from routine', async ({ page }) => {
    // Expand first routine
    await page.locator('.routine-header').first().click();

    // Get exercise count before deletion
    const exercisesBefore = await page.locator('.routine-card.expanded .exercise-item').count();

    if (exercisesBefore > 0) {
      // Click delete on first exercise
      await page.locator('.delete-exercise').first().click();

      // Confirm deletion in custom confirm dialog
      await page.locator('.confirm-overlay [data-action="confirm"]').click();

      // Wait for the exercise to be removed from DOM
      await expect(page.locator('.routine-card.expanded .exercise-item')).toHaveCount(exercisesBefore - 1, { timeout: 10000 });
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
