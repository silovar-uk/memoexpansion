(() => {
  'use strict';

  // Quiet Shell owns only persistent chrome behavior. Feature logic remains in its original modules.
  updateInstanceAlert = function updateInstanceAlertQuietShell() {
    const indicator = document.getElementById('instance-count');
    if (!indicator) return;
    const multiple = currentInstanceCount >= 2;
    indicator.hidden = !multiple;
    indicator.textContent = multiple ? String(currentInstanceCount) : '';
    indicator.title = multiple ? `サイドパネルが${currentInstanceCount}つ起動中` : '';
    indicator.setAttribute('aria-label', multiple ? `サイドパネルが${currentInstanceCount}つ起動中` : '');
  };

  updateSortButtonVisibility = function updateContextUtilityVisibility() {
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    const isOutliner = Boolean(currentTab && currentTab.mode === 'outliner');
    const btnSort = document.getElementById('btn-sort-stars');
    const btnLineNumbers = document.getElementById('btn-line-numbers');
    if (btnSort) btnSort.hidden = !isOutliner;
    if (btnLineNumbers) btnLineNumbers.hidden = !isOutliner;
  };

  let activeTabVisibilityFrame = null;

  function ensureActiveTabVisible() {
    const list = document.getElementById('tab-list');
    const activeTab = list?.querySelector('.tab.active');
    if (!list || !activeTab) return;

    const listRect = list.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    const isOutside = tabRect.left < listRect.left || tabRect.right > listRect.right;
    if (!isOutside) return;

    activeTab.scrollIntoView({
      behavior: 'auto',
      block: 'nearest',
      inline: 'nearest'
    });
  }

  function scheduleActiveTabVisibilityCheck() {
    if (activeTabVisibilityFrame !== null) cancelAnimationFrame(activeTabVisibilityFrame);
    activeTabVisibilityFrame = requestAnimationFrame(() => {
      activeTabVisibilityFrame = null;
      ensureActiveTabVisible();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateInstanceAlert();
    updateSortButtonVisibility();

    const tabList = document.getElementById('tab-list');
    if (tabList) {
      const observer = new MutationObserver(scheduleActiveTabVisibilityCheck);
      observer.observe(tabList, { childList: true });
      scheduleActiveTabVisibilityCheck();
    }
  }, { once: true });
})();
