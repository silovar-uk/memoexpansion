'use strict';

function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

function createOutlinerItem(overrides = {}) {
  return {
    id: createId(),
    text: '',
    note: '',
    depth: 0,
    completed: false,
    textColor: null,
    markerColor: null,
    collapsed: false,
    ...overrides
  };
}

function createNewOutlinerTab() {
  const now = new Date();
  const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const id = createId();

  return {
    tab: {
      id,
      title: `🔹メモ-${dateStr}-${timeStr}`,
      mode: 'outliner',
      items: [],
      content: '',
      createdAt: Date.now()
    },
    id
  };
}

function parseStoredTabs(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse stored tabs:', error);
    return [];
  }
}

// ツールバーのActionクリックはChrome標準のSide Panel起動に任せる。
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Failed to set side panel behavior:', error));

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'add-to-outliner',
      title: 'memo toolに追加',
      contexts: ['selection']
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== 'add-to-outliner' || !info.selectionText) return;

  try {
    const result = await chrome.storage.local.get(['tabs', 'activeTabId']);
    const tabs = parseStoredTabs(result.tabs);
    let activeTabId = result.activeTabId;

    if (tabs.length === 0) {
      const { tab, id } = createNewOutlinerTab();
      tabs.push(tab);
      activeTabId = id;
    }

    let targetTab = tabs.find(tab => tab.id === activeTabId);
    if (!targetTab || targetTab.mode === 'text') {
      const { tab, id } = createNewOutlinerTab();
      tabs.push(tab);
      activeTabId = id;
      targetTab = tab;
    }

    if (!Array.isArray(targetTab.items)) targetTab.items = [];
    const newItem = createOutlinerItem({
      text: info.selectionText,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    const completedArchiveIndex = targetTab.items.findIndex(item => item?.completed);
    if (completedArchiveIndex === -1) targetTab.items.push(newItem);
    else targetTab.items.splice(completedArchiveIndex, 0, newItem);

    await chrome.storage.local.set({
      tabs: JSON.stringify(tabs),
      activeTabId
    });
  } catch (error) {
    console.error('Failed to add item from context menu:', error);
  }
});

const connectedPanels = new Set();

async function updateActionBadge(count) {
  const badgeText = count > 0 ? String(count) : '';
  const operations = [
    chrome.action.setBadgeText({ text: badgeText }),
    chrome.action.setBadgeBackgroundColor({ color: '#2563eb' })
  ];

  if (typeof chrome.action.setBadgeTextColor === 'function') {
    operations.push(chrome.action.setBadgeTextColor({ color: '#ffffff' }));
  }

  await Promise.allSettled(operations);
}

async function updateAndBroadcastCount() {
  try {
    const contexts = await chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL'] });
    const count = contexts.length;

    await updateActionBadge(count);
    await chrome.storage.session.set({ instanceCount: count });

    for (const port of connectedPanels) {
      try {
        port.postMessage({ type: 'INSTANCE_COUNT_UPDATE', count });
      } catch (error) {
        connectedPanels.delete(port);
      }
    }
  } catch (error) {
    console.error('Count update failed:', error);
  }
}

updateAndBroadcastCount();
chrome.runtime.onStartup.addListener(updateAndBroadcastCount);

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'sidepanel-port') return;

  connectedPanels.add(port);
  updateAndBroadcastCount();

  port.onDisconnect.addListener(() => {
    connectedPanels.delete(port);
    updateAndBroadcastCount();
  });
});


// --- ALT+A: Side Panelを開閉し、開いたときは現在のメモへ戻る ---
let pendingShortcutFocusRequest = null;
const openPanelWindowIds = new Set();

// Service Workerが再起動しても、現在開いているSide Panelを復元しておく。
// ALT+A本体ではawaitしないため、ユーザージェスチャーを失わない。
chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL'] })
  .then((contexts) => {
    openPanelWindowIds.clear();
    for (const context of contexts) {
      if (typeof context.windowId === 'number' && context.windowId >= 0) {
        openPanelWindowIds.add(context.windowId);
      }
    }
  })
  .catch((error) => console.error('Failed to hydrate side panel state:', error));

// Chrome 142+。手動操作・ツールバー操作も含め、実際の開閉状態を同期する。
chrome.sidePanel.onOpened.addListener((info) => {
  if (typeof info?.windowId === 'number') {
    openPanelWindowIds.add(info.windowId);
  }
});

chrome.sidePanel.onClosed.addListener((info) => {
  if (typeof info?.windowId === 'number') {
    openPanelWindowIds.delete(info.windowId);
  }
});

function broadcastFocusRequest(request) {
  for (const port of connectedPanels) {
    try {
      port.postMessage({ type: 'FOCUS_CURRENT_MEMO', requestId: request.id });
    } catch (error) {
      connectedPanels.delete(port);
    }
  }
}

function clearPendingShortcutFocusRequest() {
  pendingShortcutFocusRequest = null;
  chrome.storage.session.remove('memoShortcutFocusRequest').catch(() => {});
}

function openMemoPanelFromShortcut(tab) {
  const windowId = tab?.windowId;
  if (typeof windowId !== 'number') {
    console.warn('ALT+A received without a target window; memo panel was not toggled.');
    return;
  }

  // 開いているなら閉じる。close()もイベント直下で呼び、連打時は状態を先に反転する。
  if (openPanelWindowIds.has(windowId)) {
    openPanelWindowIds.delete(windowId);
    clearPendingShortcutFocusRequest();

    chrome.sidePanel.close({ windowId }).catch((error) => {
      // 閉じられなかった場合は実状態へ戻す。
      openPanelWindowIds.add(windowId);
      console.error('Failed to close memo panel from ALT+A:', error);
    });
    return;
  }

  const request = {
    id: createId(),
    requestedAt: Date.now()
  };
  pendingShortcutFocusRequest = request;

  // IMPORTANT: sidePanel.open() はユーザージェスチャー中に直接呼ぶ必要がある。
  // ここより前に await / Promise待機 / 別APIの結果待ちを入れないこと。
  // 高速連打でも次のALT+Aをcloseとして扱えるよう、先に開状態へ寄せる。
  openPanelWindowIds.add(windowId);
  const openPromise = chrome.sidePanel.open({ windowId });

  // 閉じたパネルが起動した直後にも要求を拾えるよう、open()を呼んだ「後」で保存する。
  chrome.storage.session
    .set({ memoShortcutFocusRequest: request })
    .catch((error) => console.error('Failed to store memo shortcut focus request:', error));

  // すでにDOMが存在するケースでは、その場で現在メモへフォーカス。
  broadcastFocusRequest(request);

  openPromise.catch((error) => {
    openPanelWindowIds.delete(windowId);
    if (pendingShortcutFocusRequest?.id === request.id) clearPendingShortcutFocusRequest();
    console.error('Failed to open memo panel from ALT+A:', error);
  });
}

// 標準コマンドのkeyboard shortcutは commands.onCommand を発火する。
// open/closeの判定は同期状態だけで行い、sidePanel.open() の前にawaitを挟まない。
chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== 'open-memo-panel') return;
  openMemoPanelFromShortcut(tab);
});

// 新しくSide Panelが接続された場合は、パネル側の受信準備完了を待ってから再送する。
// runtime.connect()直後に送ると、Side Panel側がonMessage listenerを付ける前に届く可能性があるため。
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'sidepanel-port') return;

  port.onMessage.addListener((message) => {
    if (message?.type !== 'PANEL_READY_FOR_FOCUS' || !pendingShortcutFocusRequest) return;

    const request = pendingShortcutFocusRequest;
    if (Date.now() - request.requestedAt > 5000) {
      clearPendingShortcutFocusRequest();
      return;
    }

    try {
      port.postMessage({ type: 'FOCUS_CURRENT_MEMO', requestId: request.id });
      clearPendingShortcutFocusRequest();
    } catch (error) {
      console.error('Failed to deliver memo focus request to opened panel:', error);
    }
  });
});

// 他の拡張機能やOS側との競合でALT+Aが未割当になるケースをログで検知する。
chrome.runtime.onInstalled.addListener(() => {
  chrome.commands.getAll()
    .then((commands) => {
      const shortcutCommand = commands.find((command) => command.name === 'open-memo-panel');
      if (shortcutCommand && !shortcutCommand.shortcut) {
        console.warn('ALT+A is not assigned. Check chrome://extensions/shortcuts for a shortcut conflict.');
      }
    })
    .catch((error) => console.error('Failed to inspect command shortcuts:', error));
});

