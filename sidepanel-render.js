// --- レンダリング: エディタ ---

function renderEditor() {
  const editor = document.getElementById('editor');
  const currentTab = tabs.find(t => t.id === activeTabId);
  if (currentTab?.mode === 'outliner' && archiveCompletedItems(currentTab)) markAsDirty();
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

  const fragment = document.createDocumentFragment();
  const inputsToResize = [];
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
    row.draggable = true;
    row.dataset.index = index;
    row.dataset.visibleLineNumber = String(visibleLineNumber);
    row.dataset.itemId = item.id;
    
    if (selectedItemIds.has(item.id)) row.classList.add('selected');
    row.style.paddingLeft = (item.depth * 20) + 'px';
    
    row.addEventListener('dragstart', (e) => {
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
    
    row.addEventListener('mousedown', (e) => {
      if (e.target.closest('.action-icon') || e.target.closest('.fold-icon') || e.target.closest('.note-link-btn')) return;
      if (e.target.classList.contains('item-input') || e.target.classList.contains('item-note') || e.target.classList.contains('item-note-display')) return;
      
      e.preventDefault(); 
      if (e.ctrlKey || e.metaKey) {
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
        selectedItemIds.add(item.id);
        lastSelectionIndex = index;
        row.classList.add('selected');
        updateSelectionUI();
      }
    });

    const line = document.createElement('div');
    line.className = 'guide-line';
    line.style.left = (item.depth * 20) + 'px';
    
    const hasChildren = window.MemoOutlinerStructure.hasActiveChildren(currentTab.items, index);

    if (hasChildren && item.collapsed) row.classList.add('is-collapsed-row');

    const foldIcon = document.createElement('div');
    foldIcon.className = 'fold-icon';
    if (hasChildren) {
      foldIcon.setAttribute('role', 'button');
      foldIcon.setAttribute('aria-label', item.collapsed ? '展開' : '折り畳む');
      foldIcon.setAttribute('aria-expanded', String(!item.collapsed));
      foldIcon.tabIndex = 0;
      if (item.collapsed) {
        setIcon(foldIcon, 'chevronRight', 12);
        foldIcon.classList.add('collapsed');
      } else {
        setIcon(foldIcon, 'chevronDown', 12);
      }
      const toggleCurrentFold = (e) => {
        if (!(e.ctrlKey || e.metaKey || e.shiftKey)) {
          e.stopPropagation();
          toggleFold(index);
        }
      };
      foldIcon.onclick = toggleCurrentFold;
      foldIcon.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleCurrentFold(e);
        }
      };
    } else {
      setIcon(foldIcon, 'dot', 12);
      foldIcon.classList.add('leaf');
    }
    
    foldIcon.addEventListener('mousedown', (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleRowSelection(e, item, index);
      } else {
        isRowDragHandleDown = true;
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
      if (createdAtLabel.title) row.title = createdAtLabel.title;
      else row.removeAttribute('title');
      autoResize(e.target);
    };
    
    input.onkeydown = (e) => handleKey(e, index, item);
    input.onpaste = (e) => handlePaste(e, index, item);

    const noteInput = document.createElement('textarea');
    noteInput.className = 'item-note';
    noteInput.dataset.id = item.id;
    noteInput.classList.add('hidden');
    noteInput.value = item.note || '';
    noteInput.placeholder = '詳細を追加...';
    noteInput.spellcheck = false;

    const noteDisplay = document.createElement('div');
    noteDisplay.className = 'item-note-display';
    if (!item.note) {
      noteDisplay.classList.add('hidden');
    } else {
      const text = item.note || '';
      noteDisplay.textContent = text.length > 15 ? text.substring(0, 15) + '...' : text;
    }

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
      if (createdAtLabel.title) row.title = createdAtLabel.title;
      else row.removeAttribute('title');
      autoResize(e.target);
      renderNoteLinks(linkContainer, e.target.value);
    };

    noteInput.onkeydown = (e) => handleNoteKey(e, index, item);
    noteInput.onblur = () => {
      const text = noteInput.value.trim();
      if (!text) {
        noteInput.classList.add('hidden');
        noteDisplay.classList.add('hidden');
        linkContainer.style.display = 'none';
        item.note = '';
      } else {
        noteDisplay.textContent = text.length > 15 ? text.substring(0, 15) + '...' : text;
        noteInput.classList.add('hidden');
        noteDisplay.classList.remove('hidden');
      }
      saveData();
    };

    const actions = document.createElement('div');
    actions.className = 'row-actions';

    const btnCheck = document.createElement('div');
    btnCheck.className = 'action-icon check';
    btnCheck.setAttribute('role', 'button');
    btnCheck.tabIndex = 0;
    btnCheck.setAttribute('aria-label', '完了');
    setIcon(btnCheck, 'check');
    btnCheck.title = '完了';
    const completeCurrentItem = (e) => {
      e.stopPropagation();
      completeItem(index);
    };
    btnCheck.onclick = completeCurrentItem;
    btnCheck.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        completeCurrentItem(e);
      }
    };

    const createdAtLabel = document.createElement('span');
    createdAtLabel.className = 'created-at-label';
    updateItemTimestampLabel(createdAtLabel, item);
    // Timestamp is secondary metadata: expose it via the row's native tooltip
    // instead of consuming horizontal editing space.
    if (createdAtLabel.title) row.title = createdAtLabel.title;

    actions.appendChild(createdAtLabel);
    actions.appendChild(btnCheck);

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
    
    fragment.appendChild(row);
    inputsToResize.push(input);
    if (!noteInput.classList.contains('hidden')) inputsToResize.push(noteInput);
  });

  editor.appendChild(fragment);
  inputsToResize.forEach(autoResize);
}
