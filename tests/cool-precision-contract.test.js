const fs = require('fs');
const assert = require('assert');

const maintenance = fs.readFileSync('sidepanel-maintenance.css', 'utf8');
const shell = fs.readFileSync('sidepanel-shell.css', 'utf8');
const editor = fs.readFileSync('sidepanel-editor.css', 'utf8');
const components = fs.readFileSync('sidepanel-components.css', 'utf8');

assert.ok(maintenance.includes('--chrome-surface: #f1f6f9'));
assert.ok(maintenance.includes('--chrome-surface-strong: #eaf2f6'));
assert.ok(maintenance.includes('--chrome-border: #d8e5ec'));
assert.ok(editor.includes('padding: 13px 14px 18px'));
assert.ok(!editor.includes('padding: 13px 14px 72px'));
assert.ok(!editor.includes('padding-bottom: 80px'));
assert.ok(editor.includes('min-height: 0'));
assert.ok(shell.includes('background: var(--chrome-surface)'));
assert.ok(shell.includes('border-bottom-color: var(--accent-color)'));
assert.ok(components.includes('background: rgba(241,246,249,.97)'));

// Quiet Text Canvas contracts stay intact while ownership is cleaned up.
assert.ok(editor.includes('white-space: pre-wrap'));
assert.ok(editor.includes('overflow-wrap: anywhere'));
assert.ok(editor.includes('overflow-x: hidden'));
assert.ok(editor.includes('#editor > .text-editor-area:focus-visible'));

console.log('cool-precision-contract.test.js: 14/14 passed');
