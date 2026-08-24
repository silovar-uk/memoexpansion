# MemoTool — Architecture Baseline

Baseline: **v2.1.7**  
Updated: **2026-08-24**

## Runtime composition

- `background.js`: Side Panel/action/context-menu integration, instance coordination and `Alt+A` open/close/focus handshake.
- `sidepanel.html`: explicit script/style composition; no wrapper/bootstrap layer.
- `sidepanel.js`: app state, load/save lifecycle, history, completed-archive adapter and initialization.
- `outliner-structure.js`: DOM-free structural invariants for active/completed ordering, subtree boundaries and child detection.
- `sidepanel-tabs.js`: tab lifecycle and tab UI.
- `sidepanel-render.js`: editor rendering.
- `sidepanel-input.js`: editing and keyboard structure operations.
- `sidepanel-meta.js`: completion, star sorting and item metadata operations.
- `sidepanel-selection.js`: multi-selection state/commands.
- `sidepanel-ui.js`: menus, fold action and storage-listener UI coordination.
- `sidepanel-model.js`: model normalization/factories.
- `sidepanel-runtime.js`: runtime-level utility behavior.
- `sidepanel-focus.js`: session caret/focus persistence and shortcut restoration.
- `sidepanel-accessibility.js`: accessibility-specific behavior.

## Data model

The canonical outliner representation remains `items[] + depth`, not nested objects. Completed items are a trailing archive within the same array. This keeps persistence/migration simple while `outliner-structure.js` centralizes structural interpretation.

## Change rule

- Pure structure rules: `outliner-structure.js` + Node tests.
- DOM rendering: renderer/UI modules.
- Save/state ownership: `sidepanel.js`.
- Browser user-gesture lifecycle: `background.js`.
- Do not centralize browser-context behavior merely for DRYness.
