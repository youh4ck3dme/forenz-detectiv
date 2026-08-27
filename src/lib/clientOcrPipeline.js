import { parseTimeToMinutes } from './forenzUtils.js';

export const OCR_TIMEOUT_MS = 90_000;
export const OCR_LOW_CONFIDENCE = 60;

const IMAGE_EXT = /\.(png|jpe?g|webp|bmp|gif)$/i;
const TIME_RE = /\b(\d{1,2})[:.](\d{2})\b/g;
const ROLE_RE = /(?:^|\b)(svedok|podozrivý|podozrivy|obeť|obet|alibi|Svedok|Podozrivý|Podozrivy|Obeť|Obet|Alibi)\b[:\s-]*([A-ZÁÄČĎÉÍĽĹĽŇÓÔŔŠŤÚÝŽ][a-záäčďéíľĺľňóôŕšťúýž]+(?:\s+[A-ZÁÄČĎÉÍĽĹĽŇÓÔŔŠŤÚÝŽ][a-záäčďéíľĺľňóôŕšťúýž]+)*)/g;

/** True for png/jpeg/webp (and related) uploads eligible for client OCR. */
export function isImageUploadFile(file) {
  if (!file) return false;
  return file.type?.startsWith('image/') || IMAGE_EXT.test(file.name || '');
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeTime(match) {
  const h = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Heuristic entity extraction from OCR text for offline timeline/graph views. */
export function buildEntitiesFromOcrText(text, lines, documentId, documentTitle = '') {
  const safeLines = (lines?.length ? lines : String(text || '').split(/\r?\n/))
    .map((l) => l.trim())
    .filter(Boolean);

  const persons = [];
  const personNames = new Set();
  const events = [];
  const claims = [];
  const flaggedPassages = [];
  const seenEventKeys = new Set();

  for (const line of safeLines) {
    let roleMatch;
    ROLE_RE.lastIndex = 0;
    while ((roleMatch = ROLE_RE.exec(line)) !== null) {
      const roleRaw = roleMatch[1].toLowerCase();
      const role = roleRaw === 'podozrivy' ? 'podozrivý' : roleRaw === 'obet' ? 'obeť' : roleRaw;
      const name = roleMatch[2].trim();
      if (!name || personNames.has(name.toLowerCase())) continue;
      personNames.add(name.toLowerCase());
      persons.push({
        id: uid('p'),
        document_id: documentId,
        document_title: documentTitle,
        name,
        type: role,
        details: 'Rozpoznané z OCR textu'
      });
    }

    TIME_RE.lastIndex = 0;
    let timeMatch;
    while ((timeMatch = TIME_RE.exec(line)) !== null) {
      const time = normalizeTime(timeMatch);
      if (!time || parseTimeToMinutes(time) == null) continue;
      const key = `${time}::${line.slice(0, 80)}`;
      if (seenEventKeys.has(key)) continue;
      seenEventKeys.add(key);
      events.push({
        id: uid('ev'),
        document_id: documentId,
        document_title: documentTitle,
        title: `Udalosť o ${time}`,
        type: 'ocr',
        persons: persons.slice(-3).map((p) => p.name),
        date: '',
        time,
        approximate_time: /\b(okolo|približne|asi)\b/i.test(line),
        location: '',
        description: line.slice(0, 240),
        source_quote: line.slice(0, 500),
        confidence: 0.45
      });
    }

    if (/\b(videl|videla|bol|bola|nachádzal|nachádzala|uviedol|uviedla)\b/i.test(line) && line.length > 12) {
      claims.push({
        id: uid('cl'),
        document_id: documentId,
        document_title: documentTitle,
        subject: persons[persons.length - 1]?.name || 'neznámy',
        predicate: 'mentioned_in',
        object: line.slice(0, 120),
        event_time: (line.match(TIME_RE)?.[0] || '').replace('.', ':') || '',
        source_quote: line.slice(0, 500),
        confidence: 0.4
      });
    }
  }

  const confidenceNote =
    safeLines.length === 0
      ? null
      : 'Automaticky extrahované z OCR — odporúčame manuálnu kontrolu pri nízkej kvalite skenu.';

  if (confidenceNote && safeLines.some((l) => l.length > 40)) {
    flaggedPassages.push({
      id: uid('fp'),
      document_id: documentId,
      document_title: documentTitle,
      text: safeLines.find((l) => l.length > 40)?.slice(0, 500) || '',
      category: 'neistota',
      explanation: confidenceNote
    });
  }

  const charCount = String(text || '').length;
  const summary =
    charCount > 0
      ? `OCR: ${charCount} znakov, ${persons.length} osôb, ${events.length} časových údajov`
      : '';

  return { persons, events, claims, flaggedPassages, summary };
}

export function buildOcrDocumentPatch(ocrResult) {
  if (!ocrResult?.ok) return {};
  const snippet = String(ocrResult.text || '').slice(0, 280);
  const { summary } = buildEntitiesFromOcrText(ocrResult.text, ocrResult.lines, '', '');
  return {
    extracted_text: ocrResult.text,
    ocr_confidence: ocrResult.confidence,
    ocr_source: 'tesseract',
    summary: summary || (snippet ? `OCR náhľad: ${snippet}${ocrResult.text.length > 280 ? '…' : ''}` : '')
  };
}

export function buildOcrAnalysisPayload(ocrResult, documentId, documentTitle = '') {
  const entities = buildEntitiesFromOcrText(
    ocrResult.text,
    ocrResult.lines,
    documentId,
    documentTitle
  );
  return {
    source: 'client_ocr',
    documentId,
    documentTitle,
    ocr: {
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      lines: ocrResult.lines,
      lowConfidence: (ocrResult.confidence || 0) < OCR_LOW_CONFIDENCE
    },
    entities,
    documentPatch: buildOcrDocumentPatch(ocrResult)
  };
}

/** Merge OCR entities into an in-memory case snapshot (offline / guest mode). */
export function mergeClientOcrIntoCase(caseSnapshot, analysisPayload, documentId) {
  const base = caseSnapshot || {};
  const entities = analysisPayload?.entities || {};
  const patch = analysisPayload?.documentPatch || {};

  const documents = (base.documents || []).map((d) =>
    d.id === documentId ? { ...d, ...patch, status: d.status === 'pending' ? 'done' : d.status } : d
  );

  return {
    documents,
    persons: [...(base.persons || []), ...(entities.persons || [])],
    relationships: base.relationships || [],
    redFlags: base.redFlags || [],
    flaggedPassages: [...(base.flaggedPassages || []), ...(entities.flaggedPassages || [])],
    claims: [...(base.claims || []), ...(entities.claims || [])],
    events: [...(base.events || []), ...(entities.events || [])],
    locations: base.locations || [],
    vehicles: base.vehicles || [],
    contradictions: base.contradictions || [],
    overrides: base.overrides || []
  };
}

function raceWithTimeout(promise, timeoutMs, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => resolve({ ok: false, error: 'ocr_timeout', timedOut: true }), timeoutMs);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    promise
      .then((value) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        reject(err);
      });
  });
}

/**
 * Run Tesseract OCR with timeout + abort; never throws — upload flow can continue without OCR.
 * @param {string|File|Blob} imageSource
 * @param {{ onProgress?: (n:number)=>void, signal?: AbortSignal, timeoutMs?: number, runOcr?: Function }} [opts]
 */
export async function runOcrWithFallback(imageSource, opts = {}) {
  const { onProgress, signal, timeoutMs = OCR_TIMEOUT_MS, runOcr } = opts;
  if (signal?.aborted) return { ok: false, error: 'aborted' };

  try {
    const extract = runOcr || (await import('./ocrProcessor.js')).extractTextFromImage;
    const result = await raceWithTimeout(extract(imageSource, onProgress), timeoutMs, signal);
    if (result?.timedOut) {
      console.warn('[OCR] Timeout — pokračujem bez client OCR');
      return { ok: false, error: 'ocr_timeout' };
    }
    if (!result?.success && !result?.text) {
      return { ok: false, error: 'empty_ocr', confidence: result?.confidence || 0 };
    }
    return {
      ok: true,
      text: result.text || '',
      confidence: result.confidence || 0,
      lines: result.lines || [],
      lowConfidence: (result.confidence || 0) < OCR_LOW_CONFIDENCE
    };
  } catch (err) {
    if (err?.name === 'AbortError') return { ok: false, error: 'aborted' };
    console.warn('[OCR] Client OCR zlyhalo, upload pokračuje:', err);
    return { ok: false, error: err?.message || 'ocr_failed' };
  }
}
