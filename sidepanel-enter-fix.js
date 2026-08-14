(() => {
  const originalHandleKey = handleKey;

  handleKey = function (e, index, item) {
    const shouldKeepBoldOnEnter =
      e.key === 'Enter' &&
      !e.isComposing &&
      !(e.ctrlKey || e.metaKey) &&
      item?.textColor === 'bold-red';

    if (!shouldKeepBoldOnEnter) {
      return originalHandleKey(e, index, item);
    }

    e.preventDefault();
    pushHistory();

    const currentTab = tabs.find(t => t.id === activeTabId);
    if (!currentTab || currentTab.mode !== 'outliner') {
      return originalHandleKey(e, index, item);
    }

    const caretPos = e.target.selectionStart;
    const textAfter = item.text.substring(caretPos);
    const existedBeforeSplit = Boolean(item.createdAt);

    item.text = item.text.substring(0, caretPos);
    if (existedBeforeSplit) item.updatedAt = Date.now();

    const newItem = {
      id: generateId(),
      text: textAfter,
      note: '',
      depth: item.depth,
      completed: false,
      collapsed: false,
      textColor: 'bold-red'
    };
    if (textAfter.trim() !== '') newItem.createdAt = Date.now();

    let insertIndex = index + 1;
    if (item.collapsed) insertIndex = index + getSubtreeCount(currentTab, index);

    markAsDirty();
    currentTab.items.splice(insertIndex, 0, newItem);
    renderEditor();
    saveData();
    setTimeout(() => focusItemById(newItem.id, 0), 0);
  };
})();
