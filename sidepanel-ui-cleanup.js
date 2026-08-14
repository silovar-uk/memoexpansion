(() => {
  'use strict';

  const maintenance = window.MemoMaintenance || (window.MemoMaintenance = {});

  function removeEllipsisMenus() {
    document.querySelectorAll('.menu-toggle, .action-buttons, .footer-menu-wrapper').forEach(element => element.remove());
    document.body?.classList.remove('action-menu-pinned');
    if (typeof isActionMenuPinned !== 'undefined') isActionMenuPinned = false;
  }

  function makeSafeTabChoice(tab, onClick) {
    const item = document.createElement('div');
    item.className = 'popup-menu-item';
    item.setAttribute('role', 'button');
    item.tabIndex = 0;

    const label = document.createElement('span');
    const icon = tab.mode === 'outliner' ? '🔹' : '📝';
    label.textContent = `${icon} ${tab.title}`;
    item.appendChild(label);

    const activate = () => onClick();
    item.addEventListener('click', activate);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
    return item;
  }

  if (typeof showMultiMoveMenu === 'function') {
    showMultiMoveMenu = function safeShowMultiMoveMenu() {
      closeAllPopups();
      const menu = document.createElement('div');
      menu.className = 'popup-menu';
      menu.style.left = '16px';
      menu.style.bottom = '40px';
      menu.style.position = 'fixed';

      const header = document.createElement('div');
      header.className = 'popup-menu-header';
      header.textContent = `${selectedItemIds.size}件を移動...`;
      menu.appendChild(header);

      const otherTabs = tabs.filter(tab => tab.id !== activeTabId);
      if (otherTabs.length === 0) {
        const empty = document.createElement('div');
        empty.style.padding = '8px';
        empty.style.fontSize = '11px';
        empty.style.color = '#a8a29e';
        empty.textContent = '(移動先タブがありません)';
        menu.appendChild(empty);
      } else {
        otherTabs.forEach(tab => {
          menu.appendChild(makeSafeTabChoice(tab, () => {
            moveSelectedItemsToTab(tab.id);
            menu.remove();
          }));
        });
      }

      setupPopupClose(menu);
      document.body.appendChild(menu);
    };
  }

  // 行の三点リーダー配下にあったUI機能は完全撤去。
  if (typeof showMoveTabMenu === 'function') showMoveTabMenu = () => {};
  if (typeof showColorPalette === 'function') showColorPalette = () => {};

  if (typeof renderEditor === 'function') {
    const baseRenderEditor = renderEditor;
    renderEditor = function maintainedRenderEditor(...args) {
      const editor = document.getElementById('editor');
      editor?.classList.add('is-rendering');
      try {
        return baseRenderEditor.apply(this, args);
      } finally {
        removeEllipsisMenus();
        window.requestAnimationFrame(() => editor?.classList.remove('is-rendering'));
      }
    };
  }

  removeEllipsisMenus();

  const observer = new MutationObserver(() => removeEllipsisMenus());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  maintenance.ellipsisObserver = observer;
})();
