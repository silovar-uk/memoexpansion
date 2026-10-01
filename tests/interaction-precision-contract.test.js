const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

const focus = read('sidepanel-focus.js');
const navigation = read('sidepanel-navigation.js');
const ui = read('sidepanel-ui.js');
const tabsUi = read('sidepanel-tabs.js');
const input = read('sidepanel-input.js');
const meta = read('sidepanel-meta.js');
const render = read('sidepanel-render.js');

const checks = [
  ['focus state remains session-only', /chrome\.storage\.session/.test(focus) && !/chrome\.storage\.local/.test(focus)],
  ['focus state stores scrollTop', /state\.scrollTop\s*=\s*scrollOwner\.scrollTop/.test(focus)],
  ['text mode scroll owner is textarea', /tab\.mode === 'text'[\s\S]*text-editor-area/.test(focus)],
  ['outliner scroll owner is editor', /document\.getElementById\('editor'\)/.test(focus)],
  ['focusout captures outgoing memo context', /addEventListener\('focusout'[\s\S]*rememberFocusStateFromElement\(event\.target\)/.test(focus)],
  ['saved scroll is restored', /scrollOwner\.scrollTop = Math\.max\(0, savedState\.scrollTop\)/.test(focus)],
  ['tab switching is wrapped by MemoFocus', /originalSwitchTab[\s\S]*writeCurrentFocusNow\(\)[\s\S]*scheduleMemoFocus\(\)/.test(focus)],
  ['new tab creation saves outgoing focus without racing editor focus', /originalCreateNewTab[\s\S]*writeCurrentFocusNow\(\)[\s\S]*originalCreateNewTab\.apply/.test(focus) && !/originalCreateNewTab[\s\S]*scheduleMemoFocus\(\)/.test(focus)],
  ['new memo starts inline tab rename with select-all', /startTabRename\(newTab\.id, \{ selectAll: true, focusMemoOnCommit: true \}\)/.test(tabsUi)],
  ['title-first rename supports Enter Tab and Escape handoff', /event\.key === 'Enter'[\s\S]*focusMemoOnCommit && event\.key === 'Tab'[\s\S]*event\.key === 'Escape'/.test(tabsUi)],
  ['pointer blur commits without forced memo focus', /input\.onblur = \(\) => finishRename\(\);/.test(tabsUi)],
  ['backspace guards the final active row instead of total archived rows', /const activeItemCount = currentTab\.items\.filter\(i => !i\.completed\)\.length;[\s\S]*item\.text === '' && activeItemCount > 1/.test(input)],
  ['selection deletion restores the canonical active fallback', /deleteSelectedItems[\s\S]*ensureActiveItem\(currentTab\.items, createOutlinerItem\)/.test(input)],
  ['completion restores the canonical active fallback', /completeItem[\s\S]*ensureActiveItem\(currentTab\.items, createOutlinerItem\)/.test(meta)],
  ['render repairs zero-active outliners before drawing', /ensureActiveItem\(currentTab\.items, createOutlinerItem\)/.test(render)],
  ['Quick Switch delegates changed tabs to switchTab', /if \(tab\.id !== activeTabId\)[\s\S]*switchTab\(tab\.id\)/.test(navigation)],
  ['Quick Switch only directly refocuses the already-active tab', /else \{[\s\S]*MemoFocus\?\.focusCurrentMemo/.test(navigation)],
  ['new-tab trigger exposes menu semantics', /aria-haspopup', 'menu/.test(ui) && /aria-expanded', 'false/.test(ui)],
  ['new-tab items expose menuitem semantics', /setAttribute\('role', 'menuitem'\)/.test(ui)],
  ['new-tab menu supports arrow navigation', /ArrowDown/.test(ui) && /ArrowUp/.test(ui)],
  ['new-tab menu supports Enter and Space', /event\.key === 'Enter' \|\| event\.key === ' '/.test(ui)],
  ['Escape closes menu and returns focus', /closeNewTabMenu\(\{ returnFocus: true \}\)/.test(ui)],
  ['outside click closes without forced focus return', /menu\.contains\(event\.target\)[\s\S]*closeNewTabMenu\(\);/.test(ui)],
  ['menu choice closes before creating new memo', /closeNewTabMenu\(\);[\s\S]*createNewTab\('outliner'\)/.test(ui) && /closeNewTabMenu\(\);[\s\S]*createNewTab\('text'\)/.test(ui)],
];

for (const [name, ok] of checks) {
  if (!ok) throw new Error(`Interaction Precision contract failed: ${name}`);
}

console.log(`interaction-precision-contract.test.js: ${checks.length}/${checks.length} passed`);
