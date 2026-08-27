'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'sidepanel-metadata.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'sidepanel-metadata.css'), 'utf8');

assert.ok(
  js.includes('const hasLinks = urls.length > 0;') &&
  js.includes("row.classList.toggle('has-compact-metadata', hasLinks);"),
  'any note containing a URL must use compact metadata treatment'
);
assert.ok(
  js.includes("noteDisplay?.classList.add('hidden');") &&
  js.includes("linkContainer.style.display = 'none';"),
  'link-bearing mixed notes must stay out of the row text flow'
);
assert.ok(
  js.includes('const plainText = extractNonUrlText(note);') &&
  js.includes("textBlock.className = 'item-metadata-plain-text';") &&
  js.includes('textBlock.textContent = plainText;'),
  'non-URL metadata must render as plain text in the viewer'
);
assert.ok(
  js.includes("const link = document.createElement('a');") &&
  js.includes('link.href = url;'),
  'only extracted URLs should be rendered as anchors'
);
assert.ok(
  css.includes('.item-metadata-plain-text') &&
  css.includes('user-select: text;'),
  'plain metadata must remain readable and selectable without link affordance'
);
assert.ok(
  js.includes("if (hasLinks) {") &&
  !js.includes("row.classList.toggle('has-compact-metadata', kind === 'url-only')"),
  'compact behavior must no longer be limited to URL-only notes'
);

console.log('ok - compact mixed metadata UI contract');
