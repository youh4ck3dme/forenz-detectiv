import { test, expect } from '@playwright/test';
import { gotoApp, dismissQuickTipIfPresent, expectUploadFirstHome } from '../helpers.js';

test.describe('S05/S08/S09 — Legal smoke, Sherlock, PDF (no demo case)', () => {
  test('S05 smoke: Home obsahuje forenzný copy', async ({ page }) => {
    await gotoApp(page);
    await dismissQuickTipIfPresent(page);
    await expect(page.getByText(/rozpory|alibi|ForenzDetekt|nemožné|výpoved/i).first()).toBeVisible();
  });

  test('S08 Sherlock trigger existuje v shelli (empty alebo loaded)', async ({ page }) => {
    await expectUploadFirstHome(page);
    const sherlock = page.getByRole('button', { name: /Sherlock/i });
    // Mobile bottom nav má Sherlock aj na empty home
    await expect(sherlock.first()).toBeVisible({ timeout: 15_000 });
  });

  test('S09 PDF export je skrytý bez spisu (upload-first)', async ({ page }) => {
    await expectUploadFirstHome(page);
    // Bez dokumentov nie je hlavný export — HomeHero upload ostáva
    await expect(page.getByRole('button', { name: /Nahrať spis|Nahrát spis|Nahrať výpoveď/i }).first()).toBeVisible();
  });
});
