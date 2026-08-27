import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AI_PROMPT_PREAMBLE, validateAIOutput } from '../base44/shared/aiValidation.ts';
import {
  FORENSIC_ANALYST_SYSTEM_PROMPT,
  buildForensicSystemPrompt
} from '../base44/shared/forensicAnalystPrompt.ts';
import {
  buildLegalContext,
  extractLegalDatesFromDocument
} from '../base44/shared/buildLegalContext.ts';
import { resolveLegalVersion } from '../base44/shared/legalSourceOfTruth.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

describe('Forensic AI P0 — prompt hardening', () => {
  const systemPrompt = buildForensicSystemPrompt(AI_PROMPT_PREAMBLE);

  test('production prompt does not encourage linguistic lie detection', () => {
    assert.ok(!systemPrompt.toLowerCase().includes('detekciu lingvistických znakov klamstva'));
    assert.ok(!systemPrompt.toLowerCase().includes('lingvistických znakov klamstva'));
    assert.ok(!systemPrompt.includes('lingvistika klamstva'));
  });

  test('prompt prohibits lie/guilt scoring concepts as outputs', () => {
    assert.match(systemPrompt, /Nikdy nevytváraj:\s*lie_score/);
    assert.ok(systemPrompt.includes('guilt_score'));
    assert.ok(systemPrompt.includes('criminal_probability'));
    // Positive forensic framing
    assert.ok(systemPrompt.includes('HARD_CONTRADICTION'));
    assert.ok(systemPrompt.includes('INSUFFICIENT_EVIDENCE'));
    assert.ok(systemPrompt.includes('LEGAL_CONTEXT'));
  });

  test('prompt establishes forensic analyst role, not lie detector', () => {
    assert.match(systemPrompt, /forenzný analytik/i);
    assert.ok(systemPrompt.includes('detektorom lži') || systemPrompt.includes('detektor lži'));
    assert.ok(systemPrompt.includes('NIE JE'));
  });

  test('AI_PROMPT_PREAMBLE is UNTRUSTED DATA + LEGAL_CONTEXT fail-closed', () => {
    assert.ok(AI_PROMPT_PREAMBLE.includes('UNTRUSTED DATA'));
    assert.ok(AI_PROMPT_PREAMBLE.includes('LEGAL_CONTEXT'));
    assert.ok(!AI_PROMPT_PREAMBLE.includes('Jediným autoritatívnym'));
    assert.ok(!AI_PROMPT_PREAMBLE.includes('Jediným autoritatívnym zdrojom právnych noriem je'));
  });

  test('analyzeCore no longer embeds old lie-detection SYSTEM_PROMPT inline', () => {
    const analyzeCore = fs.readFileSync(
      path.join(ROOT, 'base44/shared/analyzeCore.ts'),
      'utf8'
    );
    assert.ok(!analyzeCore.includes('Detekciu lingvistických znakov klamstva'));
    assert.ok(analyzeCore.includes('buildForensicSystemPrompt'));
    assert.ok(analyzeCore.includes('buildLegalContext'));
    assert.ok(analyzeCore.includes('<LEGAL_CONTEXT>'));
  });

  test('existing AI JSON validation still accepts forensic schema payload', () => {
    const res = validateAIOutput({
      nodes: [{ label: 'Dimitri Cohen', type: 'podozrivý', details: 'Predošlé meno: Marek Ivanka' }],
      edges: [],
      red_flags: ['[HARD_CONTRADICTION] Konflikt miesta o 18:00 — overiť GPS'],
      flagged_passages: [
        { text: 'Bol som v Bratislave o 18:00', category: 'rozpor', explanation: 'Konflikt s iným tvrdením' }
      ],
      events: [
        {
          title: 'Udalosť o 18:00',
          type: 'výpoveď',
          persons: ['Dimitri Cohen'],
          date: '',
          time: '18:00',
          approximate_time: false,
          location: 'Bratislava',
          description: 'Tvrdenie o prítomnosti',
          source_quote: 'Bol som v Bratislave o 18:00',
          confidence: 0.9
        }
      ],
      locations: [{ name: 'Bratislava', address: '', source_quote: 'Bol som v Bratislave o 18:00', confidence: 0.9 }],
      vehicles: [],
      claims: [
        {
          subject: 'Dimitri Cohen',
          predicate: 'was_at',
          object: 'Bratislava',
          event_date: '',
          event_time: '18:00',
          approximate_time: false,
          location: 'Bratislava',
          source_quote: 'Bol som v Bratislave o 18:00',
          confidence: 0.9
        }
      ]
    });
    assert.equal(res.nodes.length, 1);
    assert.equal(res.nodes[0].label, 'Dimitri Cohen');
    assert.equal(res.claims.length, 1);
    assert.equal(res.redFlags.length, 1);
  });
});

describe('Forensic AI P0 — LEGAL_CONTEXT fail-closed gate', () => {
  test('AVAILABLE only when DATE_OF_CONDUCT is covered by local 300/2005 version', () => {
    const ctx = buildLegalContext({ dateOfConduct: '2026-08-01' });
    assert.ok(ctx.status === 'AVAILABLE' || ctx.status === 'PARTIAL');
    const tz = ctx.laws.find((l) => l.law_id === '300/2005');
    assert.ok(tz);
    assert.ok(tz.status === 'AVAILABLE' || tz.status === 'PARTIAL');
    assert.ok((tz.paragraphs || []).length >= 1);
    assert.match(ctx.contextBlock, /STATUS:/);
    assert.match(ctx.contextBlock, /DATE_OF_CONDUCT: 2026-08-01/);
  });

  test('out-of-range DATE_OF_CONDUCT returns LEGAL_VERSION_UNAVAILABLE', () => {
    const ctx = buildLegalContext({ dateOfConduct: '2025-06-15' });
    const tz = ctx.laws.find((l) => l.law_id === '300/2005');
    assert.equal(tz.status, 'LEGAL_VERSION_UNAVAILABLE');
    assert.equal(ctx.status, 'LEGAL_VERSION_UNAVAILABLE');
    assert.match(ctx.contextBlock, /LEGAL_VERSION_UNAVAILABLE/);
    assert.match(ctx.contextBlock, /FAIL-CLOSED/);
  });

  test('unknown DATE_OF_CONDUCT fails closed for substantive TZ (does not use interrogation date)', () => {
    const ctx = buildLegalContext({
      dateOfConduct: null,
      dateOfProceduralAct: '2026-08-13'
    });
    const tz = ctx.laws.find((l) => l.law_id === '300/2005');
    assert.equal(tz.status, 'LEGAL_VERSION_UNAVAILABLE');
    assert.match(ctx.contextBlock, /DATE_OF_CONDUCT: UNKNOWN/);
    assert.match(ctx.contextBlock, /MUST NOT select/);
    assert.ok(ctx.warnings.some((w) => /DATE_OF_PROCEDURAL_ACT/.test(w) || /DATE_OF_CONDUCT missing/.test(w)));
  });

  test('lawId 301/2005 currently LEGAL_SOURCE_UNAVAILABLE', () => {
    const ctx = buildLegalContext({ dateOfConduct: '2026-08-01' });
    const tp = ctx.laws.find((l) => l.law_id === '301/2005');
    assert.equal(tp.status, 'LEGAL_SOURCE_UNAVAILABLE');
    assert.match(ctx.contextBlock, /301\/2005/);
  });

  test('lawId 460/1992 currently LEGAL_SOURCE_UNAVAILABLE', () => {
    const ctx = buildLegalContext({ dateOfConduct: '2026-08-01' });
    const ustava = ctx.laws.find((l) => l.law_id === '460/1992');
    assert.equal(ustava.status, 'LEGAL_SOURCE_UNAVAILABLE');
  });

  test('resolveLegalVersion still rejects non-300 laws (gateway)', () => {
    assert.equal(resolveLegalVersion({ lawId: '301/2005' }).status, 'LEGAL_VERSION_UNAVAILABLE');
    assert.equal(resolveLegalVersion({ lawId: '460/1992' }).status, 'LEGAL_VERSION_UNAVAILABLE');
  });

  test('contextBlock never invents 301/460 paragraph text from memory', () => {
    const ctx = buildLegalContext({ dateOfConduct: '2026-08-01' });
    const tp = ctx.laws.find((l) => l.law_id === '301/2005');
    const ustava = ctx.laws.find((l) => l.law_id === '460/1992');
    assert.equal((tp.paragraphs || []).length, 0);
    assert.equal((ustava.paragraphs || []).length, 0);
    assert.ok(!/§\s*2\s+základné zásady/i.test(ctx.contextBlock));
  });

  test('extractLegalDatesFromDocument does not invent dates', () => {
    assert.deepEqual(extractLegalDatesFromDocument({}), {
      dateOfConduct: null,
      dateOfProceduralAct: null
    });
    assert.deepEqual(
      extractLegalDatesFromDocument({
        date_of_conduct: '2025-03-01',
        interrogation_date: '2026-08-13'
      }),
      { dateOfConduct: '2025-03-01', dateOfProceduralAct: '2026-08-13' }
    );
  });

  test('FORENSIC_ANALYST_SYSTEM_PROMPT is exported and non-empty', () => {
    assert.ok(FORENSIC_ANALYST_SYSTEM_PROMPT.length > 500);
  });
});
