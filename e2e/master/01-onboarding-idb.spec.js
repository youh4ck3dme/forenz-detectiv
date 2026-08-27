import { test, expect } from '@playwright/test';
import { gotoApp, dismissQuickTipIfPresent, openIndexedDbMeta } from '../helpers.js';

test.describe('S01 — Onboarding, Guest Mode & IndexedDB', () => {
  test('HomeHero dark motif a upload CTA', async ({ page }) => {
    await gotoApp(page);
    await dismissQuickTipIfPresent(page);

    await expect(page).toHaveTitle(/ForenzDetekt|Alibi/i);
    await expect(page.locator('body')).toContainText(/ForenzDetekt[ií]v/i);
    await expect(page.locator('.bg-slate-950').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Nahrať spis|Nahrát spis|Nahrať výpoveď/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Demo|demo spis/i })).toHaveCount(0);
  });

  test('IndexedDB ForenzDetectiv_OfflineDB v2 so store-mi', async ({ page }) => {
    await gotoApp(page);
    const meta = await openIndexedDbMeta(page);
    expect(meta.name).toBe('ForenzDetectiv_OfflineDB');
    expect(meta.version).toBe(2);
    for (const store of ['cases', 'documents', 'analysis_cache', 'file_blobs']) {
      expect(meta.stores).toContain(store);
    }
  });

  test('Offline sieť — app nespadne na bielu obrazovku', async ({ page, context }) => {
    await gotoApp(page);
    await dismissQuickTipIfPresent(page);
    try {
      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event('offline')));
      await expect(page.locator('body')).toContainText(/ForenzDetekt[ií]v/i);
    } finally {
      await context.setOffline(false);
    }
  });
});
