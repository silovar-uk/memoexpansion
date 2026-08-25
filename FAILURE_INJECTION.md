# MemoTool Failure Injection Check

Target baseline: **v2.5.0 Intent & Reliability Coherence**

Purpose: verify in real Chrome that malformed persisted tab data is treated as a protected recovery state rather than a normal empty workspace.

## Safety rule

Do not inject failure until a restorable copy of the current storage exists.

Open the Side Panel DevTools console and run:

```js
const memoFailureBackup = await chrome.storage.local.get(['tabs', 'activeTabId', 'showLineNumbers']);
console.log('MemoTool backup captured', memoFailureBackup);
```

Keep this DevTools session open until the test is finished.

Optional extra copy to the clipboard:

```js
copy(JSON.stringify(memoFailureBackup, null, 2));
```

## Scenario A — malformed persisted JSON

### 1. Inject failure

```js
await chrome.storage.local.set({ tabs: '{broken' });
```

Do not type or create a new memo after this command.

### 2. Close and reopen the Side Panel

Expected:

- the malformed value is not replaced by `[]`;
- no automatic default memo is created;
- Footer shows `読込エラー`;
- a small `再試行` action is visible;
- normal memo creation remains blocked while recovery is active.

### 3. Verify write containment

In the reopened Side Panel DevTools console:

```js
const injected = await chrome.storage.local.get(['tabs']);
console.log(injected.tabs);
```

Expected exact value:

```text
{broken
```

If the value changed to valid JSON, `[]`, or a newly created memo array, record the test as **FAIL — storage overwrite** and restore immediately.

## Scenario B — recovery after storage becomes valid

### 1. Restore the backup without reloading the panel

Use the backup captured before injection:

```js
await chrome.storage.local.set(memoFailureBackup);
```

If the DevTools context was lost, paste the previously copied JSON into a variable first and restore it with `chrome.storage.local.set(...)`.

### 2. Press `再試行`

Expected:

- `読込エラー` clears;
- `再試行` disappears;
- previous tabs return;
- previous active tab returns when its ID is still valid;
- no extra default memo is created;
- unchanged recovered data is not immediately rewritten merely because it was recovered.

## Scenario C — invalid activeTabId only

This scenario should recover automatically without entering protected load failure.

```js
const activeBackup = await chrome.storage.local.get(['activeTabId']);
await chrome.storage.local.set({ activeTabId: '__missing-tab__' });
```

Close and reopen the Side Panel.

Expected:

- stored tab JSON remains usable;
- MemoTool selects the first usable tab rather than presenting a broken current context;
- the app remains editable.

Restore afterwards:

```js
await chrome.storage.local.set(activeBackup);
```

## Pass criteria

The manual browser check passes only if all of the following are true:

1. malformed `tabs` does not become an ordinary empty workspace;
2. malformed `tabs` is not overwritten during startup;
3. recovery state is visible but quiet;
4. new/default memo creation is blocked during protected recovery;
5. restoring valid storage + `再試行` returns the UI to an editable state;
6. the recovery action disappears after success;
7. normal data is not rewritten solely because recovery succeeded.

## Stop conditions

Stop the test and restore immediately if:

- `tabs` changes after failure injection before you restore it;
- the Side Panel creates a new memo while `tabs` is malformed;
- recovery cannot be exited after valid data is restored;
- an unexpected save occurs that changes the backup data.

## What this test does not prove

This check does not simulate disk corruption, Chrome profile corruption, OS-level I/O failure, or extension-update migration failure. It verifies the MemoTool behavior around malformed or temporarily unreadable persisted tab state and its recovery UI.
