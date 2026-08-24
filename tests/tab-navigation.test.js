const assert = require('assert');
const nav = require('../tab-navigation-core.js');

const tabs = [
  { id: 'a', title: '仕事メモ', mode: 'outliner' },
  { id: 'b', title: 'English Notes', mode: 'text' },
  { id: 'c', title: '買い物リスト', mode: 'outliner' },
];

assert.equal(nav.normalizeText(' ＡＢＣ '), 'abc');
assert.deepEqual(nav.filterTabs(tabs, '').map(t => t.id), ['a', 'b', 'c']);
assert.deepEqual(nav.filterTabs(tabs, 'english').map(t => t.id), ['b']);
assert.equal(nav.activeResultIndex(tabs, 'b'), 1);
assert.equal(nav.activeResultIndex(tabs, 'missing'), 0);
assert.equal(nav.moveResultIndex(2, 3, 1), 0);
assert.equal(nav.moveResultIndex(0, 3, -1), 2);
assert.equal(nav.moveResultIndex(-1, 0, 1), -1);

console.log('tab-navigation.test.js: 8/8 passed');
