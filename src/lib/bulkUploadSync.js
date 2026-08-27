/**
 * Post-bulk-upload sync helpers — guest/offline must not call cloud fetch
 * (fetchData overwrites locally created documents with stale/empty cache).
 */

export function shouldSyncBulkViaOfflineOnly({ localOnlyCount, cloudCount }) {
  return localOnlyCount > 0 && cloudCount === 0;
}

export function buildBulkOfflineSuccessMessage(count) {
  if (count === 1) {
    return 'Spis bol načítaný a bezpečne uložený do lokálneho archívu (IndexedDB). AI analýza vyžaduje pripojenie na server.';
  }
  return `${count} súborov bolo načítaných a uložených do lokálneho archívu (IndexedDB). AI analýza vyžaduje pripojenie na server.`;
}

export function buildBulkAnalyzeFailureMessage(failedCount) {
  if (!failedCount || failedCount <= 0) return null;
  if (failedCount === 1) {
    return 'Jeden súbor bol uložený, ale AI analýza zlyhala — skúste to znova po pripojení na server.';
  }
  return `${failedCount} súborov bolo uložených, ale AI analýza zlyhala — skúste to znova po pripojení na server.`;
}

/** Strip transient flags before persisting a case snapshot. */
export function casePayloadFromStore(state) {
  const stripLocal = (doc) => {
    if (!doc || typeof doc !== 'object') return doc;
    const { __localOnly, ...rest } = doc;
    return rest;
  };
  return {
    documents: (state.documents || []).map(stripLocal),
    persons: state.persons || [],
    relationships: state.relationships || [],
    redFlags: state.redFlags || [],
    flaggedPassages: state.flaggedPassages || [],
    claims: state.claims || [],
    events: state.events || [],
    locations: state.locations || [],
    vehicles: state.vehicles || [],
    contradictions: state.contradictions || [],
    overrides: state.overrides || []
  };
}

/** Re-merge locally created docs after a cloud fetch (mixed online/offline batch). */
export function mergeLocalDocuments(existingDocs, localSnapshots) {
  const current = Array.isArray(existingDocs) ? existingDocs : [];
  const locals = Array.isArray(localSnapshots) ? localSnapshots : [];
  if (!locals.length) return current;
  const ids = new Set(current.map((d) => d?.id).filter(Boolean));
  const toAdd = locals.filter((d) => d?.id && !ids.has(d.id));
  return toAdd.length ? [...toAdd, ...current] : current;
}
