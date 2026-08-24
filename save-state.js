(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MemoSaveState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function createSnapshot(tabs, activeTabId) {
    return {
      tabsJSON: JSON.stringify(Array.isArray(tabs) ? tabs : []),
      activeTabId: activeTabId ?? null
    };
  }

  function matchesSnapshot(snapshot, tabs, activeTabId) {
    if (!snapshot) return false;
    return snapshot.tabsJSON === JSON.stringify(Array.isArray(tabs) ? tabs : [])
      && snapshot.activeTabId === (activeTabId ?? null);
  }

  function stateAfterPersist(snapshot, tabs, activeTabId) {
    return matchesSnapshot(snapshot, tabs, activeTabId) ? 'saved' : 'dirty';
  }

  return {
    createSnapshot,
    matchesSnapshot,
    stateAfterPersist
  };
});
