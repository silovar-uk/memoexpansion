// --- アウトライナー専用ヘルパー ---

function setOutlinerInputEditingState(input) {
  if (!input || !input.classList.contains('item-input')) return;

  input.style.fontSize = `${OUTLINER_EDIT_FONT_SIZE}px`;
  input.style.height = '24px';
  input.style.minHeight = '24px';
  input.dataset.fittedFontSize = String(OUTLINER_EDIT_FONT_SIZE);
  input.removeAttribute('title');
}

function updateOutlinerInputTooltip(input, fittedSize) {
  if (input.value && fittedSize < OUTLINER_PREFERRED_MIN_FONT_SIZE) input.title = input.value;
  else input.removeAttribute('title');
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

function deleteSelectedItems() {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || selectedItemIds.size === 0) return;
  pushHistory();
  for (let i = currentTab.items.length - 1; i >= 0; i--) {
    if (selectedItemIds.has(currentTab.items[i].id)) currentTab.items.splice(i, 1);
  }
  const visibleItems = currentTab.items.filter(i => !i.completed);
  if (visibleItems.length === 0) currentTab.items.push(createOutlinerItem());
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
    const pastedItem = createOutlinerItem({ text: lineText, depth: item.depth });
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
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
    e.preventDefault();
    pushHistory();
    if (item.textColor === 'bold-red') {
      item.textColor = 'green';
      e.target.classList.remove('text-bold-red');
      e.target.classList.add('text-green');
      if (!item.text.startsWith('⏳')) {
        item.text = '⏳' + item.text;
        e.target.value = '⏳' + e.target.value;
      }
    } else if (item.textColor === 'green') {
      item.textColor = null;
      e.target.classList.remove('text-green');
      if (item.text.startsWith('⏳')) {
        item.text = item.text.replace(/^⏳/, '');
        e.target.value = e.target.value.replace(/^⏳/, '');
      }
    } else {
      item.textColor = 'bold-red';
      e.target.classList.add('text-bold-red');
    }
    markAsDirty();
    saveData();
    autoResize(e.target);
    return;
  }
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
    const newItem = createOutlinerItem({
      text: textAfter,
      depth: item.depth,
      textColor: item.textColor === 'bold-red' ? 'bold-red' : null
    });
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
  if (e.shiftKey && (e.altKey || e.ctrlKey || e.metaKey)) {
    if (e.key === 'ArrowUp') { e.preventDefault(); moveItem(index, true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveItem(index, false); return; }
  }
  if (e.key === 'ArrowUp') { e.preventDefault(); focusItemById(item.id); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(index, 1); }
}

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
  if (!isText && !isNote) return fallbackItemId ? { itemId: fallbackItemId, field: 'text', start: null, end: null } : null;
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
  const row = Array.from(document.querySelectorAll('.row[data-item-id]')).find(el => el.dataset.itemId === state.itemId);
  if (!row) return;
  let target;
  if (state.field === 'note') {
    target = row.querySelector('.item-note');
    const display = row.querySelector('.item-note-display');
    if (target) target.classList.remove('hidden');
    if (display) display.classList.add('hidden');
  } else target = row.querySelector('.item-input');
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
  return window.MemoOutlinerStructure.getSubtreeCount(tab?.items, index);
}

function moveItem(index, isUp) {
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (!currentTab || currentTab.mode !== 'outliner') return;
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
    if (nextSiblingIdx >= items.length || items[nextSiblingIdx].completed || items[nextSiblingIdx].depth !== item.depth) return;
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
