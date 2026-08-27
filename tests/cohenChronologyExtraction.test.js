import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildEntitiesFromOcrText,
  rehydrateMissingEntities,
  CLIENT_EXTRACTION_VERSION
} from '../src/lib/clientOcrPipeline.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_TEXT = readFileSync(
  join(__dirname, 'fixtures/Dimitri-Cohen-chronologia-cele.txt'),
  'utf8'
);
const FIXTURE_LINES = FIXTURE_TEXT.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const DOC_ID = 'doc_cohen_chronology';
const DOC_TITLE = 'Dimitri-Cohen-chronologia-cele.txt';

function hasPersonToken(persons, token) {
  return persons.some(
    (p) =>
      p.name.includes(token) ||
      p.name.split(/\s+/).some((part) => part.includes(token))
  );
}

function simulateGraphNodes(persons, relationships) {
  return relationships
    .map((r) => {
      const source = persons.find((p) => p.document_id === r.document_id && p.name === r.source_name);
      const target = persons.find((p) => p.document_id === r.document_id && p.name === r.target_name);
      return source && target ? { source: source.id, target: target.id } : null;
    })
    .filter(Boolean);
}

describe('Cohen chronology merit/Q&A extraction', () => {
  test('persons[0] is Dimitri Cohen podozrivý; alias not a separate person', () => {
    const { persons } = buildEntitiesFromOcrText(FIXTURE_TEXT, FIXTURE_LINES, DOC_ID, DOC_TITLE);

    assert.strictEqual(persons[0].name, 'Dimitri Cohen');
    assert.strictEqual(persons[0].type, 'podozrivý');
    assert.ok(!persons.some((p) => p.name === 'Marek Ivanka'));
    assert.match(persons[0].details, /Predošlé meno: Marek Ivanka/);
  });

  test('extracts merit/Q&A names and hub relationships from chronology excerpt', () => {
    const { persons, relationships } = buildEntitiesFromOcrText(
      FIXTURE_TEXT,
      FIXTURE_LINES,
      DOC_ID,
      DOC_TITLE
    );

    assert.ok(persons.length >= 6);
    for (const token of ['Tomčík', 'Babčan', 'Ľubo', 'Marjov', 'Skyrčák']) {
      assert.ok(hasPersonToken(persons, token), `missing person token: ${token}`);
    }
    // Particle "to" must not become part of the person name
    assert.ok(!persons.some((p) => /\bto\b/i.test(p.name)), 'person name must not include clitic "to"');

    assert.ok(relationships.length >= 5);
    for (const rel of relationships) {
      assert.ok(
        rel.source_name === 'Dimitri Cohen' || rel.target_name === 'Dimitri Cohen',
        `relationship missing Cohen hub: ${rel.source_name} -> ${rel.target_name}`
      );
      assert.ok(rel.document_id === DOC_ID);
      assert.ok(rel.source_name && rel.target_name && rel.label);
      // Evidence: description is the exact supporting fragment (may be empty only if no quote)
      if (rel.description) {
        assert.ok(
          FIXTURE_TEXT.includes(rel.description.trim()) ||
            FIXTURE_TEXT.toLowerCase().includes(rel.description.trim().toLowerCase()),
          `description must be a source fragment: ${rel.description}`
        );
      }
    }

    const babcan = relationships.find((r) => /Babčan/i.test(r.target_name));
    assert.ok(babcan, 'Babčan relationship');
    assert.strictEqual(babcan.label, 'sme známi');

    const weak = relationships.find((r) => /Tomčík/i.test(r.target_name));
    assert.ok(weak);
    assert.strictEqual(weak.label, 'spomenutý vo výpovedi');

    const graphNodes = simulateGraphNodes(persons, relationships);
    assert.strictEqual(graphNodes.length, persons.length - 1);
  });

  test('filters sentence-fragment and legal noise from person list', () => {
    const { persons, relationships } = buildEntitiesFromOcrText(
      FIXTURE_TEXT,
      FIXTURE_LINES,
      DOC_ID,
      DOC_TITLE
    );

    const noiseExact = [
      'Ja som',
      'Ak',
      'On',
      'To',
      'Postup',
      'Trestného poriadku',
      'Proste som',
      'Erikovi Babčanovi',
      'Následne mi',
      'Jeho mal',
      'Vtedy som',
      'Skyrčák ich',
      'PZ',
      'PZ mjr'
    ];
    for (const noise of noiseExact) {
      assert.ok(
        !persons.some((p) => p.name === noise),
        `noise person must be absent: ${noise}`
      );
    }

    const noiseFragments = ['Ja som', 'Proste som', 'Trestného poriadku', ' som ', ' poriadku '];
    for (const fragment of noiseFragments) {
      assert.ok(
        !persons.some((p) => p.name.includes(fragment)),
        `person name must not contain fragment: ${fragment}`
      );
    }

    assert.ok(persons.length >= 6);
    assert.ok(persons.length <= 16);
    assert.ok(!persons.some((p) => p.name === 'Erikovi Babčanovi'));
    assert.ok(persons.some((p) => p.name === 'Erik Babčan'));
    assert.strictEqual(relationships.length, persons.length - 1);
  });

  test('rehydrateMissingEntities rebuilds from extracted_text with counts + version', () => {
    const snapshot = {
      documents: [{
        id: DOC_ID,
        title: DOC_TITLE,
        status: 'done',
        extracted_text: FIXTURE_TEXT,
        person_count: 0,
        relationship_count: 0,
        red_flag_count: 0,
        client_extraction_version: 1,
        summary: 'OCR: 86253 znakov, 1 osôb, 47 časových údajov'
      }],
      persons: [{ id: 'stale', document_id: DOC_ID, name: 'Dimitri Cohen', type: 'podozrivý' }],
      relationships: [],
      events: [],
      claims: [],
      flaggedPassages: []
    };

    const rehydrated = rehydrateMissingEntities(snapshot);
    const docPersons = rehydrated.persons.filter((p) => p.document_id === DOC_ID);

    assert.ok(docPersons.length >= 6);
    assert.strictEqual(rehydrated.documents[0].person_count, docPersons.length);
    assert.ok(rehydrated.documents[0].relationship_count >= 5);
    assert.ok(rehydrated.relationships.length >= 5);
    assert.strictEqual(rehydrated.documents[0].client_extraction_version, CLIENT_EXTRACTION_VERSION);
  });

  test('version-aware rehydrate is idempotent when already current', () => {
    const first = rehydrateMissingEntities({
      documents: [{
        id: DOC_ID,
        title: DOC_TITLE,
        status: 'done',
        extracted_text: FIXTURE_TEXT,
        person_count: 0,
        relationship_count: 0
      }],
      persons: [],
      relationships: []
    });
    const second = rehydrateMissingEntities(first);
    assert.strictEqual(second, first);
    assert.strictEqual(first.documents[0].client_extraction_version, CLIENT_EXTRACTION_VERSION);
  });
});
