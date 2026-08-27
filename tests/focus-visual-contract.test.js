const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const maintenance = fs.readFileSync(path.join(root, 'sidepanel-maintenance.css'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'sidepanel-shell.css'), 'utf8');
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
  ['persistent shell utilities stay quiet when idle', shell.includes('background: transparent; color: var(--text-faint);')],
  ['persistent shell utilities strengthen on keyboard focus', shell.includes('background: var(--focus-soft); color: var(--text-color); border-color: transparent;')],
  ['Quick Switch search uses shared focus color', navigation.includes('border-color: var(--focus-color);') && navigation.includes('box-shadow: 0 0 0 2px var(--focus-soft);')],
  ['Quick Switch selected candidate has a location cue', navigation.includes('box-shadow: inset 2px 0 0 var(--focus-color);')],
  ['metadata trigger has visible keyboard focus', metadata.includes('.item-metadata-trigger:focus-visible') && metadata.includes('outline: 2px solid var(--focus-color);')],
  ['metadata links have visible keyboard focus', metadata.includes('.item-metadata-link:focus-visible')],
  ['metadata edit control has visible keyboard focus', metadata.includes('.item-metadata-edit-btn:focus-visible')],
  ['metadata editor uses shared focus color', metadata.includes('.item-metadata-editor:focus') && metadata.includes('border-color: var(--focus-color);')],
  ['metadata focus does not suppress outlines', !metadata.includes('focus-visible {\n  background: var(--surface-hover);\n  color: var(--text-color);\n  outline: none;')],
  ['single URL gets an explicit count cue', metadata.includes('.item-metadata-trigger:not(:has(.item-metadata-count))::after') && metadata.includes('content: "1";')],
  ['URL-only row reserves room for link presence', metadata.includes('.row.has-compact-metadata .input-wrapper') && metadata.includes('padding-right: 62px;')],
  ['URL-only row actions remain visible at rest', /\.row\.has-compact-metadata \.row-actions\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?\}/.test(metadata)],
  ['completion action stays quiet beside persistent link presence', /\.row\.has-compact-metadata \.action-icon\.check\s*\{[\s\S]*?opacity:\s*\.24;[\s\S]*?\}/.test(metadata)],
];

for (const [name, ok] of checks) {
  if (!ok) throw new Error(`Focus visual contract failed: ${name}`);
}

console.log(`focus-visual-contract.test.js: ${checks.length}/${checks.length} passed`);
