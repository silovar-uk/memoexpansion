(() => {
  'use strict';

  const navigation = window.MemoTabNavigation;
  const button = document.getElementById('btn-tab-search');
  const switcher = document.getElementById('tab-switcher');
  const input = document.getElementById('tab-switcher-input');
  const list = document.getElementById('tab-switcher-list');
  if (!navigation || !button || !switcher || !input || !list) return;

  let results = [];
  let selectedIndex = -1;
  let previousFocus = null;

  function isOpen() {
    return !switcher.hidden;
  }

  function setSelectedIndex(index) {
    selectedIndex = index;
    list.querySelectorAll('.tab-switcher-item').forEach((item, itemIndex) => {
      const selected = itemIndex === selectedIndex;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-selected', String(selected));
      if (selected) item.scrollIntoView({ block: 'nearest' });
    });
  }

  function renderResults() {
    results = navigation.filterTabs(tabs, input.value);
    list.textContent = '';

    if (results.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tab-switcher-empty';
      empty.textContent = '該当するメモはありません';
      list.appendChild(empty);
      selectedIndex = -1;
      return;
    }

    results.forEach((tab, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'tab-switcher-item';
      item.dataset.tabId = tab.id;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');

      const title = document.createElement('span');
      title.className = 'tab-switcher-title';
      title.textContent = tab.title || '名称未設定';

      const mode = document.createElement('span');
      mode.className = 'tab-switcher-mode';
      mode.textContent = tab.mode === 'text' ? 'TEXT' : 'OUTLINE';

      item.append(title, mode);
      item.addEventListener('click', () => activateResult(index));
      item.addEventListener('mousemove', () => setSelectedIndex(index));
      list.appendChild(item);
    });

    selectedIndex = input.value
      ? 0
      : navigation.activeResultIndex(results, activeTabId);
    setSelectedIndex(selectedIndex);
  }

  function closeSwitcher({ restoreFocus = true } = {}) {
    if (!isOpen()) return;
    switcher.hidden = true;
    input.value = '';
    results = [];
    selectedIndex = -1;
    list.textContent = '';
    button.setAttribute('aria-expanded', 'false');
    if (restoreFocus) (previousFocus || button)?.focus?.({ preventScroll: true });
    previousFocus = null;
  }

  function openSwitcher() {
    if (isOpen()) return;
    previousFocus = document.activeElement;
    switcher.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    input.value = '';
    renderResults();
    requestAnimationFrame(() => input.focus());
  }

  function activateResult(index) {
    const tab = results[index];
    if (!tab) return;
    closeSwitcher({ restoreFocus: false });
    if (tab.id !== activeTabId) switchTab(tab.id);
    requestAnimationFrame(() => window.MemoFocus?.focusCurrentMemo());
  }

  button.addEventListener('click', () => isOpen() ? closeSwitcher() : openSwitcher());
  input.addEventListener('input', renderResults);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      selectedIndex = navigation.moveResultIndex(selectedIndex, results.length, event.key === 'ArrowUp' ? -1 : 1);
      setSelectedIndex(selectedIndex);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      activateResult(selectedIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeSwitcher();
    }
  });

  switcher.addEventListener('mousedown', (event) => {
    if (event.target === switcher) closeSwitcher();
  });

  document.addEventListener('keydown', (event) => {
    if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'q') {
      event.preventDefault();
      isOpen() ? closeSwitcher() : openSwitcher();
      return;
    }
    if (event.key === 'Escape' && isOpen() && document.activeElement !== input) {
      closeSwitcher();
    }
  });
})();
