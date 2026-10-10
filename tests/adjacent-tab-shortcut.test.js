'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const navigation = require('../tab-navigation-core.js');
let tabs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
let activeTabId = 'b';
let changes = [], handler, capture, popup = false, newTabMenu = false, historyModal = false;

const document = {
  addEventListener(name, callback, useCapture) {
    assert.equal(name, 'keydown');
    handler = callback;
    capture = useCapture;
  },
  querySelector() { return popup ? {} : null; },
  getElementById(id) {
    if (id === 'new-tab-menu') return { style: { display: newTabMenu ? 'flex' : 'none' } };
    if (id === 'history-modal') return { style: { display: historyModal ? 'flex' : 'none' } };
    return null;
  }
};
const context = {
  document,
  window: { MemoTabNavigation: navigation },
  get tabs() { return tabs; },
  get activeTabId() { return activeTabId; },
  switchTab(id) { changes.push(id); activeTabId = id; }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'sidepanel-adjacent-navigation.js'), 'utf8'), context);

let checks = 0;
function check(label, actual, expected) {
  assert.deepEqual(actual, expected, label);
  checks++;
}
function press(key, changesToEvent = {}) {
  let prevented = false, stopped = false;
  const event = {
    key, altKey: true, shiftKey: true, ctrlKey: false, metaKey: false,
    isComposing: false, keyCode: 0, repeat: false, defaultPrevented: false,
    target: { closest() { return null; }, isContentEditable: false },
    preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; },
    ...changesToEvent
  };
  handler(event);
  return { prevented, stopped };
}
check('listener captures before text editing', capture, true);
check('next tab', press('ArrowRight'), { prevented: true, stopped: true });
check('next updated active', activeTabId, 'c');
press('ArrowLeft');
check('previous tab', activeTabId, 'b');
press('ArrowLeft');
check('previous to first', activeTabId, 'a');
press('ArrowLeft');
check('previous wraps to last', activeTabId, 'd');
press('ArrowRight');
check('next wraps to first', activeTabId, 'a');
const validSwitches = changes.length;
check('plain Alt+arrow remains browser key', press('ArrowLeft', { shiftKey: false }).prevented, false);
check('Shift+arrow remains editor key', press('ArrowLeft', { altKey: false }).prevented, false);
check('Alt+Q remains reserved', press('q').prevented, false);
check('Alt+digit remains reserved', press('1').prevented, false);
check('Ctrl modifier is not intercepted', press('ArrowRight', { ctrlKey: true }).prevented, false);
check('Meta modifier is not intercepted', press('ArrowRight', { metaKey: true }).prevented, false);
check('not composing', press('ArrowRight', { isComposing: true }).prevented, false);
check('229 composition guard', press('ArrowRight', { keyCode: 229 }).prevented, false);
check('already-handled key respected', press('ArrowRight', { defaultPrevented: true }).prevented, false);
check('repeat is consumed but does not switch', press('ArrowRight', { repeat: true }).prevented, true);
check('repeat did not move', changes.length, validSwitches);
popup = true;
check('open dialog prevents switching', press('ArrowRight').prevented, false);
popup = false; newTabMenu = true;
check('new-tab menu prevents switching', press('ArrowRight').prevented, false);
newTabMenu = false; historyModal = true;
check('history modal prevents switching', press('ArrowRight').prevented, false);
historyModal = false;
check('tab title editing prevents switching', press('ArrowRight', {
  target: { closest(selector) { return selector === '.tab input' ? {} : null; } }
}).prevented, false);
check('contenteditable prevents switching', press('ArrowRight', {
  target: { closest() { return null; }, isContentEditable: true }
}).prevented, false);
check('no wrong switches from guarded shortcuts', changes.length, validSwitches);
tabs = [{ id: 'a' }]; activeTabId = 'a';
check('single tab no-op', press('ArrowRight').prevented, false);
tabs = []; activeTabId = 'absent';
check('empty tab list no-op', press('ArrowRight').prevented, false);
tabs = [{ id: 'a' }, { id: 'b' }]; activeTabId = 'missing';
check('unknown active tab no-op', press('ArrowRight').prevented, false);
console.log('adjacent-tab-shortcut.test.js: ' + checks + '/' + checks + ' passed');
