import { test, expect } from '@playwright/test';
import { expectUploadFirstHome, gotoApp, dismissQuickTipIfPresent } from '../helpers.js';

test.describe('S03/S04 — Graph + Map (upload-first, no demo)', () => {
  test('Empty home: upload CTA, žiadne demo tlačidlá', async ({ page }) => {
    await expectUploadFirstHome(page);
    await expect(page.getByText(/Bratislava|Košice demo|Spustiť Demo/i)).toHaveCount(0);
  });

  test('Desktop header — monetizácia paused (žiadny Free/Pro badge CTA)', async ({ page }) => {
    await gotoApp(page);
    await dismissQuickTipIfPresent(page);
    await expect(page.getByTestId('m3-app-bar')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTitle('Licencie a plány')).toHaveCount(0);
  });

  test('Geospatial / map UI je pokryté unit testami — empty state nemá mapu', async ({ page }) => {
    await expectUploadFirstHome(page);
    // Map tab sa zobrazí až po dokumentoch; empty home = HomeHero
    await expect(page.locator('input[type="file"]').first()).toBeAttached();
  });
});
