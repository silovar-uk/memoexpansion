const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

const manifest = JSON.parse(read('manifest.json'));
const version = manifest.version;
const architecture = read('ARCHITECTURE.md');
const cssOwnership = read('CSS_OWNERSHIP.md');
const workflow = read('.github/workflows/package-extension.yml');

const checks = [
  ['architecture baseline matches manifest', architecture.includes(`Baseline: **v${version}**`)],
  ['CSS ownership baseline matches manifest', cssOwnership.includes(`Baseline: **v${version}**`)],
  ['workflow ZIP verification matches manifest', workflow.includes(`= \"${version}\"`)],
  ['workflow artifact name matches manifest', workflow.includes(`memoexpansion-extension-v${version}`)],
];

for (const [name, ok] of checks) {
  if (!ok) throw new Error(`Version Coherence contract failed: ${name} (manifest ${version})`);
}

console.log(`version-coherence.test.js: ${checks.length}/${checks.length} passed for v${version}`);
