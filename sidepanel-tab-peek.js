// Quiet hover preview for memo tabs. Read-only; never changes the active memo.
(() => {
  'use strict';

  function previewLines(tab, maxLines = 3) {
    const limit = Number.isInteger(maxLines) && maxLines > 0 ? maxLines : 3;
    if (!tab) return [];
    if (tab.mode === 'text') {
      return String(tab.content ?? '').split(/\r?\n/)
        .map(line => line.trim()).filter(Boolean)
        .slice(0, limit).map(line => line.slice(0, 110));
    }
    const items = Array.isArray(tab.items) ? tab.items : [];
    const available = items.filter(item => !item?.completed && String(item?.text ?? '').trim());
    const topLevel = available.filter(item => (item.depth || 0) === 0);
    return (topLevel.length ? topLevel : available).slice(0, limit)
      .map(item => String(item.text).trim().slice(0, 110));
  }

  // Node consumers test the pure preview contract without a browser DOM.
  if (typeof module !== 'undefined' && module.exports) module.exports = { previewLines };
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  let hoverTimer = null;
  let displayedTab = null;
  let nativeTitle = null;
  const TOOLTIP_ID = 'memo-tab-peek-tooltip';

  function hide() {
    if (hoverTimer !== null) clearTimeout(hoverTimer);
    hoverTimer = null;
    document.getElementById(TOOLTIP_ID)?.remove();
    if (displayedTab?.isConnected) {
      displayedTab.removeAttribute('aria-describedby');
      if (nativeTitle !== null) displayedTab.title = nativeTitle;
    }
    displayedTab = null;
    nativeTitle = null;
  }

  function show(tabElement, tabId) {
    if (!tabElement?.isConnected || document.querySelector(
      '.popup-menu, #tab-switcher:not([hidden]), #typography-popover:not([hidden])'
    )) return;
    const tab = tabs.find(item => item.id === tabId);
    if (!tab) return;
    const lines = previewLines(tab);
    if (!lines.length) return;

    hide();
    const tooltip = document.createElement('div');
    tooltip.id = TOOLTIP_ID;
    tooltip.className = 'memo-tab-peek';
    tooltip.setAttribute('role', 'tooltip');
    const title = document.createElement('div');
    title.className = 'memo-tab-peek-title';
    title.textContent = tab.title;
    tooltip.appendChild(title);
    for (const line of lines) {
      const row = document.createElement('div');
      row.className = 'memo-tab-peek-line';
      row.textContent = line;
      tooltip.appendChild(row);
    }
    document.body.appendChild(tooltip);
    const rect = tabElement.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    tooltip.style.left = `${Math.max(6, Math.min(rect.left, window.innerWidth - tipRect.width - 6))}px`;
    const below = rect.bottom + 6;
    tooltip.style.top = `${below + tipRect.height < window.innerHeight - 6 ?
      below : Math.max(6, rect.top - tipRect.height - 6)}px`;
    nativeTitle = tabElement.title;
    tabElement.removeAttribute('title');
    displayedTab = tabElement;
    tabElement.setAttribute('aria-describedby', TOOLTIP_ID);
  }

  function attach(tabElement, tabId) {
    if (!tabElement) return;
    tabElement.addEventListener('mouseenter', () => {
      hide();
      if (window.matchMedia?.('(hover: hover)').matches === false) return;
      hoverTimer = setTimeout(() => {
        hoverTimer = null;
        if (!tabElement.classList.contains('dragging')) show(tabElement, tabId);
      }, 650);
    });
    tabElement.addEventListener('mouseleave', hide);
    tabElement.addEventListener('contextmenu', hide);
    tabElement.addEventListener('dragstart', hide);
  }

  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
  window.MemoTabPeek = { attach, hide, previewLines };
})();
