import { test, expect } from '@playwright/test';

test.describe('ForenzDetectiv - Sherlock AI & Legal Source of Truth v prehliadači', () => {
  test('Otvorenie Sherlock AI a odoslanie otázky k prípadu', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Nájdi tlačidlo na otvorenie Sherlocka
    const sherlockTrigger = page.locator('button').filter({ hasText: /Sherlock|AI/i }).first();
    if (await sherlockTrigger.isVisible()) {
      await sherlockTrigger.click();
      await page.waitForTimeout(500);

      // Nájdi vstupné textové pole pre otázku
      const inputField = page.locator('input[placeholder*="otázku"], textarea[placeholder*="otázku"], input[type="text"]').last();
      if (await inputField.isVisible()) {
        await inputField.fill('Aké sú kľúčové rozpory a alibi v tomto prípade?');
        
        // Nájdi tlačidlo Odoslať
        const sendBtn = page.locator('button').filter({ hasText: /Odoslať|Send/i }).or(page.locator('button:has(svg)')).last();
        if (await sendBtn.isVisible()) {
          await sendBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });

  test('Overenie tlačidla PDF exportu protokolu vyšetrovania', async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 900 }); // 2xl — export CTA visible
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const exportBtn = page.locator('button, a').filter({ hasText: /Report PDF|Archív PDF|Export|PDF|Protokol/i }).first();
    await expect(exportBtn).toBeAttached({ timeout: 10000 });
  });
});
