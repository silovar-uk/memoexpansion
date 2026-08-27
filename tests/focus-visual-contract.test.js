const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const maintenance = fs.readFileSync(path.join(root, 'sidepanel-maintenance.css'), 'utf8');
const navigation = fs.readFileSync(path.join(root, 'sidepanel-navigation.css'), 'utf8');
const metadata = fs.readFileSync(path.join(root, 'sidepanel-metadata.css'), 'utf8');
const inputFocusBlock = (maintenance.match(/\.item-input:focus-visible,[\s\S]*?\.item-note:focus-visible\s*\{([\s\S]*?)\}/) || [])[1] || '';

const checks = [
  ['focus uses muted blue-gray token', maintenance.includes('--focus-color: #66869a;')],
  ['focus soft surface token exists', maintenance.includes('--focus-soft: rgba(74, 111, 134, .045);')],
  ['focused row gets subtle surface cue', maintenance.includes('.row:focus-within:not(.selected) { background: var(--focus-soft); }')],
  ['outliner focus underline is one pixel', inputFocusBlock.includes('box-shadow: inset 0 -1px 0 var(--focus-color);')],
  ['input focus does not override marker backgrounds', !inputFocusBlock.includes('background:')],
  ['keyboard controls keep visible focus outline', maintenance.includes('outline: 2px solid var(--focus-color);')],
  ['selection remains semantically distinct', maintenance.includes('--selection-mark: #44443f;') && !maintenance.includes('--selection-mark: #66869a;')],
  ['old heavy outliner focus line is gone', !inputFocusBlock.includes('inset 0 -2px 0 var(--focus-color)')],
  ['Quick Switch search uses shared focus color', navigation.includes('border-color: var(--focus-color);') && navigation.includes('box-shadow: 0 0 0 2px var(--focus-soft);')],
  ['Quick Switch selected candidate has a location cue', navigation.includes('box-shadow: inset 2px 0 0 var(--focus-color);')],
  ['metadata trigger has visible keyboard focus', metadata.includes('.item-metadata-trigger:focus-visible') && metadata.includes('outline: 2px solid var(--focus-color);')],
  ['metadata links have visible keyboard focus', metadata.includes('.item-metadata-link:focus-visible')],
  ['metadata edit control has visible keyboard focus', metadata.includes('.item-metadata-edit-btn:focus-visible')],
  ['metadata editor uses shared focus color', metadata.includes('.item-metadata-editor:focus') && metadata.includes('border-color: var(--focus-color);')],
  ['metadata focus does not suppress outlines', !metadata.includes('focus-visible {\n  background: var(--surface-hover);\n  color: var(--text-color);\n  outline: none;')],
];

for (const [name, ok] of checks) {
  if (!ok) throw new Error(`Focus visual contract failed: ${name}`);
}

console.log(`focus-visual-contract.test.js: ${checks.length}/${checks.length} passed`);
