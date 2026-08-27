import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEntitiesFromOcrText,
  rehydrateMissingEntities,
  replaceDocumentEntitiesInCase
} from '../src/lib/clientOcrPipeline.js';

const FIXTURE_LINES = [
  'ZÁPISNICA O VÝSLUCHU ZADRŽANÉHO - PODOZRIVÉHO',
  'meno, priezvisko, dátum narodenia: Dimitri Cohen, 03.07.1987',
  'predošlé meno a priezvisko: Marek Ivanka',
  'miesto narodenia, okres: Partizánske'
];

const FIXTURE_TEXT = FIXTURE_LINES.join('\n');
const FIXTURE_TITLE = 'Výpoveď číslo 1 - Dimiti Cohen.txt';
const DOC_ID = 'doc_cohen_vypoved_1';

describe('Slovak police zápisnica person extraction', () => {
  test('meno, priezvisko line yields Dimitri Cohen as osoba 1 podozrivý', () => {
    const { persons, summary } = buildEntitiesFromOcrText(
      FIXTURE_TEXT,
      FIXTURE_LINES,
      DOC_ID,
      FIXTURE_TITLE
    );

    assert.strictEqual(persons.length, 1);
    assert.strictEqual(persons[0].name, 'Dimitri Cohen');
    assert.strictEqual(persons[0].type, 'podozrivý');
    assert.match(summary, /1 osôb/);
  });

  test('Marek Ivanka is alias on Cohen, not osoba 1 or separate hub', () => {
    const { persons } = buildEntitiesFromOcrText(
      FIXTURE_TEXT,
      FIXTURE_LINES,
      DOC_ID,
      FIXTURE_TITLE
    );

    assert.strictEqual(persons.length, 1);
    assert.strictEqual(persons[0].name, 'Dimitri Cohen');
    assert.match(persons[0].details, /Predošlé meno: Marek Ivanka/);
    assert.ok(!persons.some((p) => p.name === 'Marek Ivanka'));
  });

  test('witness svedok line is a separate person without displacing Cohen', () => {
    const lines = [...FIXTURE_LINES, 'svedok: Ján Novák'];
    const text = lines.join('\n');
    const { persons } = buildEntitiesFromOcrText(text, lines, DOC_ID, FIXTURE_TITLE);

    assert.strictEqual(persons.length, 2);
    assert.strictEqual(persons[0].name, 'Dimitri Cohen');
    assert.strictEqual(persons[0].type, 'podozrivý');
    assert.strictEqual(persons[1].name, 'Ján Novák');
    assert.strictEqual(persons[1].type, 'svedok');
  });

  test('title typo Dimiti is ignored when meno line is present', () => {
    const { persons } = buildEntitiesFromOcrText(
      FIXTURE_TEXT,
      FIXTURE_LINES,
      DOC_ID,
      'Výpoveď číslo 1 - Dimiti Cohen.txt'
    );

    assert.strictEqual(persons[0].name, 'Dimitri Cohen');
    assert.ok(!persons.some((p) => /Dimiti Cohen/i.test(p.name) && p.name !== 'Dimitri Cohen'));
  });

  test('title fallback used only when meno line is missing', () => {
    const headerOnly = [
      'ZÁPISNICA O VÝSLUCHU ZADRŽANÉHO - PODOZRIVÉHO',
      'miesto narodenia, okres: Partizánske'
    ];
    const { persons } = buildEntitiesFromOcrText(
      headerOnly.join('\n'),
      headerOnly,
      DOC_ID,
      FIXTURE_TITLE
    );

    assert.strictEqual(persons.length, 1);
    assert.strictEqual(persons[0].name, 'Dimiti Cohen');
    assert.strictEqual(persons[0].type, 'podozrivý');
  });

  test('re-running extractor is idempotent — Cohen stays osoba 1 with stable id', () => {
    const first = buildEntitiesFromOcrText(FIXTURE_TEXT, FIXTURE_LINES, DOC_ID, FIXTURE_TITLE);
    const second = buildEntitiesFromOcrText(FIXTURE_TEXT, FIXTURE_LINES, DOC_ID, FIXTURE_TITLE);

    assert.strictEqual(first.persons[0].name, second.persons[0].name);
    assert.strictEqual(first.persons[0].type, second.persons[0].type);
    assert.strictEqual(first.persons[0].id, second.persons[0].id);
    assert.strictEqual(first.persons.length, second.persons.length);
  });

  test('rehydrateMissingEntities fills persons from stored extracted_text', () => {
    const snapshot = {
      documents: [{
        id: DOC_ID,
        title: FIXTURE_TITLE,
        status: 'done',
        extracted_text: FIXTURE_TEXT,
        summary: 'OCR: 58049 znakov, 0 osôb, 26 časových údajov'
      }],
      persons: [],
      events: [],
      claims: [],
      flaggedPassages: []
    };

    const rehydrated = rehydrateMissingEntities(snapshot);

    assert.strictEqual(rehydrated.persons.length, 1);
    assert.strictEqual(rehydrated.persons[0].name, 'Dimitri Cohen');
    assert.strictEqual(rehydrated.persons[0].type, 'podozrivý');
    assert.match(rehydrated.documents[0].summary, /1 osôb/);
  });

  test('replaceDocumentEntitiesInCase swaps entities without duplicating on retry', () => {
    const entities = buildEntitiesFromOcrText(FIXTURE_TEXT, FIXTURE_LINES, DOC_ID, FIXTURE_TITLE);
    const stale = {
      documents: [{ id: DOC_ID, title: FIXTURE_TITLE, extracted_text: FIXTURE_TEXT }],
      persons: [{ id: 'old_p', document_id: DOC_ID, name: 'Ghost', type: 'svedok' }],
      events: [{ id: 'old_ev', document_id: DOC_ID, title: 'stale' }],
      claims: [],
      flaggedPassages: []
    };

    const replaced = replaceDocumentEntitiesInCase(stale, DOC_ID, entities, { summary: entities.summary });

    assert.strictEqual(replaced.persons.length, 1);
    assert.strictEqual(replaced.persons[0].name, 'Dimitri Cohen');
    assert.ok(!replaced.persons.some((p) => p.name === 'Ghost'));
    assert.ok(!replaced.events.some((e) => e.id === 'old_ev'));
  });

  test('ZÁPISNICA O VÝSLUCHU OBVINENÉHO yields type obvinený (not remapped to podozrivý)', () => {
    const lines = [
      'ZÁPISNICA O VÝSLUCHU OBVINENÉHO',
      'meno, priezvisko, dátum narodenia: Dimitri Cohen, 03.07.1987',
      'predošlé meno a priezvisko: Marek Ivanka'
    ];
    const { persons } = buildEntitiesFromOcrText(
      lines.join('\n'),
      lines,
      'doc_obvineny',
      'Výpoveď číslo 2 - Dimitri Cohen.txt'
    );
    assert.strictEqual(persons[0].name, 'Dimitri Cohen');
    assert.strictEqual(persons[0].type, 'obvinený');
  });

  test('A) unknown neutral zápisnica + name => type iná osoba (never invent podozrivý)', () => {
    const lines = [
      'ZÁPISNICA',
      'meno, priezvisko, dátum narodenia: Anna Belá, 01.01.1990',
      'miesto narodenia, okres: Nitra'
    ];
    const { persons } = buildEntitiesFromOcrText(
      lines.join('\n'),
      lines,
      'doc_neutral',
      'Dokument - Anna Belá.txt'
    );
    assert.strictEqual(persons[0].name, 'Anna Belá');
    assert.strictEqual(persons[0].type, 'iná osoba');
  });

  test('C) explicit poškodený Name is extracted as poškodený', () => {
    const line = 'poškodený: Martin Horváth uviedol škody.';
    const { persons } = buildEntitiesFromOcrText(line, [line], 'doc_pos', 'vypoved.txt');
    assert.ok(persons.some((p) => p.name === 'Martin Horváth' && p.type === 'poškodený'));
  });

  test('D) explicit znalec Name is extracted as znalec', () => {
    const line = 'znalec: Eva Králová vypracovala posudok.';
    const { persons } = buildEntitiesFromOcrText(line, [line], 'doc_zn', 'posudok.txt');
    assert.ok(persons.some((p) => p.name === 'Eva Králová' && p.type === 'znalec'));
  });
});
