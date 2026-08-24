# MemoTool — Architecture Baseline

Baseline: **v2.3.0**  
Updated: **2026-08-25**

## Runtime composition

- `background.js`: Side Panel/action/context-menu integration, instance coordination and `Alt+A` open/close/focus handshake.
- `sidepanel.html`: explicit script/style composition; no wrapper/bootstrap layer. The persistent top surface is the tab-first Quiet Shell.
- `sidepanel.js`: app state, load/save lifecycle, history, completed-archive adapter and initialization.
- `outliner-structure.js`: DOM-free structural invariants for active/completed ordering, subtree boundaries and child detection.
- `save-state.js`: DOM-free save snapshot identity (`tabs + activeTabId`) and stale-write detection.
- `sidepanel-tabs.js`: tab lifecycle and tab UI mechanics. Switching active tabs is a persisted state change.
- `sidepanel-render.js`: editor rendering.
- `sidepanel-input.js`: editing and keyboard structure operations.
- `sidepanel-meta.js`: completion, star sorting and item metadata operations.
- `sidepanel-selection.js`: multi-selection state/commands.
- `sidepanel-ui.js`: menus, fold action and storage-listener UI coordination.
- `sidepanel-model.js`: model normalization/factories.
- `sidepanel-runtime.js`: serialized 180ms-debounced persistence coordinator, visibility/pagehide flush and save-state transitions.
- `sidepanel-focus.js`: session caret/focus persistence and shortcut restoration.
- `sidepanel-accessibility.js`: accessibility-specific behavior.
- `sidepanel-shell.css`: final persistent top-chrome presentation: tab-first layout, contextual utilities and width-aware density.
- `sidepanel-shell.js`: thin shell adaptation layer. It may re-present instance warning and outliner-only utility visibility, but does not own storage, memo content, tab CRUD or outliner structure.

## Data model

The canonical outliner representation remains `items[] + depth`, not nested objects. Completed items are a trailing archive within the same array. This keeps persistence/migration simple while `outliner-structure.js` centralizes structural interpretation.

## Save boundary

Save Confidence is intentionally split by responsibility:

- `sidepanel.js` owns global mutable state and the dirty flag.
- `sidepanel-tabs.js` declares tab activation as a mutation that must be persisted.
- `save-state.js` owns pure snapshot creation/comparison and has no DOM or Chrome API dependency.
- `sidepanel-runtime.js` owns debounce, serialized writes, stale-write detection, retryable error state and best-effort lifecycle flushes.
- `sidepanel-components.css` owns the save-status component presentation.

A completed write only clears dirty when the current `tabs + activeTabId` still match the snapshot that was written. This prevents an older in-flight write from erasing knowledge of newer input or navigation.

## Shell boundary

The Shell is intentionally smaller than the application:

- **owns:** persistent top chrome, contextual visibility of shell controls, top-shell responsive behavior;
- **does not own:** memo data, persistence, editing, tab mutation, structural movement, completion or history.

`sidepanel-shell.js` is an adaptation boundary for the mature global-script codebase, not a new framework or state owner. If future feature modules expose explicit APIs, shell adaptations can move to those APIs without changing the product contract.

## Change rule

- Pure structure rules: `outliner-structure.js` + Node tests.
- Pure save snapshot rules: `save-state.js` + Node tests.
- Persistent shell presentation: `sidepanel-shell.css/js` + static shell contract test.
- DOM rendering: renderer/UI modules.
- Save/state ownership: global dirty state in `sidepanel.js`, mutation declaration at the owning feature, serialized persistence in `sidepanel-runtime.js`.
- Browser user-gesture lifecycle: `background.js`.
- Do not centralize browser-context behavior merely for DRYness.
- Do not place feature logic in the Shell merely because its control is visible there.
