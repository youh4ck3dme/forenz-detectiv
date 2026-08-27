import { test, expect } from '@playwright/test';
import { gotoApp, dismissQuickTipIfPresent, expectUploadFirstHome } from '../helpers.js';

test.describe('S11 — PWA, mobilné UI & offline', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Mobile bottom nav má safe-area padding', async ({ page }) => {
    await gotoApp(page);
    await dismissQuickTipIfPresent(page);

    const nav = page.locator('nav').filter({ has: page.getByRole('button', { name: /Pavúk|Spis|Alibi|Sherlock/i }) }).first();
    await expect(nav).toBeVisible({ timeout: 15_000 });
    const pb = await nav.evaluate((el) => getComputedStyle(el).paddingBottom);
    expect(pb).toBeTruthy();
  });

  test('MobileDrawer: Menu otvorí účet (bez Cenník — monetizácia paused)', async ({ page }) => {
    await gotoApp(page);
    await dismissQuickTipIfPresent(page);
    await page.getByRole('button', { name: 'Menu' }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible({ timeout: 10_000 });
    // Account/help items sit lower in the scrollable drawer — scroll before assert
    const accountItem = drawer.getByRole('button', { name: /Sprievodca|Audit|Bezpečnosť|Trust/i }).first();
    await accountItem.scrollIntoViewIfNeeded();
    await expect(accountItem).toBeVisible({ timeout: 10_000 });
    await expect(drawer.getByText(/^Cenník$/i)).toHaveCount(0);
  });

  test('Offline na empty home — UI ostáva použiteľné', async ({ page, context }) => {
    await expectUploadFirstHome(page);
    await context.setOffline(true);
    await expect(page.locator('body')).toContainText(/ForenzDetekt[ií]v/i);
    await context.setOffline(false);
  });
});

test.describe('S11b — iPhone 17 logical 393×852', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test('AppLayout dead zone + bottom nav', async ({ page }) => {
    await gotoApp(page);
    await dismissQuickTipIfPresent(page);
    await expect(page.getByTestId('app-layout')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('camera-dead-zone')).toBeVisible();
    await expect(page.getByTestId('mobile-bottom-nav')).toBeVisible();
  });
});

test.describe('S11c — iPhone Air logical 420×912', () => {
  test.use({
    viewport: { width: 420, height: 912 },
    deviceScaleFactor: 3
  });

  test('Touch chrome is below camera dead zone; layout fills 100dvh', async ({ page }) => {
    await gotoApp(page);
    await dismissQuickTipIfPresent(page);
    const layout = page.getByTestId('app-layout');
    const dead = page.getByTestId('camera-dead-zone');
    const bar = page.getByTestId('m3-app-bar');
    await expect(layout).toBeVisible({ timeout: 15_000 });
    await expect(dead).toBeVisible();
    await expect(bar).toBeVisible();
    const layoutBox = await layout.boundingBox();
    const deadBox = await dead.boundingBox();
    const barBox = await bar.boundingBox();
    expect(layoutBox).toBeTruthy();
    expect(deadBox).toBeTruthy();
    expect(barBox).toBeTruthy();
    expect(Math.round(layoutBox.height)).toBeGreaterThanOrEqual(910);
    expect(Math.round(layoutBox.height)).toBeLessThanOrEqual(914);
    expect(deadBox.height).toBeGreaterThanOrEqual(54);
    expect(barBox.y).toBeGreaterThanOrEqual(deadBox.y + deadBox.height - 1);
    await expect(page.getByTestId('mobile-bottom-nav')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflowX).toBe(false);
  });
});
