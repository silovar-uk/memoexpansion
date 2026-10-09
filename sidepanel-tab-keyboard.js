(() => {
  'use strict';

  // All navigation shortcuts are scoped to a focused tab in the MemoTool tablist.
  // Do not bind Alt+Q, Alt+digits, Ctrl+digits or any document-wide shortcuts.
  const strip = document.getElementById('tab-list');
  const navigation = window.MemoTabNavigation;
  if (!strip || !navigation) return;

  function focusTabAt(index) {
    const elements = Array.from(strip.querySelectorAll('.tab[role="tab"]'));
    const element = elements[index];
    if (!element) return false;

    // Manual-activation tablist: moving keyboard focus never changes memo content.
    elements.forEach(tab => { tab.tabIndex = tab === element ? 0 : -1; });
    element.focus({ preventScroll: true });
    element.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
    return true;
  }

  function activateTabAt(index) {
    const tab = tabs[index];
    if (!tab) return;
    if (tab.id === activeTabId) {
      window.MemoFocus?.focusCurrentMemo();
      return;
    }
    switchTab(tab.id); // Existing focus/scroll continuity and save flow own the transition.
  }

  function moveTabAt(fromIndex, direction) {
    const result = navigation.reorderTab(tabs, fromIndex, direction);
    if (!result.moved) return;
    tabs.splice(0, tabs.length, ...result.tabs);
    markAsDirty();
    saveData();
    renderTabs(); // Tab strip only; editor DOM and its caret remain untouched.
    focusTabAt(result.index);
  }

  strip.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
    // A rename input, close button or nested control must keep its own keyboard behavior.
    const target = event.target;
    if (!target?.matches?.('.tab[role="tab"]')) return;
    const currentIndex = tabs.findIndex(tab => tab.id === target.dataset.tabId);
    if (currentIndex < 0) return;
    if (event.altKey || event.metaKey) return;

    if (event.ctrlKey || event.shiftKey) {
      if (event.ctrlKey && event.shiftKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        event.stopPropagation();
        moveTabAt(currentIndex, event.key === 'ArrowLeft' ? -1 : 1);
      }
      return;
    }

    const directIndex = navigation.tabIndexForNumberKey(event.key, event.code, tabs.length);
    if (directIndex >= 0) {
      event.preventDefault();
      event.stopPropagation();
      activateTabAt(directIndex);
      return;
    }

    const targetIndex = navigation.tabIndexForNavigationKey(currentIndex, tabs.length, event.key);
    if (targetIndex >= 0) {
      event.preventDefault();
      event.stopPropagation();
      focusTabAt(targetIndex);
    }
  });
})();
