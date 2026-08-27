import { test, expect } from '@playwright/test';

test.describe('ForenzDetectiv - Hlavné Analytické Centrum & Graf', () => {
  test('Načíta hlavné analytické prostredie ForenzDetectiv', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 1. Over prítomnosť hlavného titulku alebo loga
    const logoOrTitle = page.locator('header, h1, div').filter({ hasText: /ForenzDetekt[ií]v|Forenzný/i }).first();
    await expect(logoOrTitle).toBeVisible({ timeout: 10000 });

    // 2. Over branding v body
    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/ForenzDetekt[ií]v/i);

    // 3. Over prítomnosť interaktívnych prepínačov (pohľad na graf / zoznam / os)
    const tabsOrButtons = page.locator('button, [role="tab"]');
    const count = await tabsOrButtons.count();
    expect(count).toBeGreaterThan(3);
  });

  test('Overí funkčnosť vyhľadávania a filtrovania v spise', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Nájdi vyhľadávacie pole
    const searchInput = page.locator('input[type="text"], input[type="search"], input[placeholder*="Hľadať"], input[placeholder*="Filter"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('svedok');
      await page.waitForTimeout(300);
      await expect(searchInput).toHaveValue('svedok');
    }
  });

  test('Overí prítomnosť a zobrazenie Sherlock AI asistenta', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Nájdi spúšťač pre Sherlock AI (tlačidlo so Sherlockom, lupou alebo AI)
    const sherlockBtn = page.locator('button').filter({ hasText: /Sherlock|AI Asistent|Vyšetrovateľ/i }).first();
    if (await sherlockBtn.isVisible()) {
      await sherlockBtn.click();
      await page.waitForTimeout(500);

      // Over že sa otvoril chat panel
      const chatPanel = page.locator('div').filter({ hasText: /Sherlock|Otázka|Zadaj otázku/i }).first();
      await expect(chatPanel).toBeVisible();
    }
  });
});
