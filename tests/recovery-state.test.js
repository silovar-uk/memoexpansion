const assert = require('assert');
const recovery = require('../recovery-state.js');

assert.deepStrictEqual(
  recovery.parseStoredTabs(undefined),
  { status: 'missing', tabs: [], reason: null },
  'missing storage should remain a normal empty state'
);

assert.deepStrictEqual(
  recovery.parseStoredTabs('[]'),
  { status: 'ok', tabs: [], reason: null },
  'valid empty JSON should be accepted'
);

const oneTab = recovery.parseStoredTabs('[{"id":"a"}]');
assert.strictEqual(oneTab.status, 'ok');
assert.strictEqual(oneTab.tabs[0].id, 'a');

assert.strictEqual(recovery.parseStoredTabs('{broken').status, 'invalid');
assert.strictEqual(recovery.parseStoredTabs('{}').status, 'invalid');
assert.strictEqual(recovery.parseStoredTabs({}).status, 'invalid');
assert.strictEqual(recovery.shouldBlockWrites('invalid'), true);
assert.strictEqual(recovery.shouldBlockWrites('missing'), false);
assert.strictEqual(recovery.shouldBlockWrites('ok'), false);

const tabs = [{ id: 'a' }, { id: 'b' }];
assert.strictEqual(recovery.resolveActiveTabId(tabs, 'b'), 'b');
assert.strictEqual(recovery.resolveActiveTabId(tabs, 'missing'), 'a');
assert.strictEqual(recovery.resolveActiveTabId([], 'a'), null);
assert.strictEqual(recovery.resolveActiveTabId([{ title: 'bad' }, { id: 'b' }], null), 'b');

console.log('recovery-state.test.js: 14/14 passed');
