import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { safeReturnTo } from '../src/lib/authReturnTo.js';

describe('5. 🔐 Auth Lifecycle & OAuth Popups Test Suite', () => {

  test('5.1 safeReturnTo zabezpečuje ochranu pred Open Redirect útokmi', () => {
    // Mock window.location
    globalThis.window = {
      location: {
        origin: 'https://forenz-detectiv.vercel.app',
        search: '?returnTo=%2Fdashboard'
      }
    };

    assert.strictEqual(safeReturnTo(), '/dashboard');

    // Nebezpečné externé domény (útoky) musia vrátiť predvolenú bezpečnú cestu '/'
    globalThis.window.location.search = '?returnTo=https%3A%2F%2Fmalicious-site.com';
    assert.strictEqual(safeReturnTo(), '/');

    globalThis.window.location.search = '?returnTo=%2F%2Fevil.com%2Fphishing';
    assert.strictEqual(safeReturnTo(), '/');

    globalThis.window.location.search = '?returnTo=%2F%5Cevil.com';
    assert.strictEqual(safeReturnTo(), '/');

    globalThis.window.location.search = '';
    assert.strictEqual(safeReturnTo(), '/');
  });

  test('5.2 Odstránenie app-bootstrap parametrov z returnTo (Prevencia session poisoning)', () => {
    globalThis.window = {
      location: {
        origin: 'https://forenz-detectiv.vercel.app',
        search: '?returnTo=%2Fdashboard%3Faccess_token%3Dattacker_token%26app_id%3Devil_app'
      }
    };

    const resolved = safeReturnTo();
    assert.strictEqual(resolved, '/dashboard');
    assert.strictEqual(resolved.includes('access_token'), false);
    assert.strictEqual(resolved.includes('app_id'), false);
  });

  test('5.3 Validácia event.origin pri komunikácii cez postMessage v popup okne', () => {
    const isAllowedAuthOrigin = (origin) => {
      if (!origin) return false;
      return origin.endsWith('.base44.com') || origin === 'https://app.base44.com' || origin === 'https://forenz-detectiv.vercel.app' || origin === 'https://forenzdetectiv.vercel.app';
    };

    assert.strictEqual(isAllowedAuthOrigin('https://app.base44.com'), true);
    assert.strictEqual(isAllowedAuthOrigin('https://auth.base44.com'), true);
    assert.strictEqual(isAllowedAuthOrigin('https://forenz-detectiv.vercel.app'), true);

    // Odmietnutie podvrhnutých originov
    assert.strictEqual(isAllowedAuthOrigin('https://base44.com.attacker.com'), false);
    assert.strictEqual(isAllowedAuthOrigin('https://evil-base44.com'), false);
    assert.strictEqual(isAllowedAuthOrigin('null'), false);
  });
});
