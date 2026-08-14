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

function toggleFold(index, forceCollapse = null) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || currentTab.mode !== 'outliner') return;
  const item = currentTab.items[index];
  let hasChildren = false;
  for (let i = index + 1; i < currentTab.items.length; i++) {
    if (currentTab.items[i].depth <= item.depth) break;
    if (!currentTab.items[i].completed) { hasChildren = true; break; }
  }
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
      tabs = JSON.parse(newValStr); lastSavedTabsJSON = newValStr;
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
