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
    targetTab.items.push(createOutlinerItem({
      text: info.selectionText,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));

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
