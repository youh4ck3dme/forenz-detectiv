import { test, expect } from '@playwright/test';
import { gotoApp, dismissQuickTipIfPresent, expectToastMatching } from '../helpers.js';

test.describe('S02 — Mega Upload Pipeline & Bulk gates', () => {
  test('2.3 Nadlimitný súbor >50 MB → toast 50 000 KB', async ({ page }) => {
    await gotoApp(page);
    await dismissQuickTipIfPresent(page);

    await page.locator('input[type="file"]').first().evaluate((input) => {
      const file = new File(['%PDF-1.4 oversized marker'], 'spis_52mb.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 + 4096 });
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: {
          0: file,
          length: 1,
          item: (i) => (i === 0 ? file : null),
          [Symbol.iterator]: function* () { yield file; }
        }
      });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expectToastMatching(page, /prekračuje limit 50 MB|50 000 KB/i);
  });

  test('2.1/2.2 Malý PDF — input akceptuje application/pdf', async ({ page }) => {
    await gotoApp(page);
    await dismissQuickTipIfPresent(page);
    const input = page.locator('input[type="file"]').first();
    await expect(input).toBeAttached();
    const accept = await input.getAttribute('accept');
    expect(accept || '').toMatch(/pdf|application\/pdf/i);
    await expect(page.locator('body')).toContainText(/ForenzDetekt[ií]v/i);
  });

  test('Bulk / hero file input existuje (multiple)', async ({ page }) => {
    await gotoApp(page);
    await dismissQuickTipIfPresent(page);
    const input = page.locator('input[type="file"]').first();
    await expect(input).toBeAttached();
    await expect(input).toHaveAttribute('multiple', '');
  });
});
