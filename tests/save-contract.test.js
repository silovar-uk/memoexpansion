'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('sidepanel.html', 'utf8');
const tabs = fs.readFileSync('sidepanel-tabs.js', 'utf8');
const runtime = fs.readFileSync('sidepanel-runtime.js', 'utf8');
const css = fs.readFileSync('sidepanel-components.css', 'utf8');

assert.match(html, /id="save-status"[^>]*data-state="saved"/);
assert.ok(html.indexOf('save-state.js') < html.indexOf('sidepanel-runtime.js'), 'save-state helper must load before runtime');

const switchBody = tabs.match(/function switchTab\(tabId\) \{([\s\S]*?)\n\}/)?.[1] || '';
assert.match(switchBody, /activeTabId = tabId;/);
assert.ok(switchBody.indexOf('markAsDirty();') > switchBody.indexOf('activeTabId = tabId;'), 'tab activation must mark state dirty');
assert.ok(switchBody.indexOf('saveData();') > switchBody.indexOf('markAsDirty();'), 'dirty tab activation must be scheduled for persistence');

assert.match(runtime, /if \(!isDirty\) return Promise\.resolve\(\);/);
assert.match(runtime, /saveInFlight = saveInFlight\.catch\(\(\) => \{\}\)\.then\(\(\) => persistSnapshot\(\)\);/);
assert.match(runtime, /visibilitychange/);
assert.match(runtime, /pagehide/);
assert.match(runtime, /stateAfterPersist\(snapshot, tabs, activeTabId\)/);

assert.match(css, /\.save-status\[data-state="saved"\][\s\S]*?opacity:\s*0/);
assert.match(css, /\.save-status\[data-state="error"\][\s\S]*?var\(--danger-color\)/);

console.log('10/10 save-confidence contract checks passed');
