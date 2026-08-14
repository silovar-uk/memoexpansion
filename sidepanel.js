// --- グローバル変数 & 状態管理 ---

let tabs = [];
let activeTabId = null;

// Undo/Redo用
const historyStacks = {};


// タブドラッグスクロール & 並べ替え用
let isScrollDragging = false; 
let dragSrcTabId = null; // DnDで移動中のタブID

// 複数選択用状態
let selectedItemIds = new Set();
let lastSelectionIndex = -1; // Shiftキー選択用

// ステップアップで追加された状態管理
let currentInstanceCount = 1; 
let isActionMenuPinned = false; 
let isDraggingSelection = false; // ドラッグ選択中のフラグ

// --- 行のドラッグ＆ドロップ移動用 ---
let dragSrcRowIndex = null;
let isRowDragHandleDown = false; // アイコンをつかんでいるかどうかのフラグ

// --- 同期・保存制御用フラグ (先祖返り防止) ---
let lastSavedTabsJSON = ""; 
let isDirty = false;

// --- 行番号表示・行ジャンプ ---
let showLineNumbers = true; // 全タブ共通。保存値がなければ表示を初期値にする
let lineJumpBuffer = '';
let lineJumpTimer = null;
const LINE_JUMP_DELAY = 650;

// --- アウトライナー本文の1行フィット表示 ---
const OUTLINER_EDIT_FONT_SIZE = 14;
const OUTLINER_PREFERRED_MIN_FONT_SIZE = 9;
const OUTLINER_ABSOLUTE_MIN_FONT_SIZE = 0.1;
let outlinerFitFrame = null;
let outlinerResizeObserver = null;


// --- 共通ラインアイコン ---
const ICON_PATHS = {
  check: '<path d="m5 12 4 4L19 6"/>',
  palette: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 3a9 9 0 0 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a2 2 0 0 1 0-4h2a7 7 0 0 0 0-14Z"/>',
  arrowUp: '<path d="m18 15-6-6-6 6"/>',
  arrowDown: '<path d="m6 9 6 6 6-6"/>',
  arrowRight: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  dot: '<circle cx="12" cy="12" r="2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>'
};

function iconSvg(name, size = 14) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
}

function setIcon(element, name, size = 14) {
  if (!element) return;
  element.innerHTML = iconSvg(name, size);
}

let saveStatusTimer = null;
function updateSaveStatus(state = 'saved', customText = null) {
  const status = document.getElementById('save-status');
  const label = document.getElementById('save-status-text');
  if (!status || !label) return;

  const labels = {
    saved: '保存済み',
    dirty: '未保存',
    saving: '保存中…',
    error: '保存エラー',
    feedback: customText || '完了'
  };
  status.dataset.state = state;
  label.textContent = customText || labels[state] || labels.saved;
}

function showTransientStatus(message, duration = 1500) {
  if (saveStatusTimer) clearTimeout(saveStatusTimer);
  updateSaveStatus('feedback', message);
  saveStatusTimer = setTimeout(() => {
    updateSaveStatus(isDirty ? 'dirty' : 'saved');
  }, duration);
}

// --- 開発更新履歴 ---
// 新しい履歴を配列の先頭（上）に追加していきます
const appHistory = [
  { date: '2026/08/02', text: 'アウトライナー本文を1行表示にし、非編集中は横幅に合わせて文字サイズを自動調整' },
  { date: '2026/08/01', text: 'キーボードで行を上下移動した際、本文・詳細・リンク・日時が項目単位で連動するよう修正' },
  { date: '2026/07/29', text: '作成・更新日時をホバー／フォーカス時のみ表示し、更新日時を優先する仕様に変更' },
  { date: '2026/07/24', text: 'アウトライナーの行番号表示・Shift＋数字の行ジャンプを追加' },
  { date: '2026/07/21', text: 'ラインアイコン統一・配色整理・フッター軽量化' },
  { date: '2026/03/05 13:50', text: '更新履歴のモーダル表示機能を追加' },
  { date: '2026/03/05 13:30', text: 'ノード（および子ノード）のコピー機能を追加' },
];

// --- 初期化 ---

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  await migrateLegacyData();

  if (tabs.length === 0) {
    createNewTab('outliner');
  } else if (!activeTabId || !tabs.find(t => t.id === activeTabId)) {
    if (tabs.length > 0) {
      activeTabId = tabs[0].id;
    } else {
      createNewTab('outliner');
    }
  }

  setupEventListeners();
  setupTabScroll(); 
  renderTabs();
  renderEditor();
  setupOutlinerFitResizeObserver();
  updateSaveStatus(isDirty ? 'dirty' : 'saved');

  // 追加日時の相対表示だけを軽く更新（例: 3分前 → 4分前）
  setInterval(refreshCreatedAtLabels, 60000);

  // --- バックグラウンドとの接続 ---
  function connectToBackground() {
    const port = chrome.runtime.connect({ name: 'sidepanel-port' });
    port.onMessage.addListener((msg) => {
      if (msg.type === 'INSTANCE_COUNT_UPDATE') {
        currentInstanceCount = msg.count;
        const el = document.getElementById('instance-count');
        if (el) el.textContent = `起動中: ${currentInstanceCount}つ`;
        updateInstanceAlert(); 
      }
    });
    port.onDisconnect.addListener(() => {
      setTimeout(connectToBackground, 2000);
    });
  }
  connectToBackground();

  // 定期保存
  setInterval(saveData, 5000);
});

// --- データ管理 ---

function markAsDirty() {
  isDirty = true;
  updateSaveStatus('dirty');
}

async function loadData() {
  try {
    const result = await chrome.storage.local.get(['tabs', 'activeTabId', 'showLineNumbers']);
    if (result.tabs) {
      tabs = JSON.parse(result.tabs);
      lastSavedTabsJSON = result.tabs; 
      isDirty = false;
      
      tabs.forEach(t => {
        if (!t.mode) t.mode = 'outliner';
        if (!t.content) t.content = '';
      });
    }
    if (result.activeTabId) activeTabId = result.activeTabId;
    if (typeof result.showLineNumbers === 'boolean') {
      showLineNumbers = result.showLineNumbers;
    }
  } catch (e) {
    console.error("Load failed", e);
  }
}

async function saveData() {
  if (!isDirty && tabs.length > 0) return;

  updateSaveStatus('saving');
  try {
    const jsonString = JSON.stringify(tabs);
    
    await chrome.storage.local.set({
      tabs: jsonString,
      activeTabId: activeTabId
    });
    
    lastSavedTabsJSON = jsonString;
    isDirty = false;
    updateSaveStatus('saved');
    
  } catch (e) {
    updateSaveStatus('error');
    console.error("Save failed", e);
  }
}

// --- 手動更新機能 ---
async function forceReload() {
  if (isDirty) {
    if (!confirm('未保存の変更があります。破棄して最新データを読み込みますか？')) {
      return;
    }
  }
  
  const btn = document.getElementById('btn-force-reload');
  if (btn) {
    btn.disabled = true;
    btn.classList.add('is-loading');
  }
  updateSaveStatus('feedback', '再読み込み中…');
  
  await loadData();
  isDirty = false;
  selectedItemIds.clear(); 
  
  renderTabs();
  renderEditor();
  updateUndoButtons();
  updateSortButtonVisibility();
  
  if (btn) {
    btn.disabled = false;
    btn.classList.remove('is-loading');
  }
  closeFooterMenu();
  showTransientStatus('再読み込み完了');
}

async function migrateLegacyData() {
  const result = await chrome.storage.local.get(['items']);
  if (result.items) {
    try {
      const oldItems = JSON.parse(result.items);
      if (oldItems && oldItems.length > 0) {
        const newTab = {
          id: generateId(),
          title: '引き継ぎメモ',
          mode: 'outliner',
          items: oldItems.map(i => ({
            id: i.id || generateId(),
            text: i.text || '',
            note: '', 
            depth: i.depth || 0,
            completed: false, 
            textColor: null,
            markerColor: null,
            collapsed: false, 
            updatedAt: i.updatedAt || Date.now()
          })),
          content: '',
          createdAt: Date.now()
        };
        tabs.push(newTab);
        activeTabId = newTab.id;
        
        await chrome.storage.local.remove('items');
        markAsDirty();
        saveData();
      }
    } catch(e) {
      console.error("Migration failed", e);
    }
  }
}

// --- Undo / Redo ---
function getHistory(tabId) {
  if (!historyStacks[tabId]) {
    historyStacks[tabId] = { undo: [], redo: [] };
  }
  return historyStacks[tabId];
}

function pushHistory() {
  if (!activeTabId) return;
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab) return;

  const stack = getHistory(activeTabId);
  
  let snapshot;
  if (currentTab.mode === 'text') {
    snapshot = currentTab.content;
    if (stack.undo.length > 0 && stack.undo[stack.undo.length - 1] === snapshot) return;
  } else {
    snapshot = JSON.stringify(currentTab.items);
  }

  stack.undo.push(snapshot);
  if (stack.undo.length > 50) stack.undo.shift();
  stack.redo = []; 
  updateUndoButtons();
}

function undo() {
  if (!activeTabId) return;
  const stack = getHistory(activeTabId);
  if (stack.undo.length === 0) return;

  const currentTab = tabs.find(t => t.id === activeTabId);
  
  let currentSnapshot;
  if (currentTab.mode === 'text') {
    currentSnapshot = currentTab.content;
  } else {
    currentSnapshot = JSON.stringify(currentTab.items);
  }
  stack.redo.push(currentSnapshot);
  
  const prevSnapshot = stack.undo.pop();
  
  if (currentTab.mode === 'text') {
    currentTab.content = prevSnapshot;
  } else {
    currentTab.items = JSON.parse(prevSnapshot);
  }
  
  markAsDirty();
  renderEditor();
  saveData();
  updateUndoButtons();
}

function redo() {
  if (!activeTabId) return;
  const stack = getHistory(activeTabId);
  if (stack.redo.length === 0) return;

  const currentTab = tabs.find(t => t.id === activeTabId);
  
  let currentSnapshot;
  if (currentTab.mode === 'text') {
    currentSnapshot = currentTab.content;
  } else {
    currentSnapshot = JSON.stringify(currentTab.items);
  }
  stack.undo.push(currentSnapshot);
  
  const nextSnapshot = stack.redo.pop();
  
  if (currentTab.mode === 'text') {
    currentTab.content = nextSnapshot;
  } else {
    currentTab.items = JSON.parse(nextSnapshot);
  }
  
  markAsDirty();
  renderEditor();
  saveData();
  updateUndoButtons();
}

function updateUndoButtons() {
  const stack = getHistory(activeTabId);
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  if(btnUndo) btnUndo.disabled = stack.undo.length === 0;
  if(btnRedo) btnRedo.disabled = stack.redo.length === 0;
}

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
    items: mode === 'outliner' ? [{ id: generateId(), text: '', note: '', depth: 0, completed: false, collapsed: false }] : [],
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
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      if(confirm(`「${tab.title}」を削除しますか？`)) {
        deleteTab(tab.id);
      }
    };
    div.appendChild(closeBtn);

    div.onclick = () => {
      if (isScrollDragging) return;
      if (tab.id !== activeTabId) switchTab(tab.id);
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

// --- レンダリング: エディタ ---

function renderEditor() {
  const editor = document.getElementById('editor');
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab) {
    editor.innerHTML = '';
    editor.classList.remove('line-numbers-visible');
    updateLineNumberToggle();
    return;
  }
  
  editor.innerHTML = '';
  editor.classList.toggle('line-numbers-visible', currentTab.mode === 'outliner' && showLineNumbers);
  updateLineNumberToggle();
  updateSelectionUI(); 
  applyEditorTheme(); 

  if (currentTab.mode === 'text') {
    const textarea = document.createElement('textarea');
    textarea.className = 'text-editor-area';
    textarea.value = currentTab.content;
    textarea.placeholder = 'ここに入力...';
    textarea.spellcheck = false;

    let isComposing = false;
    textarea.addEventListener('compositionstart', () => { isComposing = true; });
    textarea.addEventListener('compositionend', () => { isComposing = false; pushHistory(); });
    
    textarea.oninput = (e) => {
      markAsDirty();
      currentTab.content = e.target.value;
    };
    
    textarea.onkeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (['Enter', ' '].includes(e.key) && !isComposing) pushHistory();
    };

    textarea.onblur = () => saveData();
    editor.appendChild(textarea);
    return;
  }

  let skipUntilDepth = -1;
  let visibleLineNumber = 0;
  currentTab.items.forEach((item, index) => {
    if (item.completed) return;

    if (skipUntilDepth !== -1) {
      if (item.depth > skipUntilDepth) return; 
      else skipUntilDepth = -1; 
    }
    if (item.collapsed) skipUntilDepth = item.depth;

    visibleLineNumber += 1;

    const row = document.createElement('div');
    row.className = 'row';
    row.draggable = true; // --- 追加: 行をドラッグ可能にする ---
    row.dataset.index = index; // データ上のインデックス
    row.dataset.visibleLineNumber = String(visibleLineNumber); // 画面上の行番号
    row.dataset.itemId = item.id; // 本文・詳細を同じ項目IDで追跡
    
    if (selectedItemIds.has(item.id)) row.classList.add('selected');
    row.style.paddingLeft = (item.depth * 20) + 'px';
    
    // --- 行のドラッグ＆ドロップイベント ---
    row.addEventListener('dragstart', (e) => {
      // アイコンをつかんでいない場合はドラッグをキャンセル
      if (!isRowDragHandleDown) {
        e.preventDefault();
        return;
      }
      dragSrcRowIndex = index;
      e.dataTransfer.effectAllowed = 'move';
      row.style.opacity = '0.5';
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const bounding = row.getBoundingClientRect();
      const offset = bounding.y + (bounding.height / 2);
      // マウスが要素の上半分か下半分かで挿入位置のハイライトを変える
      if (e.clientY - offset > 0) {
        row.style.borderBottom = '2px solid #0ea5e9';
        row.style.borderTop = '';
      } else {
        row.style.borderTop = '2px solid #0ea5e9';
        row.style.borderBottom = '';
      }
    });

    row.addEventListener('dragleave', () => {
      row.style.borderTop = '';
      row.style.borderBottom = '';
    });

    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.style.borderTop = '';
      row.style.borderBottom = '';
      if (dragSrcRowIndex !== null && dragSrcRowIndex !== index) {
        const bounding = row.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        // 挿入位置（自分の前か後か）
        const insertAfter = (e.clientY - offset > 0);
        handleRowDrop(dragSrcRowIndex, index, insertAfter);
      }
      dragSrcRowIndex = null;
      isRowDragHandleDown = false;
    });

    row.addEventListener('dragend', () => {
      row.style.opacity = '1';
      document.querySelectorAll('.row').forEach(r => {
        r.style.borderTop = '';
        r.style.borderBottom = '';
      });
      dragSrcRowIndex = null;
      isRowDragHandleDown = false;
    });
    
    // --- 複数選択（CTRL+ドラッグ）のイベント ---
    row.addEventListener('mousedown', (e) => {
      if (e.target.closest('.action-icon') || e.target.closest('.fold-icon') || e.target.closest('.note-link-btn')) return;
      if (e.target.classList.contains('item-input') || e.target.classList.contains('item-note') || e.target.classList.contains('item-note-display')) return;
      
      e.preventDefault(); 
      if (e.ctrlKey || e.metaKey) {
        // CTRL + ドラッグ開始
        isDraggingSelection = true;
        selectedItemIds.add(item.id);
        lastSelectionIndex = index;
        row.classList.add('selected');
        updateSelectionUI();
      } else if (e.shiftKey) {
        handleRowSelection(e, item, index);
      }
    });

    row.addEventListener('mouseenter', () => {
      if (isDraggingSelection) {
        selectedItemIds.add(item.id); // どんどん追加で選択
        lastSelectionIndex = index;
        row.classList.add('selected');
        updateSelectionUI();
      }
    });

    row.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showMoveTabMenu(e.pageX, e.pageY, index);
    };

    const line = document.createElement('div');
    line.className = 'guide-line';
    line.style.left = (item.depth * 20) + 'px';
    
    let hasChildren = false;
    for (let i = index + 1; i < currentTab.items.length; i++) {
        if (currentTab.items[i].depth <= item.depth) break;
        if (!currentTab.items[i].completed) {
            hasChildren = true;
            break;
        }
    }

    // ★追加: 子要素を持っていて、かつ折り畳まれている行に専用のクラスを付与
    if (hasChildren && item.collapsed) {
      row.classList.add('is-collapsed-row');
    }

    const foldIcon = document.createElement('div');
    foldIcon.className = 'fold-icon';
    if (hasChildren) {
      if (item.collapsed) {
        setIcon(foldIcon, 'chevronRight', 12);
        foldIcon.classList.add('collapsed');
      } else {
        setIcon(foldIcon, 'chevronDown', 12);
      }
      foldIcon.onclick = (e) => {
        if (!(e.ctrlKey || e.metaKey || e.shiftKey)) {
          e.stopPropagation();
          toggleFold(index);
        }
      };
    } else {
      setIcon(foldIcon, 'dot', 12);
      foldIcon.classList.add('leaf');
    }
    
    // アイコンのマウスダウンでドラッグ可能フラグを立てる、または選択
    foldIcon.addEventListener('mousedown', (e) => {
       if (e.ctrlKey || e.metaKey || e.shiftKey) {
         e.preventDefault();
         e.stopPropagation();
         handleRowSelection(e, item, index);
       } else {
         isRowDragHandleDown = true; // ドラッグ開始のハンドルとして認識
       }
    });
    
    const wrapper = document.createElement('div');
    wrapper.className = 'input-wrapper';
    
    const input = document.createElement('textarea');
    input.className = 'item-input';
    input.dataset.id = item.id;
    input.value = item.text;
    input.rows = 1;
    input.wrap = 'off';
    input.placeholder = (currentTab.items.filter(i => !i.completed).length === 1 && item.text === '') ? 'ここに入力...' : '';
    input.spellcheck = false;
    
    if (item.textColor) input.classList.add(`text-${item.textColor}`);
    if (item.markerColor) input.classList.add(`bg-${item.markerColor}`);
    
    input.addEventListener('mousedown', (e) => {
       if (e.ctrlKey || e.metaKey || e.shiftKey) {
         e.preventDefault(); 
         e.stopPropagation();
         handleRowSelection(e, item, index);
       }
    });

    input.addEventListener('focus', () => {
      input.dataset.existedAtFocus = item.createdAt ? 'true' : 'false';
      setOutlinerInputEditingState(input);
    });

    input.addEventListener('blur', () => {
      fitOutlinerInput(input);
      saveData();
    });

    input.oninput = (e) => {
      markAsDirty();
      item.text = e.target.value;
      const now = Date.now();
      if (!item.createdAt && item.text.trim() !== '') {
        item.createdAt = now;
      } else if (input.dataset.existedAtFocus === 'true') {
        item.updatedAt = now;
      }
      updateItemTimestampLabel(createdAtLabel, item);
      autoResize(e.target);
    };
    
    input.onkeydown = (e) => handleKey(e, index, item);
    input.onpaste = (e) => handlePaste(e, index, item);

    const noteInput = document.createElement('textarea');
    noteInput.className = 'item-note';
    noteInput.dataset.id = item.id;
    noteInput.classList.add('hidden'); // 初期状態は隠す
    noteInput.value = item.note || '';
    noteInput.placeholder = '詳細を追加...';
    noteInput.spellcheck = false;

    // 省略表示用の要素
    const noteDisplay = document.createElement('div');
    noteDisplay.className = 'item-note-display';
    if (!item.note) {
      noteDisplay.classList.add('hidden');
    } else {
      const text = item.note || '';
      noteDisplay.textContent = text.length > 15 ? text.substring(0, 15) + '...' : text;
    }

    // クリック時の切り替えイベント
    noteDisplay.onclick = (e) => {
      e.stopPropagation();
      noteDisplay.classList.add('hidden');
      noteInput.classList.remove('hidden');
      noteInput.focus();
      autoResize(noteInput);
    };

    const linkContainer = document.createElement('div');
    linkContainer.className = 'note-link-container';
    if (item.note) renderNoteLinks(linkContainer, item.note);

    noteInput.addEventListener('focus', () => {
      noteInput.dataset.existedAtFocus = item.createdAt ? 'true' : 'false';
    });

    noteInput.oninput = (e) => {
      markAsDirty();
      item.note = e.target.value;
      const now = Date.now();
      if (!item.createdAt && item.note.trim() !== '') {
        item.createdAt = now;
      } else if (noteInput.dataset.existedAtFocus === 'true') {
        item.updatedAt = now;
      }
      updateItemTimestampLabel(createdAtLabel, item);
      autoResize(e.target);
      renderNoteLinks(linkContainer, e.target.value);
    };

    noteInput.onkeydown = (e) => handleNoteKey(e, index, item);
    noteInput.onblur = () => {
      const text = noteInput.value.trim();
      if (!text) {
        // テキストが空になった場合：入力欄も省略表示も隠す
        noteInput.classList.add('hidden');
        noteDisplay.classList.add('hidden');
        linkContainer.style.display = 'none';
        item.note = '';
      } else {
        // テキストがある場合：省略表示を更新して再表示し、入力欄を隠す
        noteDisplay.textContent = text.length > 15 ? text.substring(0, 15) + '...' : text;
        noteInput.classList.add('hidden');
        noteDisplay.classList.remove('hidden');
      }
      saveData();
    };

    const actions = document.createElement('div');
    actions.className = 'row-actions';
    
    const actionBtns = document.createElement('div');
    actionBtns.className = 'action-buttons';

    const btnCheck = document.createElement('div');
    btnCheck.className = 'action-icon check';
    setIcon(btnCheck, 'check');
    btnCheck.title = '完了';
    btnCheck.onclick = (e) => { e.stopPropagation(); completeItem(index); };
    
    const btnPalette = document.createElement('div');
    btnPalette.className = 'action-icon palette';
    setIcon(btnPalette, 'palette');
    btnPalette.onclick = (e) => {
      e.stopPropagation();
      showColorPalette(e.target, index);
    };

    const btnTop = document.createElement('div');
    btnTop.className = 'action-icon top';
    setIcon(btnTop, 'arrowUp');
    btnTop.onclick = (e) => { e.stopPropagation(); moveItemToTop(index); };

    const btnBottom = document.createElement('div');
    btnBottom.className = 'action-icon bottom';
    setIcon(btnBottom, 'arrowDown');
    btnBottom.onclick = (e) => { e.stopPropagation(); moveItemToBottom(index); };

    const btnMove = document.createElement('div');
    btnMove.className = 'action-icon move';
    setIcon(btnMove, 'arrowRight');
    btnMove.onclick = (e) => {
      e.stopPropagation();
      const rect = e.target.getBoundingClientRect();
      showMoveTabMenu(rect.left, rect.bottom, index);
    };

    // --- 新規追加: コピーボタン ---
    const btnCopy = document.createElement('div');
    btnCopy.className = 'action-icon copy';
    setIcon(btnCopy, 'copy');
    btnCopy.onclick = (e) => { e.stopPropagation(); copyItem(index); };

    actionBtns.appendChild(btnPalette);
    actionBtns.appendChild(btnTop);
    actionBtns.appendChild(btnBottom);
    actionBtns.appendChild(btnCopy);
    actionBtns.appendChild(btnMove);

    const createdAtLabel = document.createElement('span');
    createdAtLabel.className = 'created-at-label';
    updateItemTimestampLabel(createdAtLabel, item);

    // ⋮ (メニュー) ボタン
    const btnMenu = document.createElement('div');
    btnMenu.className = 'action-icon menu-toggle';
    setIcon(btnMenu, 'more');
    btnMenu.onclick = (e) => {
      e.stopPropagation();
      isActionMenuPinned = !isActionMenuPinned; 
      if (isActionMenuPinned) document.body.classList.add('action-menu-pinned');
      else document.body.classList.remove('action-menu-pinned');
    };

    actions.appendChild(actionBtns);
    actions.appendChild(createdAtLabel);
    actions.appendChild(btnCheck);
    actions.appendChild(btnMenu);

    wrapper.appendChild(input);
    wrapper.appendChild(noteInput);
    wrapper.appendChild(noteDisplay); 
    wrapper.appendChild(linkContainer);

    if (showLineNumbers) {
      const lineNumber = document.createElement('span');
      lineNumber.className = 'line-number';
      lineNumber.textContent = String(visibleLineNumber);
      lineNumber.setAttribute('aria-hidden', 'true');
      row.appendChild(lineNumber);
    }

    row.appendChild(line);
    row.appendChild(foldIcon); 
    row.appendChild(wrapper);
    row.appendChild(actions);
    
    editor.appendChild(row);
    autoResize(input);
    if (!noteInput.classList.contains('hidden')) autoResize(noteInput);
  });
}

// --- 行のドロップ処理（タスクの移動） ---
function handleRowDrop(fromIndex, toIndex, insertAfter) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || currentTab.mode !== 'outliner') return;
  
  // 移動元の要素と子要素の数を取得
  const count = getSubtreeCount(currentTab, fromIndex);
  
  // 移動元と移動先が重なっている（子タスクの中に移動しようとしている）場合はキャンセル
  if (toIndex >= fromIndex && toIndex < fromIndex + count) return;
  
  pushHistory();
  
  // 移動先の深さを基準にする
  const targetItem = currentTab.items[toIndex];
  let newDepth = targetItem.depth;
  
  // 移動する要素を取り出す
  const itemsToMove = currentTab.items.splice(fromIndex, count);
  
  // spliceしたことでtoIndexがずれる場合があるため補正
  let adjustedToIndex = toIndex;
  if (fromIndex < toIndex) {
    adjustedToIndex -= count;
  }
  
  // 挿入位置を決定
  let insertIndex = adjustedToIndex;
  if (insertAfter) {
    // ターゲットが展開されていて子を持つなら、その子の先頭に入れる（一段深くする）
    let hasChildren = false;
    if (adjustedToIndex + 1 < currentTab.items.length && currentTab.items[adjustedToIndex + 1].depth > targetItem.depth) {
      hasChildren = true;
    }
    
    if (hasChildren && !targetItem.collapsed) {
      newDepth = targetItem.depth + 1;
      insertIndex = adjustedToIndex + 1;
    } else {
      // それ以外はターゲットのサブツリーの後ろに入れる
      const targetSubtreeCount = getSubtreeCount(currentTab, adjustedToIndex);
      insertIndex = adjustedToIndex + targetSubtreeCount;
    }
  }
  
  // 深さを調整
  const depthDiff = newDepth - itemsToMove[0].depth;
  itemsToMove.forEach(item => {
    item.depth = Math.max(0, item.depth + depthDiff);
  });
  
  // 要素を挿入
  currentTab.items.splice(insertIndex, 0, ...itemsToMove);
  
  markAsDirty();
  saveData();
  renderEditor();
  
  setTimeout(() => focusItemById(itemsToMove[0].id), 0);
}

// --- コピー機能 (単一ノード ＋ 子ノード) ---
function copyItem(index) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || currentTab.mode !== 'outliner') return;
  pushHistory();

  const count = getSubtreeCount(currentTab, index);
  const itemsToCopy = currentTab.items.slice(index, index + count);
  
  // ディープコピーして新しいIDを付与
  const now = Date.now();
  const newItems = itemsToCopy.map(item => ({...item, id: generateId(), createdAt: now}));
  
  // 親ノードに「（コピー）」をつける
  newItems[0].text += '（コピー）';

  // コピー先は元のサブツリーのすぐ下
  currentTab.items.splice(index + count, 0, ...newItems);

  markAsDirty();
  saveData();
  renderEditor();
  
  // コピー後の親要素にフォーカスを当てる
  setTimeout(() => focusItemById(newItems[0].id), 0);
}

// --- コピー機能 (複数選択一括) ---
function copySelectedItems() {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || selectedItemIds.size === 0) return;
  pushHistory();

  // 選択されているアイテムのインデックスを取得（昇順）
  const selectedIndices = [];
  currentTab.items.forEach((item, index) => {
    if (selectedItemIds.has(item.id)) selectedIndices.push(index);
  });

  // 選択されたインデックスのうち、祖先がすでに選択されている場合は除外する（二重コピー防止）
  const topLevelIndices = [];
  for (let i = 0; i < selectedIndices.length; i++) {
    const idx = selectedIndices[i];
    let hasSelectedAncestor = false;
    for (let j = 0; j < i; j++) {
       const prevIdx = selectedIndices[j];
       if (prevIdx < idx && prevIdx + getSubtreeCount(currentTab, prevIdx) > idx) {
           hasSelectedAncestor = true;
           break;
       }
    }
    if (!hasSelectedAncestor) topLevelIndices.push(idx);
  }

  // インデックスのずれを防ぐため、後ろ（大きいインデックス）から処理する
  for (let i = topLevelIndices.length - 1; i >= 0; i--) {
      const idx = topLevelIndices[i];
      const count = getSubtreeCount(currentTab, idx);
      const itemsToCopy = currentTab.items.slice(idx, idx + count);
      
      const now = Date.now();
      const copied = itemsToCopy.map(item => ({...item, id: generateId(), createdAt: now}));
      copied[0].text += '（コピー）';
      
      currentTab.items.splice(idx + count, 0, ...copied);
  }

  selectedItemIds.clear();
  markAsDirty();
  saveData();
  renderEditor();
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
    countSpan.textContent = `${selectedItemIds.size} items`;
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
      const icon = tab.mode === 'outliner' ? '🔹' : '📝';
      item.innerHTML = `<span>${icon} ${tab.title}</span>`;
      item.onclick = () => { moveSelectedItemsToTab(tab.id); menu.remove(); };
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

// --- アウトライナー専用ヘルパー ---

function setOutlinerInputEditingState(input) {
  if (!input || !input.classList.contains('item-input')) return;

  input.style.fontSize = `${OUTLINER_EDIT_FONT_SIZE}px`;
  input.style.height = '24px';
  input.style.minHeight = '24px';
  input.dataset.fittedFontSize = String(OUTLINER_EDIT_FONT_SIZE);
  input.removeAttribute('title');

  // フォーカス時は14pxで編集する。横にあふれた場合はtextarea内部でカーソルへ追従する。
}

function updateOutlinerInputTooltip(input, fittedSize) {
  if (input.value && fittedSize < OUTLINER_PREFERRED_MIN_FONT_SIZE) {
    input.title = input.value;
  } else {
    input.removeAttribute('title');
  }
}

function fitOutlinerInput(input) {
  if (!input || !input.classList.contains('item-input')) return;

  input.style.height = '24px';
  input.style.minHeight = '24px';
  input.scrollLeft = 0;

  if (document.activeElement === input) {
    setOutlinerInputEditingState(input);
    return;
  }

  input.style.fontSize = `${OUTLINER_EDIT_FONT_SIZE}px`;

  if (!input.value || input.clientWidth <= 0) {
    input.dataset.fittedFontSize = String(OUTLINER_EDIT_FONT_SIZE);
    updateOutlinerInputTooltip(input, OUTLINER_EDIT_FONT_SIZE);
    return;
  }

  const fits = () => input.scrollWidth <= input.clientWidth + 1;
  if (fits()) {
    input.dataset.fittedFontSize = String(OUTLINER_EDIT_FONT_SIZE);
    updateOutlinerInputTooltip(input, OUTLINER_EDIT_FONT_SIZE);
    return;
  }

  // 14pxから必要なだけ縮小する。9pxは読みやすさの目安だが、収まらなければ下回る。
  let low = OUTLINER_ABSOLUTE_MIN_FONT_SIZE;
  let high = OUTLINER_EDIT_FONT_SIZE;
  for (let i = 0; i < 18; i++) {
    const mid = (low + high) / 2;
    input.style.fontSize = `${mid}px`;
    if (fits()) low = mid;
    else high = mid;
  }

  let fittedSize = Math.max(OUTLINER_ABSOLUTE_MIN_FONT_SIZE, low - 0.02);
  input.style.fontSize = `${fittedSize.toFixed(2)}px`;

  // フォントの丸めやブラウザー側の最小描画差を吸収する。
  for (let i = 0; i < 4 && !fits(); i++) {
    const ratio = input.clientWidth / Math.max(input.scrollWidth, 1);
    fittedSize = Math.max(OUTLINER_ABSOLUTE_MIN_FONT_SIZE, fittedSize * ratio * 0.98);
    input.style.fontSize = `${fittedSize.toFixed(3)}px`;
  }

  input.dataset.fittedFontSize = String(fittedSize);
  updateOutlinerInputTooltip(input, fittedSize);
}

function fitAllOutlinerInputs() {
  document.querySelectorAll('.item-input').forEach(input => {
    if (document.activeElement !== input) fitOutlinerInput(input);
  });
}

function scheduleFitAllOutlinerInputs() {
  if (outlinerFitFrame !== null) cancelAnimationFrame(outlinerFitFrame);
  outlinerFitFrame = requestAnimationFrame(() => {
    outlinerFitFrame = null;
    fitAllOutlinerInputs();
  });
}

function setupOutlinerFitResizeObserver() {
  const editor = document.getElementById('editor');
  if (!editor) return;

  if (outlinerResizeObserver) outlinerResizeObserver.disconnect();

  let lastWidth = editor.clientWidth;
  if (typeof ResizeObserver !== 'undefined') {
    outlinerResizeObserver = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect?.width ?? editor.clientWidth;
      if (Math.abs(width - lastWidth) < 0.5) return;
      lastWidth = width;
      scheduleFitAllOutlinerInputs();
    });
    outlinerResizeObserver.observe(editor);
  }

  window.addEventListener('resize', scheduleFitAllOutlinerInputs, { passive: true });
}

function autoResize(textarea) {
  if (textarea.classList.contains('item-input')) {
    if (document.activeElement === textarea) setOutlinerInputEditingState(textarea);
    else fitOutlinerInput(textarea);
    return;
  }

  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

function showColorPalette(triggerEl, itemIndex) {
  closeAllPopups();
  const palette = document.createElement('div');
  palette.className = 'color-palette popup-menu'; 
  const createRow = (label, colors, propName) => {
    const row = document.createElement('div');
    row.className = 'palette-row';
    const span = document.createElement('span'); span.className = 'palette-label'; span.textContent = label;
    row.appendChild(span);
    const reset = document.createElement('div');
    reset.className = 'color-swatch'; reset.style.background = '#fff'; reset.style.border = '1px solid #ccc';
    reset.textContent = 'x'; reset.style.fontSize = '10px'; reset.style.textAlign = 'center'; reset.style.lineHeight = '14px';
    reset.onclick = () => applyColor(itemIndex, propName, null);
    row.appendChild(reset);
    colors.forEach(c => {
      const swatch = document.createElement('div'); swatch.className = 'color-swatch';
      const map = { 'red': '#ef4444', 'blue': '#3b82f6', 'green': '#22c55e', 'yellow': '#fef08a', 'pink': '#fbcfe8', 'blue-bg': '#bae6fd' };
      swatch.style.background = map[c.ui || c.val]; 
      swatch.onclick = () => applyColor(itemIndex, propName, c.val);
      row.appendChild(swatch);
    });
    return row;
  };
  palette.appendChild(createRow('文字', [{val: 'red'}, {val: 'blue'}, {val: 'green'}], 'textColor'));
  palette.appendChild(createRow('背景', [{val: 'yellow'}, {val: 'pink'}, {val: 'blue', ui: 'blue-bg'}], 'markerColor'));
  setupPopupClose(palette);
  triggerEl.parentElement.appendChild(palette);
}

function showMoveTabMenu(x, y, itemIndex) {
  closeAllPopups();
  const menu = document.createElement('div');
  menu.className = 'popup-menu';
  menu.style.left = Math.min(x, window.innerWidth - 130) + 'px';
  menu.style.top = y + 'px';
  menu.style.position = 'fixed'; 

  const header = document.createElement('div');
  header.className = 'popup-menu-header'; header.textContent = '別タブへ移動...';
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
      const icon = tab.mode === 'outliner' ? '🔹' : '📝';
      item.innerHTML = `<span>${icon} ${tab.title}</span>`;
      item.onclick = () => { moveItemToTab(itemIndex, tab.id); menu.remove(); };
      menu.appendChild(item);
    });
  }
  setupPopupClose(menu);
  document.body.appendChild(menu);
}

function moveItemToTab(index, targetTabId) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  const targetTab = tabs.find(t => t.id === targetTabId);
  if (!currentTab || !targetTab) return;
  pushHistory();
  const count = getSubtreeCount(currentTab, index);
  const itemsToMove = currentTab.items.splice(index, count);
  if (itemsToMove.length > 0) {
    const baseDepth = itemsToMove[0].depth;
    itemsToMove.forEach(item => { item.depth = Math.max(0, item.depth - baseDepth); });
  }
  if (targetTab.mode === 'outliner') {
    targetTab.items.push(...itemsToMove);
  } else {
    const textToAppend = itemsToMove.map(item => `  `.repeat(item.depth) + `- ${item.text}`).join('\n');
    if (targetTab.content && !targetTab.content.endsWith('\n')) targetTab.content += '\n';
    targetTab.content += textToAppend;
  }
  markAsDirty(); saveData(); switchTab(targetTabId);
}

function moveItemToTop(index) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || index === 0) return;
  pushHistory();
  const count = getSubtreeCount(currentTab, index);
  const itemsToMove = currentTab.items.splice(index, count);
  if (itemsToMove.length > 0) {
    const baseDepth = itemsToMove[0].depth;
    itemsToMove.forEach(item => { item.depth = Math.max(0, item.depth - baseDepth); });
  }
  currentTab.items.unshift(...itemsToMove);
  markAsDirty(); saveData(); renderEditor();
  setTimeout(() => focusItemById(itemsToMove[0].id), 0);
}

function moveItemToBottom(index) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab) return;
  const count = getSubtreeCount(currentTab, index);
  if (index + count >= currentTab.items.length) return;
  pushHistory();
  const itemsToMove = currentTab.items.splice(index, count);
  if (itemsToMove.length > 0) {
    const baseDepth = itemsToMove[0].depth;
    itemsToMove.forEach(item => { item.depth = Math.max(0, item.depth - baseDepth); });
  }
  currentTab.items.push(...itemsToMove);
  markAsDirty(); saveData(); renderEditor();
  setTimeout(() => focusItemById(itemsToMove[0].id), 0);
}

function deleteSelectedItems() {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || selectedItemIds.size === 0) return;
  pushHistory();
  for (let i = currentTab.items.length - 1; i >= 0; i--) {
    if (selectedItemIds.has(currentTab.items[i].id)) currentTab.items.splice(i, 1);
  }
  const visibleItems = currentTab.items.filter(i => !i.completed);
  if (visibleItems.length === 0) {
    currentTab.items.push({ id: generateId(), text: '', note: '', depth: 0, completed: false, collapsed: false });
  }
  selectedItemIds.clear(); markAsDirty(); saveData(); renderEditor();
}

function closeAllPopups() {
  document.querySelectorAll('.popup-menu').forEach(el => el.remove());
  document.querySelectorAll('.color-palette').forEach(el => el.remove());
}

function setupPopupClose(element) {
  setTimeout(() => {
    const closeHandler = (e) => {
      if (!element.contains(e.target)) {
        element.remove();
        document.removeEventListener('click', closeHandler);
        document.removeEventListener('contextmenu', closeHandler); 
      }
    };
    document.addEventListener('click', closeHandler);
    document.addEventListener('contextmenu', closeHandler);
  }, 50);
}

function applyColor(index, prop, value) {
  pushHistory();
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (currentTab && currentTab.items[index]) {
    markAsDirty(); 
    currentTab.items[index][prop] = value;
    renderEditor(); saveData();
  }
}

function handlePaste(e, index, item) {
  const paste = (e.clipboardData || window.clipboardData).getData('text');
  if (!paste.includes('\n') && !paste.includes('\r')) return;
  e.preventDefault(); pushHistory();
  const input = e.target; const cursorStart = input.selectionStart; const cursorEnd = input.selectionEnd;
  const textBefore = item.text.substring(0, cursorStart); const textAfter = item.text.substring(cursorEnd);
  const lines = paste.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const existedBeforePaste = Boolean(item.createdAt);
  const now = Date.now();
  item.text = textBefore + lines[0];
  if (!item.createdAt && item.text.trim() !== '') item.createdAt = now;
  else if (existedBeforePaste) item.updatedAt = now;
  const newItems = []; const currentTab = tabs.find(t => t.id === activeTabId);
  for (let i = 1; i < lines.length; i++) {
    let lineText = lines[i]; if (i === lines.length - 1) lineText += textAfter;
    const pastedItem = { id: generateId(), text: lineText, note: '', depth: item.depth, completed: false, collapsed: false };
    if (lineText.trim() !== '') pastedItem.createdAt = Date.now();
    newItems.push(pastedItem);
  }
  let insertIndex = index + 1;
  if (item.collapsed) insertIndex = index + getSubtreeCount(currentTab, index);
  markAsDirty(); currentTab.items.splice(insertIndex, 0, ...newItems);
  renderEditor(); saveData();
  setTimeout(() => focusItemById(newItems[newItems.length - 1].id, lines[lines.length - 1].length), 0);
}

function handleKey(e, index, item) {
  if (selectedItemIds.size > 0 && (e.key === 'Backspace' || e.key === 'Delete')) {
    e.preventDefault(); deleteSelectedItems(); return;
  }
  if (e.key === 'F2') {
    e.preventDefault(); const noteInput = e.target.nextElementSibling;
    if (noteInput && noteInput.classList.contains('item-note')) { noteInput.classList.remove('hidden'); noteInput.focus(); }
    return;
  }
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
    if (e.key === 'ArrowUp') { e.preventDefault(); toggleFold(index, true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); toggleFold(index, false); return; }
  }
  
  // ▼ ここを3段階トグルに修正しました ▼
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
    e.preventDefault(); 
    pushHistory(); 
    
    if (item.textColor === 'bold-red') {
      // 1回押し(赤太字) → 2回押し(緑・非太字 ＋ ⏳追加)
      item.textColor = 'green';
      e.target.classList.remove('text-bold-red');
      e.target.classList.add('text-green');
      if (!item.text.startsWith('⏳')) {
        item.text = '⏳' + item.text;
        e.target.value = '⏳' + e.target.value;
      }
    } else if (item.textColor === 'green') {
      // 2回押し(待ち状態) → 通常に戻る (⏳も削除)
      item.textColor = null;
      e.target.classList.remove('text-green');
      if (item.text.startsWith('⏳')) {
        item.text = item.text.replace(/^⏳/, '');
        e.target.value = e.target.value.replace(/^⏳/, '');
      }
    } else {
      // 通常 → 1回押し(赤太字)
      item.textColor = 'bold-red';
      e.target.classList.add('text-bold-red');
    }
    
    markAsDirty(); 
    saveData(); 
    autoResize(e.target);
    return;
  }
  // ▲ 修正ここまで ▲

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault(); e.shiftKey ? redo() : undo(); return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault(); completeItem(index); return;
  }
  if (e.shiftKey && (e.altKey || e.ctrlKey || e.metaKey)) {
    if (e.key === 'ArrowUp') { e.preventDefault(); moveItem(index, true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveItem(index, false); return; }
  }
  if (e.key === 'Tab') {
    e.preventDefault(); pushHistory(); const currentTab = tabs.find(t => t.id === activeTabId);
    const newDepth = e.shiftKey ? item.depth - 1 : item.depth + 1;
    if (newDepth < 0) return;
    if (!e.shiftKey && index > 0 && newDepth > currentTab.items[index - 1].depth + 1) return;
    item.depth = newDepth; markAsDirty(); renderEditor(); focusItemById(item.id); saveData();
  } else if (e.key === 'Enter' && !e.isComposing) {
    e.preventDefault(); pushHistory(); const currentTab = tabs.find(t => t.id === activeTabId);
    const caretPos = e.target.selectionStart;
    const textAfter = item.text.substring(caretPos);
    const existedBeforeSplit = Boolean(item.createdAt);
    item.text = item.text.substring(0, caretPos);
    if (existedBeforeSplit) item.updatedAt = Date.now();
    const newItem = { id: generateId(), text: textAfter, note: '', depth: item.depth, completed: false, collapsed: false };
    if (textAfter.trim() !== '') newItem.createdAt = Date.now();
    let insertIndex = index + 1;
    if (item.collapsed) insertIndex = index + getSubtreeCount(currentTab, index);
    markAsDirty(); currentTab.items.splice(insertIndex, 0, newItem);
    renderEditor(); saveData(); setTimeout(() => focusItemById(newItem.id, 0), 0);
  } else if (e.key === 'Backspace') {
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (item.text === '' && currentTab.items.length > 1) {
      e.preventDefault(); pushHistory();
      let prevId = null;
      for (let i = index - 1; i >= 0; i--) { if (!currentTab.items[i].completed) { prevId = currentTab.items[i].id; break; } }
      markAsDirty(); currentTab.items.splice(index, 1); renderEditor(); if (prevId) focusItemById(prevId); saveData();
    } else if (e.target.selectionStart === 0 && e.target.selectionEnd === 0 && index > 0) { 
      // ★修正3: e.target.selectionEnd === 0 を追加し、文字がハイライトされていないこと（カーソル単体であること）を厳密にチェック
      e.preventDefault(); pushHistory();
      let prevIdx = -1;
      for (let i = index - 1; i >= 0; i--) { if (!currentTab.items[i].completed) { prevIdx = i; break; } }
      if (prevIdx !== -1) {
        const prevItem = currentTab.items[prevIdx]; const prevLen = prevItem.text.length;
        prevItem.text += item.text;
        if (prevItem.createdAt) prevItem.updatedAt = Date.now();
        currentTab.items.splice(index, 1);
        markAsDirty(); renderEditor(); focusItemById(prevItem.id, prevLen); saveData();
      }
    }
  } else if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(index, -1); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(index, 1); }
}

function handleNoteKey(e, index, item) {
  // 詳細欄の編集中でも、親項目ごと上下移動できるようにする。
  if (e.shiftKey && (e.altKey || e.ctrlKey || e.metaKey)) {
    if (e.key === 'ArrowUp') { e.preventDefault(); moveItem(index, true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveItem(index, false); return; }
  }

  if (e.key === 'ArrowUp') { e.preventDefault(); focusItemById(item.id); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(index, 1); }
}

// DOM上で編集中の本文・詳細を、構造変更前に項目ID単位でデータへ反映する。
// 行番号（配列位置）ではなくIDで結び付けることで、移動後の取り違えを防ぐ。
function syncRenderedOutlinerState() {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || currentTab.mode !== 'outliner') return;

  const itemById = new Map(currentTab.items.map(item => [item.id, item]));
  document.querySelectorAll('.row[data-item-id]').forEach(row => {
    const item = itemById.get(row.dataset.itemId);
    if (!item) return;

    const textInput = row.querySelector('.item-input');
    const noteInput = row.querySelector('.item-note');
    if (textInput) item.text = textInput.value;
    if (noteInput) item.note = noteInput.value;
  });
}

function captureOutlinerFocusState(fallbackItemId = null) {
  const active = document.activeElement;
  if (!active) return fallbackItemId ? { itemId: fallbackItemId, field: 'text', start: null, end: null } : null;

  const isText = active.classList?.contains('item-input');
  const isNote = active.classList?.contains('item-note');
  if (!isText && !isNote) {
    return fallbackItemId ? { itemId: fallbackItemId, field: 'text', start: null, end: null } : null;
  }

  const row = active.closest('.row');
  return {
    itemId: active.dataset.id || row?.dataset.itemId || fallbackItemId,
    field: isNote ? 'note' : 'text',
    start: Number.isInteger(active.selectionStart) ? active.selectionStart : null,
    end: Number.isInteger(active.selectionEnd) ? active.selectionEnd : null
  };
}

function restoreOutlinerFocusState(state) {
  if (!state?.itemId) return;

  const row = Array.from(document.querySelectorAll('.row[data-item-id]'))
    .find(el => el.dataset.itemId === state.itemId);
  if (!row) return;

  let target;
  if (state.field === 'note') {
    target = row.querySelector('.item-note');
    const display = row.querySelector('.item-note-display');
    if (target) target.classList.remove('hidden');
    if (display) display.classList.add('hidden');
  } else {
    target = row.querySelector('.item-input');
  }

  if (!target) return;
  target.focus();
  if (state.start !== null && typeof target.setSelectionRange === 'function') {
    const max = target.value.length;
    const start = Math.min(state.start, max);
    const end = Math.min(state.end ?? state.start, max);
    target.setSelectionRange(start, end);
  }
  target.scrollIntoView({ block: 'nearest' });
}

function moveFocus(currentIndex, direction) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  const inputs = Array.from(document.querySelectorAll('.item-input'));
  const currentInput = document.querySelector(`.item-input[data-id="${currentTab.items[currentIndex].id}"]`);
  if (currentInput) {
    const idx = inputs.indexOf(currentInput) + direction;
    if (idx >= 0 && idx < inputs.length) inputs[idx].focus();
  }
}

function getSubtreeCount(tab, index) {
  const targetDepth = tab.items[index].depth;
  let count = 1;
  for (let i = index + 1; i < tab.items.length; i++) {
    if (tab.items[i].depth > targetDepth) count++; else break;
  }
  return count;
}

function moveItem(index, isUp) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || currentTab.mode !== 'outliner') return;

  // 再描画の前に、本文と詳細の最新入力値を項目IDへ確定する。
  syncRenderedOutlinerState();

  const items = currentTab.items;
  const item = items[index];
  if (!item) return;

  const focusState = captureOutlinerFocusState(item.id);
  const myCount = getSubtreeCount(currentTab, index);

  if (isUp) {
    let prevSiblingIdx = -1;
    for (let i = index - 1; i >= 0; i--) {
      if (items[i].depth === item.depth) { prevSiblingIdx = i; break; }
      if (items[i].depth < item.depth) return;
    }
    if (prevSiblingIdx === -1) return;

    pushHistory();
    const mySubtree = items.splice(index, myCount);
    items.splice(prevSiblingIdx, 0, ...mySubtree);
  } else {
    const nextSiblingIdx = index + myCount;
    if (nextSiblingIdx >= items.length || items[nextSiblingIdx].depth !== item.depth) return;

    pushHistory();
    const siblingCount = getSubtreeCount(currentTab, nextSiblingIdx);
    const mySubtree = items.splice(index, myCount);
    items.splice(index + siblingCount, 0, ...mySubtree);
  }

  markAsDirty();
  renderEditor();
  restoreOutlinerFocusState(focusState);
  saveData();
}

function completeItem(index) {
  pushHistory();
  const currentTab = tabs.find(t => t.id === activeTabId);
  const count = getSubtreeCount(currentTab, index); 

  const editor = document.getElementById('editor');
  const scrollPos = editor.scrollTop; // 現在のスクロール位置を記憶

  const targetItemIds = new Set();
  for (let i = 0; i < count; i++) targetItemIds.add(currentTab.items[index + i].id);

  const rows = editor.querySelectorAll('.row');
  let animationApplied = false;
  rows.forEach(row => {
    const input = row.querySelector('.item-input');
    if (input && targetItemIds.has(input.dataset.id)) {
      row.classList.add('row-fade-out');
      animationApplied = true;
    }
  });

  const delay = animationApplied ? 300 : 0;
  setTimeout(() => {
    for (let i = 0; i < count; i++) currentTab.items[index + i].completed = true;
    const visibleItems = currentTab.items.filter(i => !i.completed);
    if (visibleItems.length === 0) {
      currentTab.items.push({ id: generateId(), text: '', note: '', depth: 0, completed: false, collapsed: false });
    }
    markAsDirty(); 
    renderEditor(); 
    editor.scrollTop = scrollPos; // 位置復元
    saveData();
  }, delay);
}

function countStars(text) {
  if (!text) return 0; const match = text.match(/(★+)$/); return match ? match[1].length : 0;
}

function sortItemsByStars() {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || currentTab.mode !== 'outliner') return;
  if (currentTab.items.length <= 1) return;
  pushHistory(); 
  function buildTree(itemList) {
    const root = { children: [] }; const stack = [{ depth: -1, node: root }];
    itemList.forEach(item => {
      const node = { item: item, children: [] };
      while (stack.length > 0 && stack[stack.length - 1].depth >= item.depth) stack.pop();
      stack[stack.length - 1].node.children.push(node);
      stack.push({ depth: item.depth, node: node });
    });
    return root.children;
  }
  function sortTree(nodes) {
    nodes.sort((a, b) => countStars(b.item.text) - countStars(a.item.text));
    nodes.forEach(node => { if (node.children.length > 0) sortTree(node.children); });
  }
  function flattenTree(nodes, resultList = []) {
    nodes.forEach(node => { resultList.push(node.item); if (node.children.length > 0) flattenTree(node.children, resultList); });
    return resultList;
  }
  const tree = buildTree(currentTab.items); sortTree(tree); currentTab.items = flattenTree(tree);
  markAsDirty(); renderEditor(); saveData();
}

function focusItemById(id, cursorPos = null) {
  const input = document.querySelector(`.item-input[data-id="${id}"]`);
  if (input) {
    input.focus();
    if (cursorPos !== null) input.setSelectionRange(cursorPos, cursorPos);
  }
}

function hasMeaningfulUpdate(item) {
  if (!item || !item.createdAt || !item.updatedAt) return false;
  return Number(item.updatedAt) > Number(item.createdAt) + 1000;
}

function updateItemTimestampLabel(label, item) {
  if (!label) return;
  const createdAt = Number(item?.createdAt || 0);
  const updatedAt = Number(item?.updatedAt || 0);

  if (!createdAt) {
    label.style.display = 'none';
    label.removeAttribute('data-created-at');
    label.removeAttribute('data-updated-at');
    label.textContent = '';
    label.removeAttribute('title');
    label.removeAttribute('aria-label');
    return;
  }

  label.style.display = '';
  label.dataset.createdAt = String(createdAt);
  if (updatedAt) label.dataset.updatedAt = String(updatedAt);
  else label.removeAttribute('data-updated-at');

  const edited = hasMeaningfulUpdate(item);
  const primaryTime = edited ? updatedAt : createdAt;
  label.textContent = edited
    ? `更新 ${formatRelativeCreatedAt(primaryTime)}`
    : formatRelativeCreatedAt(primaryTime);

  const detail = edited
    ? `作成 ${formatAbsoluteCreatedAt(createdAt)}／更新 ${formatAbsoluteCreatedAt(updatedAt)}`
    : `作成 ${formatAbsoluteCreatedAt(createdAt)}`;
  label.title = detail;
  label.setAttribute('aria-label', detail);
}

function formatRelativeCreatedAt(value) {
  const created = Number(value);
  if (!created || Number.isNaN(created)) return '';

  const diffMs = Date.now() - created;
  if (diffMs < 0) return 'たった今';

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'たった今';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}分前`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}時間前`;
  if (diffMs < 2 * day) return '昨日';
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}日前`;

  const d = new Date(created);
  const now = new Date();
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function formatAbsoluteCreatedAt(value) {
  const created = Number(value);
  if (!created || Number.isNaN(created)) return '';

  const d = new Date(created);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

function refreshCreatedAtLabels() {
  document.querySelectorAll('.created-at-label[data-created-at]').forEach(label => {
    const createdAt = Number(label.dataset.createdAt || 0);
    const updatedAt = Number(label.dataset.updatedAt || 0);
    const edited = updatedAt > createdAt + 1000;
    const primaryTime = edited ? updatedAt : createdAt;

    label.textContent = edited
      ? `更新 ${formatRelativeCreatedAt(primaryTime)}`
      : formatRelativeCreatedAt(primaryTime);

    const detail = edited
      ? `作成 ${formatAbsoluteCreatedAt(createdAt)}／更新 ${formatAbsoluteCreatedAt(updatedAt)}`
      : `作成 ${formatAbsoluteCreatedAt(createdAt)}`;
    label.title = detail;
    label.setAttribute('aria-label', detail);
  });
}

function generateId() { return Math.random().toString(36).substr(2, 9); }

function getTabContentText(tab) {
  if (tab.mode === 'text') return tab.content;
  return tab.items.filter(i => !i.completed).map(i => {
    const indent = '  '.repeat(i.depth); const note = i.note ? `\n${indent}  (${i.note})` : '';
    return `${indent}- ${i.text}${note}`;
  }).join('\n');
}

function downloadFile(extension) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab) return;
  const content = getTabContentText(currentTab);
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
  const filename = (currentTab.title || 'memo').replace(/[\\/:*?"<>|]/g, '_') + extension;
  chrome.downloads.download({ url: url, filename: filename, saveAs: true }, () => deleteTab(activeTabId));
}

async function copyToClipboard() {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab) return;
  let content = `[${currentTab.title || '無題'}]\n\n${getTabContentText(currentTab)}`;
  try {
    await navigator.clipboard.writeText(content);
    closeFooterMenu();
    showTransientStatus('コピーしました');
  } catch (err) { alert('コピーに失敗しました'); }
}


function closeFooterMenu() {
  const menu = document.getElementById('footer-menu');
  const button = document.getElementById('btn-footer-menu');
  if (menu) menu.classList.add('hidden');
  if (button) button.setAttribute('aria-expanded', 'false');
}

function toggleFooterMenu() {
  const menu = document.getElementById('footer-menu');
  const button = document.getElementById('btn-footer-menu');
  if (!menu || !button) return;
  const willOpen = menu.classList.contains('hidden');
  menu.classList.toggle('hidden', !willOpen);
  button.setAttribute('aria-expanded', String(willOpen));
}

function setupEventListeners() {
  const menuBtn = document.getElementById('new-tab-btn');
  const menu = document.getElementById('new-tab-menu');
  menuBtn.onclick = (e) => { e.stopPropagation(); menu.style.display = (menu.style.display === 'flex' ? 'none' : 'flex'); };
  document.addEventListener('click', () => {
    menu.style.display = 'none';
    closeFooterMenu();
  });

  const footerMenuButton = document.getElementById('btn-footer-menu');
  const footerMenu = document.getElementById('footer-menu');
  if (footerMenuButton) {
    footerMenuButton.onclick = (e) => {
      e.stopPropagation();
      toggleFooterMenu();
    };
  }
  if (footerMenu) footerMenu.onclick = (e) => e.stopPropagation();
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeFooterMenu();
      clearLineJumpBuffer();
      return;
    }
    handleLineJumpKeydown(e);
  });
  
  // 画面のどこかでマウスを離したらドラッグフラグをオフにする
  document.addEventListener('mouseup', () => { 
    isDraggingSelection = false; 
    isRowDragHandleDown = false; // アイコンドラッグのフラグも解除
  });

  document.getElementById('menu-outliner').onclick = () => createNewTab('outliner');
  document.getElementById('menu-text').onclick = () => createNewTab('text');
  document.getElementById('btn-undo').onclick = undo;
  document.getElementById('btn-redo').onclick = redo;
  document.getElementById('btn-copy-clipboard').onclick = copyToClipboard;
  document.getElementById('btn-download-txt').onclick = () => { closeFooterMenu(); if (confirm('.txt形式で保存して閉じますか？')) downloadFile('.txt'); };
  document.getElementById('btn-download-md').onclick = () => { closeFooterMenu(); if (confirm('.md形式で保存して閉じますか？')) downloadFile('.md'); };
  document.getElementById('btn-force-reload').onclick = forceReload;
  document.getElementById('btn-selection-cancel').onclick = () => { selectedItemIds.clear(); renderEditor(); };
  document.getElementById('btn-selection-move').onclick = (e) => { e.stopPropagation(); showMultiMoveMenu(); };
  
  // --- 複数選択コピーボタンのイベント紐付け ---
  const btnSelectionCopy = document.getElementById('btn-selection-copy');
  if (btnSelectionCopy) {
    btnSelectionCopy.onclick = (e) => { e.stopPropagation(); copySelectedItems(); };
  }
  
  const btnLineNumbers = document.getElementById('btn-line-numbers');
  if (btnLineNumbers) btnLineNumbers.onclick = toggleLineNumbers;

  const btnSort = document.getElementById('btn-sort-stars');
  if (btnSort) btnSort.onclick = sortItemsByStars;

  // --- 履歴モーダル ---
  const btnHistory = document.getElementById('btn-history');
  if (btnHistory) btnHistory.onclick = showHistoryModal;
  
  const btnCloseHistory = document.getElementById('btn-close-history');
  if (btnCloseHistory) btnCloseHistory.onclick = hideHistoryModal;

  const historyModal = document.getElementById('history-modal');
  if (historyModal) {
    historyModal.addEventListener('click', (e) => {
      if (e.target === historyModal) hideHistoryModal(); // 背景クリックで閉じる
    });
  }
}

// --- 折り畳み（トグル）機能 ---
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

// --- 複数起動アラートの更新ロジック ---
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

// --- 履歴モーダル制御 ---
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
  if (modal) {
    modal.style.display = 'none';
  }
}