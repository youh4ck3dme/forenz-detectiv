/**
 * Fail-closed LEGAL_CONTEXT builder for Mistral analyzeDocument.
 * Does NOT invent datasets — only uses verified local Source of Truth.
 * Currently: Zákon č. 300/2005 Z. z. only. 301/2005 and 460/1992 → UNAVAILABLE.
 *
 * DATE_OF_CONDUCT (skutok) ≠ DATE_OF_PROCEDURAL_ACT (výsluch).
 * Substantive criminal law (TZ) is resolved against DATE_OF_CONDUCT only.
 */
import {
  getLegalSourceManifest,
  getLegalProvenance,
  getRelevantLegalParagraphs,
  resolveLegalVersion,
  verifyLegalSourceIntegrity,
  type LegalManifest,
  type LegalProvenance
} from './legalSourceOfTruth.ts';

export type LegalContextStatus =
  | 'AVAILABLE'
  | 'PARTIAL'
  | 'LEGAL_SOURCE_UNAVAILABLE'
  | 'LEGAL_VERSION_UNAVAILABLE';

export interface LegalContextLawEntry {
  law_id: string;
  title: string;
  status: LegalContextStatus;
  effective_from?: string;
  effective_to?: string;
  sourceHash?: string;
  details?: string;
  paragraphs?: Array<{
    law_id: string;
    title: string;
    paragraph: string;
    effective_from: string;
    effective_to: string;
    sourceFile: string;
    sourcePage: number;
    sourceHash: string;
    text: string;
  }>;
}

export interface LegalContextResult {
  status: LegalContextStatus;
  contextBlock: string;
  laws: LegalContextLawEntry[];
  warnings: string[];
  dateOfConduct: string | null;
  dateOfProceduralAct: string | null;
}

export interface BuildLegalContextOptions {
  /** Dátum skutku (YYYY-MM-DD) — REQUIRED for substantive TZ qualification. */
  dateOfConduct?: string | null;
  /** Dátum výsluchu / procesného úkonu — MUST NOT select TZ version. */
  dateOfProceduralAct?: string | null;
  /** Extra topic keys for paragraph selection (default: false testimony / accusation / obstruction). */
  topics?: string[];
  /** Explicit paragraph numbers for 300/2005 (default: 344, 345, 346). */
  paragraphNumbers?: string[];
  /**
   * Optional integrity check override (tests only).
   * Defaults to verifyLegalSourceIntegrity from legalSourceOfTruth.
   */
  integrityCheck?: () => { ok: boolean; sha256?: string; error?: string };
}

const DEFAULT_TOPICS = [
  'false_testimony_and_perjury',
  'false_accusation',
  'obstruction_of_justice'
];

const DEFAULT_PARAGRAPHS = ['344', '345', '346'];

const LOCAL_LAWS = {
  '300/2005': 'Trestný zákon',
  '301/2005': 'Trestný poriadok',
  '460/1992': 'Ústava Slovenskej republiky'
} as const;

function normalizeDate(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const d = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return d;
}

function formatProvenance(
  prov: LegalProvenance,
  manifest: LegalManifest
): NonNullable<LegalContextLawEntry['paragraphs']>[number] {
  return {
    law_id: prov.lawId,
    title: prov.fullTitle || prov.title,
    paragraph: prov.paragraph,
    effective_from: manifest.effective_from,
    effective_to: manifest.effective_to,
    sourceFile: prov.sourceFile,
    sourcePage: prov.sourcePage,
    sourceHash: prov.sourceHash,
    text: prov.text
  };
}

function collectParagraphs(
  paragraphNumbers: string[],
  topics: string[],
  manifest: LegalManifest
): NonNullable<LegalContextLawEntry['paragraphs']> {
  const nums = new Set<string>(paragraphNumbers.map((n) => String(n).replace(/^§\s*/, '').trim()));
  for (const p of getRelevantLegalParagraphs(topics)) {
    nums.add(p.paragraph);
  }
  const out: NonNullable<LegalContextLawEntry['paragraphs']> = [];
  for (const num of nums) {
    const prov = getLegalProvenance(num);
    if (prov) out.push(formatProvenance(prov, manifest));
  }
  return out.sort((a, b) => a.paragraph.localeCompare(b.paragraph, 'sk', { numeric: true }));
}

function renderContextBlock(
  status: LegalContextStatus,
  laws: LegalContextLawEntry[],
  warnings: string[],
  dateOfConduct: string | null,
  dateOfProceduralAct: string | null
): string {
  const lines: string[] = [];
  lines.push(`STATUS: ${status}`);
  lines.push(`DATE_OF_CONDUCT: ${dateOfConduct || 'UNKNOWN'}`);
  lines.push(`DATE_OF_PROCEDURAL_ACT: ${dateOfProceduralAct || 'UNKNOWN'}`);
  lines.push(
    'RULE: Substantive criminal-law version (TZ) MUST be selected by DATE_OF_CONDUCT only. Interrogation date must NOT select TZ version.'
  );
  lines.push(
    'RULE: Never reconstruct Slovak law from model memory. Cite ONLY paragraphs listed under LAW entries with status AVAILABLE.'
  );
  lines.push(
    'RULE (PER-LAW): Use legal assessment ONLY for a LAW entry with status AVAILABLE. A LAW entry with LEGAL_SOURCE_UNAVAILABLE or LEGAL_VERSION_UNAVAILABLE must not be used or reconstructed from memory. Unavailability of one law does NOT disable another independent law with status AVAILABLE. Overall STATUS PARTIAL does not mean all laws are unavailable.'
  );

  if (warnings.length) {
    lines.push('WARNINGS:');
    for (const w of warnings) lines.push(`- ${w}`);
  }

  for (const law of laws) {
    lines.push('');
    lines.push(`LAW ${law.law_id} — ${law.title}`);
    lines.push(`  status: ${law.status}`);
    if (law.effective_from) lines.push(`  effective_from: ${law.effective_from}`);
    if (law.effective_to) lines.push(`  effective_to: ${law.effective_to}`);
    if (law.sourceHash) lines.push(`  sourceHash: ${law.sourceHash}`);
    if (law.details) lines.push(`  details: ${law.details}`);
    if (law.paragraphs?.length) {
      for (const p of law.paragraphs) {
        lines.push(`  § ${p.paragraph} | ${p.title}`);
        lines.push(`    effective: ${p.effective_from} → ${p.effective_to}`);
        lines.push(`    source: ${p.sourceFile} p.${p.sourcePage}`);
        lines.push(`    sha256: ${p.sourceHash}`);
        lines.push(`    text: ${p.text}`);
      }
    }
  }

  const anyUsableLaw = laws.some(
    (l) => l.status === 'AVAILABLE' && Array.isArray(l.paragraphs) && l.paragraphs.length > 0
  );
  if (!anyUsableLaw) {
    lines.push('');
    lines.push(
      'FAIL-CLOSED: No LAW entry with status AVAILABLE and verified paragraphs. Extraction of persons/claims/events is allowed. Definitive legal qualification is FORBIDDEN for all laws.'
    );
  }

  return lines.join('\n');
}

/**
 * Build verified LEGAL_CONTEXT for injection into the Mistral user message.
 * Fail closed when local dataset/version cannot cover DATE_OF_CONDUCT.
 */
export function buildLegalContext(options: BuildLegalContextOptions = {}): LegalContextResult {
  const dateOfConduct = normalizeDate(options.dateOfConduct);
  const dateOfProceduralAct = normalizeDate(options.dateOfProceduralAct);
  const topics = options.topics?.length ? options.topics : DEFAULT_TOPICS;
  const paragraphNumbers = options.paragraphNumbers?.length
    ? options.paragraphNumbers
    : DEFAULT_PARAGRAPHS;

  const warnings: string[] = [];
  const laws: LegalContextLawEntry[] = [];

  // --- Laws without local datasets: always UNAVAILABLE (do not invent) ---
  for (const lawId of ['301/2005', '460/1992'] as const) {
    laws.push({
      law_id: lawId,
      title: LOCAL_LAWS[lawId],
      status: 'LEGAL_SOURCE_UNAVAILABLE',
      details: `Lokálny overený dataset pre zákon č. ${lawId} v tomto repozitári ešte nie je. Necituj tento predpis z pamäte modelu.`
    });
  }

  // --- 300/2005: only when DATE_OF_CONDUCT is known AND covered by local version ---
  let tzStatus: LegalContextStatus = 'LEGAL_VERSION_UNAVAILABLE';
  let tzEntry: LegalContextLawEntry = {
    law_id: '300/2005',
    title: LOCAL_LAWS['300/2005'],
    status: 'LEGAL_VERSION_UNAVAILABLE'
  };

  try {
    if (!dateOfConduct) {
      tzStatus = 'LEGAL_VERSION_UNAVAILABLE';
      tzEntry = {
        law_id: '300/2005',
        title: LOCAL_LAWS['300/2005'],
        status: 'LEGAL_VERSION_UNAVAILABLE',
        details:
          'DATE_OF_CONDUCT is UNKNOWN. Substantive TZ qualification is fail-closed. Do not use DATE_OF_PROCEDURAL_ACT or today\'s date to select a TZ version.'
      };
      warnings.push(
        'DATE_OF_CONDUCT missing — 300/2005 substantive analysis blocked (LEGAL_VERSION_UNAVAILABLE).'
      );
      if (dateOfProceduralAct) {
        warnings.push(
          `DATE_OF_PROCEDURAL_ACT=${dateOfProceduralAct} recorded but MUST NOT select Trestný zákon version.`
        );
      }
    } else {
      const integrity = (options.integrityCheck || verifyLegalSourceIntegrity)();
      if (!integrity.ok) {
        tzStatus = 'LEGAL_SOURCE_UNAVAILABLE';
        tzEntry = {
          law_id: '300/2005',
          title: LOCAL_LAWS['300/2005'],
          status: 'LEGAL_SOURCE_UNAVAILABLE',
          details:
            integrity.error ||
            'LEGAL_SOURCE integrity verification failed — statutory text not injected.',
          paragraphs: []
        };
        warnings.push(
          `300/2005 LEGAL_SOURCE_UNAVAILABLE: integrity check failed (${integrity.error || 'unknown'}).`
        );
      } else {
        const resolved = resolveLegalVersion({ lawId: '300/2005', incidentDate: dateOfConduct });
        if (resolved.status === 'AVAILABLE' && resolved.version) {
          const manifest = resolved.version;
          const paragraphs = collectParagraphs(paragraphNumbers, topics, manifest);
          tzStatus = paragraphs.length ? 'AVAILABLE' : 'PARTIAL';
          tzEntry = {
            law_id: '300/2005',
            title: manifest.title || LOCAL_LAWS['300/2005'],
            status: tzStatus,
            effective_from: manifest.effective_from,
            effective_to: manifest.effective_to,
            sourceHash: manifest.sha256,
            paragraphs,
            details: paragraphs.length
              ? undefined
              : 'Version covers DATE_OF_CONDUCT but no requested paragraphs were found.'
          };
          if (!paragraphs.length) {
            warnings.push('300/2005 version available but paragraph set empty — PARTIAL.');
          }
        } else {
          const manifest = getLegalSourceManifest();
          tzStatus = 'LEGAL_VERSION_UNAVAILABLE';
          tzEntry = {
            law_id: '300/2005',
            title: LOCAL_LAWS['300/2005'],
            status: 'LEGAL_VERSION_UNAVAILABLE',
            effective_from: manifest.effective_from,
            effective_to: manifest.effective_to,
            sourceHash: manifest.sha256,
            details:
              resolved.details ||
              `DATE_OF_CONDUCT ${dateOfConduct} is outside local dataset window ${manifest.effective_from}–${manifest.effective_to}.`
          };
          warnings.push(
            `300/2005 LEGAL_VERSION_UNAVAILABLE for DATE_OF_CONDUCT=${dateOfConduct} (local window ${manifest.effective_from}→${manifest.effective_to}).`
          );
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tzStatus = 'LEGAL_SOURCE_UNAVAILABLE';
    tzEntry = {
      law_id: '300/2005',
      title: LOCAL_LAWS['300/2005'],
      status: 'LEGAL_SOURCE_UNAVAILABLE',
      details: msg
    };
    warnings.push(`300/2005 load failed: ${msg}`);
  }

  laws.unshift(tzEntry);

  // Overall status: AVAILABLE only if TZ paragraphs are available; else fail-closed / partial
  let status: LegalContextStatus = tzStatus;
  if (tzStatus === 'AVAILABLE' && laws.some((l) => l.status === 'LEGAL_SOURCE_UNAVAILABLE')) {
    status = 'PARTIAL';
    warnings.push(
      'PARTIAL: 300/2005 available for DATE_OF_CONDUCT, but 301/2005 and 460/1992 local sources are unavailable.'
    );
  }

  const contextBlock = renderContextBlock(
    status,
    laws,
    warnings,
    dateOfConduct,
    dateOfProceduralAct
  );

  return {
    status,
    contextBlock,
    laws,
    warnings,
    dateOfConduct,
    dateOfProceduralAct
  };
}

/** Resolve date fields from a Document-like object without inventing values. */
export function extractLegalDatesFromDocument(doc: Record<string, unknown> | null | undefined): {
  dateOfConduct: string | null;
  dateOfProceduralAct: string | null;
} {
  if (!doc || typeof doc !== 'object') {
    return { dateOfConduct: null, dateOfProceduralAct: null };
  }
  const conductKeys = ['date_of_conduct', 'incident_date', 'skutok_date', 'conduct_date'];
  const proceduralKeys = [
    'date_of_procedural_act',
    'interrogation_date',
    'hearing_date',
    'procedural_act_date'
  ];
  let dateOfConduct: string | null = null;
  let dateOfProceduralAct: string | null = null;
  for (const k of conductKeys) {
    dateOfConduct = normalizeDate(typeof doc[k] === 'string' ? (doc[k] as string) : null);
    if (dateOfConduct) break;
  }
  for (const k of proceduralKeys) {
    dateOfProceduralAct = normalizeDate(typeof doc[k] === 'string' ? (doc[k] as string) : null);
    if (dateOfProceduralAct) break;
  }
  return { dateOfConduct, dateOfProceduralAct };
}
