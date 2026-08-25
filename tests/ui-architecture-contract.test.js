const fs = require('fs');
const assert = require('assert');

const editor = fs.readFileSync('sidepanel-editor.css', 'utf8');
const components = fs.readFileSync('sidepanel-components.css', 'utf8');
const maintenance = fs.readFileSync('sidepanel-maintenance.css', 'utf8');
const shell = fs.readFileSync('sidepanel-shell.css', 'utf8');

// Editor owns vertical layout and Text Canvas focus.
assert.ok(editor.includes('#editor-container {'));
assert.ok(editor.includes('padding: 13px 14px 18px'));
assert.ok(editor.includes('#editor.line-numbers-visible { padding-left: 42px; }'));
assert.ok(editor.includes('#editor > .text-editor-area:focus-visible'));
assert.ok(!maintenance.includes('#editor-container'));
assert.ok(!maintenance.includes('#editor {'));
assert.ok(!maintenance.includes('.text-editor-area:focus-visible'));

// Footer presentation has one final owner.
assert.ok(components.includes('footer {'));
assert.ok(components.includes('background: rgba(241,246,249,.97)'));
assert.ok(components.includes('background: var(--chrome-surface-strong)'));
assert.ok(!maintenance.includes('\nfooter {'));

// Shell owns persistent tab presentation. Baseline mechanics may remain in tabs.css,
// but components/maintenance must not restyle the shell generically.
assert.ok(shell.includes('#tab-header-area {'));
assert.ok(shell.includes('.tab {'));
assert.ok(!components.includes('#tab-header-area {'));
assert.ok(!maintenance.includes('#tab-header-area {'));
assert.ok(!/^\s*\.tab\s*\{/m.test(components));
assert.ok(!/^\s*\.tab\s*\{/m.test(maintenance));

console.log('ui-architecture-contract.test.js: 17/17 passed');
