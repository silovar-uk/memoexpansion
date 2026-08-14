// サイドパネルをアクションクリックで開く設定
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// インストール時に右クリックメニューを作成
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-to-outliner",
    title: "memo toolに追加",
    contexts: ["selection"]
  });
});

// メニューがクリックされたときの処理（選択テキストをメモに追加）
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "add-to-outliner" && info.selectionText) {
    try {
      const result = await chrome.storage.local.get(['tabs', 'activeTabId']);
      let tabs = result.tabs ? JSON.parse(result.tabs) : [];
      let activeTabId = result.activeTabId;

      if (tabs.length === 0) {
        const { tab: newTab, id } = createNewOutlinerTab();
        tabs.push(newTab);
        activeTabId = id;
      }

      let targetTab = tabs.find(t => t.id === activeTabId);
      
      if (!targetTab || targetTab.mode === 'text') {
        const { tab: newTab, id } = createNewOutlinerTab();
        tabs.push(newTab);
        activeTabId = id;
        targetTab = newTab;
      }

      const newItem = {
        id: Math.random().toString(36).substr(2, 9),
        text: info.selectionText,
        note: '',
        depth: 0,
        completed: false,
        textColor: null,
        markerColor: null,
        collapsed: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      targetTab.items.push(newItem);

      await chrome.storage.local.set({
        tabs: JSON.stringify(tabs),
        activeTabId: activeTabId
      });

    } catch (e) {
      console.error("Failed to add item from context menu:", e);
    }
  }
});

function createNewOutlinerTab() {
  const now = new Date();
  const dateStr = `${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const newTabId = Math.random().toString(36).substr(2, 9);
  
  const newTab = {
    id: newTabId,
    title: `🔹メモ-${dateStr}-${timeStr}`,
    mode: 'outliner',
    items: [],
    content: '',
    createdAt: Date.now()
  };
  return { tab: newTab, id: newTabId };
}

// --- サイドパネルの起動インスタンス数（接続数）の監視 ---
let connectedPanels = [];

// ツールバーアイコンのバッジを更新する。
// 0件なら非表示、1件以上なら開いているサイドパネル数を表示。
async function updateActionBadge(count) {
  const badgeText = count > 0 ? String(count) : '';

  await Promise.all([
    chrome.action.setBadgeText({ text: badgeText }),
    chrome.action.setBadgeBackgroundColor({ color: '#2563eb' }),
    chrome.action.setBadgeTextColor({ color: '#ffffff' })
  ]);
}

async function updateAndBroadcastCount() {
  try {
    // 開いているサイドパネルの数を取得
    const contexts = await chrome.runtime.getContexts({ contextTypes: ["SIDE_PANEL"] });
    const count = contexts.length;

    // ツールバーアイコンに起動数を表示
    await updateActionBadge(count);
    
    // セッションストレージに保存
    await chrome.storage.session.set({ instanceCount: count });
    
    // 接続されている全てのパネルに最新の数を通知
    connectedPanels.forEach(port => {
      try { port.postMessage({ type: 'INSTANCE_COUNT_UPDATE', count: count }); }
      catch (e) {}
    });
  } catch (e) {
    console.error("Count update failed:", e);
  }
}

// Service Workerの起動時にも実際の状態とバッジを同期する。
updateAndBroadcastCount();
chrome.runtime.onStartup.addListener(updateAndBroadcastCount);

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel-port') {
    connectedPanels.push(port);
    updateAndBroadcastCount();

    // パネルが閉じられた時の処理
    port.onDisconnect.addListener(() => {
      connectedPanels = connectedPanels.filter(p => p !== port);
      updateAndBroadcastCount();
    });
  }
});