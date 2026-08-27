import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isImageUploadFile,
  buildEntitiesFromOcrText,
  buildOcrDocumentPatch,
  mergeClientOcrIntoCase,
  runOcrWithFallback,
  OCR_LOW_CONFIDENCE
} from '../src/lib/clientOcrPipeline.js';

describe('clientOcrPipeline', () => {
  test('isImageUploadFile rozpozná png/jpeg/webp', () => {
    assert.strictEqual(isImageUploadFile({ name: 'scan.png', type: 'image/png' }), true);
    assert.strictEqual(isImageUploadFile({ name: 'photo.JPG', type: '' }), true);
    assert.strictEqual(isImageUploadFile({ name: 'doc.pdf', type: 'application/pdf' }), false);
  });

  test('buildEntitiesFromOcrText extrahuje osoby, časy a tvrdenia', () => {
    const text = 'Svedok Ján Novák uviedol: Videl som podozrivého o 14:30 na Poštovej ulici.';
    const { persons, events, claims } = buildEntitiesFromOcrText(
      text,
      [text],
      'doc_1',
      'vypoved.png'
    );

    assert.strictEqual(persons.length, 1);
    assert.strictEqual(persons[0].name, 'Ján Novák');
    assert.strictEqual(persons[0].type, 'svedok');
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].time, '14:30');
    assert.strictEqual(events[0].document_id, 'doc_1');
    assert.ok(claims.length >= 1);
  });

  test('buildOcrDocumentPatch ukladá extracted_text a summary', () => {
    const patch = buildOcrDocumentPatch({
      ok: true,
      text: 'Krátky OCR text pre test.',
      confidence: 88,
      lines: ['Krátky OCR text pre test.']
    });
    assert.strictEqual(patch.extracted_text, 'Krátky OCR text pre test.');
    assert.strictEqual(patch.ocr_source, 'tesseract');
    assert.match(patch.summary, /OCR:/);
  });

  test('mergeClientOcrIntoCase doplní entity do offline snapshotu', () => {
    const payload = buildOcrAnalysisPayloadHelper();
    const merged = mergeClientOcrIntoCase(
      { documents: [{ id: 'doc_1', title: 'a.png', status: 'pending' }], persons: [], events: [], claims: [], flaggedPassages: [] },
      payload,
      'doc_1'
    );
    assert.strictEqual(merged.documents[0].extracted_text, 'Test OCR');
    assert.strictEqual(merged.persons.length, 1);
    assert.strictEqual(merged.events.length, 1);
  });

  test('runOcrWithFallback nevyhodí výnimku pri zlyhaní OCR', async () => {
    const result = await runOcrWithFallback('fake', {
      runOcr: async () => {
        throw new Error('simulated failure');
      }
    });
    assert.strictEqual(result.ok, false);
    assert.match(result.error, /simulated failure/);
  });

  test('runOcrWithFallback vráti text pri úspechu mock OCR', async () => {
    const result = await runOcrWithFallback('fake', {
      runOcr: async () => ({
        text: 'OK text',
        confidence: 95,
        lines: ['OK text'],
        success: true
      })
    });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.text, 'OK text');
    assert.strictEqual(result.lowConfidence, false);
  });

  test('runOcrWithFallback označí nízku confidence', async () => {
    const result = await runOcrWithFallback('fake', {
      runOcr: async () => ({
        text: 'rozmazané',
        confidence: OCR_LOW_CONFIDENCE - 5,
        lines: ['rozmazané'],
        success: true
      })
    });
    assert.strictEqual(result.lowConfidence, true);
  });
});

function buildOcrAnalysisPayloadHelper() {
  const ocrResult = {
    ok: true,
    text: 'Test OCR',
    confidence: 80,
    lines: ['Svedok Peter Kováč videl niekoho o 09:15.']
  };
  const entities = buildEntitiesFromOcrText(ocrResult.text, ocrResult.lines, 'doc_1', 'a.png');
  return {
    source: 'client_ocr',
    entities,
    documentPatch: buildOcrDocumentPatch(ocrResult)
  };
}
