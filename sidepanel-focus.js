(() => {
  'use strict';

  const STORAGE_KEY = 'memoCaretByTabId';
  const SAVE_DELAY_MS = 120;
  let focusByTabId = {};
  let saveTimer = null;
  let focusStateReady = Promise.resolve();

  function isEditableMemoElement(element) {
    return element instanceof HTMLTextAreaElement && (
      element.classList.contains('text-editor-area') ||
      element.classList.contains('item-input') ||
      element.classList.contains('item-note')
    );
  }

  function snapshotFromElement(element) {
    if (!activeTabId || !isEditableMemoElement(element)) return null;

    const base = {
      selectionStart: Number.isInteger(element.selectionStart) ? element.selectionStart : 0,
      selectionEnd: Number.isInteger(element.selectionEnd) ? element.selectionEnd : 0,
      savedAt: Date.now()
    };

    if (element.classList.contains('text-editor-area')) {
      return { ...base, kind: 'text' };
    }

    return {
      ...base,
      kind: 'outliner',
      itemId: element.dataset.id || null,
      field: element.classList.contains('item-note') ? 'note' : 'text'
    };
  }

  function scrollOwnerForTab(tab) {
    if (!tab) return null;
    return tab.mode === 'text'
      ? document.querySelector('.text-editor-area')
      : document.getElementById('editor');
  }

  function rememberFocusStateFromElement(element) {
    if (!activeTabId) return null;
    const currentTab = tabs.find((tab) => tab.id === activeTabId);
    if (!currentTab) return null;

    const state = snapshotFromElement(element);
    if (!state) return null;

    const scrollOwner = scrollOwnerForTab(currentTab);
    if (scrollOwner && Number.isFinite(scrollOwner.scrollTop)) {
      state.scrollTop = scrollOwner.scrollTop;
    }
    focusByTabId[activeTabId] = state;
    return state;
  }

  async function writeCurrentFocusNow() {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }

    if (!activeTabId) return;
    const currentTab = tabs.find((tab) => tab.id === activeTabId);
    if (!currentTab) return;

    let state = rememberFocusStateFromElement(document.activeElement);
    if (!state && focusByTabId[activeTabId]) {
      state = { ...focusByTabId[activeTabId], savedAt: Date.now() };
      const scrollOwner = scrollOwnerForTab(currentTab);
      if (scrollOwner && Number.isFinite(scrollOwner.scrollTop)) {
        state.scrollTop = scrollOwner.scrollTop;
      }
      focusByTabId[activeTabId] = state;
    }
    if (!state) return;

    try {
      await chrome.storage.session.set({ [STORAGE_KEY]: focusByTabId });
    } catch (error) {
      console.error('Failed to save memo caret:', error);
    }
  }

  function scheduleFocusSave() {
    if (!snapshotFromElement(document.activeElement)) return;
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      writeCurrentFocusNow().catch(() => {});
    }, SAVE_DELAY_MS);
  }

  function clampSelection(element, state) {
    const length = element.value.length;
    const start = Math.max(0, Math.min(Number(state?.selectionStart) || 0, length));
    const end = Math.max(start, Math.min(Number(state?.selectionEnd) || start, length));
    element.setSelectionRange(start, end);
  }

  function findOutlinerElement(state) {
    if (!state?.itemId) return null;
    const selector = state.field === 'note' ? '.item-note' : '.item-input';
    return Array.from(document.querySelectorAll(selector))
      .find((element) => element.dataset.id === state.itemId) || null;
  }

  function revealNoteInput(noteInput) {
    if (!noteInput?.classList.contains('item-note')) return;
    noteInput.classList.remove('hidden');
    const display = noteInput.nextElementSibling;
    if (display?.classList.contains('item-note-display')) display.classList.add('hidden');
  }

  function fallbackElementForCurrentTab(currentTab) {
    if (currentTab.mode === 'text') {
      return document.querySelector('.text-editor-area');
    }

    const inputs = Array.from(document.querySelectorAll('.item-input'));
    return inputs.length ? inputs[inputs.length - 1] : null;
  }

  async function focusCurrentMemo() {
    await focusStateReady;

    const currentTab = tabs.find((tab) => tab.id === activeTabId);
    if (!currentTab) return false;

    // レンダー直後・パネル展開直後でもDOMが揃うまで1フレーム待つ。
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const savedState = focusByTabId[activeTabId];
    let target = null;

    if (savedState?.kind === 'text' && currentTab.mode === 'text') {
      target = document.querySelector('.text-editor-area');
    } else if (savedState?.kind === 'outliner' && currentTab.mode === 'outliner') {
      target = findOutlinerElement(savedState);
      if (target?.classList.contains('item-note')) revealNoteInput(target);
    }

    if (!target) target = fallbackElementForCurrentTab(currentTab);
    if (!target) return false;

    target.focus({ preventScroll: true });
    if (savedState && (
      savedState.kind === 'text' ||
      savedState.itemId === target.dataset.id
    )) {
      clampSelection(target, savedState);
    } else {
      const end = target.value.length;
      target.setSelectionRange(end, end);
    }

    const scrollOwner = scrollOwnerForTab(currentTab);
    if (scrollOwner && Number.isFinite(savedState?.scrollTop)) {
      scrollOwner.scrollTop = Math.max(0, savedState.scrollTop);
    } else {
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    if (target.classList.contains('item-input') && typeof setOutlinerInputEditingState === 'function') {
      setOutlinerInputEditingState(target);
    }
    return true;
  }

  function scheduleMemoFocus() {
    requestAnimationFrame(() => {
      focusCurrentMemo().catch(() => {});
    });
  }

  function installContinuityWrappers() {
    const originalSwitchTab = window.switchTab;
    if (typeof originalSwitchTab === 'function' && !originalSwitchTab.__memoContinuityWrapped) {
      const wrappedSwitchTab = function wrappedSwitchTab(tabId) {
        if (tabId === activeTabId) return originalSwitchTab.apply(this, arguments);
        writeCurrentFocusNow().catch(() => {});
        const result = originalSwitchTab.apply(this, arguments);
        scheduleMemoFocus();
        return result;
      };
      wrappedSwitchTab.__memoContinuityWrapped = true;
      window.switchTab = wrappedSwitchTab;
    }

    const originalCreateNewTab = window.createNewTab;
    if (typeof originalCreateNewTab === 'function' && !originalCreateNewTab.__memoContinuityWrapped) {
      const wrappedCreateNewTab = function wrappedCreateNewTab(mode) {
        writeCurrentFocusNow().catch(() => {});
        const result = originalCreateNewTab.apply(this, arguments);
        scheduleMemoFocus();
        return result;
      };
      wrappedCreateNewTab.__memoContinuityWrapped = true;
      window.createNewTab = wrappedCreateNewTab;
    }
  }

  focusStateReady = chrome.storage.session.get(STORAGE_KEY)
    .then((result) => {
      const stored = result[STORAGE_KEY];
      focusByTabId = stored && typeof stored === 'object' ? stored : {};
    })
    .catch((error) => {
      console.error('Failed to load memo caret state:', error);
      focusByTabId = {};
    });

  ['focusin', 'input', 'keyup', 'mouseup'].forEach((eventName) => {
    document.addEventListener(eventName, scheduleFocusSave, true);
  });
  document.addEventListener('selectionchange', scheduleFocusSave, true);
  document.addEventListener('focusout', (event) => {
    rememberFocusStateFromElement(event.target);
  }, true);

  window.addEventListener('pagehide', () => {
    writeCurrentFocusNow().catch(() => {});
  });

  window.MemoFocus = {
    focusCurrentMemo,
    saveCurrentFocus: writeCurrentFocusNow
  };

  installContinuityWrappers();
})();
