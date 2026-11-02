'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const nav = require('../tab-navigation-core.js');
const peek = require('../sidepanel-tab-peek.js');

const source = [
  { id: 'a', title: '企画', mode: 'outliner', items: [] },
  { id: 'b', title: '調査', mode: 'outliner', items: [{ text: 'keep' }], bgColor: 'blue' },
  { id: 'c', title: 'アイデア', mode: 'text', content: 'abc' },
  { id: 'd', title: '議事録', mode: 'text', content: 'def' }
];
let count = 0;
function check(label, actual, expected) {
  assert.deepEqual(actual, expected, label);
  count++;
}
check('moves to first', nav.moveTabToIndex(source, 'c', 0).tabs.map(x => x.id), ['c','a','b','d']);
check('moves to last', nav.moveTabToIndex(source, 'b', 3).tabs.map(x => x.id), ['a','c','d','b']);
check('moves forward one', nav.moveTabToIndex(source, 'b', 2).tabs.map(x => x.id), ['a','c','b','d']);
check('moves backward one', nav.moveTabToIndex(source, 'd', 2).tabs.map(x => x.id), ['a','b','d','c']);
check('never mutates source', source.map(x => x.id), ['a','b','c','d']);
check('keeps memo object and metadata', nav.moveTabToIndex(source, 'b', 3).tabs[3], source[1]);
check('does not mutate on same position', nav.moveTabToIndex(source, 'b', 1).moved, false);
check('invalid index cannot move', nav.moveTabToIndex(source, 'b', 4).moved, false);
check('negative index cannot move', nav.moveTabToIndex(source, 'b', -1).moved, false);
check('fractional index cannot move', nav.moveTabToIndex(source, 'b', 1.5).moved, false);
check('unknown id cannot move', nav.moveTabToIndex(source, 'missing', 1).moved, false);
check('null input harmless', nav.moveTabToIndex(null, 'a', 0).moved, false);
check('only one tab cannot move', nav.moveTabToIndex([source[0]], 'a', 0).moved, false);
check('one tab has no choices', nav.tabMoveDestinations([source[0]], 'a'), []);
const positions = nav.tabMoveDestinations(source, 'b');
check('destination count', positions.length, 4);
check('first destination label', positions[0].label, '先頭へ');
check('second destination is current', positions[1].current, true);
check('second is after first tab', positions[1].label, '企画の後へ');
check('third destination refers to surviving neighbor', positions[2].label, 'アイデアの後へ');
check('last destination label', positions[3].label, '末尾へ');
check('first insertion before', positions[0].insertBeforeId, 'a');
check('last insertion after', positions[3].insertAfterId, 'd');
check('destination index always absolute', positions.map(x => x.index), [0,1,2,3]);
const many = Array.from({ length: 50 }, (_, i) => ({ id: String(i), title: 'メモ' + i }));
check('50-tab reorder', nav.moveTabToIndex(many, '3', 49).tabs.at(-1).id, '3');
check('50-tab destinations', nav.tabMoveDestinations(many, '3').length, 50);
check('text peek omits blank lines', peek.previewLines({ mode: 'text', content: '\n One\n\nTwo\nThree\nFour' }), ['One','Two','Three']);
check('outliner peek uses active top-level content', peek.previewLines({
  mode: 'outliner', items: [
    { text: 'First', depth: 0, completed: false },
    { text: 'hidden child', depth: 1, completed: false },
    { text: 'completed', depth: 0, completed: true },
    { text: 'Second', depth: 0, completed: false }
  ]
}), ['First','Second']);
check('empty peek stays invisible', peek.previewLines({ mode: 'outliner', items: [] }), []);
check('long content constrained', peek.previewLines({ mode: 'text', content: 'x'.repeat(300) })[0].length, 110);

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'sidepanel.html'), 'utf8');
const tabUI = fs.readFileSync(path.join(root, 'sidepanel-tabs.js'), 'utf8');
const moveUI = fs.readFileSync(path.join(root, 'sidepanel-tab-move.js'), 'utf8');
const peekUI = fs.readFileSync(path.join(root, 'sidepanel-tab-peek.js'), 'utf8');
check('modules loaded after core', html.indexOf('tab-navigation-core.js') < html.indexOf('sidepanel-tab-move.js'), true);
check('peek module loaded', html.includes('sidepanel-tab-peek.js'), true);
check('actions CSS loaded', html.includes('sidepanel-tab-actions.css'), true);
check('tab menu has integration hook', tabUI.includes('MemoTabMove?.mountContextEntry(menu, tabId)'), true);
check('tab rendering attaches peek', tabUI.includes('MemoTabPeek?.attach(div, tab.id)'), true);
check('move must not rerender memo editor', /\brenderEditor\s*\(/.test(moveUI), false);
check('move must not switch active memo', /\bswitchTab\s*\(/.test(moveUI), false);
check('peek must not write storage', /chrome\.storage|saveData\s*\(/.test(peekUI), false);
check('move keeps undo conditional on unchanged order', moveUI.includes('expectedOrder'), true);
console.log('tab-move-peek.test.js: ' + count + '/' + count + ' passed');
