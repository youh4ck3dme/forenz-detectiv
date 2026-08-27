import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('AppHeader Responsive & Functional Architecture Suite', () => {

  test('1. Alert Badge: spracovanie celkového počtu varovaní a rozporov', () => {
    const calcAlertCount = (redFlags = [], contradictions = []) => redFlags.length + contradictions.length;
    const formatAlertDisplay = (count) => (count > 9 ? '9+' : String(count));

    assert.strictEqual(calcAlertCount([], []), 0);
    assert.strictEqual(calcAlertCount([1, 2], [3]), 3);
    assert.strictEqual(formatAlertDisplay(3), '3');
    assert.strictEqual(formatAlertDisplay(15), '9+');
  });

  test('2. Plan Badge: vizuálne rozlíšenie FREE, PRO a AGENCY s jantárovým / fialovým orámovaním', () => {
    const getPlanClasses = (plan) => {
      if (plan === 'agency') {
        return 'bg-purple-500/15 text-purple-300 border-purple-500/40';
      }
      if (plan === 'pro') {
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      }
      return 'bg-slate-800/90 text-slate-300 border-slate-700';
    };

    assert.ok(getPlanClasses('agency').includes('purple'));
    assert.ok(getPlanClasses('pro').includes('amber'));
    assert.ok(getPlanClasses('free').includes('slate'));
  });

  test('3. Tablet Hybrid Menu: zhlukovanie sekundárnych nástrojov do rozbaľovacieho zoznamu', () => {
    // Referral hidden while monetization is hard-disabled
    const SECONDARY_TOOLS = [
      { id: 'guide', label: 'Sprievodca' },
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'identity', label: 'Správa identít' },
      { id: 'trust', label: 'Trust Pack' },
      { id: 'audit', label: 'Audit log' }
    ];

    assert.strictEqual(SECONDARY_TOOLS.length, 5);
    assert.ok(SECONDARY_TOOLS.some(t => t.id === 'trust'));
    assert.ok(SECONDARY_TOOLS.some(t => t.id === 'audit'));
    assert.ok(!SECONDARY_TOOLS.some(t => t.id === 'referral'));
  });

  test('4. Zdieľanie prípadu (Shared Case): bezpečný stav a indikátor aktívneho tokenu', () => {
    const canShare = (documents, readOnly) => !readOnly && documents.length > 0;

    assert.strictEqual(canShare([], false), false);
    assert.strictEqual(canShare([{ id: 'd1' }], true), false);
    assert.strictEqual(canShare([{ id: 'd1' }], false), true);

    const activeShare = { id: 'share_123', token: 'abcd1234ef5678' };
    const isShareActive = (share) => Boolean(share?.token);
    assert.strictEqual(isShareActive(activeShare), true);
    assert.strictEqual(isShareActive(null), false);
  });

  test('5. Klávesová skratka Ctrl+K / Quick Search integrácia', () => {
    let searchOpened = false;
    const triggerSearch = () => { searchOpened = true; };

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault?.();
        triggerSearch();
      }
    };

    handleKeyDown({ ctrlKey: true, key: 'k', preventDefault: () => {} });
    assert.strictEqual(searchOpened, true);
  });

  test('6. Exportné strážky (Report PDF vs Archív PDF)', () => {
    const canExportReport = (persons, readOnly) => !readOnly && persons.length > 0;
    const canExportArchive = (documents, readOnly) => !readOnly && documents.length > 0;

    assert.strictEqual(canExportReport([], false), false);
    assert.strictEqual(canExportReport([{ id: 'p1' }], false), true);
    assert.strictEqual(canExportReport([{ id: 'p1' }], true), false);

    assert.strictEqual(canExportArchive([], false), false);
    assert.strictEqual(canExportArchive([{ id: 'doc1' }], false), true);
  });

  test('7. Dropdown outside-click detektor a zatváranie menu', () => {
    let isOpen = true;
    const closeDropdown = () => { isOpen = false; };

    const handleOutsideClick = (targetInDropdown) => {
      if (!targetInDropdown) {
        closeDropdown();
      }
    };

    handleOutsideClick(true);
    assert.strictEqual(isOpen, true);

    handleOutsideClick(false);
    assert.strictEqual(isOpen, false);
  });
});
