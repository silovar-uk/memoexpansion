# MemoTool — Architecture Baseline

Baseline: **v2.5.0**  
Updated: **2026-08-26**

## Runtime composition

- `background.js`: Side Panel/action/context-menu integration, instance coordination and `Alt+A` open/close/focus handshake.
- `sidepanel.html`: explicit script/style composition; no wrapper/bootstrap layer. The persistent top surface is the tab-first Quiet Shell.
- `sidepanel.js`: app state, load/save lifecycle, history, completed-archive adapter and initialization.
- `outliner-structure.js`: DOM-free structural invariants for active/completed ordering, subtree boundaries and child detection.
- `recovery-state.js`: DOM-free storage-load classification and active-tab recovery decisions.
- `save-state.js`: DOM-free save snapshot identity (`tabs + activeTabId`) and stale-write detection.
- `tab-navigation-core.js`: DOM-free tab-title normalization, filtering and result-index movement for Quick Switch.
- `sidepanel-tabs.js`: tab lifecycle and tab UI mechanics. Switching active tabs is a persisted state change.
- `sidepanel-render.js`: editor rendering.
- `sidepanel-input.js`: editing and keyboard structure operations.
- `sidepanel-meta.js`: completion, star sorting and item metadata operations.
- `sidepanel-selection.js`: multi-selection state/commands.
- `sidepanel-ui.js`: menus, fold action and storage-listener UI coordination; new-tab menu keyboard/open-close continuity remains here.
- `sidepanel-model.js`: model normalization/factories.
- `sidepanel-recovery.js`: failure-only storage recovery adaptation. It preflights persisted tabs before normal load, blocks default-tab creation / legacy migration when stored tabs are invalid, preserves the existing storage value, and exposes a retry path.
- `sidepanel-runtime.js`: serialized 180ms-debounced persistence coordinator, visibility/pagehide flush and save-state transitions.
- `sidepanel-focus.js`: session-only caret/focus/vertical-scroll continuity, shortcut restoration and thin wrappers around existing tab/new-tab transitions so focus logic is not duplicated by callers.
- `sidepanel-accessibility.js`: accessibility-specific behavior.
- `sidepanel-shell.css`: final persistent top-chrome presentation: tab-first layout, contextual utilities and width-aware density.
- `sidepanel-shell.js`: thin shell adaptation layer. It may re-present instance warning and outliner-only utility visibility, but does not own storage, memo content, tab CRUD or outliner structure.
- `sidepanel-navigation.js`: temporary Quick Switch DOM/event layer. It reads existing tabs and delegates changed-tab activation to `switchTab()`; it owns no persistence or duplicate focus-restoration path.
- `sidepanel-navigation.css`: Quick Switch surface presentation only.
- `sidepanel-recovery.css`: failure-only retry control presentation. Healthy state remains invisible.

## Data model

The canonical outliner representation remains `items[] + depth`, not nested objects. Completed items are a trailing archive within the same array. This keeps persistence/migration simple while `outliner-structure.js` centralizes structural interpretation.

Navigation Confidence adds **no persisted model**. It derives results from the current in-memory `tabs` array and keeps only temporary query/selection state while the switcher is open.

Interaction Precision adds **no local persisted model**. It extends the existing `memoCaretByTabId` session state with vertical `scrollTop` when available. That state is disposable across browser sessions and never becomes memo content.

Intent & Reliability Coherence also adds **no new persisted schema**. Recovery state is runtime-only; invalid persisted `tabs` is treated as a blocked-load condition rather than as an empty memo collection.

## Navigation boundary

Navigation Confidence is deliberately small:

- `tab-navigation-core.js` owns pure normalization/filter/result-index rules;
- `sidepanel-navigation.js` owns open/close, keyboard interaction and result rendering;
- existing `sidepanel-tabs.js` remains the owner of actual tab activation and persistence declaration;
- `sidepanel-focus.js` owns cross-transition focus/scroll continuity after an activation is delegated;
- no recent-tab history, ranking state or new local-storage key is introduced.

This keeps Quick Switch reversible and prevents a convenience feature from becoming a second tab-management system.

## Interaction continuity boundary

Interaction Precision is organized around one rule: feature owners perform the action; `sidepanel-focus.js` preserves editing context around actions that replace the editor DOM.

- Before `switchTab()` or `createNewTab()` replaces the editor DOM, MemoFocus snapshots the outgoing memo's caret state and vertical scroll position when available.
- After the transition, MemoFocus restores the incoming/new memo's remembered target and scroll position or uses the existing fallback editing target.
- Text Mode scroll continuity belongs to the textarea; Outliner scroll continuity belongs to `#editor`.
- `sidepanel-navigation.js` must not add its own changed-tab focus sequence; it delegates changed tabs to `switchTab()` and only directly focuses when the chosen result is already active.
- `sidepanel-ui.js` owns the new-tab mode menu's menu semantics, keyboard traversal and Escape focus return because those are menu interaction concerns, not tab CRUD.
- Mouse outside-click dismissal must not forcibly return focus to the trigger because the clicked destination becomes the new user context.

## Save boundary

Save Confidence is intentionally split by responsibility:

- `sidepanel.js` owns global mutable state and the dirty flag.
- `sidepanel-tabs.js` declares tab activation as a mutation that must be persisted.
- `save-state.js` owns pure snapshot creation/comparison and has no DOM or Chrome API dependency.
- `sidepanel-runtime.js` owns debounce, serialized writes, stale-write detection, retryable error state and best-effort lifecycle flushes.
- `sidepanel-components.css` owns the save-status component presentation.

A completed write only clears dirty when the current `tabs + activeTabId` still match the snapshot that was written. This prevents an older in-flight write from erasing knowledge of newer input or navigation.

## Recovery boundary

Recovery Confidence follows **Detect → Contain → Explain → Recover → Test**.

- `recovery-state.js` classifies stored tabs as `missing`, `ok`, or `invalid` without DOM or Chrome dependencies.
- `sidepanel-recovery.js` preflights `chrome.storage.local.tabs` before the normal loader runs.
- `missing` is a normal empty state and may proceed to default-tab creation.
- `invalid` is **not** interpreted as empty. Runtime enters a write-blocked recovery state, clears only in-memory presentation state, skips default-tab creation and legacy migration, and leaves the persisted value untouched.
- The footer exposes a retry control only while load/save recovery is actionable. Healthy state remains visually quiet.
- A retry re-reads storage before unblocking. It does not overwrite the invalid stored value just to make the application boot.
- No schema version, backup history, migration framework or second persistence store is introduced by v2.5.0.

## Shell boundary

The Shell is intentionally smaller than the application:

- **owns:** persistent top chrome, contextual visibility of shell controls, top-shell responsive behavior;
- **does not own:** memo data, persistence, editing, tab mutation, structural movement, completion, history or interaction-continuity state.

`sidepanel-shell.js` is an adaptation boundary for the mature global-script codebase, not a new framework or state owner. If future feature modules expose explicit APIs, shell adaptations can move to those APIs without changing the product contract.

## Change rule

- Pure structure rules: `outliner-structure.js` + Node tests.
- Pure recovery decisions: `recovery-state.js` + Node tests.
- Pure save snapshot rules: `save-state.js` + Node tests.
- Pure tab navigation rules: `tab-navigation-core.js` + Node tests.
- Persistent shell presentation: `sidepanel-shell.css/js` + static shell contract test.
- Quick Switch presentation: `sidepanel-navigation.css/js` + navigation contract test.
- Failure-only storage recovery: `sidepanel-recovery.js/css` + recovery contract test.
- Cross-tab/new-tab focus and vertical-scroll continuity: `sidepanel-focus.js` + Interaction Precision contract test.
- New-tab menu open/close/keyboard continuity: `sidepanel-ui.js` + Interaction Precision contract test.
- DOM rendering: renderer/UI modules.
- Save/state ownership: global dirty state in `sidepanel.js`, mutation declaration at the owning feature, serialized persistence in `sidepanel-runtime.js`.
- Browser user-gesture lifecycle: `background.js`.
- Do not centralize browser-context behavior merely for DRYness.
- Do not place feature logic in the Shell merely because its control is visible there.
- Do not add persisted navigation history until a real repeated-navigation problem justifies it.
- Do not add recovery storage layers until a concrete data-loss scenario requires them.
