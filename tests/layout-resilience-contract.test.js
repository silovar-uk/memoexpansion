const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

const shell = read('sidepanel-shell.js');
const ui = read('sidepanel-ui.js');
const render = read('sidepanel-render.js');
const navigationCss = read('sidepanel-navigation.css');
const editorCss = read('sidepanel-editor.css');

const checks = [
  ['active tab visibility is checked after tab-list mutation', /MutationObserver\(scheduleActiveTabVisibilityCheck\)/.test(shell)],
  ['active tab only auto-scrolls when outside strip bounds', /tabRect\.left < listRect\.left \|\| tabRect\.right > listRect\.right/.test(shell)],
  ['active tab uses nearest non-smooth reveal', /behavior: 'auto'[\s\S]*block: 'nearest'[\s\S]*inline: 'nearest'/.test(shell)],
  ['popup menus are observed when dynamically added', /MutationObserver\(\(records\)/.test(ui) && /classList\.contains\('popup-menu'\)/.test(ui)],
  ['popup clamp checks both right and bottom viewport boundaries', /rect\.right > maxRight/.test(ui) && /rect\.bottom > maxBottom/.test(ui)],
  ['popup clamp also protects left and top boundaries', /rect\.left < POPUP_VIEWPORT_MARGIN/.test(ui) && /rect\.top < POPUP_VIEWPORT_MARGIN/.test(ui)],
  ['popup dimensions are capped to viewport', /maxWidth = `calc\(100vw/.test(ui) && /maxHeight = `calc\(100vh/.test(ui)],
  ['outliner visual indentation is capped', /OUTLINER_MAX_VISUAL_INDENT\s*=\s*100/.test(render) && /Math\.min\(Math\.max\(0, item\.depth\) \* 20, OUTLINER_MAX_VISUAL_INDENT\)/.test(render)],
  ['outliner data depth is not rewritten by the visual cap', !/item\.depth\s*=\s*Math\.min/.test(render)],
  ['row and guide line share the same visual indent', /row\.style\.paddingLeft = visualIndent/.test(render) && /line\.style\.left = visualIndent/.test(render)],
  ['Quick Switch still constrains width to viewport', /width: min\(320px, calc\(100vw - 14px\)\)/.test(navigationCss)],
  ['Quick Switch still constrains height to viewport', /max-height: min\(420px, calc\(100vh - 92px\)\)/.test(navigationCss)],
  ['Text Canvas still breaks hostile unspaced content', /overflow-wrap: anywhere/.test(editorCss)],
];

for (const [name, ok] of checks) {
  if (!ok) throw new Error(`Layout Resilience contract failed: ${name}`);
}

console.log(`layout-resilience-contract.test.js: ${checks.length}/${checks.length} passed`);
