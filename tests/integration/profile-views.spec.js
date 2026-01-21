import { test, expect } from '@playwright/test';

test.describe('Profile Page Views', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to profile
    await page.goto('/');
    await page.getByRole('button', { name: /dev login/i }).click();
    await page.waitForURL(/workout/);
    await page.locator('a[href*="profile"]').click();
    await page.waitForURL(/profile/);
  });

  test('should display profile page with tabs', async ({ page }) => {
    // Should see profile page
    await expect(page.locator('.profile-header')).toBeVisible();

    // Should see tab navigation
    await expect(page.locator('.stats-tab')).toHaveCount(3); // General, Calendar, Trends
  });

  test.describe('General View', () => {
    test('should display general stats by default', async ({ page }) => {
      // General tab should be active by default
      const generalTab = page.locator('.stats-tab[data-tab="general"]');
      await expect(generalTab).toHaveClass(/active/);

      // Should see general stats content
      await expect(page.locator('#stats-content')).toBeVisible();
    });

    test('should show general summary with stats', async ({ page }) => {
      // Should see summary stats - wait for content to load
      await page.waitForTimeout(500);
      const statsContent = page.locator('#stats-content');
      await expect(statsContent).toBeVisible();
    });
  });

  test.describe('Calendar View', () => {
    test.beforeEach(async ({ page }) => {
      // Switch to calendar tab
      await page.locator('.stats-tab[data-tab="calendar"]').click();
    });

    test('should display calendar with current month', async ({ page }) => {
      // Should see calendar
      const calendar = page.locator('.calendar');
      await expect(calendar).toBeVisible();

      // Should show current month in title
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const currentMonth = monthNames[new Date().getMonth()];
      await expect(page.locator('.calendar-title')).toContainText(currentMonth);
    });

    test('should display weekday headers', async ({ page }) => {
      // Should see weekday headers
      const weekdays = page.locator('.calendar-weekday');
      await expect(weekdays).toHaveCount(7);
    });

    test('should navigate to previous month', async ({ page }) => {
      const currentTitle = await page.locator('.calendar-title').textContent();

      // Click previous month button
      await page.locator('#cal-prev').click();

      // Title should change
      const newTitle = await page.locator('.calendar-title').textContent();
      expect(newTitle).not.toBe(currentTitle);
    });

    test('should navigate to next month', async ({ page }) => {
      // Go back first to ensure we can go forward
      await page.locator('#cal-prev').click();
      const previousTitle = await page.locator('.calendar-title').textContent();

      // Click next month button
      await page.locator('#cal-next').click();

      // Title should change
      const newTitle = await page.locator('.calendar-title').textContent();
      expect(newTitle).not.toBe(previousTitle);
    });

    test('should show day detail modal when clicking on a day', async ({ page }) => {
      // Click on a calendar day
      await page.locator('.calendar-day:not(.empty)').first().click();

      // Modal should appear
      const modal = page.locator('.modal-overlay');
      await expect(modal).toBeVisible();

      // Should show day details
      await expect(modal.locator('.modal-header')).toBeVisible();

      // Close modal
      await page.locator('.modal-close').click();
      await expect(modal).not.toBeVisible();
    });

    test('should display calendar summary stats', async ({ page }) => {
      // Should see summary section
      const summary = page.locator('#calendar-summary');
      await expect(summary).toBeVisible();

      // Should show active days, total reps, average
      await expect(summary).toContainText(/active days/i);
      await expect(summary).toContainText(/total reps/i);
      await expect(summary).toContainText(/avg/i);
    });

    test('should show routine filter options', async ({ page }) => {
      // Should see filter section
      const filter = page.locator('.calendar-filter');
      await expect(filter).toBeVisible();

      // Should have "All" option checked by default
      const allRadio = page.locator('input[name="routine-filter"][value="all"]');
      await expect(allRadio).toBeChecked();
    });

    test('should filter calendar by routine', async ({ page }) => {
      // Get summary before filtering
      const summaryBefore = await page.locator('#calendar-summary').textContent();

      // Select a specific routine (if available)
      const routineRadios = page.locator('input[name="routine-filter"]:not([value="all"])');
      const count = await routineRadios.count();

      if (count > 0) {
        await routineRadios.first().click();

        // Wait for calendar to update
        await page.waitForTimeout(300);

        // Calendar should reflect filtered data
        // (can't guarantee specific values, but structure should remain)
        await expect(page.locator('.calendar-day')).toBeVisible();
      }
    });

    test('should show intensity colors on active days', async ({ page }) => {
      // Days with activity should have intensity classes
      const daysWithIntensity = page.locator('.calendar-day[class*="intensity-"]');

      // At least check that intensity classes exist in the HTML
      const calendarDays = page.locator('.calendar-day:not(.empty)');
      const firstDay = calendarDays.first();
      const className = await firstDay.getAttribute('class');

      expect(className).toContain('intensity-');
    });
  });

  test.describe('Trends View', () => {
    test.beforeEach(async ({ page }) => {
      // Switch to trends tab
      await page.locator('.stats-tab[data-tab="trends"]').click();
    });

    test('should display trends chart', async ({ page }) => {
      // Should see chart container
      const chartContainer = page.locator('.chart-container');
      await expect(chartContainer).toBeVisible();

      // Should see chart title
      await expect(page.locator('.chart-title')).toContainText(/trends/i);
    });

    test('should show granularity controls', async ({ page }) => {
      // Should see Day/Week/Month buttons
      await expect(page.locator('.chart-control[data-granularity="day"]')).toBeVisible();
      await expect(page.locator('.chart-control[data-granularity="week"]')).toBeVisible();
      await expect(page.locator('.chart-control[data-granularity="month"]')).toBeVisible();

      // Day should be active by default
      await expect(page.locator('.chart-control[data-granularity="day"]')).toHaveClass(/active/);
    });

    test('should switch granularity to week', async ({ page }) => {
      // Click week button
      await page.locator('.chart-control[data-granularity="week"]').click();

      // Week should now be active
      await expect(page.locator('.chart-control[data-granularity="week"]')).toHaveClass(/active/);
      await expect(page.locator('.chart-control[data-granularity="day"]')).not.toHaveClass(/active/);
    });

    test('should switch granularity to month', async ({ page }) => {
      // Click month button
      await page.locator('.chart-control[data-granularity="month"]').click();

      // Month should now be active
      await expect(page.locator('.chart-control[data-granularity="month"]')).toHaveClass(/active/);
    });

    test('should show routine filter', async ({ page }) => {
      // Should see routine selector
      const routineSelector = page.locator('.chart-routine-selector');
      await expect(routineSelector).toBeVisible();

      // Should have "All" option
      await expect(routineSelector).toContainText(/all/i);
    });

    test('should filter trends by routine', async ({ page }) => {
      // Select a specific routine (if available)
      const routineRadios = page.locator('.chart-routine-selector input[type="radio"]:not([value=""])');
      const count = await routineRadios.count();

      if (count > 0) {
        await routineRadios.first().click();

        // Wait for chart to update
        await page.waitForTimeout(300);

        // Chart should still be visible
        await expect(page.locator('#chart-svg-container')).toBeVisible();
      }
    });

    test('should display chart SVG or empty state', async ({ page }) => {
      // Should see either chart SVG or empty state
      const svgContainer = page.locator('#chart-svg-container');
      await expect(svgContainer).toBeVisible();

      // Contains either SVG or empty state message
      const content = await svgContainer.innerHTML();
      const hasSvg = content.includes('<svg');
      const hasEmptyState = content.includes('empty-state') || content.includes('No data');

      expect(hasSvg || hasEmptyState).toBeTruthy();
    });
  });

  test.describe('Tab Navigation', () => {
    test('should switch between tabs', async ({ page }) => {
      // Click Calendar tab
      await page.locator('.stats-tab[data-tab="calendar"]').click();
      await expect(page.locator('.stats-tab[data-tab="calendar"]')).toHaveClass(/active/);
      await expect(page.locator('.calendar')).toBeVisible();

      // Click Trends tab
      await page.locator('.stats-tab[data-tab="trends"]').click();
      await expect(page.locator('.stats-tab[data-tab="trends"]')).toHaveClass(/active/);
      await expect(page.locator('.chart-container')).toBeVisible();

      // Click General tab
      await page.locator('.stats-tab[data-tab="general"]').click();
      await expect(page.locator('.stats-tab[data-tab="general"]')).toHaveClass(/active/);
      // General view should be visible in stats content
      await expect(page.locator('#stats-content')).toBeVisible();
    });
  });
});
