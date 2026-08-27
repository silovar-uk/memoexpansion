(function () {
  if (typeof document === 'undefined') return;
  if (!window.MemoNoteMetadata) return;

  const { extractUrls, extractNonUrlText, compactUrlLabel } = window.MemoNoteMetadata;
  const originalRenderEditor = window.renderEditor;
  const originalHandleKey = window.handleKey;
  let activeMetadataPopup = null;
  let outsideClickHandler = null;

  function findActiveItem(itemId) {
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    if (!currentTab || currentTab.mode !== 'outliner') return null;
    const index = currentTab.items.findIndex(item => item.id === itemId);
    if (index === -1) return null;
    return { currentTab, item: currentTab.items[index], index };
  }

  function cleanupOutsideHandler() {
    if (!outsideClickHandler) return;
    document.removeEventListener('click', outsideClickHandler);
    outsideClickHandler = null;
  }

  function removeMetadataPopup({ restoreFocus = false, itemId = null } = {}) {
    cleanupOutsideHandler();
    if (activeMetadataPopup) activeMetadataPopup.remove();
    activeMetadataPopup = null;
    if (restoreFocus && itemId) requestAnimationFrame(() => focusItemById(itemId));
  }

  function positionMetadataPopup(popup, anchor) {
    const rect = anchor?.getBoundingClientRect?.();
    if (!rect) return;
    popup.style.position = 'fixed';
    popup.style.left = `${rect.left}px`;
    popup.style.top = `${rect.bottom + 4}px`;
    requestAnimationFrame(() => clampPopupMenuToViewport(popup));
  }

  function installOutsideClose(popup, onClose) {
    cleanupOutsideHandler();
    setTimeout(() => {
      outsideClickHandler = (event) => {
        if (!popup.isConnected || popup.contains(event.target)) return;
        onClose();
      };
      document.addEventListener('click', outsideClickHandler);
    }, 0);
  }

  function createPopupShell(itemId, anchor) {
    closeAllPopups();
    removeMetadataPopup();

    const popup = document.createElement('div');
    popup.className = 'popup-menu item-metadata-popup';
    popup.dataset.itemId = itemId;
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'リンク詳細');
    document.body.appendChild(popup);
    activeMetadataPopup = popup;
    positionMetadataPopup(popup, anchor);
    return popup;
  }

  function makePopupHeader(text) {
    const header = document.createElement('div');
    header.className = 'item-metadata-header';
    header.textContent = text;
    return header;
  }

  function openMetadataViewer(itemId, anchor) {
    const found = findActiveItem(itemId);
    if (!found) return;
    const note = found.item.note || '';
    const urls = extractUrls(note);
    if (urls.length === 0) {
      openMetadataEditor(itemId, anchor);
      return;
    }
    const plainText = extractNonUrlText(note);

    const popup = createPopupShell(itemId, anchor);
    popup.appendChild(makePopupHeader(plainText ? '詳細 / リンク' : (urls.length === 1 ? 'リンク' : `リンク ${urls.length}件`)));

    if (plainText) {
      const textBlock = document.createElement('div');
      textBlock.className = 'item-metadata-plain-text';
      textBlock.textContent = plainText;
      popup.appendChild(textBlock);
    }

    const list = document.createElement('div');
    list.className = 'item-metadata-link-list';
    urls.forEach((url) => {
      const link = document.createElement('a');
      link.className = 'item-metadata-link';
      link.href = url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.title = url;
      link.innerHTML = iconSvg('link', 13);
      const label = document.createElement('span');
      label.textContent = compactUrlLabel(url);
      link.appendChild(label);
      link.addEventListener('pointerdown', event => event.stopPropagation());
      list.appendChild(link);
    });
    popup.appendChild(list);

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'item-metadata-edit-btn';
    editButton.textContent = '編集';
    editButton.addEventListener('click', (event) => {
      event.stopPropagation();
      openMetadataEditor(itemId, anchor);
    });
    popup.appendChild(editButton);

    popup.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      removeMetadataPopup({ restoreFocus: true, itemId });
    });

    installOutsideClose(popup, () => removeMetadataPopup());
    requestAnimationFrame(() => editButton.focus({ preventScroll: true }));
  }

  function openMetadataEditor(itemId, anchor) {
    const found = findActiveItem(itemId);
    if (!found) return;
    const { item } = found;
    const tabIdAtOpen = activeTabId;
    const popup = createPopupShell(itemId, anchor);
    popup.classList.add('is-editing');
    popup.setAttribute('aria-label', '詳細を編集');
    popup.appendChild(makePopupHeader('詳細 / リンク'));

    const textarea = document.createElement('textarea');
    textarea.className = 'item-metadata-editor';
    textarea.value = item.note || '';
    textarea.placeholder = '詳細やURLを入力...';
    textarea.spellcheck = false;
    textarea.rows = Math.min(7, Math.max(3, textarea.value.split(/\r?\n/).length));
    popup.appendChild(textarea);

    const hint = document.createElement('div');
    hint.className = 'item-metadata-hint';
    hint.textContent = 'Esc / Ctrl+Enter で閉じる';
    popup.appendChild(hint);

    let changed = false;
    let historyPushed = false;
    const originalNote = item.note || '';

    function applyDraft() {
      if (textarea.value === item.note) return;
      if (!historyPushed) {
        pushHistory();
        historyPushed = true;
      }
      item.note = textarea.value;
      changed = true;
      const now = Date.now();
      if (!item.createdAt && item.note.trim() !== '') item.createdAt = now;
      else if (item.createdAt) item.updatedAt = now;
      markAsDirty();
    }

    function commitAndClose({ rerender = true, restoreFocus = true } = {}) {
      applyDraft();
      const shouldRender = rerender && (changed || originalNote !== item.note) && activeTabId === tabIdAtOpen;
      removeMetadataPopup();
      if (changed) saveData();
      if (shouldRender) renderEditor();
      if (restoreFocus && activeTabId === tabIdAtOpen) {
        requestAnimationFrame(() => focusItemById(itemId));
      }
    }

    textarea.addEventListener('input', applyDraft);
    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        commitAndClose();
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        commitAndClose();
      }
    });

    popup.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && event.target !== textarea) {
        event.preventDefault();
        commitAndClose();
      }
    });

    installOutsideClose(popup, () => commitAndClose({
      rerender: activeTabId === tabIdAtOpen,
      restoreFocus: false
    }));
    requestAnimationFrame(() => {
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      clampPopupMenuToViewport(popup);
    });
  }

  function createLinkTrigger(item) {
    const urls = extractUrls(item.note || '');
    if (urls.length === 0) return null;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'item-metadata-trigger';
    button.dataset.itemId = item.id;
    button.setAttribute('aria-label', urls.length === 1 ? 'リンクを開く' : `リンク ${urls.length}件を開く`);
    button.title = urls.length === 1 ? compactUrlLabel(urls[0]) : `リンク ${urls.length}件`;
    button.innerHTML = iconSvg('link', 13);
    if (urls.length > 1) {
      const count = document.createElement('span');
      count.className = 'item-metadata-count';
      count.textContent = String(urls.length);
      button.appendChild(count);
    }
    button.addEventListener('pointerdown', event => event.stopPropagation());
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openMetadataViewer(item.id, button);
    });
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openMetadataViewer(item.id, button);
      }
    });
    return button;
  }

  function enhanceMetadataRows() {
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    if (!currentTab || currentTab.mode !== 'outliner') return;
    const itemById = new Map(currentTab.items.map(item => [item.id, item]));

    document.querySelectorAll('.row[data-item-id]').forEach((row) => {
      const item = itemById.get(row.dataset.itemId);
      if (!item) return;
      const urls = extractUrls(item.note || '');
      const hasLinks = urls.length > 0;
      const noteDisplay = row.querySelector('.item-note-display');
      const linkContainer = row.querySelector('.note-link-container');
      const actions = row.querySelector('.row-actions');
      row.classList.toggle('has-compact-metadata', hasLinks);

      if (hasLinks) {
        noteDisplay?.classList.add('hidden');
        if (linkContainer) linkContainer.style.display = 'none';
        if (actions && !actions.querySelector('.item-metadata-trigger')) {
          const trigger = createLinkTrigger(item);
          if (trigger) actions.insertBefore(trigger, actions.lastElementChild || null);
        }
      }
    });
  }

  if (typeof originalRenderEditor === 'function') {
    window.renderEditor = function compactMetadataRenderEditor(...args) {
      const result = originalRenderEditor.apply(this, args);
      enhanceMetadataRows();
      return result;
    };
  }

  if (typeof originalHandleKey === 'function') {
    window.handleKey = function compactMetadataHandleKey(event, index, item) {
      if (event.key === 'F2') {
        event.preventDefault();
        event.stopPropagation();
        openMetadataEditor(item.id, event.target);
        return;
      }
      return originalHandleKey.call(this, event, index, item);
    };
  }

  window.MemoCompactMetadata = {
    enhanceMetadataRows,
    openMetadataViewer,
    openMetadataEditor
  };
})();
