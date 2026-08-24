(() => {
  'use strict';

  const maintenance = window.MemoMaintenance || (window.MemoMaintenance = {});
  const saveState = window.MemoSaveState;
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
    const snapshot = saveState.createSnapshot(tabs, activeTabId);
    updateSaveStatus('saving');

    await chrome.storage.local.set({
      tabs: snapshot.tabsJSON,
      activeTabId: snapshot.activeTabId
    });

    lastSavedTabsJSON = snapshot.tabsJSON;
    const nextState = saveState.stateAfterPersist(snapshot, tabs, activeTabId);
    isDirty = nextState === 'dirty';
    updateSaveStatus(nextState);

    // Saving is serialized. If the user typed or switched tabs while the write was
    // in flight, the just-written snapshot is valid but already stale: immediately
    // queue the newer state rather than clearing dirty by accident.
    if (isDirty && saveTimer === null) scheduleFlush();
  }

  async function flushSaveData() {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (!isDirty) {
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

  if (typeof saveData === 'function' && saveState) {
    saveData = function debouncedSaveData() {
      if (!isDirty) return Promise.resolve();
      const promise = new Promise((resolve, reject) => pendingSaveWaiters.push({ resolve, reject }));
      scheduleFlush();
      return promise;
    };

    maintenance.flushSaveData = flushSaveData;
    maintenance.getSaveRuntimeState = () => ({
      isDirty,
      hasDebounceTimer: saveTimer !== null,
      pendingWaiterCount: pendingSaveWaiters.length
    });

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
