const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const recoveryStateSource = fs.readFileSync(path.join(root, 'recovery-state.js'), 'utf8');
const recoveryUiSource = fs.readFileSync(path.join(root, 'sidepanel-recovery.js'), 'utf8');
const saveStateSource = fs.readFileSync(path.join(root, 'save-state.js'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(root, 'sidepanel-runtime.js'), 'utf8');

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

function makeHarness() {
  const saveStatus = makeElement('save-status');
  const footerRight = makeElement('footer-right');
  const elements = new Map([['save-status', saveStatus]]);
  const storage = {
    tabs: JSON.stringify([{ id: 'a', title: 'before', mode: 'text', content: 'old', items: [] }]),
    activeTabId: 'a',
  };
  const writes = [];
  let failWrites = false;

  const document = {
    visibilityState: 'visible',
    listeners: {},
    addEventListener(name, handler) { this.listeners[name] = handler; },
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
          if (failWrites) throw new Error('injected storage write failure');
          writes.push({ ...values });
          Object.assign(storage, values);
        },
      },
    },
  };

  const windowListeners = {};
  const context = {
    console,
    setTimeout,
    clearTimeout,
    Promise,
    window: {},
    document,
    chrome,
    tabs: [{ id: 'a', title: 'after', mode: 'text', content: 'edited', items: [] }],
    activeTabId: 'a',
    isDirty: true,
    lastSavedTabsJSON: storage.tabs,
    updateSaveStatus(state, text) {
      saveStatus.dataset.state = state;
      saveStatus.textContent = text || state;
    },
    async loadData() { return true; },
    async migrateLegacyData() { return true; },
    createNewTab() { throw new Error('not expected'); },
    markAsDirty() { context.isDirty = true; },
    async saveData() {},
    renderTabs() {},
    renderEditor() {},
    updateUndoButtons() {},
    updateSortButtonVisibility() {},
    archiveCompletedItemsInAllTabs() { return false; },
    MemoMaintenance: {
      normalizeState() {},
    },
  };

  context.window = {
    ...context,
    MemoMaintenance: context.MemoMaintenance,
    setTimeout,
    addEventListener(name, handler) { windowListeners[name] = handler; },
  };
  context.globalThis = context;

  vm.createContext(context);
  vm.runInContext(recoveryStateSource, context, { filename: 'recovery-state.js' });
  context.window.MemoRecoveryState = context.MemoRecoveryState;
  vm.runInContext(saveStateSource, context, { filename: 'save-state.js' });
  context.window.MemoSaveState = context.MemoSaveState;
  vm.runInContext(recoveryUiSource, context, { filename: 'sidepanel-recovery.js' });
  vm.runInContext(runtimeSource, context, { filename: 'sidepanel-runtime.js' });

  return {
    context,
    storage,
    writes,
    saveStatus,
    getRetryButton: () => elements.get('btn-storage-retry'),
    setFailWrites(value) { failWrites = value; },
  };
}

(async () => {
  const h = makeHarness();
  h.setFailWrites(true);

  const scheduledSave = h.context.saveData();
  const forcedFlush = h.context.MemoMaintenance.flushSaveData();

  await assert.rejects(forcedFlush, /injected storage write failure/);
  await assert.rejects(scheduledSave, /injected storage write failure/);

  assert.strictEqual(h.context.isDirty, true, 'failed save must keep the edited state dirty');
  assert.strictEqual(h.writes.length, 0, 'failed storage write must not be recorded as successful');
  assert.strictEqual(
    h.storage.tabs,
    JSON.stringify([{ id: 'a', title: 'before', mode: 'text', content: 'old', items: [] }]),
    'failed save must leave previously persisted tabs untouched'
  );
  assert.strictEqual(h.saveStatus.dataset.state, 'error', 'failed save must expose an error state');

  const retryButton = h.getRetryButton();
  assert.ok(retryButton && !retryButton.hidden, 'save failure must expose the retry action');
  assert.strictEqual(retryButton.textContent, '再試行');

  h.setFailWrites(false);
  await h.context.MemoMaintenance.retryStorageOperation();

  assert.strictEqual(h.context.isDirty, false, 'successful retry must clear dirty state');
  assert.strictEqual(h.writes.length, 1, 'successful retry must persist exactly one snapshot');
  assert.strictEqual(h.storage.activeTabId, 'a');
  assert.deepStrictEqual(
    JSON.parse(h.storage.tabs),
    [{ id: 'a', title: 'after', mode: 'text', content: 'edited', items: [] }],
    'successful retry must persist the in-memory edited content'
  );
  assert.strictEqual(h.saveStatus.dataset.state, 'saved', 'successful retry must return to saved state');
  assert.strictEqual(retryButton.hidden, true, 'retry action must disappear after successful save');

  const runtimeState = h.context.MemoMaintenance.getSaveRuntimeState();
  assert.strictEqual(runtimeState.isDirty, false);
  assert.strictEqual(runtimeState.hasDebounceTimer, false);
  assert.strictEqual(runtimeState.pendingWaiterCount, 0);

  console.log('save-recovery-flow.test.js: save failure -> dirty/error -> retry -> saved passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
