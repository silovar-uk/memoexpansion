(() => {
  'use strict';

  // Only the exact Alt+Shift+Left/Right chord, within the MemoTool side panel.
  // Alt+Q and Alt+digits remain reserved for Quick Links; plain Alt+arrows
  // remain the browser's back/forward navigation.
  const navigation = window.MemoTabNavigation;
  if (!navigation) return;

  function hasOpenInteraction() {
    if (document.querySelector(
      '#tab-switcher:not([hidden]), #typography-popover:not([hidden]), .popup-menu'
    )) return true;
    if (document.getElementById('new-tab-menu')?.style.display === 'flex') return true;
    if (document.getElementById('history-modal')?.style.display === 'flex') return true;
    return false;
  }

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
    if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    // Renaming or an open dialog owns its keyboard interactions.
    if (event.target?.closest?.('.tab input') || event.target?.isContentEditable) return;
    if (hasOpenInteraction()) return;

    const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
    if (tabs.length < 2 || currentIndex < 0) return;

    // Exactly the same wraparound ordering as focus-scoped tablist arrows.
    const nextIndex = navigation.tabIndexForNavigationKey(
      currentIndex, tabs.length, event.key
    );
    if (nextIndex < 0 || nextIndex === currentIndex) return;

    // Prevent browser navigation and native selection before editor listeners run.
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat) return; // Holding the chord should not race multiple saves.

    // Existing switchTab + MemoFocus own dirty/save and caret/scroll continuity.
    switchTab(tabs[nextIndex].id);
  }, true);
})();
