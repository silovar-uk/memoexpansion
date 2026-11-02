(() => {
  'use strict';

  function normalizeText(value) {
    return String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('ja-JP');
  }

  function filterTabs(tabs, query) {
    const source = Array.isArray(tabs) ? tabs : [];
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return source.slice();
    return source.filter(tab => normalizeText(tab?.title).includes(normalizedQuery));
  }

  function activeResultIndex(results, activeTabId) {
    if (!Array.isArray(results) || results.length === 0) return -1;
    const index = results.findIndex(tab => tab?.id === activeTabId);
    return index >= 0 ? index : 0;
  }

  function moveResultIndex(currentIndex, resultCount, delta) {
    if (!Number.isInteger(resultCount) || resultCount <= 0) return -1;
    const start = Number.isInteger(currentIndex) && currentIndex >= 0 ? currentIndex : 0;
    const step = delta < 0 ? -1 : 1;
    return (start + step + resultCount) % resultCount;
  }

  // Digits only work while the tablist itself owns focus; they are never global shortcuts.
  function tabIndexForNumberKey(key, code, tabCount) {
    if (typeof tabCount !== 'number' || tabCount < 1) return -1;
    if (!/^[1-9]$/.test(key) || code !== 'Digit' + key) return -1;
    const index = Number(key) - 1;
    return index < tabCount ? index : -1;
  }

  function tabIndexForNavigationKey(index, tabCount, key) {
    if (!Number.isInteger(tabCount) || tabCount < 1 || !Number.isInteger(index) || index < 0 || index >= tabCount) return -1;
    if (key === 'ArrowRight') return (index + 1) % tabCount;
    if (key === 'ArrowLeft') return (index - 1 + tabCount) % tabCount;
    if (key === 'Home') return 0;
    if (key === 'End') return tabCount - 1;
    return -1;
  }

  function reorderTab(source, index, direction) {
    if (!Array.isArray(source) || !Number.isInteger(index) || index < 0 || index >= source.length || ![-1, 1].includes(direction)) {
      return { tabs: Array.isArray(source) ? source.slice() : [], index, moved: false };
    }
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= source.length) return { tabs: source.slice(), index, moved: false };
    const result = source.slice();
    const [tab] = result.splice(index, 1);
    result.splice(nextIndex, 0, tab);
    return { tabs: result, index: nextIndex, moved: true };
  }

  // Move a tab to an absolute zero-based position. This does not activate the tab.
  // Keep the original objects so IDs, memo content and metadata are preserved.
  function moveTabToIndex(source, tabId, targetIndex) {
    const current = Array.isArray(source) ? source : [];
    const fromIndex = current.findIndex(tab => tab?.id === tabId);
    if (fromIndex < 0 || !Number.isInteger(targetIndex) || targetIndex < 0 ||
        targetIndex >= current.length || targetIndex === fromIndex) {
      return { tabs: current.slice(), fromIndex, index: fromIndex, moved: false };
    }
    const result = current.slice();
    const [movedTab] = result.splice(fromIndex, 1);
    result.splice(targetIndex, 0, movedTab);
    return { tabs: result, fromIndex, index: targetIndex, moved: true };
  }

  // Destination labels are based on the list *without* the moving tab.
  function tabMoveDestinations(source, tabId) {
    if (!Array.isArray(source) || source.length < 2) return [];
    const fromIndex = source.findIndex(tab => tab?.id === tabId);
    if (fromIndex < 0) return [];
    const otherTabs = source.filter(tab => tab.id !== tabId);
    return source.map((_, index) => ({
      index,
      position: index + 1,
      current: index === fromIndex,
      label: index === 0 ? '先頭へ' :
        index === otherTabs.length ? '末尾へ' :
        `${otherTabs[index - 1].title}の後へ`,
      insertBeforeId: otherTabs[index]?.id ?? null,
      insertAfterId: index === otherTabs.length ? otherTabs.at(-1)?.id ?? null : null
    }));
  }

  const api = { normalizeText, filterTabs, activeResultIndex, moveResultIndex,
    tabIndexForNumberKey, tabIndexForNavigationKey, reorderTab,
    moveTabToIndex, tabMoveDestinations };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.MemoTabNavigation = api;
})();
