import { parseTimeToMinutes } from './forenzUtils.js';

export const OCR_TIMEOUT_MS = 90_000;
export const OCR_LOW_CONFIDENCE = 60;

const IMAGE_EXT = /\.(png|jpe?g|webp|bmp|gif)$/i;
const TIME_RE = /\b(\d{1,2})[:.](\d{2})\b/g;
const NAME_TOKEN = '[A-ZÁÄČĎÉÍĽĹĽŇÓÔŔŠŤÚÝŽ][a-záäčďéíľĺľňóôŕšťúýž]+';
const FULL_NAME = `${NAME_TOKEN}(?:\\s+${NAME_TOKEN})+`;
const ROLE_RE = new RegExp(
  `(?:^|\\b)(` +
    `obvinený|obvineny|Obvinený|obvineného|obvineneho|` +
    `podozrivý|podozrivy|Podozrivý|Podozrivy|podozrivého|podozriveho|` +
    `zadržaný|zadrzany|zadržaného|zadrzeneho|` +
    `svedok|svedka|Svedok|Svedka|` +
    `poškodený|poskodeny|Poškodený|poškodeného|poskodeneho|` +
    `obeť|obet|obete|Obeť|Obet|` +
    `znalec|Znalec|` +
    `alibi|Alibi` +
    // No trailing \\b — JS \\b breaks on accented finals (ý/ť) before ':'
    `)[:\\s-]+(${FULL_NAME})`,
  'g'
);
const MENO_PRIEZVISKO_RE = new RegExp(
  `meno,?\\s*priezvisko[^:]*:\\s*(${NAME_TOKEN}(?:\\s+${NAME_TOKEN})*)`,
  'i'
);
const PREDOSELE_MENO_RE = new RegExp(
  `pred[oô]šl[eé]\\s+meno(?:\\s+a\\s+priezvisko)?[^:]*:\\s*(${NAME_TOKEN}(?:\\s+${NAME_TOKEN})*)`,
  'i'
);
const VYPoved_DOC_RE = /(?:výpoveď|vypoved|zapisnic)/i;
const TITLE_NAME_RE = new RegExp(
  `[-–—]\\s*(${NAME_TOKEN}\\s+${NAME_TOKEN})(?:\\.(?:txt|pdf|png|jpe?g|webp|docx|odt))?$`,
  'i'
);

/** True for png/jpeg/webp (and related) uploads eligible for client OCR. */
export function isImageUploadFile(file) {
  if (!file) return false;
  return file.type?.startsWith('image/') || IMAGE_EXT.test(file.name || '');
}

function normalizeTime(match) {
  const h = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function stripTrailingDateFromName(name) {
  return String(name || '')
    .replace(/,\s*\d{1,2}\.\d{1,2}\.\d{4}.*$/, '')
    .trim();
}

function normalizeRole(roleRaw) {
  const r = String(roleRaw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (/obvinen/.test(r)) return 'obvinený';
  if (/podozriv|zadrz/.test(r)) return 'podozrivý';
  if (r === 'svedka' || r === 'svedok') return 'svedok';
  if (/poskod/.test(r)) return 'poškodený';
  if (/obet/.test(r)) return 'obeť';
  if (/znalec/.test(r)) return 'znalec';
  if (r === 'alibi') return 'alibi';
  return 'iná osoba';
}

function inferSubjectRole(documentTitle, headerLines) {
  const ctx = `${documentTitle}\n${(headerLines || []).slice(0, 8).join('\n')}`.toLowerCase();
  if (/obvinen/.test(ctx)) return 'obvinený';
  if (/podozriv|zadržan|zadrz|výsluch zadržan|vypoved zadrz/.test(ctx)) return 'podozrivý';
  if (/svedok|sviedok/.test(ctx)) return 'svedok';
  if (/poškoden|poskoden/.test(ctx)) return 'poškodený';
  if (/\bobe[tť]/.test(ctx)) return 'obeť';
  if (/znalec/.test(ctx)) return 'znalec';
  if (/\balibi\b/.test(ctx)) return 'alibi';
  // Neutral / unknown procedural status — never invent "podozrivý"
  return 'iná osoba';
}

function extractNameFromTitle(documentTitle) {
  if (!VYPoved_DOC_RE.test(documentTitle)) return null;
  const match = documentTitle.match(TITLE_NAME_RE);
  return match ? stripTrailingDateFromName(match[1]) : null;
}

function stableEntityId(prefix, documentId, seed) {
  const safe = String(seed || 'unknown')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return `${prefix}_${documentId || 'doc'}_${safe || 'x'}`;
}

function addPerson(persons, personNames, aliasNames, opts) {
  const { name, type, documentId, documentTitle, details, idSeed, insertAtFront = false } = opts;
  const clean = stripTrailingDateFromName(name);
  if (!clean) return null;
  const key = clean.toLowerCase();
  if (personNames.has(key) || aliasNames.has(key)) {
    return persons.find((p) => p.name.toLowerCase() === key) || null;
  }
  const person = {
    id: stableEntityId('p', documentId, idSeed || clean),
    document_id: documentId,
    document_title: documentTitle,
    name: clean,
    type,
    details: details || 'Rozpoznané z OCR textu'
  };
  if (insertAtFront) persons.unshift(person);
  else persons.push(person);
  personNames.add(key);
  return person;
}

function attachAlias(primaryPerson, aliasName, aliasNames) {
  const clean = stripTrailingDateFromName(aliasName);
  if (!clean || !primaryPerson) return;
  aliasNames.add(clean.toLowerCase());
  const note = `Predošlé meno: ${clean}`;
  if (primaryPerson.details && primaryPerson.details !== 'Rozpoznané z OCR textu') {
    if (!primaryPerson.details.includes(clean)) primaryPerson.details = `${primaryPerson.details}; ${note}`;
  } else {
    primaryPerson.details = note;
  }
}

/**
 * Heuristic entity extraction from OCR/text for offline timeline/graph views.
 * Slovak zápisnica: riadok „meno, priezvisko“ + kontext podozrivý/zadržaný → persons[0] (osoba 1).
 */
export function buildEntitiesFromOcrText(text, lines, documentId, documentTitle = '') {
  const safeLines = (lines?.length ? lines : String(text || '').split(/\r?\n/))
    .map((l) => l.trim())
    .filter(Boolean);

  const persons = [];
  const personNames = new Set();
  const aliasNames = new Set();
  const events = [];
  const claims = [];
  const flaggedPassages = [];
  const seenEventKeys = new Set();

  const subjectRole = inferSubjectRole(documentTitle, safeLines);
  let primaryPerson = null;

  for (const line of safeLines) {
    const menoMatch = line.match(MENO_PRIEZVISKO_RE);
    if (menoMatch) {
      primaryPerson = addPerson(persons, personNames, aliasNames, {
        name: menoMatch[1],
        type: subjectRole,
        documentId,
        documentTitle,
        idSeed: 'subject',
        insertAtFront: true
      });
      break;
    }
  }

  for (const line of safeLines) {
    const aliasMatch = line.match(PREDOSELE_MENO_RE);
    if (aliasMatch) attachAlias(primaryPerson, aliasMatch[1], aliasNames);
  }

  if (!primaryPerson) {
    const titleName = extractNameFromTitle(documentTitle);
    if (titleName) {
      primaryPerson = addPerson(persons, personNames, aliasNames, {
        name: titleName,
        type: subjectRole,
        documentId,
        documentTitle,
        idSeed: 'subject',
        insertAtFront: true
      });
    }
  }

  for (const line of safeLines) {
    ROLE_RE.lastIndex = 0;
    let roleMatch;
    while ((roleMatch = ROLE_RE.exec(line)) !== null) {
      const role = normalizeRole(roleMatch[1]);
      const name = stripTrailingDateFromName(roleMatch[2]);
      if (!name) continue;
      addPerson(persons, personNames, aliasNames, {
        name,
        type: role,
        documentId,
        documentTitle,
        idSeed: name
      });
    }
  }

  for (const line of safeLines) {
    TIME_RE.lastIndex = 0;
    let timeMatch;
    while ((timeMatch = TIME_RE.exec(line)) !== null) {
      const time = normalizeTime(timeMatch);
      if (!time || parseTimeToMinutes(time) == null) continue;
      const key = `${time}::${line.slice(0, 80)}`;
      if (seenEventKeys.has(key)) continue;
      seenEventKeys.add(key);
      events.push({
        id: stableEntityId('ev', documentId, `${time}_${line.slice(0, 40)}`),
        document_id: documentId,
        document_title: documentTitle,
        title: `Udalosť o ${time}`,
        type: 'ocr',
        persons: persons.slice(0, 3).map((p) => p.name),
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
        id: stableEntityId('cl', documentId, line.slice(0, 40)),
        document_id: documentId,
        document_title: documentTitle,
        subject: persons[0]?.name || persons[persons.length - 1]?.name || 'neznámy',
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
      id: stableEntityId('fp', documentId, 'confidence'),
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

  let documents = (base.documents || []).map((d) =>
    d.id === documentId ? { ...d, ...patch, status: d.status === 'pending' ? 'done' : d.status } : d
  );

  if (documentId && !documents.some((d) => d.id === documentId)) {
    documents = [
      {
        id: documentId,
        title: analysisPayload?.documentTitle || 'Neznámy spis',
        status: 'done',
        source_kind: 'upload',
        ...patch
      },
      ...documents
    ];
  }

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

/** Drop per-document entities before re-applying client extraction (retry / rehydrate). */
export function replaceDocumentEntitiesInCase(caseSnapshot, documentId, entities, documentPatch = {}) {
  const base = caseSnapshot || {};
  const withoutDoc = (list) => (list || []).filter((item) => item.document_id !== documentId);

  const documents = (base.documents || []).map((d) =>
    d.id === documentId ? { ...d, ...documentPatch, status: d.status === 'pending' ? 'done' : d.status } : d
  );

  return {
    ...base,
    documents,
    persons: [...withoutDoc(base.persons), ...(entities.persons || [])],
    flaggedPassages: [...withoutDoc(base.flaggedPassages), ...(entities.flaggedPassages || [])],
    claims: [...withoutDoc(base.claims), ...(entities.claims || [])],
    events: [...withoutDoc(base.events), ...(entities.events || [])]
  };
}

/** Re-run client extraction for docs that have stored text but zero linked persons. */
export function rehydrateMissingEntities(caseSnapshot) {
  const base = caseSnapshot || {};
  const docs = base.documents || [];
  let result = base;
  let changed = false;

  for (const doc of docs) {
    const text = doc.extracted_text;
    if (!text || String(text).length < 20) continue;
    const hasPersons = (result.persons || []).some((p) => p.document_id === doc.id);
    if (hasPersons) continue;

    const entities = buildEntitiesFromOcrText(text, null, doc.id, doc.title || '');
    if (!entities.persons?.length) continue;

    result = replaceDocumentEntitiesInCase(result, doc.id, entities, { summary: entities.summary });
    changed = true;
  }

  return changed ? result : base;
}

/** Build OCR-compatible input from a document's persisted extracted_text. */
export function ocrShapeFromExtractedText(doc) {
  const text = String(doc?.extracted_text || '');
  if (!text) return null;
  return {
    ok: true,
    text,
    confidence: doc.ocr_confidence ?? 92,
    lines: text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
    lowConfidence: false,
    source: doc.ocr_source || 'stored_text'
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
