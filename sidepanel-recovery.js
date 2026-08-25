(() => {
  'use strict';

  const recoveryState = window.MemoRecoveryState;
  const maintenance = window.MemoMaintenance || (window.MemoMaintenance = {});
  if (!recoveryState) return;

  let storageRecoveryBlocked = false;
  let lastLoadFailureReason = null;
  let recoveryButton = null;
  let retryInFlight = false;
  let lastRetryFailed = false;

  const baseUpdateSaveStatus = typeof updateSaveStatus === 'function' ? updateSaveStatus : null;
  const baseLoadData = typeof loadData === 'function' ? loadData : null;
  const baseMigrateLegacyData = typeof migrateLegacyData === 'function' ? migrateLegacyData : null;
  const baseCreateNewTab = typeof createNewTab === 'function' ? createNewTab : null;

  function ensureRecoveryButton() {
    if (recoveryButton?.isConnected) return recoveryButton;
    const footerRight = document.querySelector('footer .footer-right');
    if (!footerRight) return null;

    recoveryButton = document.createElement('button');
    recoveryButton.id = 'btn-storage-retry';
    recoveryButton.className = 'storage-retry-btn';
    recoveryButton.type = 'button';
    recoveryButton.textContent = '再試行';
    recoveryButton.hidden = true;
    recoveryButton.setAttribute('aria-label', '保存処理を再試行');
    footerRight.insertBefore(recoveryButton, footerRight.firstChild);
    recoveryButton.addEventListener('click', retryStorageOperation);
    return recoveryButton;
  }

  function syncRecoveryUI(state) {
    const button = ensureRecoveryButton();
    const status = document.getElementById('save-status');
    const loadFailure = storageRecoveryBlocked;
    const saveFailure = (state === 'error' || lastRetryFailed) && !loadFailure;

    if (button) {
      button.hidden = !(loadFailure || saveFailure);
      button.disabled = retryInFlight;
      button.textContent = retryInFlight ? '再試行中…' : '再試行';
      button.setAttribute('aria-label', loadFailure ? '保存データを再読み込み' : '保存処理を再試行');
      button.title = loadFailure
        ? '既存データを上書きせず、保存領域をもう一度読み込みます'
        : '未保存の内容をもう一度保存します';
    }

    if (status) {
      if (loadFailure) {
        status.title = '保存データを読み込めないため、既存データを保護して保存を停止しています';
      } else if (saveFailure) {
        status.title = '保存に失敗しました。未保存内容はこの画面に残っています';
      } else {
        status.removeAttribute('title');
      }
    }
  }

  if (baseUpdateSaveStatus) {
    updateSaveStatus = function recoveryAwareSaveStatus(state = 'saved', customText = null) {
      if (storageRecoveryBlocked) {
        baseUpdateSaveStatus('error', '読込エラー');
        syncRecoveryUI('error');
        return;
      }
      if (state !== 'error') lastRetryFailed = false;
      baseUpdateSaveStatus(state, customText);
      syncRecoveryUI(state);
    };
  }

  async function inspectStoredTabs() {
    try {
      const result = await chrome.storage.local.get(['tabs']);
      return recoveryState.parseStoredTabs(result.tabs);
    } catch (_) {
      return { status: 'invalid', tabs: [], reason: 'storage-read-failed' };
    }
  }

  if (baseLoadData) {
    loadData = async function guardedLoadData(...args) {
      const inspection = await inspectStoredTabs();
      storageRecoveryBlocked = recoveryState.shouldBlockWrites(inspection.status);
      lastLoadFailureReason = storageRecoveryBlocked ? inspection.reason : null;

      if (storageRecoveryBlocked) {
        tabs = [];
        activeTabId = null;
        isDirty = false;
        updateSaveStatus('error', '読込エラー');
        return false;
      }

      const result = await baseLoadData.apply(this, args);
      maintenance.normalizeState?.();
      return result === false ? false : true;
    };
  }

  if (baseMigrateLegacyData) {
    migrateLegacyData = async function guardedLegacyMigration(...args) {
      if (storageRecoveryBlocked) return false;
      return baseMigrateLegacyData.apply(this, args);
    };
  }

  if (baseCreateNewTab) {
    createNewTab = function guardedCreateNewTab(...args) {
      if (storageRecoveryBlocked) {
        updateSaveStatus('error', '読込エラー');
        return null;
      }
      return baseCreateNewTab.apply(this, args);
    };
  }

  async function retryStorageOperation() {
    if (retryInFlight) return;
    retryInFlight = true;
    lastRetryFailed = false;
    syncRecoveryUI(storageRecoveryBlocked ? 'error' : (isDirty ? 'error' : 'saved'));

    try {
      if (storageRecoveryBlocked) {
        const inspection = await inspectStoredTabs();
        if (recoveryState.shouldBlockWrites(inspection.status)) {
          lastLoadFailureReason = inspection.reason;
          updateSaveStatus('error', '読込エラー');
          return;
        }

        storageRecoveryBlocked = false;
        lastLoadFailureReason = null;
        await loadData();
        await migrateLegacyData();

        const resolvedActiveTabId = recoveryState.resolveActiveTabId(tabs, activeTabId);
        if (resolvedActiveTabId !== activeTabId) {
          activeTabId = resolvedActiveTabId;
          if (activeTabId) markAsDirty();
        }

        if (tabs.length === 0) {
          createNewTab('outliner');
        } else {
          renderTabs();
          renderEditor();
          updateUndoButtons();
          updateSortButtonVisibility();
          if (isDirty) saveData();
        }
        updateSaveStatus(isDirty ? 'dirty' : 'saved');
        return;
      }

      if (isDirty) {
        if (typeof maintenance.flushSaveData === 'function') {
          await maintenance.flushSaveData();
        } else {
          await saveData();
        }
      }
      updateSaveStatus(isDirty ? 'dirty' : 'saved');
    } catch (error) {
      lastRetryFailed = true;
      console.error('Storage recovery retry failed:', error);
      if (baseUpdateSaveStatus) baseUpdateSaveStatus('error');
    } finally {
      retryInFlight = false;
      syncRecoveryUI(storageRecoveryBlocked || lastRetryFailed ? 'error' : (isDirty ? 'dirty' : 'saved'));
    }
  }

  maintenance.isStorageRecoveryBlocked = () => storageRecoveryBlocked;
  maintenance.getStorageRecoveryState = () => ({
    blocked: storageRecoveryBlocked,
    reason: lastLoadFailureReason,
    retryInFlight,
    lastRetryFailed
  });
  maintenance.retryStorageOperation = retryStorageOperation;

  ensureRecoveryButton();
})();
