// On-demand tab move UI: no new persisted schema, no editor rerender.
(() => {
  'use strict';

  const nav = window.MemoTabNavigation;
  const INSERT_CLASSES = ['tab-move-insert-before', 'tab-move-insert-after'];
  let undoTimer = null;

  function clearPreview() {
    document.querySelectorAll('.tab-move-insert-before, .tab-move-insert-after')
      .forEach(node => node.classList.remove(...INSERT_CLASSES));
  }

  function showPreview(destination) {
    clearPreview();
    if (!destination) return;
    const id = destination.insertBeforeId || destination.insertAfterId;
    const element = Array.from(document.querySelectorAll('#tab-list .tab'))
      .find(node => node.dataset.tabId === id);
    if (element) element.classList.add(destination.insertBeforeId ?
      'tab-move-insert-before' : 'tab-move-insert-after');
  }

  function dismissUndo() {
    if (undoTimer !== null) clearTimeout(undoTimer);
    undoTimer = null;
    document.getElementById('tab-move-undo')?.remove();
  }

  function showUndo(tabId, fromIndex, toIndex) {
    dismissUndo();
    const expectedOrder = tabs.map(tab => tab.id).join('\u0001');
    const toast = document.createElement('div');
    toast.id = 'tab-move-undo';
    toast.className = 'tab-move-undo';
    toast.setAttribute('role', 'status');

    const label = document.createElement('span');
    label.textContent = `${toIndex + 1}番目に移動しました`;
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.textContent = '元に戻す';
    undo.setAttribute('aria-label', '直前のタブ移動を元に戻す');
    undo.addEventListener('click', () => {
      // Do not undo over another window's or a later operation's tab order.
      if (tabs.map(tab => tab.id).join('\u0001') !== expectedOrder) {
        dismissUndo();
        window.showTransientStatus?.('タブ順序が変わったため取り消せません');
        return;
      }
      const result = nav.moveTabToIndex(tabs, tabId, fromIndex);
      dismissUndo();
      if (!result.moved) return;
      tabs.splice(0, tabs.length, ...result.tabs);
      markAsDirty();
      saveData();
      renderTabs(); // Keep the editor DOM, caret and activeTabId untouched.
    });
    toast.append(label, undo);
    document.body.appendChild(toast);
    const scheduleDismiss = () => {
      if (undoTimer !== null) clearTimeout(undoTimer);
      undoTimer = setTimeout(dismissUndo, 6000);
    };
    toast.addEventListener('mouseenter', () => {
      if (undoTimer !== null) clearTimeout(undoTimer);
    });
    toast.addEventListener('mouseleave', scheduleDismiss);
    toast.addEventListener('focusin', () => {
      if (undoTimer !== null) clearTimeout(undoTimer);
    });
    toast.addEventListener('focusout', scheduleDismiss);
    scheduleDismiss();
  }

  function commitMove(menu, tabId, targetIndex) {
    const result = nav.moveTabToIndex(tabs, tabId, targetIndex);
    clearPreview();
    menu.remove();
    if (!result.moved) return;
    tabs.splice(0, tabs.length, ...result.tabs);
    markAsDirty();
    saveData();
    renderTabs(); // Do not activate the moving tab or recreate the editor.
    showUndo(tabId, result.fromIndex, result.index);
  }

  function mountContextEntry(menu, tabId) {
    if (!nav?.moveTabToIndex || !nav?.tabMoveDestinations || tabs.length < 2) return;
    const entry = document.createElement('button');
    entry.type = 'button';
    entry.className = 'popup-menu-item tab-move-trigger';
    entry.textContent = '↔  移動先を指定  ›';
    entry.setAttribute('aria-label', 'このタブの移動先を指定');
    entry.setAttribute('aria-haspopup', 'true');
    menu.appendChild(entry);

    const initialNodes = Array.from(menu.children);
    function restoreMenu() {
      clearPreview();
      menu.querySelector('.tab-move-panel')?.remove();
      for (const node of initialNodes) node.hidden = false;
      menu.classList.remove('tab-move-expanded');
      menu.style.removeProperty('width');
      requestAnimationFrame(() => clampPopupMenuToViewport(menu));
      entry.focus({ preventScroll: true });
    }
    function openPanel() {
      if (!menu.isConnected) return;
      window.MemoTabPeek?.hide();
      const destinations = nav.tabMoveDestinations(tabs, tabId);
      if (!destinations.length) return;
      const originalIndex = tabs.findIndex(tab => tab.id === tabId);
      for (const node of initialNodes) node.hidden = true;
      menu.classList.add('tab-move-expanded');
      menu.style.width = 'min(282px, calc(100vw - 16px))';

      const panel = document.createElement('div');
      panel.className = 'tab-move-panel';
      const top = document.createElement('div');
      top.className = 'tab-move-top';
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'tab-move-back';
      back.textContent = '‹ 戻る';
      back.setAttribute('aria-label', 'タブの右クリックメニューへ戻る');
      back.addEventListener('click', restoreMenu);
      const title = document.createElement('strong');
      title.textContent = '移動先を選択';
      top.append(back, title);
      panel.appendChild(top);

      const current = document.createElement('div');
      current.className = 'tab-move-source';
      current.textContent = `現在 ${originalIndex + 1}番 · ${tabs[originalIndex]?.title ?? ''}`;
      current.title = current.textContent;
      panel.appendChild(current);

      const search = document.createElement('input');
      if (tabs.length >= 10) {
        search.type = 'search';
        search.className = 'tab-move-search';
        search.placeholder = '番号・タブ名で絞り込み';
        search.setAttribute('aria-label', '移動先を絞り込み');
        panel.appendChild(search);
      }

      const list = document.createElement('div');
      list.className = 'tab-move-options';
      list.setAttribute('role', 'group');
      list.setAttribute('aria-label', '移動先');
      panel.appendChild(list);

      const preview = document.createElement('div');
      preview.className = 'tab-move-preview';
      preview.textContent = '候補に合わせると挿入位置を表示';
      preview.setAttribute('aria-live', 'off');
      panel.appendChild(preview);

      const buttons = [];
      function renderOptions(query = '') {
        clearPreview();
        list.replaceChildren();
        buttons.length = 0;
        const key = nav.normalizeText(query);
        const matches = destinations.filter(d => !key ||
          nav.normalizeText(`${d.position} ${d.label}`).includes(key));
        for (const d of matches) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'tab-move-option';
          button.disabled = d.current;
          const number = document.createElement('span');
          number.className = 'tab-move-number';
          number.textContent = String(d.position);
          const label = document.createElement('span');
          label.className = 'tab-move-label';
          label.textContent = d.label;
          const hint = document.createElement('span');
          hint.className = 'tab-move-current';
          hint.textContent = d.current ? '現在' : '';
          button.append(number, label, hint);
          button.addEventListener('mouseenter', () => {
            showPreview(d);
            preview.textContent = `${originalIndex + 1} → ${d.position}番目に移動`;
          });
          button.addEventListener('focus', () => {
            showPreview(d);
            preview.textContent = `${originalIndex + 1} → ${d.position}番目に移動`;
          });
          button.addEventListener('click', () => commitMove(menu, tabId, d.index));
          list.appendChild(button);
          if (!button.disabled) buttons.push(button);
        }
        if (matches.length === 0) {
          const empty = document.createElement('span');
          empty.className = 'tab-move-empty';
          empty.textContent = '該当する移動先はありません';
          list.appendChild(empty);
        }
        preview.textContent = '候補に合わせると挿入位置を表示';
        requestAnimationFrame(() => {
          if (menu.isConnected) clampPopupMenuToViewport(menu);
        });
      }
      search.addEventListener('input', () => renderOptions(search.value));
      panel.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          restoreMenu();
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const currentIndex = buttons.indexOf(document.activeElement);
          const delta = event.key === 'ArrowDown' ? 1 : -1;
          const nextIndex = currentIndex < 0 ? (delta > 0 ? 0 : buttons.length - 1) :
            (currentIndex + delta + buttons.length) % buttons.length;
          buttons[nextIndex]?.focus({ preventScroll: true });
          buttons[nextIndex]?.scrollIntoView({ block: 'nearest' });
        }
      });
      menu.appendChild(panel);
      renderOptions();
      requestAnimationFrame(() => {
        if (!menu.isConnected) return;
        clampPopupMenuToViewport(menu);
        if (tabs.length >= 10) search.focus({ preventScroll: true });
        else buttons[0]?.focus({ preventScroll: true });
      });
    }
    entry.addEventListener('click', openPanel);
    menu.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !menu.querySelector('.tab-move-panel')) {
        clearPreview();
        menu.remove();
      }
    });
    // If an outside click removes the menu, do not leave a ghost insertion line.
    const observer = new MutationObserver(() => {
      if (!menu.isConnected) {
        clearPreview();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true });
  }

  window.MemoTabMove = { mountContextEntry, clearPreview };
})();
