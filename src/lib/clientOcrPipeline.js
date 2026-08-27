import { parseTimeToMinutes } from './forenzUtils.js';

export const OCR_TIMEOUT_MS = 90_000;
export const OCR_LOW_CONFIDENCE = 60;

/** Bump when client-side entity extraction logic changes (drives idempotent rehydrate). */
export const CLIENT_EXTRACTION_VERSION = 4;

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
/** Merit patterns require Meno Priezvisko — single-token captures caused sentence-fragment false positives. */
const MERIT_FULL_NAME = FULL_NAME;
const SK_LEFT = String.raw `(?:^|[^\p{L}\p{N}])`;
const SK_RIGHT = String.raw `(?=$|[^\p{L}\p{N}])`;
const MERIT_FLAGS = 'giu';
const MERIT_OSOBOU_RE = new RegExp(`${SK_LEFT}(?:s\\s+)?osob(?:ou|a)\\s+(${MERIT_FULL_NAME})${SK_RIGHT}`, MERIT_FLAGS);
const MERIT_BOL_RE = new RegExp(`${SK_LEFT}(${MERIT_FULL_NAME})\\s+bol(?:a)?\\s+([^.,;\\n]{2,80})`, MERIT_FLAGS);
const MERIT_VERB_RE = new RegExp(
  `${SK_LEFT}(${MERIT_FULL_NAME})\\s+(?:dohodil|dohodila|financoval|financovala|nosil|nosila|robil(?:a)?)${SK_RIGHT}`,
  MERIT_FLAGS
);
const MERIT_ROBIL_S_OSOBOU_RE = new RegExp(
  `${SK_LEFT}robil(?:a)?\\s+s\\s+osob(?:ou|a)\\s+(${MERIT_FULL_NAME})${SK_RIGHT}`,
  MERIT_FLAGS
);
const MERIT_SHORT_FINANCE_RE = new RegExp(
  `${SK_LEFT}(${NAME_TOKEN})\\s+to\\s+financoval(?:a)?${SK_RIGHT}`,
  MERIT_FLAGS
);
const MERIT_INVESTIGATOR_RE = new RegExp(
  `${SK_LEFT}Vyšetrovateľ[^\\n]{0,80}?(${MERIT_FULL_NAME})${SK_RIGHT}`,
  MERIT_FLAGS
);
const MERIT_JUDR_RE = new RegExp(
  `${SK_LEFT}JUDr\\.?\\s+(${MERIT_FULL_NAME})${SK_RIGHT}`,
  MERIT_FLAGS
);
const QA_RELATION_RE = new RegExp(
  `${SK_LEFT}v\\s+akom\\s+vzťahu\\s+ste\\s+s\\s+osob(?:ou|a)\\s+(${MERIT_FULL_NAME})${SK_RIGHT}`,
  MERIT_FLAGS
);
const NON_PERSON_TOKENS = new Set([
  'zapisnica',
  'otazka',
  'odpoved',
  'vysetrovatel',
  'partizanske',
  'slovensko',
  'bratislava',
  'petris',
  'factory',
  'bark',
  'tatragene',
  'remeta',
  'eb-eu',
  'eb',
  'eu',
  'to',
  'sa',
  'si',
  'mi',
  'ti',
  'ho',
  'ju',
  'ich',
  'som',
  'sme',
  'ste',
  'bol',
  'bola',
  'boli',
  'aj',
  'na',
  'do',
  'po',
  'za',
  'od',
  'ku',
  'pri',
  'bez',
  'alebo',
  'ako',
  'kto',
  'kde',
  'kedy',
  'ja',
  'on',
  'ona',
  'my',
  'vy',
  'ten',
  'ta',
  'ak',
  'proste',
  'vtedy',
  'následne',
  'nasledne',
  'postup',
  'jeho',
  'raz',
  'tam',
  'teda',
  'poriadku',
  'zákona',
  'zakona',
  'trestného',
  'trestneho',
  'trestný',
  'trestny',
  'pz',
  'mjr',
  'judr',
  'konateľ',
  'konatel',
  'licenciu',
  'účtovníctvo',
  'uctovnictvo'
]);
/** Single-token given names that legitimately appear without a surname in merit text. */
const KNOWN_SINGLE_GIVEN_NAMES = new Set(['lubo', 'lubomir', 'lubomír']);
/** Substrings that disqualify a candidate person name (legal boilerplate, clitics in multi-token noise). */
const PERSON_NAME_REJECT_RES = [
  /\bsom\b/i,
  /\bporiadku\b/i,
  /\bzákona\b/i,
  /\bporiadok\b/i,
  /\btrestného\b/i,
  /\btrestný\b/i,
  /\bs\.r\.o\b/i,
  /\bfactory\b/i
];

/** Weak fallback — must not imply a stronger semantic relation than the text supports. */
const FALLBACK_RELATION_LABEL = 'spomenutý vo výpovedi';

/** Common Slovak masculine animate surname case endings (generic; no hardcoded surnames). */
const SK_SURNAME_CASE_SUFFIXES = ['ovi', 'om', 'ami', 'ov', 'a', 'u', 'e', 'y', 'i'];

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
  const {
    name,
    type,
    documentId,
    documentTitle,
    details,
    idSeed,
    insertAtFront = false,
    allowSingleGivenName = false
  } = opts;
  const clean = stripTrailingNameParticles(stripTrailingDateFromName(name));
  if (
    !clean ||
    (!isLikelyPersonName(clean) && !(allowSingleGivenName && isLikelySingleGivenName(clean)))
  ) {
    return null;
  }
  const key = normalizePersonKey(clean);
  if (personNames.has(key) || aliasNames.has(key)) {
    return persons.find((p) => normalizePersonKey(p.name) === key) || null;
  }
  // Collapse surname-only into an already-known fuller name
  for (const existing of persons) {
    const canonical = canonicalizeAgainstKnownNames(clean, [existing.name], aliasNames);
    if (canonical && normalizePersonKey(canonical) === normalizePersonKey(existing.name) && canonical !== clean) {
      return existing;
    }
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
  const clean = stripTrailingNameParticles(stripTrailingDateFromName(aliasName));
  if (!clean || !primaryPerson) return;
  aliasNames.add(normalizePersonKey(clean));
  const note = `Predošlé meno: ${clean}`;
  if (primaryPerson.details && primaryPerson.details !== 'Rozpoznané z OCR textu') {
    if (!primaryPerson.details.includes(clean)) primaryPerson.details = `${primaryPerson.details}; ${note}`;
  } else {
    primaryPerson.details = note;
  }
}

function normalizePersonKey(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/** Drop trailing Slovak clitics accidentally captured into a name (e.g. "Ján to"). */
function stripTrailingNameParticles(name) {
  const tokens = String(name || '').trim().split(/\s+/).filter(Boolean);
  while (tokens.length > 1 && NON_PERSON_TOKENS.has(normalizePersonKey(tokens[tokens.length - 1]))) {
    tokens.pop();
  }
  return tokens.join(' ').trim();
}

function surnameStemKey(token) {
  let key = normalizePersonKey(token);
  // Strip common masculine animate case endings, longest first
  const ordered = [...SK_SURNAME_CASE_SUFFIXES].sort((a, b) => b.length - a.length);
  for (const suf of ordered) {
    if (key.length > suf.length + 2 && key.endsWith(suf)) {
      key = key.slice(0, -suf.length);
      break;
    }
  }
  return key;
}

/**
 * Canonicalize a mention against names already discovered in this document.
 * - Full-name exact / alias match
 * - Surname-only or declined surname → matching discovered full name / surname
 * Returns null when the form cannot be resolved safely (do not invent identity).
 */
function canonicalizeAgainstKnownNames(rawName, knownNames, aliasNames) {
  const cleaned = stripTrailingNameParticles(
    stripTrailingDateFromName(normalizeNameToNominative(rawName))
  );
  if (!cleaned) return null;
  const key = normalizePersonKey(cleaned);
  if (aliasNames?.has?.(key)) return null;

  for (const known of knownNames) {
    if (normalizePersonKey(known) === key) return known;
  }

  const tokens = cleaned.split(/\s+/);
  const mentionSurname = tokens[tokens.length - 1];
  const mentionStem = surnameStemKey(mentionSurname);

  // Surname-only or declined surname matching a known full name's surname
  const surnameHits = knownNames.filter((known) => {
    const parts = String(known).split(/\s+/);
    if (!parts.length) return false;
    const knownSurname = parts[parts.length - 1];
    const knownKey = normalizePersonKey(knownSurname);
    const mentionKey = normalizePersonKey(mentionSurname);
    if (knownKey === mentionKey) return true;
    if (surnameStemKey(knownSurname) === mentionStem && mentionStem.length >= 3) return true;
    return false;
  });

  if (surnameHits.length === 1) return surnameHits[0];
  // Ambiguous or unresolved — do not invent
  if (tokens.length === 1) return null;
  return cleaned;
}

function normalizeTokenToNominative(token, isSurname = false) {
  const key = normalizePersonKey(token);
  const suffixes = isSurname
    ? ['ovi', 'om', 'omu', 'ami', 'a', 'u', 'e', 'y', 'i']
    : ['ovi', 'om', 'omu', 'em'];
  const ordered = [...suffixes].sort((a, b) => b.length - a.length);
  for (const suf of ordered) {
    if (key.length > suf.length + 2 && key.endsWith(suf)) {
      const stem = token.slice(0, token.length - suf.length);
      if (!stem) return token;
      return stem.charAt(0).toUpperCase() + stem.slice(1);
    }
  }
  return token;
}

function normalizeNameToNominative(name) {
  const tokens = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return '';
  if (tokens.length === 1) return normalizeTokenToNominative(tokens[0], true);
  return tokens
    .map((token, idx) => normalizeTokenToNominative(token, idx === tokens.length - 1))
    .join(' ');
}

function isLikelyPersonName(name) {
  const clean = stripTrailingNameParticles(stripTrailingDateFromName(name));
  if (!clean || clean.length < 2) return false;
  if (PERSON_NAME_REJECT_RES.some((re) => re.test(clean))) return false;

  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.some((t) => NON_PERSON_TOKENS.has(normalizePersonKey(t)))) return false;
  if (/^(Otázka|Odpoveď|ZÁPISNICA|Vyšetrovateľ)/i.test(clean)) return false;
  if (!/^[A-ZÁÄČĎÉÍĽĹĽŇÓÔŔŠŤÚÝŽ]/.test(clean)) return false;

  if (tokens.length === 1) {
    return KNOWN_SINGLE_GIVEN_NAMES.has(normalizePersonKey(tokens[0]));
  }

  if (NON_PERSON_TOKENS.has(normalizePersonKey(tokens[0]))) return false;

  const substantive = tokens.filter((t) => !NON_PERSON_TOKENS.has(normalizePersonKey(t)));
  return substantive.length >= 2;
}

/** Single-token given name in merit context (e.g. „Ľubo to financoval“, „Ján to financoval“). */
function isLikelySingleGivenName(token) {
  const clean = stripTrailingNameParticles(stripTrailingDateFromName(token));
  if (!clean) return false;
  const key = normalizePersonKey(clean);
  if (KNOWN_SINGLE_GIVEN_NAMES.has(key)) return true;
  if (clean.length < 3 || NON_PERSON_TOKENS.has(key)) return false;
  if (PERSON_NAME_REJECT_RES.some((re) => re.test(clean))) return false;
  return /^[A-ZÁÄČĎÉÍĽĹĽŇÓÔŔŠŤÚÝŽ][a-záäčďéíľĺľňóôŕšťúýž]{2,}$/.test(clean);
}

function collectMeritMentions(fullText, safeLines, knownNames = [], aliasNames = new Set()) {
  const mentions = new Map();
  const text = fullText || safeLines.join('\n');

  const register = (rawName, details, quote, label, opts = {}) => {
    const nominative = normalizeNameToNominative(rawName);
    const canonical = canonicalizeAgainstKnownNames(nominative, knownNames, aliasNames);
    const name = canonical || stripTrailingNameParticles(stripTrailingDateFromName(nominative));
    const allowSingleGiven = opts.allowSingleGivenName === true;
    if (!isLikelyPersonName(name) && !(allowSingleGiven && isLikelySingleGivenName(name))) return;
    // Unresolved surname-only declined form — skip rather than invent
    if (!canonical && String(rawName || '').trim().split(/\s+/).length === 1 && !allowSingleGiven) {
      const asIs = stripTrailingNameParticles(stripTrailingDateFromName(rawName));
      if (!isLikelyPersonName(asIs)) return;
      // Allow single-token Capitalized nominative when it looks like a given name/surname
      // but reject if it looks like a declined form of an unknown stem (ends with case suffix
      // and stem is shorter than original by a typical ending).
      const stem = surnameStemKey(asIs);
      const bare = normalizePersonKey(asIs);
      if (stem !== bare && stem.length >= 3 && !knownNames.some((k) => surnameStemKey(k.split(/\s+/).pop()) === stem)) {
        return;
      }
    }
    const resolved = canonical || name;
    const key = normalizePersonKey(resolved);
    if (aliasNames.has(key)) return;
    const existing = mentions.get(key);
    const entry = {
      name: resolved,
      details: details || '',
      quote: (quote || '').slice(0, 500),
      label: label || ''
    };
    if (!existing) {
      mentions.set(key, entry);
      return;
    }
    if (entry.details && !existing.details.includes(entry.details)) {
      existing.details = existing.details ? `${existing.details}; ${entry.details}` : entry.details;
    }
    if (entry.label && !existing.label) existing.label = entry.label;
    if (entry.quote.length > existing.quote.length) existing.quote = entry.quote;
  };

  const scan = (re, handler) => {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(text)) !== null) {
      handler(match);
    }
  };

  scan(MERIT_ROBIL_S_OSOBOU_RE, (m) => register(m[1], 'spojka', m[0], ''));
  scan(MERIT_OSOBOU_RE, (m) => register(m[1], '', m[0], ''));
  scan(MERIT_BOL_RE, (m) => register(m[1], m[2].trim(), m[0], ''));
  scan(MERIT_SHORT_FINANCE_RE, (m) =>
    register(m[1], 'financovanie', m[0], '', { allowSingleGivenName: true })
  );
  scan(MERIT_VERB_RE, (m) => {
    const verb = m[0].match(/\b(dohodil|dohodila|financoval|financovala|nosil|nosila|robil(?:a)?)\b/i);
    const hint = verb?.[0]?.toLowerCase().includes('financov')
      ? 'financovanie'
      : verb?.[0] || '';
    register(m[1], hint, m[0], '');
  });
  scan(MERIT_INVESTIGATOR_RE, (m) => register(m[1], 'Vyšetrovateľ', m[0], ''));
  scan(MERIT_JUDR_RE, (m) => register(m[1], 'Vyšetrovateľ', m[0], ''));

  // Surname-only mentions: only canonicalize onto already-known persons (never invent)
  const surnameMentionRe = new RegExp(
    `${SK_LEFT}(?:p[aá]n(?:a|om)?|pani)?\\s*(${NAME_TOKEN})${SK_RIGHT}`,
    MERIT_FLAGS
  );
  scan(surnameMentionRe, (m) => {
    const canonical = canonicalizeAgainstKnownNames(m[1], knownNames, aliasNames);
    if (!canonical) return;
    if (normalizePersonKey(canonical) === normalizePersonKey(m[1])) return; // already nominative full capture elsewhere
    register(canonical, '', m[0], '');
  });

  const qaLabels = new Map();
  scan(QA_RELATION_RE, (m) => {
    const nominative = normalizeNameToNominative(m[1]);
    const name = canonicalizeAgainstKnownNames(nominative, knownNames, aliasNames)
      || stripTrailingNameParticles(stripTrailingDateFromName(nominative));
    if (!name) return;
    const idx = m.index ?? text.indexOf(m[0]);
    const after = text.slice(idx, idx + 400);
    const answerMatch = after.match(/Odpoveď:\s*([^.\n]+)/i);
    if (answerMatch) qaLabels.set(normalizePersonKey(name), answerMatch[1].trim());
  });

  for (const [key, entry] of mentions) {
    if (qaLabels.has(key)) entry.label = qaLabels.get(key);
  }

  return [...mentions.values()];
}

/**
 * Hub relationships from primary subject to other persons.
 * `description` must carry the exact source fragment when available.
 * Semantic labels only when grounded in Q&A/text; otherwise weak fallback.
 */
function buildHubRelationships(hubName, persons, mentions, documentId, documentTitle) {
  if (!hubName) return [];
  const hubKey = normalizePersonKey(hubName);
  const relationships = [];

  for (const person of persons) {
    if (normalizePersonKey(person.name) === hubKey) continue;
    const mention = mentions.find((m) => normalizePersonKey(m.name) === normalizePersonKey(person.name));
    const quote = (mention?.quote || '').trim();
    const qaLabel = (mention?.label || '').trim();
    // Only use a stronger label when we have an explicit Q&A answer; otherwise weak fallback
    const label = qaLabel || FALLBACK_RELATION_LABEL;
    relationships.push({
      id: stableEntityId('rel', documentId, `${hubName}_${person.name}`),
      document_id: documentId,
      document_title: documentTitle,
      source_name: hubName,
      target_name: person.name,
      label,
      // Exact supporting fragment when present; never pretend details are a quote
      description: quote || ''
    });
  }

  return relationships;
}

/** Sync per-document entity counters used by ArchiveFilmstrip / DocumentList. */
export function syncDocumentEntityCounts(doc, entities = {}) {
  if (!doc?.id) return doc;
  const docId = doc.id;
  const personCount = (entities.persons || []).filter((p) => p.document_id === docId).length;
  const relationshipCount = (entities.relationships || []).filter((r) => r.document_id === docId).length;
  const redFlagCount = (entities.redFlags || []).filter((r) => r.document_id === docId).length;
  const flaggedCount = (entities.flaggedPassages || []).filter((p) => p.document_id === docId).length;
  return {
    ...doc,
    person_count: personCount,
    relationship_count: relationshipCount,
    red_flag_count: redFlagCount || flaggedCount,
    client_extraction_version: CLIENT_EXTRACTION_VERSION
  };
}

function applyEntityCountsToDocuments(documents, documentId, mergedEntities) {
  return (documents || []).map((d) =>
    d.id === documentId ? syncDocumentEntityCounts(d, mergedEntities) : d
  );
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

  const fullText = String(text || safeLines.join('\n'));
  // Pass 1: seed knownNames with primary + role-labelled persons already extracted
  let knownNames = persons.map((p) => p.name);
  let meritMentions = collectMeritMentions(fullText, safeLines, knownNames, aliasNames);

  // Pass 2: after registering full-name merit hits, re-scan so declined surnames
  // can canonicalize onto newly discovered nominatives (still never invents identities).
  for (const mention of meritMentions) {
    const key = normalizePersonKey(mention.name);
    if (aliasNames.has(key)) continue;
    if (primaryPerson && normalizePersonKey(primaryPerson.name) === key) continue;
    addPerson(persons, personNames, aliasNames, {
      name: mention.name,
      type: 'iná osoba',
      documentId,
      documentTitle,
      details: mention.details || FALLBACK_RELATION_LABEL,
      idSeed: mention.name,
      allowSingleGivenName: mention.details === 'financovanie'
    });
  }
  knownNames = persons.map((p) => p.name);
  meritMentions = collectMeritMentions(fullText, safeLines, knownNames, aliasNames);
  for (const mention of meritMentions) {
    const key = normalizePersonKey(mention.name);
    if (aliasNames.has(key)) continue;
    if (primaryPerson && normalizePersonKey(primaryPerson.name) === key) continue;
    addPerson(persons, personNames, aliasNames, {
      name: mention.name,
      type: 'iná osoba',
      documentId,
      documentTitle,
      details: mention.details || FALLBACK_RELATION_LABEL,
      idSeed: mention.name,
      allowSingleGivenName: mention.details === 'financovanie'
    });
  }

  const hubName = primaryPerson?.name || persons[0]?.name || null;
  const relationships = buildHubRelationships(
    hubName,
    persons,
    meritMentions,
    documentId,
    documentTitle
  );

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

  return { persons, relationships, events, claims, flaggedPassages, summary };
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

  const mergedPersons = [...(base.persons || []), ...(entities.persons || [])];
  const mergedRelationships = [...(base.relationships || []), ...(entities.relationships || [])];
  const mergedFlagged = [...(base.flaggedPassages || []), ...(entities.flaggedPassages || [])];
  documents = applyEntityCountsToDocuments(documents, documentId, {
    persons: mergedPersons,
    relationships: mergedRelationships,
    flaggedPassages: mergedFlagged,
    redFlags: base.redFlags || []
  });

  return {
    documents,
    persons: mergedPersons,
    relationships: mergedRelationships,
    redFlags: base.redFlags || [],
    flaggedPassages: mergedFlagged,
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

  const mergedPersons = [...withoutDoc(base.persons), ...(entities.persons || [])];
  const mergedRelationships = [...withoutDoc(base.relationships), ...(entities.relationships || [])];
  const mergedFlagged = [...withoutDoc(base.flaggedPassages), ...(entities.flaggedPassages || [])];
  const syncedDocuments = applyEntityCountsToDocuments(documents, documentId, {
    persons: mergedPersons,
    relationships: mergedRelationships,
    flaggedPassages: mergedFlagged,
    redFlags: base.redFlags || []
  });

  return {
    ...base,
    documents: syncedDocuments,
    persons: mergedPersons,
    relationships: mergedRelationships,
    flaggedPassages: mergedFlagged,
    claims: [...withoutDoc(base.claims), ...(entities.claims || [])],
    events: [...withoutDoc(base.events), ...(entities.events || [])]
  };
}

/** Re-run client extraction for docs with stored text but missing/stale entities. */
export function rehydrateMissingEntities(caseSnapshot) {
  const base = caseSnapshot || {};
  const docs = base.documents || [];
  let result = base;
  let changed = false;

  for (const doc of docs) {
    const text = doc.extracted_text;
    if (!text || String(text).length < 20) continue;

    const entities = buildEntitiesFromOcrText(text, null, doc.id, doc.title || '');
    const expectedPersons = entities.persons?.length || 0;
    const expectedRelationships = entities.relationships?.length || 0;
    if (!expectedPersons) continue;

    const currentPersons = (result.persons || []).filter((p) => p.document_id === doc.id);
    const currentRelationships = (result.relationships || []).filter((r) => r.document_id === doc.id);
    const storedPersonCount = doc.person_count ?? currentPersons.length;
    const versionStale = doc.client_extraction_version !== CLIENT_EXTRACTION_VERSION;

    const needsRehydrate =
      versionStale ||
      currentPersons.length === 0 ||
      currentPersons.length !== expectedPersons ||
      storedPersonCount !== expectedPersons ||
      (expectedRelationships > 0 && currentRelationships.length === 0);

    if (!needsRehydrate) continue;

    result = replaceDocumentEntitiesInCase(result, doc.id, entities, {
      summary: entities.summary,
      client_extraction_version: CLIENT_EXTRACTION_VERSION
    });
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
