import { test, expect } from '@playwright/test';
import {
  GUEST_TXT_FIXTURE,
  writeTxtFixture,
  gotoEmptyHeroHome,
  gotoEmptyWorkspace,
  expectGuestTxtInArchive
} from './helpers.js';

test.describe('Guest/offline .txt upload (setInputFiles, no native dialog)', () => {
  test('HomeHero hidden input — home-file-input → Výpovede ≥ 1 + title visible', async ({ page }) => {
    await gotoEmptyHeroHome(page);

    const filePath = writeTxtFixture(GUEST_TXT_FIXTURE.content, GUEST_TXT_FIXTURE.fileName);
    const homeInput = page.getByTestId('home-file-input');
    await expect(homeInput).toHaveAttribute('accept', /(\.txt|text\/plain)/i);

    await homeInput.setInputFiles(filePath);

    await expectGuestTxtInArchive(page, GUEST_TXT_FIXTURE.fileName);
  });

  test('ScanButton hidden input — scan-file-input → Výpovede ≥ 1 + title visible', async ({ page }) => {
    await gotoEmptyWorkspace(page);

    const filePath = writeTxtFixture(GUEST_TXT_FIXTURE.content, GUEST_TXT_FIXTURE.fileName);
    const scanInput = page.getByTestId('scan-file-input');
    await expect(scanInput).toHaveAttribute('accept', /(\.txt|text\/plain)/i);

    await scanInput.setInputFiles(filePath);

    await expectGuestTxtInArchive(page, GUEST_TXT_FIXTURE.fileName);
  });
});
