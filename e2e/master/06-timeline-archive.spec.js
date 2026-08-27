import { test, expect } from '@playwright/test';
import { expectUploadFirstHome } from '../helpers.js';

test.describe('S06/S07 — Timeline & Archive (empty workspace)', () => {
  test('S06 Empty home — žiadny timeline bez spisu', async ({ page }) => {
    await expectUploadFirstHome(page);
    await expect(page.getByRole('button', { name: /Nahrať spis|Nahrát spis|Nahrať výpoveď/i }).first()).toBeVisible();
  });

  test('S07 Empty home — kartotéka až po uploade', async ({ page }) => {
    await expectUploadFirstHome(page);
    await expect(page.locator('input[type="file"]').first()).toBeAttached();
  });
});
