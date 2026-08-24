'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'sidepanel.html'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'sidepanel-shell.css'), 'utf8');
const shellJs = fs.readFileSync(path.join(root, 'sidepanel-shell.js'), 'utf8');

assert.ok(!html.includes('<header>'), 'dedicated header must be removed');
assert.ok(!html.includes('memo tool'), 'brand title must not occupy persistent chrome');
assert.ok(html.includes('id="tab-header-area"'), 'tab header must remain the persistent top shell');
assert.ok(html.includes('class="tab-utility-group"'), 'context utilities must live beside tabs');
assert.ok(html.includes('id="instance-count"') && html.includes('hidden aria-live="polite"'), 'instance warning must be contextual and hidden by default');
assert.ok(html.indexOf('id="btn-line-numbers"') > html.indexOf('class="tab-utility-group"'), 'line number control must live inside utility group');
assert.ok(html.indexOf('id="btn-sort-stars"') > html.indexOf('class="tab-utility-group"'), 'star sort control must live inside utility group');
assert.ok(html.lastIndexOf('sidepanel-shell.css') > html.lastIndexOf('sidepanel-maintenance.css'), 'shell owner CSS must load after legacy refinement CSS');
assert.ok(shell.includes('#tab-header-area') && shell.includes('.tab-utility-group'), 'shell stylesheet must own top chrome');
assert.ok(shellJs.includes('indicator.hidden = !multiple'), 'single-instance state must stay visually silent');
assert.ok(shellJs.includes('btnLineNumbers.hidden = !isOutliner'), 'line number control must be contextual to outliner mode');
assert.ok(shellJs.includes('btnSort.hidden = !isOutliner'), 'star sort control must be contextual to outliner mode');
assert.ok(html.lastIndexOf('sidepanel-shell.js') > html.lastIndexOf('sidepanel-accessibility.js'), 'shell behavior must load after feature modules');

console.log('ok - quiet shell static contract');
