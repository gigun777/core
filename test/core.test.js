import test from 'node:test';
import assert from 'node:assert/strict';

import { computeNumbering, canGoBackJournal, canGoBackSpace, currentJournalLabel, plusCreatesOnlyChildren } from '../src/core/navigation_core.js';
import { deleteSpaceSubtree } from '../src/core/spaces_tree_core.js';
import { deleteJournalSubtree } from '../src/core/journal_tree_core.js';
import { createSEDO, createMemoryStorage, createNavi } from '../src/index.js';

test('numbering supports 1, 1.2, 1.2.3 pattern fragments', () => {
  const numbering = computeNumbering(['1', '2', '3']);
  assert.deepEqual(numbering, ['1', '1.2', '1.2.3']);
});

test('back and plus rules', () => {
  assert.equal(canGoBackSpace({ parentId: null }), false);
  assert.equal(canGoBackSpace({ parentId: 'root' }), true);
  assert.equal(canGoBackJournal({ parentId: 'space-1' }, 'space-1'), false);
  assert.equal(canGoBackJournal({ parentId: 'journal-1' }, 'space-1'), true);
  assert.equal(plusCreatesOnlyChildren(), true);
});

test('delete subtree works for spaces and journals', () => {
  const spaces = [
    { id: 'r', parentId: null, childCount: 2 },
    { id: 'a', parentId: 'r', childCount: 0 },
    { id: 'b', parentId: 'r', childCount: 1 },
    { id: 'c', parentId: 'b', childCount: 0 }
  ];
  const result = deleteSpaceSubtree(spaces, 'b');
  assert.deepEqual([...result.removedIds].sort(), ['b', 'c']);

  const journals = [
    { id: 'j1', parentId: 'space-1', childCount: 1 },
    { id: 'j2', parentId: 'j1', childCount: 0 }
  ];
  const jRes = deleteJournalSubtree(journals, 'j1');
  assert.deepEqual([...jRes.removedIds].sort(), ['j1', 'j2']);
});

test('empty space shows add journal label', () => {
  const label = currentJournalLabel({ journals: [], activeSpaceId: 's1', activeJournalId: null });
  assert.equal(label, 'Додай журнал');
});

test('integration: create space/journal then delete with commit pipeline', async () => {
  const sdo = createSEDO({ storage: createMemoryStorage() });
  await sdo.start();

  await sdo.commit((state) => {
    state.spaces = [{ id: 's-root', title: 'Root', parentId: null, childCount: 0 }];
    state.activeSpaceId = 's-root';
  }, ['spaces_nodes_v2']);

  await sdo.commit((state) => {
    state.journals = [{ id: 'j-root', spaceId: 's-root', parentId: 's-root', templateId: 'base', title: 'J1', childCount: 0 }];
    state.activeJournalId = 'j-root';
  }, ['journals_nodes_v2']);

  let snapshot = sdo.getState();
  assert.equal(snapshot.activeSpaceId, 's-root');
  assert.equal(snapshot.activeJournalId, 'j-root');

  await sdo.commit((state) => {
    state.journals = [];
    state.activeJournalId = null;
  }, ['journals_nodes_v2']);

  snapshot = sdo.getState();
  assert.equal(snapshot.journals.length, 0);
  assert.equal(snapshot.activeJournalId, null);
});

test('createNavi uses v2 payload contract', async () => {
  const storage = createMemoryStorage();
  const navi = createNavi(storage);

  await navi.importNavigationState({
    spaces_nodes_v2: [{ id: 's', title: 'S', parentId: null, childCount: 0 }],
    journals_nodes_v2: [],
    nav_last_loc_v2: { activeSpaceId: 's', activeJournalId: null },
    nav_history_v2: []
  });

  const exported = await navi.exportNavigationState();
  assert.equal(exported.spaces_nodes_v2[0].id, 's');
  assert.equal(exported.nav_last_loc_v2.activeSpaceId, 's');
});

test('importBackup fails on invalid integrity hash', async () => {
  const sdo = createSEDO({ storage: createMemoryStorage() });
  await sdo.start();

  const bundle = await sdo.exportBackup();
  bundle.integrity.payloadHashB64 = 'invalid';

  await assert.rejects(() => sdo.importBackup(bundle), /integrity check failed/);
});
