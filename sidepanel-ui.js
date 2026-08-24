let copyAllFeedbackTimer = null;

function setupEventListeners() {
  const menuBtn = document.getElementById('new-tab-btn');
  const menu = document.getElementById('new-tab-menu');
  menuBtn.onclick = (e) => { e.stopPropagation(); menu.style.display = (menu.style.display === 'flex' ? 'none' : 'flex'); };
  document.addEventListener('click', () => {
    menu.style.display = 'none';
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearLineJumpBuffer();
      return;
    }
    handleLineJumpKeydown(e);
  });
  document.addEventListener('mouseup', () => { 
    isDraggingSelection = false; 
    isRowDragHandleDown = false;
  });

  document.getElementById('menu-outliner').onclick = () => createNewTab('outliner');
  document.getElementById('menu-text').onclick = () => createNewTab('text');
  document.getElementById('btn-undo').onclick = undo;
  document.getElementById('btn-redo').onclick = redo;
  document.getElementById('btn-selection-cancel').onclick = () => { selectedItemIds.clear(); renderEditor(); };
  document.getElementById('btn-selection-move').onclick = (e) => { e.stopPropagation(); showMultiMoveMenu(); };
  const btnLineNumbers = document.getElementById('btn-line-numbers');
  if (btnLineNumbers) btnLineNumbers.onclick = toggleLineNumbers;
  const btnSort = document.getElementById('btn-sort-stars');
  if (btnSort) btnSort.onclick = sortItemsByStars;
  const btnCopyAll = document.getElementById('btn-copy-all');
  if (btnCopyAll) btnCopyAll.onclick = copyActiveMemoToClipboard;
  const btnHistory = document.getElementById('btn-history');
  if (btnHistory) btnHistory.onclick = showHistoryModal;
  const btnCloseHistory = document.getElementById('btn-close-history');
  if (btnCloseHistory) btnCloseHistory.onclick = hideHistoryModal;
  const historyModal = document.getElementById('history-modal');
  if (historyModal) {
    historyModal.addEventListener('click', (e) => {
      if (e.target === historyModal) hideHistoryModal();
    });
  }
}

function getActiveMemoPlainText() {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab) return '';

  if (currentTab.mode === 'text') {
    const textarea = document.querySelector('.text-editor-area');
    return textarea ? textarea.value : (currentTab.content || '');
  }

  syncRenderedOutlinerState();
  return (currentTab.items || [])
    .filter(item => !item.completed)
    .map(item => item.text || '')
    .join('\n');
}

function fallbackCopyText(text) {
  const previousFocus = document.activeElement;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (error) {
    console.error('Fallback copy failed', error);
  }

  textarea.remove();
  if (previousFocus && typeof previousFocus.focus === 'function') {
    try { previousFocus.focus({ preventScroll: true }); } catch (_) { previousFocus.focus(); }
  }
  return copied;
}

function copyIconMarkup() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="2"/><path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/></svg>';
}

function checkIconMarkup() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
}

function setCopyAllFeedback(state) {
  const button = document.getElementById('btn-copy-all');
  if (!button) return;

  if (copyAllFeedbackTimer) clearTimeout(copyAllFeedbackTimer);
  button.classList.remove('copied', 'copy-failed');

  if (state === 'success') {
    button.innerHTML = checkIconMarkup();
    button.classList.add('copied');
    button.setAttribute('aria-label', 'メモ全体をコピーしました');
  } else {
    button.innerHTML = copyIconMarkup();
    button.classList.add('copy-failed');
    button.setAttribute('aria-label', 'メモ全体のコピーに失敗しました');
  }

  copyAllFeedbackTimer = setTimeout(() => {
    button.innerHTML = copyIconMarkup();
    button.classList.remove('copied', 'copy-failed');
    button.setAttribute('aria-label', 'メモ全体をコピー');
  }, 1600);
}

async function copyActiveMemoToClipboard() {
  const text = getActiveMemoPlainText();
  let copied = false;

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (error) {
      console.warn('Clipboard API copy failed; trying fallback', error);
    }
  }

  if (!copied) copied = fallbackCopyText(text);
  setCopyAllFeedback(copied ? 'success' : 'error');
}

function toggleFold(index, forceCollapse = null) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || currentTab.mode !== 'outliner') return;
  const item = currentTab.items[index];
  const hasChildren = window.MemoOutlinerStructure.hasActiveChildren(currentTab.items, index);
  if (!hasChildren) return;
  pushHistory();
  item.collapsed = (forceCollapse !== null ? forceCollapse : !item.collapsed);
  markAsDirty(); renderEditor(); saveData();
  setTimeout(() => focusItemById(item.id), 0);
}

function updateInstanceAlert() {
  const bar = document.getElementById('status-bar');
  if (!bar) return;
  bar.classList.toggle('instance-alert', currentInstanceCount >= 2);
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'local') return;
  const activeEl = document.activeElement;
  const isEditing = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT');

  if (changes.tabs) {
    const newValStr = changes.tabs.newValue || "[]";
    if (newValStr === lastSavedTabsJSON || isDirty || isEditing) return;
    if (newValStr !== JSON.stringify(tabs)) {
      tabs = JSON.parse(newValStr);
      lastSavedTabsJSON = newValStr;
      if (archiveCompletedItemsInAllTabs()) markAsDirty();
      renderTabs(); renderEditor();
    }
  }

  if (changes.activeTabId) {
    const newActiveId = changes.activeTabId.newValue;
    if (newActiveId !== activeTabId && !isEditing && !isDirty) {
      activeTabId = newActiveId; renderTabs(); renderEditor();
      updateUndoButtons(); updateSortButtonVisibility();
    }
  }

  if (changes.showLineNumbers) {
    showLineNumbers = changes.showLineNumbers.newValue !== false;
    renderEditor();
  }
});

function renderHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;
  container.innerHTML = '';
  appHistory.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    const dateSpan = document.createElement('span');
    dateSpan.className = 'history-date';
    dateSpan.textContent = item.date;
    const textSpan = document.createElement('span');
    textSpan.textContent = item.text;
    div.appendChild(dateSpan);
    div.appendChild(document.createTextNode(' : '));
    div.appendChild(textSpan);
    container.appendChild(div);
  });
}

function showHistoryModal() {
  const modal = document.getElementById('history-modal');
  if (modal) {
    renderHistory();
    modal.style.display = 'flex';
  }
}

function hideHistoryModal() {
  const modal = document.getElementById('history-modal');
  if (modal) modal.style.display = 'none';
}
