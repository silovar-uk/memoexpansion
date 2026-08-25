const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const recoveryStateSource = fs.readFileSync(path.join(root, 'recovery-state.js'), 'utf8');
const recoveryUiSource = fs.readFileSync(path.join(root, 'sidepanel-recovery.js'), 'utf8');

function makeElement(id = '') {
  return {
    id,
    isConnected: true,
    hidden: false,
    disabled: false,
    textContent: '',
    title: '',
    className: '',
    type: '',
    dataset: {},
    attributes: {},
    children: [],
    setAttribute(name, value) { this.attributes[name] = String(value); },
    removeAttribute(name) { delete this.attributes[name]; },
    addEventListener(name, handler) { this[`on${name}`] = handler; },
    insertBefore(child) { this.children.unshift(child); },
  };
}

function makeHarness(initialTabsJSON) {
  const saveStatus = makeElement('save-status');
  const footerRight = makeElement('footer-right');
  const elements = new Map([['save-status', saveStatus]]);
  const storage = { tabs: initialTabsJSON, activeTabId: 'a' };
  const writes = [];
  let baseCreateCalls = 0;
  let renderCalls = 0;

  const document = {
    querySelector(selector) {
      if (selector === 'footer .footer-right') return footerRight;
      return null;
    },
    getElementById(id) { return elements.get(id) || null; },
    createElement() {
      const el = makeElement();
      Object.defineProperty(el, 'id', {
        get() { return this._id || ''; },
        set(value) { this._id = value; elements.set(value, this); },
        configurable: true,
      });
      return el;
    },
  };

  const chrome = {
    storage: {
      local: {
        async get(keys) {
          const out = {};
          for (const key of keys) {
            if (Object.prototype.hasOwnProperty.call(storage, key)) out[key] = storage[key];
          }
          return out;
        },
        async set(values) {
          writes.push({ ...values });
          Object.assign(storage, values);
        },
      },
    },
  };

  const context = {
    console,
    setTimeout,
    clearTimeout,
    Promise,
    window: {},
    document,
    chrome,
    tabs: [],
    activeTabId: null,
    isDirty: false,
    updateSaveStatus(state, text) {
      saveStatus.dataset.state = state;
      saveStatus.textContent = text || state;
    },
    async loadData() {
      const result = await chrome.storage.local.get(['tabs', 'activeTabId']);
      context.tabs = result.tabs ? JSON.parse(result.tabs) : [];
      context.activeTabId = result.activeTabId || null;
      return true;
    },
    async migrateLegacyData() { return true; },
    createNewTab() {
      baseCreateCalls += 1;
      const tab = { id: 'new', title: 'new' };
      context.tabs.push(tab);
      context.activeTabId = tab.id;
      context.isDirty = true;
      return tab;
    },
    markAsDirty() { context.isDirty = true; },
    async saveData() {
      if (!context.isDirty) return;
      await chrome.storage.local.set({
        tabs: JSON.stringify(context.tabs),
        activeTabId: context.activeTabId,
      });
      context.isDirty = false;
    },
    renderTabs() { renderCalls += 1; },
    renderEditor() { renderCalls += 1; },
    updateUndoButtons() {},
    updateSortButtonVisibility() {},
    MemoMaintenance: {},
  };

  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(recoveryStateSource, context, { filename: 'recovery-state.js' });
  vm.runInContext(recoveryUiSource, context, { filename: 'sidepanel-recovery.js' });

  return {
    context,
    storage,
    writes,
    getRetryButton: () => elements.get('btn-storage-retry'),
    getBaseCreateCalls: () => baseCreateCalls,
    getRenderCalls: () => renderCalls,
  };
}

(async () => {
  const h = makeHarness('{broken');

  const loaded = await h.context.loadData();
  assert.strictEqual(loaded, false, 'invalid persisted JSON must fail closed');
  assert.strictEqual(
    h.context.MemoMaintenance.isStorageRecoveryBlocked(),
    true,
    'invalid load must block writes'
  );
  assert.strictEqual(h.context.tabs.length, 0, 'invalid data must not become a normal empty workspace');
  assert.strictEqual(h.writes.length, 0, 'invalid load must not write anything');

  const createResult = h.context.createNewTab('outliner');
  assert.strictEqual(createResult, null, 'new/default tab creation must be blocked during recovery');
  assert.strictEqual(h.getBaseCreateCalls(), 0, 'blocked create must not reach normal tab creation');
  assert.strictEqual(h.writes.length, 0, 'blocked create must not overwrite persisted data');

  const retryButton = h.getRetryButton();
  assert.ok(retryButton && !retryButton.hidden, 'recovery action must be visible while blocked');
  assert.strictEqual(retryButton.textContent, '再試行');

  h.storage.tabs = JSON.stringify([{ id: 'a', title: 'restored' }]);
  h.storage.activeTabId = 'a';
  await h.context.MemoMaintenance.retryStorageOperation();

  assert.strictEqual(
    h.context.MemoMaintenance.isStorageRecoveryBlocked(),
    false,
    'valid retry must unblock recovery'
  );
  assert.strictEqual(h.context.tabs.length, 1, 'valid retry must restore stored tabs');
  assert.strictEqual(h.context.tabs[0].id, 'a');
  assert.strictEqual(h.context.activeTabId, 'a');
  assert.ok(h.getRenderCalls() >= 2, 'successful retry must render restored UI');
  assert.strictEqual(h.writes.length, 0, 'successful reread must not rewrite unchanged recovered data');
  assert.strictEqual(retryButton.hidden, true, 'recovery action must disappear after successful recovery');

  console.log('recovery-flow.test.js: invalid-load protection and retry recovery passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
