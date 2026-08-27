import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { create } from 'zustand';
import { resolveEntityArrayUpdate } from '../src/store/entityArraySetter.js';

describe('Entity array setters (bulk upload regression)', () => {
  test('resolveEntityArrayUpdate applies functional updaters to arrays', () => {
    const prev = [{ id: 'doc_1', title: 'a.png' }];
    const next = resolveEntityArrayUpdate(prev, (current) => [
      { id: 'doc_2', title: 'b.png' },
      ...current
    ]);
    assert.deepEqual(next.map((d) => d.id), ['doc_2', 'doc_1']);
  });

  test('resolveEntityArrayUpdate rejects non-array results and keeps previous array', () => {
    const prev = [{ id: 'doc_1' }];
    assert.deepEqual(resolveEntityArrayUpdate(prev, null), prev);
    assert.deepEqual(resolveEntityArrayUpdate(prev, {}), prev);
    assert.deepEqual(resolveEntityArrayUpdate(prev, 'bad'), prev);
  });

  test('setDocuments with updater stores an array — forEach must not throw (o.forEach crash)', () => {
    const useTestStore = create((set, get) => ({
      documents: [],
      setDocuments: (valueOrUpdater) => {
        const next = resolveEntityArrayUpdate(get().documents, valueOrUpdater);
        set({ documents: next });
      }
    }));

    const { setDocuments } = useTestStore.getState();
    setDocuments((prev) => [{ id: 'doc_a', title: 'one.png' }, ...(prev || [])]);
    setDocuments((prev) => [{ id: 'doc_b', title: 'two.png' }, ...(prev || [])]);

    const { documents } = useTestStore.getState();
    assert.strictEqual(typeof documents.forEach, 'function');
    assert.strictEqual(Array.isArray(documents), true);
    assert.strictEqual(documents.length, 2);

    let count = 0;
    assert.doesNotThrow(() => {
      documents.forEach(() => {
        count++;
      });
    });
    assert.strictEqual(count, 2);
  });
});
