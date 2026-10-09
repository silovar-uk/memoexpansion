'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const nav = require('../tab-navigation-core.js');

let tabs = [
  { id: 'a', title: 'first' },
  { id: 'b', title: 'second' },
  { id: 'c', title: 'third' }
];
let activeTabId = 'a';
let focused = null, switchCount = 0, dirtyCount = 0, saveCount = 0;
let renderCount = 0, restoredCount = 0, handler = null;
let tabNodes = [];

function node(id) {
  return {
    dataset: { tabId: id },
    tabIndex: -1,
    matches(selector) { return selector === '.tab[role="tab"]'; },
    focus() { focused = this; },
    scrollIntoView() {}
  };
}
function renderTabs() {
  renderCount++;
  tabNodes = tabs.map(tab => node(tab.id));
}
const strip = {
  querySelectorAll() { return tabNodes; },
  addEventListener(name, listener) {
    assert.equal(name, 'keydown');
    handler = listener;
  }
};
const context = {
  window: {
    MemoTabNavigation: nav,
    MemoFocus: { focusCurrentMemo() { restoredCount++; } }
  },
  document: { getElementById(name) { return name === 'tab-list' ? strip : null; } },
  get tabs() { return tabs; },
  get activeTabId() { return activeTabId; },
  switchTab(id) {
    switchCount++;
    activeTabId = id;
    renderTabs();
  },
  markAsDirty() { dirtyCount++; },
  saveData() { saveCount++; },
  renderTabs
};
renderTabs();
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../sidepanel-tab-keyboard.js'), 'utf8'), context);

function send(target, key, options = {}) {
  let prevented = false, stopped = false;
  const event = {
    target, key, code: options.code || '',
    altKey: false, ctrlKey: false, metaKey: false, shiftKey: false,
    isComposing: false, keyCode: 0, defaultPrevented: false,
    preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; },
    ...options
  };
  handler(event);
  return { prevented, stopped };
}

let checks = 0;
function check(label, actual, expected) {
  assert.deepEqual(actual, expected, label);
  checks++;
}
check('navigation handler attached', typeof handler, 'function');
send(tabNodes[0], 'ArrowRight');
check('arrows only move focus', focused?.dataset.tabId, 'b');
check('arrow does not switch memo', switchCount, 0);
check('roving tabindex', tabNodes.map(t => t.tabIndex), [-1, 0, -1]);
send(tabNodes[1], 'Home');
check('Home returns focus to first', focused?.dataset.tabId, 'a');
send(tabNodes[0], 'End');
check('End takes focus to final', focused?.dataset.tabId, 'c');
send(tabNodes[0], '3', { code: 'Digit3', altKey: true });
check('Alt+3 remains free', switchCount, 0);
send(tabNodes[0], '3', { code: 'Digit3', ctrlKey: true });
check('Ctrl+3 remains free', switchCount, 0);
send(tabNodes[0], '3', { code: 'Digit3', shiftKey: true });
check('Shift+3 remains free', switchCount, 0);
send(tabNodes[0], '3', { code: 'Digit3', isComposing: true });
check('IME composition remains free', switchCount, 0);
send(tabNodes[0], '3', { code: 'Digit3', keyCode: 229 });
check('IME 229 remains free', switchCount, 0);
send({ matches() { return false; } }, '3', { code: 'Digit3' });
check('editor key remains free', switchCount, 0);
send(tabNodes[0], '3', { code: 'Digit3' });
check('focused tab numeric jump switches', activeTabId, 'c');
check('numeric switch happened once', switchCount, 1);
send(tabNodes[2], '3', { code: 'Digit3' });
check('already-active numeric jump restores focus', restoredCount, 1);
send(tabNodes[1], 'ArrowRight', { ctrlKey: true, shiftKey: true });
check('reorder changed tab order', tabs.map(t => t.id), ['a', 'c', 'b']);
check('reorder changes dirty flag once', dirtyCount, 1);
check('reorder saves once', saveCount, 1);
check('reorder keeps moved item keyboard focused', focused?.dataset.tabId, 'b');
send(tabNodes[2], 'ArrowRight', { ctrlKey: true, shiftKey: true });
check('boundary reorder ignored', dirtyCount, 1);
check('reorder does not switch active memo', activeTabId, 'c');
check('reorder renders tablist but not editor', renderCount, 3);
console.log('tab-keyboard-behavior.test.js: ' + checks + '/' + checks + ' passed');
