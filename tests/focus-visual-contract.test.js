const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'sidepanel-maintenance.css'), 'utf8');

const checks = [
  ['focus uses muted blue-gray token', /--focus-color:\s*#66869a;/.test(css)],
  ['focus soft surface token exists', /--focus-soft:\s*rgba\(74,\s*111,\s*134,\s*\.055\);/.test(css)],
  ['outliner focus underline is one pixel', /\.item-input:focus-visible,[\s\S]*\.item-note:focus-visible\s*\{[\s\S]*box-shadow:\s*inset 0 -1px 0 var\(--focus-color\)/.test(css)],
  ['outliner focus gets subtle surface cue', /\.item-input:focus-visible,[\s\S]*background:\s*var\(--focus-soft\)/.test(css)],
  ['keyboard controls keep visible focus outline', /outline:\s*2px solid var\(--focus-color\)/.test(css)],
  ['selection remains semantically distinct', /--selection-mark:\s*#44443f;/.test(css) && !/--selection-mark:\s*#66869a;/.test(css)],
  ['old heavy outliner focus line is gone', !/\.item-input:focus-visible,[\s\S]*box-shadow:\s*inset 0 -2px 0 var\(--focus-color\)/.test(css)],
];

for (const [name, ok] of checks) {
  if (!ok) throw new Error(`Focus visual contract failed: ${name}`);
}

console.log(`focus-visual-contract.test.js: ${checks.length}/${checks.length} passed`);
