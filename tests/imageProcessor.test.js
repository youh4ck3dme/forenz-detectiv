import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isImageUploadFile, prepareFileForUpload } from '../src/lib/imageProcessor.js';

describe('imageProcessor OCR helpers', () => {
  test('isImageUploadFile export z imageProcessor', () => {
    assert.strictEqual(isImageUploadFile({ name: 'x.webp', type: 'image/webp' }), true);
    assert.strictEqual(isImageUploadFile({ name: 'notes.txt', type: 'text/plain' }), false);
  });

  test('prepareFileForUpload nechá textové súbory bez zmeny', async () => {
    const file = { name: 'notes.txt', type: 'text/plain', size: 12 };
    const out = await prepareFileForUpload(file);
    assert.strictEqual(out, file);
  });
});
