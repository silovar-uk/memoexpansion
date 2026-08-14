(() => {
  'use strict';

  const maintenance = window.MemoMaintenance || (window.MemoMaintenance = {});
  const SAVE_DEBOUNCE_MS = 180;
  let saveTimer = null;
  let saveInFlight = Promise.resolve();
  let pendingSaveWaiters = [];

  function resolveWaiters(waiters, error = null) {
    waiters.forEach(({ resolve, reject }) => error ? reject(error) : resolve());
  }

  function scheduleFlush() {
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      flushSaveData().catch((error) => console.error('Debounced save failed:', error));
    }, SAVE_DEBOUNCE_MS);
  }

  async function persistSnapshot() {
    maintenance.normalizeState?.();
    const tabsSnapshot = JSON.stringify(tabs);
    const activeTabSnapshot = activeTabId;
    updateSaveStatus('saving');

    await chrome.storage.local.set({
      tabs: tabsSnapshot,
      activeTabId: activeTabSnapshot
    });

    lastSavedTabsJSON = tabsSnapshot;
    const stateStillMatches = JSON.stringify(tabs) === tabsSnapshot && activeTabId === activeTabSnapshot;
    isDirty = !stateStillMatches;
    updateSaveStatus(isDirty ? 'dirty' : 'saved');
    if (isDirty && saveTimer === null) scheduleFlush();
  }

  async function flushSaveData() {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (!isDirty && Array.isArray(tabs) && tabs.length > 0) {
      resolveWaiters(pendingSaveWaiters.splice(0));
      return;
    }
    const waiters = pendingSaveWaiters.splice(0);
    saveInFlight = saveInFlight.catch(() => {}).then(() => persistSnapshot());
    try {
      await saveInFlight;
      resolveWaiters(waiters);
    } catch (error) {
      isDirty = true;
      updateSaveStatus('error');
      resolveWaiters(waiters, error);
      throw error;
    }
  }

  if (typeof saveData === 'function') {
    saveData = function debouncedSaveData() {
      if (!isDirty && Array.isArray(tabs) && tabs.length > 0) return Promise.resolve();
      const promise = new Promise((resolve, reject) => pendingSaveWaiters.push({ resolve, reject }));
      scheduleFlush();
      return promise;
    };

    maintenance.flushSaveData = flushSaveData;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && isDirty) {
        flushSaveData().catch((error) => console.error('Visibility save failed:', error));
      }
    });
    window.addEventListener('pagehide', () => {
      if (isDirty) flushSaveData().catch(() => {});
    });
  }
})();
