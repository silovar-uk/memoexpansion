(() => {
  'use strict';
  const core = window.MemoTypographyCore;
  const STORAGE_KEY = 'memoViewPreferences';
  let preferences = core.normalize(null);
  let pendingWrites = 0;
  let writeQueue = Promise.resolve();

  function getPreferences() { return { ...preferences }; }

  function updateControls() {
    const size = document.getElementById('typography-size');
    const minus = document.getElementById('typography-decrease');
    const plus = document.getElementById('typography-increase');
    const compact = document.getElementById('typography-compact');
    const wrap = document.getElementById('typography-wrap');
    if (size) size.textContent = preferences.fontSize + 'px';
    if (minus) minus.disabled = preferences.fontSize <= core.MIN;
    if (plus) plus.disabled = preferences.fontSize >= core.MAX;
    if (compact) compact.setAttribute('aria-pressed', String(preferences.outlinerLayout === 'compact'));
    if (wrap) wrap.setAttribute('aria-pressed', String(preferences.outlinerLayout === 'wrap'));
  }

  function apply(next) {
    preferences = core.normalize(next);
    const root = document.documentElement;
    root.style.setProperty('--memo-font-size', preferences.fontSize + 'px');
    root.style.setProperty('--memo-note-font-size', Math.max(12, preferences.fontSize - 2) + 'px');
    root.style.setProperty('--memo-outliner-line-height', Math.max(24, Math.ceil(preferences.fontSize * 1.55)) + 'px');
    root.dataset.memoLayout = preferences.outlinerLayout;
    // Preserve existing textarea nodes to avoid changing the caret or IME composition.
    document.querySelectorAll('.item-input').forEach(input => autoResize(input));
    document.querySelectorAll('.item-note:not(.hidden)').forEach(input => autoResize(input));
    updateControls();
  }

  function change(next) {
    const desired = core.normalize(next);
    if (desired.fontSize === preferences.fontSize && desired.outlinerLayout === preferences.outlinerLayout) return;
    apply(desired);
    const status = document.getElementById('typography-status');
    if (status) status.textContent = '';
    // Serialize rapid changes so stale values cannot win a write race.
    pendingWrites += 1;
    writeQueue = writeQueue.catch(() => {}).then(() => chrome.storage.local.set({ [STORAGE_KEY]: desired }))
      .catch(error => {
        console.error('Failed to save view preferences:', error);
        if (status) status.textContent = '表示設定の保存に失敗しました';
      })
      .finally(() => { pendingWrites -= 1; });
  }

  window.MemoTypography = { getPreferences };

  document.addEventListener('DOMContentLoaded', async () => {
    const trigger = document.getElementById('btn-typography');
    const panel = document.getElementById('typography-popover');
    const status = document.getElementById('typography-status');
    if (!trigger || !panel) return;
    const isOpen = () => !panel.hidden;
    function closePanel(restoreTrigger = false) {
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (restoreTrigger) trigger.focus({ preventScroll: true });
    }
    function openPanel(keyboard = false) {
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      updateControls();
      if (keyboard) document.getElementById('typography-decrease')?.focus({ preventScroll: true });
    }

    trigger.addEventListener('click', event => {
      if (isOpen()) closePanel();
      else openPanel(event.detail === 0);
    });
    document.getElementById('typography-close')?.addEventListener('click', () => closePanel(true));
    document.getElementById('typography-decrease')?.addEventListener('click', () => change(core.adjust(preferences, -core.STEP)));
    document.getElementById('typography-increase')?.addEventListener('click', () => change(core.adjust(preferences, core.STEP)));
    document.getElementById('typography-compact')?.addEventListener('click', () => change({ ...preferences, outlinerLayout: 'compact' }));
    document.getElementById('typography-wrap')?.addEventListener('click', () => change({ ...preferences, outlinerLayout: 'wrap' }));
    document.getElementById('typography-reset')?.addEventListener('click', () => change(core.DEFAULT));
    document.addEventListener('pointerdown', event => {
      if (isOpen() && !panel.contains(event.target) && !trigger.contains(event.target)) closePanel();
    });
    document.addEventListener('keydown', event => {
      if (isOpen() && event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closePanel(true);
      }
    }, true);

    trigger.disabled = true;
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      apply(result[STORAGE_KEY]);
    } catch (error) {
      console.error('Failed to load view preferences:', error);
      apply(core.DEFAULT);
      if (status) status.textContent = '表示設定を読み込めませんでした';
    } finally {
      trigger.disabled = false;
    }
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes[STORAGE_KEY] || pendingWrites > 0) return;
      apply(changes[STORAGE_KEY].newValue);
    });
  }, { once: true });
})();
