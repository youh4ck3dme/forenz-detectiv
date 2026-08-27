/**
 * Shared helpers for Master E2E (PROMPT scenarios 01–12).
 * Product has no demo case — tests use empty Home / real upload gates.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect } from '@playwright/test';

export async function gotoApp(page, pathName = '/') {
  await page.goto(pathName, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/ForenzDetectiv|ForenzDetektív/i, { timeout: 30_000 });
}

export async function dismissQuickTipIfPresent(page) {
  const close = page.getByRole('button', { name: /Zavrieť tip|Zavřít tip|Close/i });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  }
}

/** Dismiss cookie banner so it does not intercept file inputs or obscure toasts. */
export async function dismissCookieConsentIfPresent(page) {
  const accept = page.getByRole('button', { name: /Súhlasím|Len nevyhnutné/i }).first();
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

/** Empty-state home: upload CTA must be present; no demo buttons. */
export async function expectUploadFirstHome(page) {
  await gotoApp(page);
  await dismissQuickTipIfPresent(page);
  await expect(page.getByRole('button', { name: /Nahrať spis|Nahrát spis/i }).first()).toBeVisible({
    timeout: 15_000
  });
  await expect(page.getByRole('button', { name: /Demo|demo spis|lokálne demo|lokální demo/i })).toHaveCount(0);
}

export async function openIndexedDbMeta(page) {
  return page.evaluate(async () => {
    const DB_NAME = 'ForenzDetectiv_OfflineDB';
    const DB_VERSION = 2;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error || new Error('IDB open failed'));
      req.onsuccess = () => {
        const db = req.result;
        const stores = Array.from(db.objectStoreNames);
        db.close();
        resolve({ name: DB_NAME, version: DB_VERSION, stores });
      };
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const name of ['cases', 'documents', 'analysis_cache', 'file_blobs']) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: name === 'analysis_cache' ? 'key' : 'id' });
          }
        }
      };
    });
  });
}

/** Write PDF fixture to temp file (Playwright rejects in-memory buffers > 50MB). */
export function writePdfFixture(sizeBytes, fileName = 'spis.pdf') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forenz-e2e-'));
  const filePath = path.join(dir, fileName);
  const fd = fs.openSync(filePath, 'w');
  fs.writeSync(fd, Buffer.from('%PDF-1.4\n'));
  const remaining = Math.max(0, sizeBytes - 8);
  const chunk = Buffer.alloc(1024 * 1024, 0);
  let written = 0;
  while (written < remaining) {
    const n = Math.min(chunk.length, remaining - written);
    fs.writeSync(fd, chunk, 0, n);
    written += n;
  }
  fs.closeSync(fd);
  return filePath;
}

export async function expectToastMatching(page, pattern, timeoutMs = 45_000) {
  const toast = page.getByTestId('app-toast');
  await expect(toast).toBeVisible({ timeout: timeoutMs });
  await expect(toast).toContainText(pattern);
}

/** UTF-8 .txt fixture for guest upload E2E (Playwright setInputFiles — no native dialog). */
export function writeTxtFixture(content, fileName = 'vypoved.txt') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forenz-e2e-'));
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
  return filePath;
}

export const GUEST_TXT_FIXTURE = {
  fileName: 'Výpoveď číslo 1 - Dimiti Cohen.txt',
  content: [
    'VÝPOVEĎ SVEDKA',
    'Meno: Dimiti Cohen',
    'Svedok uviedol, že dňa 12.03.2026 o 21:30 bol doma v Bratislave.',
    'Podpis: ________________'
  ].join('\n')
};

/** Guest/offline empty case — clear persisted case on the app origin. */
export async function resetGuestCaseStorage(page) {
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase('ForenzDetectiv_OfflineDB');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('IDB delete failed'));
      req.onblocked = () => resolve();
    });
  });
}

export async function gotoEmptyHeroHome(page) {
  await gotoApp(page, '/?view=hero');
  await resetGuestCaseStorage(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await dismissQuickTipIfPresent(page);
  await dismissCookieConsentIfPresent(page);
  await expect(page.getByTestId('home-file-input')).toBeAttached({ timeout: 15_000 });
}

export async function gotoEmptyWorkspace(page) {
  await gotoApp(page, '/');
  await resetGuestCaseStorage(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await dismissQuickTipIfPresent(page);
  await dismissCookieConsentIfPresent(page);
  await expect(page.getByTestId('scan-file-input')).toBeAttached({ timeout: 15_000 });
}

/** Assert archive shows at least one výpoveď with the uploaded title (guest/offline). */
export async function expectGuestTxtInArchive(page, fileTitle) {
  const toastPattern = /Textový spis|offline režim|lokáln|uložen/i;

  await Promise.all([
    expectToastMatching(page, toastPattern, 45_000),
    expect(page.getByTestId('case-header')).toContainText(/[1-9]\d*\s*dok\./i, { timeout: 45_000 })
  ]);

  const výpovedeHeader = page.getByRole('heading', { name: /Výpovede & Spisy/i }).first();
  await expect(výpovedeHeader).toBeVisible({ timeout: 15_000 });
  const countBadge = výpovedeHeader.locator('xpath=following-sibling::span[1]');
  await expect(countBadge).toHaveText(/^[1-9]/);

  await expect(page.getByRole('paragraph').filter({ hasText: fileTitle }).first()).toBeVisible({ timeout: 15_000 });
}

export async function openPricingModal(page) {
  const planBtn = page.locator('header.hidden.lg\\:flex, header').getByRole('button', { name: /Free|Pro|Agency/i }).first();
  if (await planBtn.isVisible().catch(() => false)) {
    await planBtn.click();
    return;
  }
  const freeBtn = page.getByTitle('Licencie a plány');
  if (await freeBtn.isVisible().catch(() => false)) {
    await freeBtn.click();
    return;
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByText(/Cenník/i).first().click();
}
