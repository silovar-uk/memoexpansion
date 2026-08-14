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
          items: oldItems.map(i => createOutlinerItem({
            id: i.id || generateId(),
            text: i.text || '',
            depth: i.depth || 0,
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
