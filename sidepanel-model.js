(() => {
  'use strict';

  const maintenance = window.MemoMaintenance || (window.MemoMaintenance = {});

  function createId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    const random = Math.random().toString(36).slice(2, 11);
    return `${Date.now().toString(36)}-${random}`;
  }

  function createOutlinerItem(overrides = {}) {
    const item = {
      id: createId(),
      text: '',
      note: '',
      depth: 0,
      completed: false,
      collapsed: false,
      textColor: null,
      markerColor: null,
      ...overrides
    };

    item.id ||= createId();
    item.text = typeof item.text === 'string' ? item.text : String(item.text ?? '');
    item.note = typeof item.note === 'string' ? item.note : String(item.note ?? '');
    item.depth = Number.isFinite(Number(item.depth)) ? Math.max(0, Number(item.depth)) : 0;
    item.completed = Boolean(item.completed);
    item.collapsed = Boolean(item.collapsed);
    if (typeof item.textColor === 'undefined') item.textColor = null;
    if (typeof item.markerColor === 'undefined') item.markerColor = null;

    return item;
  }

  function normalizeItem(item) {
    if (!item || typeof item !== 'object') return createOutlinerItem();

    if (!item.id) item.id = createId();
    if (typeof item.text !== 'string') item.text = String(item.text ?? '');
    if (typeof item.note !== 'string') item.note = String(item.note ?? '');
    item.depth = Number.isFinite(Number(item.depth)) ? Math.max(0, Number(item.depth)) : 0;
    item.completed = Boolean(item.completed);
    item.collapsed = Boolean(item.collapsed);
    if (typeof item.textColor === 'undefined') item.textColor = null;
    if (typeof item.markerColor === 'undefined') item.markerColor = null;
    return item;
  }

  function normalizeTab(tab) {
    if (!tab || typeof tab !== 'object') return null;

    if (!tab.id) tab.id = createId();
    if (!tab.mode) tab.mode = 'outliner';
    if (typeof tab.title !== 'string') tab.title = String(tab.title ?? '名称未設定');
    if (typeof tab.content !== 'string') tab.content = String(tab.content ?? '');
    if (!Array.isArray(tab.items)) tab.items = [];
    tab.items = tab.items.map(normalizeItem);
    return tab;
  }

  function normalizeState() {
    if (!Array.isArray(tabs)) tabs = [];
    tabs = tabs.map(normalizeTab).filter(Boolean);
  }

  maintenance.createId = createId;
  maintenance.createOutlinerItem = createOutlinerItem;
  maintenance.normalizeItem = normalizeItem;
  maintenance.normalizeTab = normalizeTab;
  maintenance.normalizeState = normalizeState;

  if (typeof generateId === 'function') {
    generateId = createId;
  }

  if (typeof loadData === 'function') {
    const baseLoadData = loadData;
    loadData = async function normalizedLoadData(...args) {
      const result = await baseLoadData.apply(this, args);
      normalizeState();
      return result;
    };
  }

  if (typeof migrateLegacyData === 'function') {
    const baseMigrateLegacyData = migrateLegacyData;
    migrateLegacyData = async function normalizedMigrateLegacyData(...args) {
      const result = await baseMigrateLegacyData.apply(this, args);
      normalizeState();
      return result;
    };
  }

  if (typeof createNewTab === 'function') {
    const baseCreateNewTab = createNewTab;
    createNewTab = function normalizedCreateNewTab(...args) {
      const result = baseCreateNewTab.apply(this, args);
      normalizeState();
      return result;
    };
  }
})();
