'use strict';

const assert = require('node:assert/strict');
const Structure = require('../outliner-structure.js');

function row(id, depth = 0, completed = false) {
  return { id, depth, completed };
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('completed items are stably archived after active items', () => {
  const items = [row('A'), row('done-1', 0, true), row('B', 1), row('done-2', 2, true), row('C')];
  assert.equal(Structure.archiveCompletedItems(items), true);
  assert.deepEqual(items.map(item => item.id), ['A', 'B', 'C', 'done-1', 'done-2']);
  assert.equal(Structure.isCompletedArchiveNormalized(items), true);
});

test('subtree count includes active descendants but stops before next sibling', () => {
  const items = [row('A', 0), row('B', 1), row('C', 2), row('D', 1), row('E', 0), row('done', 2, true)];
  assert.equal(Structure.getSubtreeCount(items, 0), 4);
  assert.equal(Structure.getSubtreeCount(items, 1), 2);
  assert.equal(Structure.getSubtreeCount(items, 4), 1);
});

test('completed archive rows never become active descendants', () => {
  const items = [row('A', 0), row('B', 1), row('done', 2, true)];
  assert.equal(Structure.getSubtreeCount(items, 0), 2);
  assert.equal(Structure.getSubtreeCount(items, 2), 0);
});

test('fold eligibility is based on active descendants only', () => {
  const onlyCompletedBelow = [row('A', 0), row('done', 1, true)];
  assert.equal(Structure.hasActiveChildren(onlyCompletedBelow, 0), false);

  const activeChildBeforeArchive = [row('A', 0), row('B', 1), row('done', 2, true)];
  assert.equal(Structure.hasActiveChildren(activeChildBeforeArchive, 0), true);
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    passed += 1;
    console.log(`ok ${passed} - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}
console.log(`${passed}/${tests.length} outliner structure tests passed`);
