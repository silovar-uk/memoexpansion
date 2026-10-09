'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const html = read('sidepanel.html'), css = read('sidepanel-editor.css');
const input = read('sidepanel-input.js'), ui = read('sidepanel-typography.js');
const style = read('sidepanel-typography.css');
const meta = read('sidepanel-metadata.css'), runtime = read('sidepanel-runtime.js');
const checks = [
  ['Aa trigger exists in footer', html.includes('id="btn-typography"') && html.indexOf('id="btn-typography"') > html.indexOf('<footer>')],
  ['dialog exposes controls', html.includes('id="typography-popover"') && html.includes('id="typography-increase"') && html.includes('id="typography-wrap"')],
  ['owner scripts and stylesheet loaded', html.includes('typography-core.js') && html.includes('sidepanel-typography.js') && html.includes('sidepanel-typography.css')],
  ['Text Canvas uses font size variable', css.includes('font-size: var(--memo-font-size, 14px)')],
  ['Outliner supports wrapping', css.includes('data-memo-layout="wrap"') && css.includes('overflow-wrap: anywhere')],
  ['editing uses selected size', input.includes('getOutlinerTypography()') && !input.includes('OUTLINER_EDIT_FONT_SIZE')],
  ['wrapped textarea grows by content', input.includes("input.wrap = typography.wrap ? 'soft' : 'off'") && input.includes('input.scrollHeight')],
  ['compact retains automatic shrinking', input.includes('OUTLINER_ABSOLUTE_MIN_FONT_SIZE') && input.includes('const fits = () => input.scrollWidth <= input.clientWidth + 1')],
  ['display changes do not re-render memo', !ui.includes('renderEditor(') && ui.includes("querySelectorAll('.item-input')")],
  ['settings stored outside memo data', ui.includes('memoViewPreferences') && !runtime.includes('memoViewPreferences')],
  ['multi-panel preference sync exists', ui.includes('chrome.storage.onChanged.addListener')],
  ['popup dismisses via Escape/outside', ui.includes('pointerdown') && ui.includes("event.key === 'Escape'")],
  ['popup constrained to viewport', style.includes('calc(100vw - 18px)') && style.includes('max-height: calc(100vh - 63px)')],
  ['details adapt text size', meta.includes('var(--memo-note-font-size, 12px)')]
];
for (const [name, ok] of checks) assert.ok(ok, name);
console.log('typography-contract.test.js: ' + checks.length + '/' + checks.length + ' passed');
