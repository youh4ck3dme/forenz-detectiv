import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isTextUploadFile,
  xmlToPlainText,
  textResultToOcrShape
} from '../src/lib/textFileProcessor.js';

describe('textFileProcessor', () => {
  test('isTextUploadFile rozpozná txt/docx/odt', () => {
    assert.strictEqual(isTextUploadFile({ name: 'vypoved.txt', type: 'text/plain' }), true);
    assert.strictEqual(isTextUploadFile({ name: 'sprava.docx', type: '' }), true);
    assert.strictEqual(isTextUploadFile({ name: 'notes.odt', type: '' }), true);
    assert.strictEqual(isTextUploadFile({ name: 'scan.png', type: 'image/png' }), false);
    assert.strictEqual(isTextUploadFile({ name: 'legacy.doc', type: '' }), true);
  });

  test('xmlToPlainText extrahuje text z OOXML', () => {
    const xml = '<w:document><w:p><w:r><w:t>Svedok Ján Novák</w:t></w:r></w:p><w:p><w:r><w:t>o 14:30</w:t></w:r></w:p></w:document>';
    const text = xmlToPlainText(xml);
    assert.match(text, /Svedok Ján Novák/);
    assert.match(text, /14:30/);
  });

  test('textResultToOcrShape mapuje na OCR pipeline tvar', () => {
    const shape = textResultToOcrShape({
      ok: true,
      text: 'Svedok Peter Kováč o 09:15.',
      lines: ['Svedok Peter Kováč o 09:15.'],
      source: 'text_file'
    });
    assert.strictEqual(shape.ok, true);
    assert.strictEqual(shape.confidence, 92);
    assert.strictEqual(shape.lowConfidence, false);
  });
});
