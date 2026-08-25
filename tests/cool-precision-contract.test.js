const fs = require('fs');
const assert = require('assert');

const maintenance = fs.readFileSync('sidepanel-maintenance.css', 'utf8');
const shell = fs.readFileSync('sidepanel-shell.css', 'utf8');
const textCanvas = fs.readFileSync('sidepanel-editor.css', 'utf8');

assert.ok(maintenance.includes('--chrome-surface: #f1f6f9'));
assert.ok(maintenance.includes('--chrome-surface-strong: #eaf2f6'));
assert.ok(maintenance.includes('--chrome-border: #d8e5ec'));
assert.ok(maintenance.includes('padding: 13px 14px 18px'));
assert.ok(!maintenance.includes('padding: 13px 14px 72px'));
assert.ok(!maintenance.includes('padding-bottom: 80px'));
assert.ok(maintenance.includes('#editor-container { min-height: 0; }'));
assert.ok(shell.includes('background: var(--chrome-surface)'));
assert.ok(shell.includes('border-bottom-color: var(--accent-color)'));
assert.ok(maintenance.includes('background: rgba(241,246,249,.97)'));

// v2.4.2 changes chrome and whitespace only. Quiet Text Canvas contracts stay intact.
assert.ok(textCanvas.includes('white-space: pre-wrap'));
assert.ok(textCanvas.includes('overflow-wrap: anywhere'));
assert.ok(textCanvas.includes('overflow-x: hidden'));
assert.ok(textCanvas.includes('#editor > .text-editor-area:focus-visible'));

console.log('cool-precision-contract.test.js: 14/14 passed');
