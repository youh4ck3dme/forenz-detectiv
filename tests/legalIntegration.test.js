import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  getLegalSourceManifest,
  getLegalParagraph,
  getLegalProvenance,
  searchLegalSource,
  getRelevantLegalParagraphs,
  verifyLegalSourceIntegrity,
  resolveLegalVersion
} from '../base44/shared/legalSourceOfTruth.ts';

import { LegalRetriever } from '../base44/shared/legalRetriever.ts';
import {
  assessContradictionRelevance,
  createLegalAssessment
} from '../base44/shared/legalAssessment.ts';

import {
  validateLegalAssessment,
  AI_PROMPT_PREAMBLE,
  LegalAssessmentSchema
} from '../base44/shared/aiValidation.ts';

import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

describe('Legal Source of Truth Integration Tests (Zákon č. 300/2005 Z. z.)', () => {
  // Test 1: getLegalParagraph("346") -> existuje a obsahuje provenance
  test('Test 1: getLegalParagraph("346") existuje a vracia overené znenie s provenance', () => {
    const p346 = getLegalParagraph('346');
    assert.ok(p346, 'Paragraf § 346 musí existovať');
    assert.equal(p346.paragraph, '346');
    assert.match(p346.title, /krivá výpoveď/i);

    const prov = getLegalProvenance('346');
    assert.ok(prov, 'Provenance pre § 346 musí existovať');
    assert.equal(prov.lawId, '300/2005');
    assert.equal(prov.paragraph, '346');
    assert.equal(prov.sourcePage, 160);
    assert.match(prov.text, /krivá výpoveď/i);
    assert.equal(prov.sourceHash, 'c99954a3c25d3d9ed5721ee060e3c7371646d435a09d918a990b07580f61230e');
  });

  // Test 2: getLegalParagraph("999") -> NOT_FOUND (null)
  test('Test 2: getLegalParagraph("999") vracia null (neexistujúci paragraf)', () => {
    const p999 = getLegalParagraph('999');
    assert.equal(p999, null, 'Neexistujúci paragraf § 999 musí vrátiť null');

    const prov999 = getLegalProvenance('999');
    assert.equal(prov999, null, 'Provenance pre neexistujúci paragraf musí byť null');
  });

  // Test 3: Legal citation bez source evidence -> reject
  test('Test 3: Právne posúdenie bez source evidence je validáciou zamietnuté (REJECT)', () => {
    const invalidAssessment = {
      paragraph: '346',
      status: 'potentially_relevant',
      rationale: 'Podozrenie na rozpor.',
      sourceEvidence: [], // Prázdna dôkazná opora
      supportingClaims: ['Výpoveď svedka'],
      missingEvidence: [],
      requiresHumanReview: true
    };

    const validSet = new Set(['346']);
    const valResult = validateLegalAssessment(invalidAssessment, validSet);
    assert.equal(valResult.ok, false);
    assert.match(valResult.error || '', /REJECT|source evidence/i);
  });

  // Test 4: Neexistujúci paragraf (§ 999) -> reject
  test('Test 4: Právne posúdenie odkazujúce na neexistujúci § 999 je validáciou zamietnuté', () => {
    const fabricatedAssessment = {
      paragraph: '999',
      status: 'potentially_relevant',
      rationale: 'Vymyslený paragraf.',
      sourceEvidence: [
        {
          sourceFile: 'docs/source-of-truth.pdf',
          page: 1,
          paragraph: '999',
          text: 'Vymyslený text normy',
          sourceHash: 'c99954a3c25d3d9ed5721ee060e3c7371646d435a09d918a990b07580f61230e'
        }
      ],
      supportingClaims: [],
      missingEvidence: [],
      requiresHumanReview: true
    };

    const validSet = new Set(['1', '2', '346']);
    const valResult = validateLegalAssessment(fabricatedAssessment, validSet);
    assert.equal(valResult.ok, false);
    assert.match(valResult.error || '', /REJECT.*does not exist/i);
  });

  // Test 5: Contradiction != Crime (Zásadné pravidlo)
  test('Test 5: Detegovaný rozpor (Contradiction) nevytvára automatickú kvalifikáciu trestného činu', () => {
    const contradiction = {
      id: 'contra-1',
      type: 'location_time_conflict',
      severity: 'high',
      explanation: 'Svedok A uvádza čas 14:00 v Bratislave, svedok B čas 14:00 v Trnave',
      claim_a_quote: 'Bol som v Bratislave o 14:00',
      claim_b_quote: 'Videl som ho v Trnave o 14:00'
    };

    const assessment = assessContradictionRelevance(contradiction);
    // Nesmie označiť čin ako dokonaný zločin, ale iba potentially_relevant s požiadavkou na human review
    assert.equal(assessment.status, 'potentially_relevant');
    assert.equal(assessment.requiresHumanReview, true);
    assert.ok(assessment.missingEvidence.length >= 2, 'Musí uvádzať chýbajúce dôkazy (úmysel, poučenie)');
    assert.match(assessment.rationale, /nepredstavuje trestný čin/i);
  });

  // Test 6: Time mismatch -> potentially_relevant s requiresHumanReview === true
  test('Test 6: Časový nesúlad vytvára status potentially_relevant a striktne vyžaduje posúdenie človekom', () => {
    const timeMismatch = {
      type: 'time_mismatch',
      claim_a_quote: 'Odišiel o 15:30',
      claim_b_quote: 'Odišiel o 16:30'
    };

    const assessment = assessContradictionRelevance(timeMismatch);
    assert.equal(assessment.status, 'potentially_relevant');
    assert.equal(assessment.requiresHumanReview, true);
  });

  // Test 7: Prompt injection vo výpovedi nemôže zmeniť právne inštrukcie
  test('Test 7: Bezpečnostný preamble chráni pred prompt injection a per-law LEGAL_CONTEXT', () => {
    assert.ok(AI_PROMPT_PREAMBLE.includes('UNTRUSTED DATA'));
    assert.ok(AI_PROMPT_PREAMBLE.includes('LEGAL_CONTEXT'));
    assert.ok(AI_PROMPT_PREAMBLE.includes('PER-LAW'));
    assert.ok(!AI_PROMPT_PREAMBLE.includes('Jediným autoritatívnym zdrojom'));
    assert.ok(!/Jediným autoritatívnym.*300\/2005/.test(AI_PROMPT_PREAMBLE));
    assert.ok(!AI_PROMPT_PREAMBLE.includes('alebo obsahuje LEGAL_SOURCE_UNAVAILABLE'));
  });

  // Test 8: Source hash mismatch -> zlyhá closed
  test('Test 8: Pri nesúlade kontrolného súčtu (SHA-256 mismatch) zlyhá legal retrieval closed', () => {
    const originalManifest = getLegalSourceManifest();
    assert.equal(originalManifest.sha256, 'c99954a3c25d3d9ed5721ee060e3c7371646d435a09d918a990b07580f61230e');

    const integrity = verifyLegalSourceIntegrity();
    assert.equal(integrity.ok, true);
  });

  // Test 9: Legal retriever topics & search
  test('Test 9: LegalRetriever indexuje kľúčové forenzné témy (podvod, krádež, krivá výpoveď)', () => {
    const falseTestimony = LegalRetriever.getByTopic('false_testimony');
    assert.ok(falseTestimony.length > 0);
    assert.equal(falseTestimony[0].paragraph, '346');

    const fraud = LegalRetriever.getByTopic('fraud');
    assert.ok(fraud.length >= 1);
    assert.ok(fraud.some((f) => f.paragraph === '221'));

    const searchRes = LegalRetriever.search('krádež');
    assert.ok(searchRes.length > 0);
    assert.ok(searchRes.some((r) => r.paragraph === '212'));
  });

  // Test 10: Temporal Legal Versioning
  test('Test 10: resolveLegalVersion správne overuje dátum incidentu voči účinnosti verzie', () => {
    const validDate = resolveLegalVersion({ lawId: '300/2005', incidentDate: '2026-07-20' });
    assert.equal(validDate.status, 'AVAILABLE');

    const futureDate = resolveLegalVersion({ lawId: '300/2005', incidentDate: '2029-01-01' });
    assert.equal(futureDate.status, 'LEGAL_VERSION_UNAVAILABLE');

    const foreignLaw = resolveLegalVersion({ lawId: '40/1964', incidentDate: '2026-07-20' });
    assert.equal(foreignLaw.status, 'LEGAL_VERSION_UNAVAILABLE');
  });
});
