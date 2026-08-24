function completeItem(index) {
  pushHistory();
  const currentTab = tabs.find(t => t.id === activeTabId);
  const count = getSubtreeCount(currentTab, index); 

  const editor = document.getElementById('editor');
  const scrollPos = editor.scrollTop;
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
    if (visibleItems.length === 0) currentTab.items.push(createOutlinerItem());
    archiveCompletedItems(currentTab);
    markAsDirty(); 
    renderEditor(); 
    editor.scrollTop = scrollPos;
    saveData();
  }, delay);
}

function countStars(text) {
  if (!text) return 0;
  const match = text.match(/(★+)$/);
  return match ? match[1].length : 0;
}

function sortItemsByStars() {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || currentTab.mode !== 'outliner') return;
  archiveCompletedItems(currentTab);
  const activeItems = currentTab.items.filter(item => !item.completed);
  const completedItems = currentTab.items.filter(item => item.completed);
  if (activeItems.length <= 1) return;
  pushHistory();
  function buildTree(itemList) {
    const root = { children: [] };
    const stack = [{ depth: -1, node: root }];
    itemList.forEach(item => {
      const node = { item, children: [] };
      while (stack.length > 0 && stack[stack.length - 1].depth >= item.depth) stack.pop();
      stack[stack.length - 1].node.children.push(node);
      stack.push({ depth: item.depth, node });
    });
    return root.children;
  }
  function sortTree(nodes) {
    nodes.sort((a, b) => countStars(b.item.text) - countStars(a.item.text));
    nodes.forEach(node => { if (node.children.length > 0) sortTree(node.children); });
  }
  function flattenTree(nodes, resultList = []) {
    nodes.forEach(node => {
      resultList.push(node.item);
      if (node.children.length > 0) flattenTree(node.children, resultList);
    });
    return resultList;
  }
  const tree = buildTree(activeItems);
  sortTree(tree);
  currentTab.items = flattenTree(tree).concat(completedItems);
  markAsDirty();
  renderEditor();
  saveData();
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
  label.textContent = edited ? `更新 ${formatRelativeCreatedAt(primaryTime)}` : formatRelativeCreatedAt(primaryTime);
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
  if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}/${d.getDate()}`;
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
    label.textContent = edited ? `更新 ${formatRelativeCreatedAt(primaryTime)}` : formatRelativeCreatedAt(primaryTime);
    const detail = edited
      ? `作成 ${formatAbsoluteCreatedAt(createdAt)}／更新 ${formatAbsoluteCreatedAt(updatedAt)}`
      : `作成 ${formatAbsoluteCreatedAt(createdAt)}`;
    label.title = detail;
    label.setAttribute('aria-label', detail);
  });
}

function generateId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

function createOutlinerItem(overrides = {}) {
  return {
    id: generateId(),
    text: '',
    note: '',
    depth: 0,
    completed: false,
    collapsed: false,
    textColor: null,
    markerColor: null,
    ...overrides
  };
}
