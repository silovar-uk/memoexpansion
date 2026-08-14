(() => {
  'use strict';

  const maintenance = window.MemoMaintenance || (window.MemoMaintenance = {});
  const SAVE_DEBOUNCE_MS = 180;
  let saveTimer = null;
  let saveInFlight = Promise.resolve();
  let pendingSaveWaiters = [];

  function settleSaveWaiters(error = null) {
    const waiters = pendingSaveWaiters;
    pendingSaveWaiters = [];
    waiters.forEach(({ resolve, reject }) => error ? reject(error) : resolve());
  }

  if (typeof saveData === 'function') {
    const baseSaveData = saveData;

    async function flushSaveData() {
      if (saveTimer !== null) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }

      maintenance.normalizeState?.();
      saveInFlight = saveInFlight.then(() => baseSaveData());

      try {
        await saveInFlight;
        settleSaveWaiters();
      } catch (error) {
        settleSaveWaiters(error);
        throw error;
      }
    }

    saveData = function debouncedSaveData() {
      if (!isDirty && Array.isArray(tabs) && tabs.length > 0) {
        return Promise.resolve();
      }

      if (saveTimer !== null) clearTimeout(saveTimer);

      const promise = new Promise((resolve, reject) => {
        pendingSaveWaiters.push({ resolve, reject });
      });

      saveTimer = window.setTimeout(() => {
        flushSaveData().catch((error) => console.error('Debounced save failed:', error));
      }, SAVE_DEBOUNCE_MS);

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

  if (typeof forceReload === 'function') {
    const baseForceReload = forceReload;
    forceReload = async function safeForceReload(...args) {
      if (saveTimer !== null) {
        clearTimeout(saveTimer);
        saveTimer = null;
        settleSaveWaiters();
      }
      return baseForceReload.apply(this, args);
    };
  }

  if (typeof handleKey === 'function') {
    const baseHandleKey = handleKey;

    handleKey = function maintainedHandleKey(e, index, item) {
      const keepBoldOnEnter =
        e.key === 'Enter' &&
        !e.isComposing &&
        !(e.ctrlKey || e.metaKey) &&
        item?.textColor === 'bold-red';

      if (!keepBoldOnEnter) {
        return baseHandleKey(e, index, item);
      }

      e.preventDefault();
      pushHistory();

      const currentTab = tabs.find(tab => tab.id === activeTabId);
      if (!currentTab || currentTab.mode !== 'outliner') return;

      const caretPos = e.target.selectionStart;
      const textAfter = item.text.substring(caretPos);
      const existedBeforeSplit = Boolean(item.createdAt);

      item.text = item.text.substring(0, caretPos);
      if (existedBeforeSplit) item.updatedAt = Date.now();

      const newItem = maintenance.createOutlinerItem({
        text: textAfter,
        depth: item.depth,
        textColor: 'bold-red'
      });
      if (textAfter.trim() !== '') newItem.createdAt = Date.now();

      let insertIndex = index + 1;
      if (item.collapsed) insertIndex = index + getSubtreeCount(currentTab, index);

      markAsDirty();
      currentTab.items.splice(insertIndex, 0, newItem);
      renderEditor();
      saveData();
      window.setTimeout(() => focusItemById(newItem.id, 0), 0);
    };
  }
})();
