// --- 行のドロップ処理（タスクの移動） ---
function handleRowDrop(fromIndex, toIndex, insertAfter) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || currentTab.mode !== 'outliner') return;
  
  const count = getSubtreeCount(currentTab, fromIndex);
  if (toIndex >= fromIndex && toIndex < fromIndex + count) return;
  
  pushHistory();
  const targetItem = currentTab.items[toIndex];
  let newDepth = targetItem.depth;
  const itemsToMove = currentTab.items.splice(fromIndex, count);
  let adjustedToIndex = toIndex;
  if (fromIndex < toIndex) adjustedToIndex -= count;
  
  let insertIndex = adjustedToIndex;
  if (insertAfter) {
    let hasChildren = false;
    if (adjustedToIndex + 1 < currentTab.items.length && currentTab.items[adjustedToIndex + 1].depth > targetItem.depth) {
      hasChildren = true;
    }
    if (hasChildren && !targetItem.collapsed) {
      newDepth = targetItem.depth + 1;
      insertIndex = adjustedToIndex + 1;
    } else {
      const targetSubtreeCount = getSubtreeCount(currentTab, adjustedToIndex);
      insertIndex = adjustedToIndex + targetSubtreeCount;
    }
  }
  
  const depthDiff = newDepth - itemsToMove[0].depth;
  itemsToMove.forEach(item => { item.depth = Math.max(0, item.depth + depthDiff); });
  currentTab.items.splice(insertIndex, 0, ...itemsToMove);
  
  markAsDirty();
  saveData();
  renderEditor();
  setTimeout(() => focusItemById(itemsToMove[0].id), 0);
}

// --- 複数選択ロジック ---

function handleRowSelection(e, item, index) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab) return;

  if (e.shiftKey && lastSelectionIndex !== -1) {
    const start = Math.min(lastSelectionIndex, index);
    const end = Math.max(lastSelectionIndex, index);
    if (!(e.ctrlKey || e.metaKey)) selectedItemIds.clear(); 
    for (let i = start; i <= end; i++) {
      if (!currentTab.items[i].completed) selectedItemIds.add(currentTab.items[i].id);
    }
  } else if (e.ctrlKey || e.metaKey) {
    if (selectedItemIds.has(item.id)) selectedItemIds.delete(item.id);
    else selectedItemIds.add(item.id);
    lastSelectionIndex = index;
  }
  renderEditor();
}

function updateSelectionUI() {
  const bar = document.getElementById('selection-bar');
  const countSpan = document.getElementById('selection-count');
  if (selectedItemIds.size > 0) {
    bar.classList.remove('hidden');
    bar.style.display = 'flex';
    countSpan.textContent = `${selectedItemIds.size}件選択`;
  } else {
    bar.classList.add('hidden');
    bar.style.display = 'none';
  }
}

function showMultiMoveMenu() {
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

  const otherTabs = tabs.filter(t => t.id !== activeTabId);
  if (otherTabs.length === 0) {
    const empty = document.createElement('div');
    empty.style.padding = '8px'; empty.style.fontSize = '11px'; empty.style.color = '#a8a29e';
    empty.textContent = '(移動先タブがありません)';
    menu.appendChild(empty);
  } else {
    otherTabs.forEach(tab => {
      const item = document.createElement('div');
      item.className = 'popup-menu-item';
      item.setAttribute('role', 'button');
      item.tabIndex = 0;
      const icon = tab.mode === 'outliner' ? '🔹' : '📝';
      const label = document.createElement('span');
      label.textContent = `${icon} ${tab.title}`;
      item.appendChild(label);
      const activate = () => { moveSelectedItemsToTab(tab.id); menu.remove(); };
      item.onclick = activate;
      item.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      };
      menu.appendChild(item);
    });
  }
  setupPopupClose(menu);
  document.body.appendChild(menu);
}

function moveSelectedItemsToTab(targetTabId) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  const targetTab = tabs.find(t => t.id === targetTabId);
  if (!currentTab || !targetTab || selectedItemIds.size === 0) return;

  pushHistory();
  let itemsToMove = [];
  let indicesToRemove = [];
  currentTab.items.forEach((item, idx) => {
    if (selectedItemIds.has(item.id)) {
      itemsToMove.push(item);
      indicesToRemove.push(idx);
    }
  });

  if (itemsToMove.length > 0) {
    const minDepth = Math.min(...itemsToMove.map(i => i.depth));
    itemsToMove.forEach(item => { item.depth = Math.max(0, item.depth - minDepth); });
  }

  for (let i = indicesToRemove.length - 1; i >= 0; i--) currentTab.items.splice(indicesToRemove[i], 1);

  if (targetTab.mode === 'outliner') {
    targetTab.items.push(...itemsToMove);
  } else {
    const textToAppend = itemsToMove.map(item => `  `.repeat(item.depth) + `- ${item.text}`).join('\n');
    if (targetTab.content && !targetTab.content.endsWith('\n')) targetTab.content += '\n';
    targetTab.content += textToAppend;
  }

  selectedItemIds.clear();
  markAsDirty();
  saveData();
  switchTab(targetTabId);
}
