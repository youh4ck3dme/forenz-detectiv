const TEXT_EXT = /\.(txt|md|csv|log)$/i;
const DOCX_EXT = /\.docx$/i;
const ODT_EXT = /\.odt$/i;
const LEGACY_DOC_EXT = /\.doc$/i;

/** Plain-text and office-document uploads eligible for client-side text extraction. */
export function isTextUploadFile(file) {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  if (type.startsWith('text/')) return true;
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/vnd.oasis.opendocument.text'
  ) {
    return true;
  }
  const name = file.name || '';
  return TEXT_EXT.test(name) || DOCX_EXT.test(name) || ODT_EXT.test(name) || LEGACY_DOC_EXT.test(name);
}

function decodeXmlEntities(str) {
  return String(str || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Strip OOXML / ODF XML tags and keep readable paragraph breaks. */
export function xmlToPlainText(xml) {
  return decodeXmlEntities(
    String(xml || '')
      .replace(/<w:tab[^>]*\/>/g, '\t')
      .replace(/<w:br[^>]*\/>/g, '\n')
      .replace(/<text:line-break[^>]*\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<\/text:p>/g, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Nepodarilo sa prečítať súbor'));
    reader.readAsArrayBuffer(file);
  });
}

function readFileAsText(file, encoding = 'utf-8') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Nepodarilo sa prečítať text'));
    reader.readAsText(file, encoding);
  });
}

/** Minimal ZIP reader — extracts one entry by path (supports STORE + DEFLATE). */
export async function readZipEntry(arrayBuffer, entryPath) {
  const bytes = new Uint8Array(arrayBuffer);
  const target = entryPath.replace(/^\//, '');
  let offset = 0;

  while (offset + 30 <= bytes.length) {
    const sig = new DataView(bytes.buffer, offset, 4).getUint32(0, true);
    if (sig !== 0x04034b50) break;

    const compression = new DataView(bytes.buffer, offset + 8, 2).getUint16(0, true);
    const compSize = new DataView(bytes.buffer, offset + 18, 4).getUint32(0, true);
    const nameLen = new DataView(bytes.buffer, offset + 26, 2).getUint16(0, true);
    const extraLen = new DataView(bytes.buffer, offset + 28, 2).getUint16(0, true);
    const nameStart = offset + 30;
    const name = new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLen));
    const dataStart = nameStart + nameLen + extraLen;
    const dataEnd = dataStart + compSize;

    if (name === target && dataEnd <= bytes.length) {
      const compressed = bytes.subarray(dataStart, dataEnd);
      if (compression === 0) return compressed;
      if (compression === 8 && typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        const reader = ds.readable.getReader();
        writer.write(compressed);
        writer.close();
        const chunks = [];
        let total = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          total += value.length;
        }
        const out = new Uint8Array(total);
        let pos = 0;
        for (const chunk of chunks) {
          out.set(chunk, pos);
          pos += chunk.length;
        }
        return out;
      }
      throw new Error(`Nepodporovaná kompresia ZIP (${compression})`);
    }

    offset = dataEnd;
  }

  return null;
}

async function extractDocxText(arrayBuffer) {
  const xmlBytes = await readZipEntry(arrayBuffer, 'word/document.xml');
  if (!xmlBytes) throw new Error('word/document.xml nenájdený v DOCX');
  const xml = new TextDecoder().decode(xmlBytes);
  return xmlToPlainText(xml);
}

async function extractOdtText(arrayBuffer) {
  const xmlBytes = await readZipEntry(arrayBuffer, 'content.xml');
  if (!xmlBytes) throw new Error('content.xml nenájdený v ODT');
  const xml = new TextDecoder().decode(xmlBytes);
  return xmlToPlainText(xml);
}

/**
 * Extract plain text from .txt / .docx / .odt uploads for offline entity heuristics.
 * @returns {Promise<{ ok: true, text: string, lines: string[], source: string } | { ok: false, error: string }>}
 */
export async function extractTextFromUpload(file) {
  if (!file) return { ok: false, error: 'Chýba súbor' };

  const name = file.name || '';
  const type = String(file.type || '').toLowerCase();

  try {
    if (TEXT_EXT.test(name) || type.startsWith('text/')) {
      const text = (await readFileAsText(file)).trim();
      if (!text) return { ok: false, error: 'Textový súbor je prázdny' };
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      return { ok: true, text, lines, source: 'text_file' };
    }

    if (DOCX_EXT.test(name) || type.includes('wordprocessingml')) {
      const buf = await readFileAsArrayBuffer(file);
      const text = (await extractDocxText(buf)).trim();
      if (!text) return { ok: false, error: 'DOCX neobsahuje rozpoznateľný text' };
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      return { ok: true, text, lines, source: 'docx' };
    }

    if (ODT_EXT.test(name) || type.includes('opendocument.text')) {
      const buf = await readFileAsArrayBuffer(file);
      const text = (await extractOdtText(buf)).trim();
      if (!text) return { ok: false, error: 'ODT neobsahuje rozpoznateľný text' };
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      return { ok: true, text, lines, source: 'odt' };
    }

    if (LEGACY_DOC_EXT.test(name)) {
      return {
        ok: false,
        error: 'Formát .doc (Word 97–2003) nie je podporovaný — uložte súbor ako .docx alebo .pdf.'
      };
    }

    return { ok: false, error: 'Nepodporovaný typ textového súboru' };
  } catch (err) {
    console.warn('[TextExtract]', err);
    return { ok: false, error: err?.message || 'Extrakcia textu zlyhala' };
  }
}

/** Normalize text extraction result into OCR-compatible shape for shared pipeline. */
export function textResultToOcrShape(textResult) {
  if (!textResult?.ok) return null;
  return {
    ok: true,
    text: textResult.text,
    confidence: 92,
    lines: textResult.lines || [],
    lowConfidence: false,
    source: textResult.source || 'text_file'
  };
}
