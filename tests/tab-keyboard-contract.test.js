'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const html = read('sidepanel.html');
const tabs = read('sidepanel-tabs.js');
const keyboard = read('sidepanel-tab-keyboard.js');
const css = read('sidepanel-tab-keyboard.css');
const navigation = read('sidepanel-navigation.js');
const manifest = JSON.parse(read('manifest.json'));
const checks = [
  ['position badge is derived from tab order', /tabs\.forEach\(\(tab, index\) =>/.test(tabs) && /number\.textContent = String\(index \+ 1\)/.test(tabs)],
  ['number never changes memo title', tabs.includes("number.setAttribute('aria-hidden', 'true')") && tabs.includes('titleSpan.textContent = tab.title')],
  ['manual activation by keyboard only in tablist', keyboard.includes("strip.addEventListener('keydown'") && keyboard.includes("target?.matches?.('.tab[role=\"tab\"]')")],
  ['direct jump only when tab itself focused', keyboard.includes('tabIndexForNumberKey(event.key, event.code, tabs.length)')],
  ['IME is protected', keyboard.includes('event.isComposing') && keyboard.includes('event.keyCode === 229')],
  ['reserved Alt combinations are passed through', keyboard.includes('if (event.altKey || event.metaKey) return')],
  ['Ctrl+digit is never interpreted as jump', keyboard.includes('if (event.ctrlKey || event.shiftKey)')],
  ['arrows focus without switching editor', keyboard.includes('focusTabAt(targetIndex)')],
  ['existing tab switching is reused', keyboard.includes('switchTab(tab.id)')],
  ['reorder reuses persistence and does not render editor', keyboard.includes('markAsDirty()') && keyboard.includes('saveData()') && keyboard.includes('renderTabs()') && !keyboard.includes('renderEditor(')],
  ['reorder keeps focus on moved tab', keyboard.includes('focusTabAt(result.index)')],
  ['search result number remains original order', navigation.includes("tabs.indexOf(tab) + 1")],
  ['tab toolbar owns additional style', html.includes('sidepanel-tab-keyboard.css') && css.includes('.tab-position')],
  ['tab keyboard loaded after navigation core', html.indexOf('tab-navigation-core.js') < html.indexOf('sidepanel-tab-keyboard.js')],
  ['Alt+Q and Alt+digits remain unbound', !/event\.altKey[\s\S]*key\.toLowerCase\(\) === 'q'/.test(navigation) && !keyboard.includes("event.altKey &&") && !Object.keys(manifest.commands || {}).some(k => /tab|quick/i.test(k))]
];
for (const [label, ok] of checks) assert.ok(ok, label);
console.log('tab-keyboard-contract.test.js: ' + checks.length + '/' + checks.length + ' passed');
