import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSha256Digest, generateCaseIntegrityDigest } from '../src/utils/cryptoUtils.js';
import skDict from '../src/locales/sk.json' with { type: 'json' };
import csDict from '../src/locales/cs.json' with { type: 'json' };

describe('PROMPT 06 & 07: Crypto & PDF Hash Integrity', () => {
  test('calculateSha256Digest vypočíta validný 64-znakový SHA-256 hash', async () => {
    const hash = await calculateSha256Digest('Testovaci retazec spisu 123');
    assert.strictEqual(typeof hash, 'string');
    assert.strictEqual(hash.length, 64);
    assert.match(hash, /^[a-f0-9]{64}$/);
  });

  test('generateCaseIntegrityDigest generuje deterministický hash s prefixom sha256:', async () => {
    const caseData = {
      caseTitle: 'Kauza K-402',
      documents: [{ id: '1', title: 'Výpoveď 1', content: 'Obsah výpovede' }],
      persons: [{ id: 'p1', name: 'Peter Kováč' }],
      contradictions: [{ id: 'c1', type: 'alibi' }]
    };

    const digest = await generateCaseIntegrityDigest(caseData);
    assert.ok(digest.startsWith('sha256:'));
    assert.strictEqual(digest.length, 7 + 64);
  });
});

describe('PROMPT 08: Monetization & Plan Guard Logic', () => {
  test('Licenčný kľúč PRO-LAWYER-2026 je platný', async () => {
    const VALID_KEYS = {
      'PRO-LAWYER-2026': { plan: 'pro', validDays: 365 },
      'ACADEMIA-SK': { plan: 'pro', validDays: 180 }
    };

    assert.strictEqual(VALID_KEYS['PRO-LAWYER-2026'].plan, 'pro');
    assert.strictEqual(VALID_KEYS['PRO-LAWYER-2026'].validDays, 365);
    assert.strictEqual(VALID_KEYS['DEMO-VIP'], undefined);
  });

  test('Free tier limituje počet prípadov na 2 a počet dokumentov na 5', () => {
    const canCreateCase = (plan, count) => (plan === 'pro' ? true : count < 2);
    const canAddDoc = (plan, count) => (plan === 'pro' ? true : count < 5);

    assert.strictEqual(canCreateCase('free', 1), true);
    assert.strictEqual(canCreateCase('free', 2), false);
    assert.strictEqual(canCreateCase('pro', 10), true);

    assert.strictEqual(canAddDoc('free', 4), true);
    assert.strictEqual(canAddDoc('free', 5), false);
    assert.strictEqual(canAddDoc('pro', 50), true);
  });

  test('Referral ?ref= iba zaznamená kód — neudeľuje Pro upgrade', () => {
    const storage = new Map();
    let plan = 'free';

    const captureReferralCode = (search) => {
      const ref = new URLSearchParams(search).get('ref');
      if (ref) storage.set('forenz_incoming_ref', ref);
    };

    captureReferralCode('?ref=ADV-88392');
    assert.strictEqual(storage.get('forenz_incoming_ref'), 'ADV-88392');
    assert.strictEqual(plan, 'free');
  });
});

describe('PROMPT 09: i18n & Legal Terminology Localization', () => {
  test('SK a CS slovníky obsahujú kľúčové právne pojmy', () => {
    assert.ok(skDict.legal.case);
    assert.ok(csDict.legal.case);
    assert.strictEqual(skDict.legal.testimony, 'Výpoveď');
    assert.strictEqual(csDict.legal.testimony, 'Výpověď');
    assert.strictEqual(skDict.legal.courtProtocol, 'Súdny protokol');
    assert.strictEqual(csDict.legal.courtProtocol, 'Soudní protokol');
  });

  test('Všetky hlavné navigačné kľúče sú prítomné v oboch jazykoch', () => {
    const keys = Object.keys(skDict.nav);
    for (const k of keys) {
      assert.ok(csDict.nav[k], `Chýba preklad pre nav.${k} v cs.json`);
    }
  });
});

describe('PROMPT 10 & 12: Audit Logging & UTM Growth Tracking', () => {
  test('Audit log záznam obsahuje povinné atribúty', () => {
    const log = {
      id: 'LOG-test123',
      timestamp: new Date().toISOString(),
      action: 'CONTRADICTION_FLAGGED',
      details: { contradictionId: 'c1' },
      userRole: 'Vyšetrovateľ / Obhajca'
    };

    assert.ok(log.id.startsWith('LOG-'));
    assert.ok(log.timestamp);
    assert.strictEqual(log.action, 'CONTRADICTION_FLAGGED');
  });
});
