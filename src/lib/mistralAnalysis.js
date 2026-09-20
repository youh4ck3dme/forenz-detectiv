/**
 * Convert Mistral forensic JSON (nodes/edges/…) into client_ocr-compatible entities.
 */
function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

export function mistralAnalysisToEntities(analysis, documentId, documentTitle = '') {
  const nodes = asArray(analysis?.nodes);
  const edges = asArray(analysis?.edges);
  const redFlagsRaw = asArray(analysis?.red_flags);
  const flagged = asArray(analysis?.flagged_passages);
  const events = asArray(analysis?.events);
  const claims = asArray(analysis?.claims);
  const locations = asArray(analysis?.locations);
  const vehicles = asArray(analysis?.vehicles);

  const persons = nodes
    .map((n) => {
      const label = String(n?.label || '').trim();
      if (!label) return null;
      return {
        id: uid('person'),
        document_id: documentId,
        name: label,
        type: n?.type || 'iná osoba',
        details: String(n?.details || '').slice(0, 1000),
        source: 'mistral'
      };
    })
    .filter(Boolean);

  const nameToId = new Map(persons.map((p) => [p.name.toLowerCase(), p.id]));

  const resolvePerson = (ref) => {
    const key = String(ref || '').trim().toLowerCase();
    if (!key) return null;
    if (nameToId.has(key)) return nameToId.get(key);
    const byLabel = persons.find((p) => p.name.toLowerCase() === key);
    return byLabel?.id || null;
  };

  const relationships = edges
    .map((e) => {
      const sourceName = String(e?.source || '').trim();
      const targetName = String(e?.target || '').trim();
      if (!sourceName || !targetName) return null;
      return {
        id: uid('rel'),
        document_id: documentId,
        source_name: sourceName,
        target_name: targetName,
        source_id: resolvePerson(sourceName),
        target_id: resolvePerson(targetName),
        label: String(e?.label || 'vzťah').slice(0, 200),
        time: String(e?.time || ''),
        description: String(e?.description || '').slice(0, 2000),
        source: 'mistral'
      };
    })
    .filter(Boolean);

  const redFlags = redFlagsRaw
    .map((rf) => {
      const text = typeof rf === 'string' ? rf : rf?.text || rf?.description || '';
      if (!text) return null;
      return {
        id: uid('rf'),
        document_id: documentId,
        description: String(text).slice(0, 2000),
        severity: 'medium',
        source: 'mistral'
      };
    })
    .filter(Boolean);

  const flaggedPassages = flagged
    .map((fp) => {
      const text = String(fp?.text || '').trim();
      if (!text) return null;
      return {
        id: uid('fp'),
        document_id: documentId,
        text: text.slice(0, 1000),
        category: fp?.category === 'rozpor' ? 'rozpor' : 'neistota',
        explanation: String(fp?.explanation || '').slice(0, 1000),
        source: 'mistral'
      };
    })
    .filter(Boolean);

  const mappedEvents = events
    .map((ev) => {
      const title = String(ev?.title || '').trim();
      if (!title) return null;
      return {
        id: uid('evt'),
        document_id: documentId,
        title,
        type: String(ev?.type || 'udalosť'),
        persons: asArray(ev?.persons).map(String),
        date: String(ev?.date || ''),
        time: String(ev?.time || ''),
        approximate_time: !!ev?.approximate_time,
        location: String(ev?.location || ''),
        description: String(ev?.description || ''),
        source_quote: String(ev?.source_quote || ''),
        confidence: Number(ev?.confidence) || 0,
        source: 'mistral'
      };
    })
    .filter(Boolean);

  const mappedClaims = claims
    .map((c) => {
      const subject = String(c?.subject || '').trim();
      if (!subject) return null;
      return {
        id: uid('claim'),
        document_id: documentId,
        subject,
        predicate: String(c?.predicate || ''),
        object: String(c?.object || ''),
        event_date: String(c?.event_date || ''),
        event_time: String(c?.event_time || ''),
        approximate_time: !!c?.approximate_time,
        location: String(c?.location || ''),
        source_quote: String(c?.source_quote || ''),
        confidence: Number(c?.confidence) || 0,
        source: 'mistral'
      };
    })
    .filter(Boolean);

  const mappedLocations = locations
    .map((loc) => {
      const name = String(loc?.name || '').trim();
      if (!name) return null;
      return {
        id: uid('loc'),
        document_id: documentId,
        name,
        address: String(loc?.address || ''),
        source_quote: String(loc?.source_quote || ''),
        confidence: Number(loc?.confidence) || 0,
        source: 'mistral'
      };
    })
    .filter(Boolean);

  const mappedVehicles = vehicles
    .map((v) => {
      const brand = String(v?.brand_model || v?.type || '').trim();
      if (!brand && !v?.license_plate) return null;
      return {
        id: uid('veh'),
        document_id: documentId,
        type: String(v?.type || ''),
        brand_model: brand,
        color: String(v?.color || ''),
        license_plate: String(v?.license_plate || ''),
        owner_name: String(v?.owner_name || ''),
        source_quote: String(v?.source_quote || ''),
        confidence: Number(v?.confidence) || 0,
        source: 'mistral'
      };
    })
    .filter(Boolean);

  return {
    source: 'mistral',
    documentId,
    documentTitle,
    entities: {
      persons,
      relationships,
      redFlags,
      flaggedPassages,
      claims: mappedClaims,
      events: mappedEvents,
      locations: mappedLocations,
      vehicles: mappedVehicles
    },
    documentPatch: {
      status: 'done',
      analysis_source: 'mistral',
      last_error: ''
    }
  };
}
