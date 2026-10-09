const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('sidepanel.html');
const ui = read('sidepanel-navigation.js');
const css = read('sidepanel-navigation.css');

const checks = [
  ['search button exists', /id="btn-tab-search"/.test(html)],
  ['switcher dialog exists', /id="tab-switcher"/.test(html)],
  ['search input exists', /id="tab-switcher-input"/.test(html)],
  ['navigation core loaded', /tab-navigation-core\.js/.test(html)],
  ['navigation UI loaded', /sidepanel-navigation\.js/.test(html)],
  ['navigation CSS loaded', /sidepanel-navigation\.css/.test(html)],
  ['Alt+Q remains unbound for Quick Links', !/event\.altKey[\s\S]*key\.toLowerCase\(\) === 'q'/.test(ui) && !html.includes('Alt+Q')],
  ['existing switchTab is reused', /switchTab\(tab\.id\)/.test(ui)],
  ['no new storage writes', !/chrome\.storage/.test(ui)],
  ['switcher hidden contract', /\.tab-switcher\[hidden\]/.test(css)],
];

for (const [name, ok] of checks) {
  if (!ok) throw new Error(`Navigation contract failed: ${name}`);
}
console.log(`navigation-contract.test.js: ${checks.length}/${checks.length} passed`);
