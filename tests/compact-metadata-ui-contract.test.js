'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'sidepanel-metadata.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'sidepanel-metadata.css'), 'utf8');

assert.ok(
  js.includes('const hasMetadata = note.trim().length > 0;') &&
  js.includes("row.classList.toggle('has-compact-metadata', hasMetadata);"),
  'every non-empty detail note must use compact metadata treatment'
);
assert.ok(
  js.includes("noteDisplay?.classList.add('hidden');") &&
  js.includes("linkContainer.style.display = 'none';"),
  'all detail content must stay out of the row text flow'
);
assert.ok(
  js.includes("row.classList.toggle('has-link-metadata', hasMetadata && hasLinks);") &&
  js.includes("row.classList.toggle('has-plain-metadata', hasMetadata && !hasLinks);"),
  'link presence and plain metadata presence must remain semantically distinct'
);
assert.ok(
  js.includes("button.className = `item-metadata-trigger ${hasLinks ? 'is-link' : 'is-plain'}`;") &&
  js.includes("button.title = hasLinks") &&
  js.includes(": '詳細あり';"),
  'plain metadata must use a non-link trigger'
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
  js.includes("button.innerHTML = hasLinks ? iconSvg('link', 13) : detailIconSvg();"),
  'plain metadata must not reuse the link icon'
);
assert.ok(
  css.includes('.row.has-link-metadata .item-metadata-trigger.is-link') &&
  css.includes('.row.has-plain-metadata .item-metadata-trigger.is-plain'),
  'plain and link metadata must have distinct visual affordances'
);
assert.ok(
  css.includes('.item-metadata-trigger.is-link:not(:has(.item-metadata-count))::after') &&
  !css.includes('.item-metadata-trigger:not(:has(.item-metadata-count))::after'),
  'the implicit single-link count must never appear on plain metadata'
);
assert.ok(
  css.includes('.item-metadata-plain-text') &&
  css.includes('user-select: text;'),
  'plain metadata must remain readable and selectable without link affordance'
);

console.log('ok - hidden detail metadata UI contract');
