const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

const html = read('sidepanel.html');
const recovery = read('sidepanel-recovery.js');
const css = read('sidepanel-recovery.css');

const checks = [
  ['recovery decisions load before application state', html.indexOf('recovery-state.js') < html.indexOf('sidepanel.js')],
  ['recovery integration loads after model normalization', html.indexOf('sidepanel-model.js') < html.indexOf('sidepanel-recovery.js')],
  ['invalid stored tabs block initialization writes', /shouldBlockWrites\(inspection\.status\)/.test(recovery) && /storageRecoveryBlocked/.test(recovery)],
  ['blocked load does not call base loader', /if \(storageRecoveryBlocked\)[\s\S]*return false;[\s\S]*baseLoadData/.test(recovery)],
  ['default tab creation is blocked during recovery', /createNewTab = function guardedCreateNewTab/.test(recovery) && /if \(storageRecoveryBlocked\)/.test(recovery)],
  ['legacy migration is blocked during recovery', /migrateLegacyData = async function guardedLegacyMigration/.test(recovery)],
  ['failure-only retry control exists', /btn-storage-retry/.test(recovery) && /button\.hidden = !\(loadFailure \|\| saveFailure\)/.test(recovery)],
  ['load failure explains write protection', /既存データを保護して保存を停止/.test(recovery)],
  ['retry re-inspects storage before unblocking', /const inspection = await inspectStoredTabs\(\)/.test(recovery) && /storageRecoveryBlocked = false/.test(recovery)],
  ['recovery button remains quiet when healthy', /\.storage-retry-btn\[hidden\]/.test(css)],
];

for (const [name, ok] of checks) {
  if (!ok) throw new Error(`Recovery Confidence contract failed: ${name}`);
}

console.log(`recovery-contract.test.js: ${checks.length}/${checks.length} passed`);
