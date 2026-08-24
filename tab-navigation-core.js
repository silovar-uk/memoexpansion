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

  const api = { normalizeText, filterTabs, activeResultIndex, moveResultIndex };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.MemoTabNavigation = api;
})();
