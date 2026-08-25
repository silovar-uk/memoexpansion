(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MemoRecoveryState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function parseStoredTabs(tabsJSON) {
    if (tabsJSON === undefined || tabsJSON === null || tabsJSON === '') {
      return { status: 'missing', tabs: [], reason: null };
    }
    if (typeof tabsJSON !== 'string') {
      return { status: 'invalid', tabs: [], reason: 'not-string' };
    }

    try {
      const parsed = JSON.parse(tabsJSON);
      if (!Array.isArray(parsed)) {
        return { status: 'invalid', tabs: [], reason: 'not-array' };
      }
      return { status: 'ok', tabs: parsed, reason: null };
    } catch (_) {
      return { status: 'invalid', tabs: [], reason: 'invalid-json' };
    }
  }

  function resolveActiveTabId(tabs, activeTabId) {
    if (!Array.isArray(tabs) || tabs.length === 0) return null;
    if (activeTabId && tabs.some(tab => tab && tab.id === activeTabId)) return activeTabId;
    const firstUsableTab = tabs.find(tab => tab && tab.id);
    return firstUsableTab ? firstUsableTab.id : null;
  }

  function shouldBlockWrites(loadStatus) {
    return loadStatus === 'invalid';
  }

  return {
    parseStoredTabs,
    resolveActiveTabId,
    shouldBlockWrites
  };
});
