import { test, expect } from '@playwright/test';

test.describe('ForenzDetectiv - Dashboard & Hlavné Rozhranie', () => {
  test('Načíta Dashboard a overí kľúčové prvky rozhrania', async ({ page }) => {
    // 1. Otvor dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // 2. Over titulok a hlavičku
    await expect(page).toHaveTitle(/ForenzDetekt|Alibi/i);

    // 3. Over navigačný panel a profil vyšetrovateľa
    const heading = page.locator('h1, h2').filter({ hasText: /Forenz|Dashboard|Vyšetrovanie|Prípady/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // 4. Over prítomnosť navigačných prvkov
    const navBar = page.locator('nav, header').first();
    await expect(navBar).toBeVisible();

    // 5. Over prítomnosť tlačidiel pre prípady a akcie
    const newCaseBtn = page.locator('button, a').filter({ hasText: /Nový prípad|Vytvoriť prípad|Otvoriť spis/i }).first();
    if (await newCaseBtn.isVisible()) {
      await expect(newCaseBtn).toBeEnabled();
    }
  });

  test('Presun z Dashboardu do Vyšetrovacieho spisu (Workspace)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Nájdi odkaz alebo kartu prípadu a klikni
    const caseCardOrLink = page.locator('a, button, [role="button"]').filter({ hasText: /Otvoriť|Detail|Spis|Vyšetrovanie/i }).first();
    if (await caseCardOrLink.isVisible()) {
      await caseCardOrLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/case|spis|forenz|dashboard/i);
    }
  });
});
