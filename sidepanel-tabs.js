// --- タブ操作 ---

function createNewTab(mode = 'outliner') {
  const now = new Date();
  const dateStr = `${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const icon = mode === 'outliner' ? '🔹' : '📝';
  
  const newTab = {
    id: generateId(),
    title: `${icon}メモ-${dateStr}-${timeStr}`,
    mode: mode,
    bgColor: null, 
    items: mode === 'outliner' ? [createOutlinerItem()] : [],
    content: '',
    createdAt: Date.now()
  };
  
  tabs.push(newTab);
  activeTabId = newTab.id;
  selectedItemIds.clear(); 
  markAsDirty();
  saveData();
  renderTabs();
  renderEditor();
}

function switchTab(tabId) {
  activeTabId = tabId;
  selectedItemIds.clear(); 
  saveData();
  renderTabs();
  renderEditor();
  updateUndoButtons();
  updateSortButtonVisibility();
}

function renameTab(tabId, newTitle) {
  const tab = tabs.find(t => t.id === tabId);
  if (tab) {
    tab.title = newTitle;
    markAsDirty();
    saveData();
    renderTabs();
  }
}

function deleteTab(tabId) {
  const idx = tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return;
  
  tabs.splice(idx, 1);
  if (tabs.length === 0) {
    createNewTab('outliner');
  } else {
    if (activeTabId === tabId) {
      activeTabId = tabs[Math.max(0, idx - 1)].id;
    }
  }
  selectedItemIds.clear();
  markAsDirty();
  saveData();
  renderTabs();
  renderEditor();
}

// --- レンダリング: タブ ---

function renderTabs() {
  const container = document.getElementById('tab-list');
  if (!container) return;
  
  container.innerHTML = '';

  tabs.forEach(tab => {
    const div = document.createElement('div');
    div.className = `tab ${tab.id === activeTabId ? 'active' : ''}`;
    div.setAttribute('role', 'tab');
    div.setAttribute('aria-selected', String(tab.id === activeTabId));
    div.tabIndex = tab.id === activeTabId ? 0 : -1;
    if (tab.bgColor) {
      div.classList.add(`tab-bg-${tab.bgColor}`);
    }
    div.title = tab.title;
    
    div.draggable = true;
    div.dataset.tabId = tab.id;
    
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('dragleave', handleDragLeave);
    div.addEventListener('drop', handleDrop);
    div.addEventListener('dragend', handleDragEnd);

    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showTabContextMenu(e.pageX, e.pageY, tab.id);
    });

    const titleSpan = document.createElement('span');
    titleSpan.className = 'tab-title';
    titleSpan.textContent = tab.title;
    div.appendChild(titleSpan);

    const closeBtn = document.createElement('span');
    closeBtn.className = 'close-tab-btn';
    closeBtn.textContent = '✕';
    closeBtn.title = '削除';
    closeBtn.setAttribute('role', 'button');
    closeBtn.setAttribute('aria-label', `${tab.title}を削除`);
    closeBtn.tabIndex = 0;
    const closeTab = (e) => {
      e.stopPropagation();
      if(confirm(`「${tab.title}」を削除しますか？`)) {
        deleteTab(tab.id);
      }
    };
    closeBtn.onclick = closeTab;
    closeBtn.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        closeTab(e);
      }
    };
    div.appendChild(closeBtn);

    const activateTab = () => {
      if (isScrollDragging) return;
      if (tab.id !== activeTabId) switchTab(tab.id);
    };
    div.onclick = activateTab;
    div.onkeydown = (e) => {
      if (e.target !== div) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateTab();
      }
    };
    
    div.ondblclick = (e) => {
      e.stopPropagation();
      if (div.querySelector('input')) return;

      div.draggable = false;
      titleSpan.style.display = 'none';
      
      const input = document.createElement('input');
      input.value = tab.title;
      input.onclick = (ev) => ev.stopPropagation();
      
      const finishRename = () => {
        const newVal = input.value.trim() || '名称未設定';
        if (newVal !== tab.title) {
          renameTab(tab.id, newVal);
        } else {
          input.remove();
          titleSpan.style.display = '';
        }
        div.draggable = true;
      };

      input.onblur = finishRename;
      input.onkeydown = (ev) => {
        if(ev.key === 'Enter') input.blur();
      };
      
      div.insertBefore(input, closeBtn);
      input.focus();
    };

    container.appendChild(div);
  });
  
  updateSortButtonVisibility();
}

function updateSortButtonVisibility() {
  const currentTab = tabs.find(t => t.id === activeTabId);
  const btnSort = document.getElementById('btn-sort-stars');
  if (btnSort) {
    if (currentTab && currentTab.mode === 'outliner') {
      btnSort.style.display = 'flex';
    } else {
      btnSort.style.display = 'none';
    }
  }
}

// --- タブ並べ替え (DnD) ---

function handleDragStart(e) {
  dragSrcTabId = this.dataset.tabId;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  if (e.preventDefault) e.preventDefault(); 
  e.dataTransfer.dropEffect = 'move';
  if (dragSrcTabId === this.dataset.tabId) return false;
  this.classList.add('drag-over');
  return false;
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  if (e.stopPropagation) e.stopPropagation(); 

  this.classList.remove('drag-over');
  const dropTargetId = this.dataset.tabId;

  if (dragSrcTabId && dragSrcTabId !== dropTargetId) {
    const fromIndex = tabs.findIndex(t => t.id === dragSrcTabId);
    const toIndex = tabs.findIndex(t => t.id === dropTargetId);

    if (fromIndex > -1 && toIndex > -1) {
      const [movedTab] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, movedTab);
      markAsDirty();
      saveData();
      renderTabs();
    }
  }
  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.remove('drag-over');
    t.classList.remove('dragging');
  });
  dragSrcTabId = null;
}

// --- タブの右クリックメニュー ---
function showTabContextMenu(x, y, tabId) {
  closeAllPopups();
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;

  const menu = document.createElement('div');
  menu.className = 'popup-menu';
  menu.style.left = Math.min(x, window.innerWidth - 150) + 'px';
  menu.style.top = y + 'px';
  menu.style.position = 'fixed'; 

  const renameItem = document.createElement('div');
  renameItem.className = 'popup-menu-item';
  renameItem.innerHTML = `<span>✏️ 名称を変更</span>`;
  renameItem.onclick = () => {
    menu.remove();
    const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (tabEl) {
      const dblclickEvent = new MouseEvent('dblclick', { bubbles: true });
      tabEl.dispatchEvent(dblclickEvent);
    }
  };
  menu.appendChild(renameItem);

  const colorHeader = document.createElement('div');
  colorHeader.className = 'popup-menu-header';
  colorHeader.textContent = '背景色';
  colorHeader.style.marginTop = '4px';
  menu.appendChild(colorHeader);

  const colorRow = document.createElement('div');
  colorRow.className = 'palette-row';
  colorRow.style.padding = '4px 8px';
  colorRow.style.justifyContent = 'flex-start';
  colorRow.style.gap = '6px';
  
  const colors = [
    { val: null, ui: '#ffffff', title: 'デフォルト' }, 
    { val: 'red', ui: '#fca5a5', title: '赤' },
    { val: 'blue', ui: '#7dd3fc', title: '青' },
    { val: 'green', ui: '#86efac', title: '緑' },
    { val: 'yellow', ui: '#fde047', title: '黄' },
    { val: 'purple', ui: '#d8b4fe', title: '紫' }
  ];

  colors.forEach(c => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.background = c.ui;
    swatch.title = c.title;
    if (!c.val) swatch.innerHTML = '<span style="font-size:10px;color:#ccc;text-align:center;display:block;line-height:14px;">x</span>';
    swatch.onclick = () => {
      changeTabColor(tabId, c.val);
      menu.remove();
    };
    colorRow.appendChild(swatch);
  });
  menu.appendChild(colorRow);

  const deleteItem = document.createElement('div');
  deleteItem.className = 'popup-menu-item';
  deleteItem.style.marginTop = '4px';
  deleteItem.style.borderTop = '1px solid #f5f5f4';
  deleteItem.innerHTML = `<span style="color:#ef4444;">🗑️ 削除</span>`;
  deleteItem.onclick = () => {
    menu.remove();
    if(confirm(`「${tab.title}」を削除しますか？`)) deleteTab(tabId);
  };
  menu.appendChild(deleteItem);

  setupPopupClose(menu);
  document.body.appendChild(menu);
}

function changeTabColor(tabId, color) {
  const tab = tabs.find(t => t.id === tabId);
  if (tab) {
    tab.bgColor = color;
    markAsDirty();
    saveData();
    renderTabs();
    if (activeTabId === tabId) applyEditorTheme();
  }
}

function applyEditorTheme() {
  const currentTab = tabs.find(t => t.id === activeTabId);
  const container = document.getElementById('editor-container');
  if (!container) return;
  
  container.classList.remove('editor-bg-red', 'editor-bg-blue', 'editor-bg-green', 'editor-bg-yellow', 'editor-bg-purple');
  if (currentTab && currentTab.bgColor) {
    container.classList.add(`editor-bg-${currentTab.bgColor}`);
  }
}

// --- タブのドラッグスクロール ---
function setupTabScroll() {
  const slider = document.getElementById('tab-list');
  const btnLeft = document.getElementById('tab-scroll-left');
  const btnRight = document.getElementById('tab-scroll-right');

  let isDown = false;
  let startX;
  let scrollLeft;
  
  btnLeft.onclick = () => slider.scrollBy({ left: -100, behavior: 'smooth' });
  btnRight.onclick = () => slider.scrollBy({ left: 100, behavior: 'smooth' });

  slider.addEventListener('mousedown', (e) => {
    if (e.target.closest('.tab')) return;
    isDown = true;
    isScrollDragging = false;
    slider.classList.add('grabbing');
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
  });

  slider.addEventListener('mouseleave', () => {
    isDown = false;
    slider.classList.remove('grabbing');
    setTimeout(() => { isScrollDragging = false; }, 0);
  });

  slider.addEventListener('mouseup', () => {
    isDown = false;
    slider.classList.remove('grabbing');
    setTimeout(() => { isScrollDragging = false; }, 50);
  });

  slider.addEventListener('mousemove', (e) => {
    if(!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX); 
    if (Math.abs(walk) > 3) {
      isScrollDragging = true;
      slider.scrollLeft = scrollLeft - walk;
    }
  });

  slider.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      slider.scrollLeft += e.deltaY;
    }
  });
}

// --- URL抽出ヘルパー ---
function extractUrls(text) {
  const regex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(regex);
  return matches || [];
}

function renderNoteLinks(container, text) {
  container.innerHTML = '';
  const urls = extractUrls(text);
  
  if (urls.length > 0) {
    container.style.display = 'flex';
    urls.forEach(url => {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.className = 'note-link-btn';
      let displayUrl = url.replace(/^https?:\/\//, '');
      if (displayUrl.length > 30) displayUrl = displayUrl.substring(0, 27) + '...';
      a.innerHTML = iconSvg('link', 12);
      const label = document.createElement('span');
      label.textContent = displayUrl;
      a.appendChild(label);
      a.title = url;
      a.addEventListener('mousedown', (e) => e.stopPropagation());
      a.addEventListener('click', (e) => e.stopPropagation());
      container.appendChild(a);
    });
  } else {
    container.style.display = 'none';
  }
}

// --- 行番号表示・行ジャンプ ---
function updateLineNumberToggle() {
  const button = document.getElementById('btn-line-numbers');
  if (!button) return;

  button.classList.toggle('active', showLineNumbers);
  button.setAttribute('aria-pressed', String(showLineNumbers));
  button.title = showLineNumbers
    ? '行番号を非表示（アウトライナーのみ）'
    : '行番号を表示（アウトライナーのみ）';
}

async function toggleLineNumbers() {
  showLineNumbers = !showLineNumbers;
  updateLineNumberToggle();
  await chrome.storage.local.set({ showLineNumbers });
  renderEditor();
  showTransientStatus(showLineNumbers ? '行番号を表示' : '行番号を非表示');
}

function ensureLineJumpIndicator() {
  let indicator = document.getElementById('line-jump-indicator');
  if (indicator) return indicator;

  const container = document.getElementById('editor-container');
  if (!container) return null;

  indicator = document.createElement('div');
  indicator.id = 'line-jump-indicator';
  indicator.className = 'line-jump-indicator hidden';
  indicator.setAttribute('aria-live', 'polite');
  container.appendChild(indicator);
  return indicator;
}

function updateLineJumpIndicator(message = '') {
  const indicator = ensureLineJumpIndicator();
  if (!indicator) return;
  indicator.textContent = message ? `行 ${message}` : '';
  indicator.classList.toggle('hidden', !message);
}

function clearLineJumpBuffer() {
  if (lineJumpTimer) clearTimeout(lineJumpTimer);
  lineJumpTimer = null;
  lineJumpBuffer = '';
  updateLineJumpIndicator('');
}

function jumpToVisibleLine(lineNumber) {
  if (!Number.isInteger(lineNumber) || lineNumber < 1) return;

  const row = document.querySelector(`.row[data-visible-line-number="${lineNumber}"]`);
  if (!row) {
    showTransientStatus(`${lineNumber}行目はありません`);
    return;
  }

  row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  row.classList.remove('line-jump-target');
  void row.offsetWidth;
  row.classList.add('line-jump-target');

  const input = row.querySelector('.item-input');
  if (input) {
    input.focus({ preventScroll: true });
    const caretPosition = input.value.length;
    input.setSelectionRange(caretPosition, caretPosition);
  }

  window.setTimeout(() => row.classList.remove('line-jump-target'), 900);
}

function commitLineJump() {
  const lineNumber = Number.parseInt(lineJumpBuffer, 10);
  clearLineJumpBuffer();
  if (Number.isInteger(lineNumber)) jumpToVisibleLine(lineNumber);
}

function handleLineJumpKeydown(e) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || currentTab.mode !== 'outliner') return;
  if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!/^Digit[0-9]$/.test(e.code)) return;

  e.preventDefault();
  e.stopPropagation();
  if (e.repeat) return;

  const digit = e.code.slice(-1);
  lineJumpBuffer = (lineJumpBuffer + digit).slice(0, 4);
  updateLineJumpIndicator(lineJumpBuffer);

  if (lineJumpTimer) clearTimeout(lineJumpTimer);
  lineJumpTimer = window.setTimeout(commitLineJump, LINE_JUMP_DELAY);
}
