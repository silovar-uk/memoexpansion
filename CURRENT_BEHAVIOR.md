# MemoTool — Current Behavior Contract

Baseline: **v2.2.0**  
Canonical behavior source: **v2.1.7 behavior contract + v2.2.0 Quiet Shell presentation decision**  
Updated: **2026-08-25**

This file is a regression contract. Refactors may reorganize code, but must not change the behaviors below unless a later product decision explicitly updates this contract.

## Side Panel lifecycle

- Chrome action opens the Side Panel using Chrome's standard Side Panel behavior.
- `Alt+A` is the dedicated `open-memo-panel` command.
- `Alt+A`: closed -> open; open -> close.
- `chrome.sidePanel.open()` must be started inside the original eligible command/user-gesture turn. Do not insert an `await` before it.
- When opening through `Alt+A`, the panel returns to the current memo and attempts to restore the last caret/selection position.
- If there is no existing memo, `Alt+A` does not create a memo merely because the panel was opened.
- Caret state is session-only and may be discarded safely; memo content remains the source of truth in local storage.

## Quiet Shell

- The dedicated `memo tool / 起動中` header row is no longer persistent UI.
- The tab strip is the topmost persistent navigation surface.
- Line-number toggle, star sort and new-tab controls live beside the tab strip as contextual utilities.
- Line-number toggle and star sort are visible only while an outliner tab is active.
- Single-instance state is visually silent.
- Multiple Side Panel instances are surfaced only when the background reports two or more connected panels.
- `sidepanel-shell.css` owns persistent top-chrome presentation.
- `sidepanel-shell.js` may adapt existing global shell functions but must not own memo content, storage mutation, tab CRUD or outliner structure.

## Tabs

- Tabs retain their existing IDs, titles, mode, order, colors/background metadata and active-tab behavior.
- New tabs may be created in text or outliner mode through the existing UI.
- Tab rename, close, reorder and mode switching remain available.
- `activeTabId` identifies the current tab and is persisted with memo state.

## Outliner model

The persisted representation is a flat array with `depth`; it is intentionally not a nested tree object.

Invariants:

- Parent/child structure is defined by contiguous active items and their `depth` values.
- A subtree starts at one active item and continues through following active items whose depth is greater than the root depth.
- Completed items are outside the active tree.
- Completed items are stored as a stable archive at the end of the item array: active items first, completed items second.
- A completed item must not behave as an invisible sibling between visible rows.
- Folding eligibility is determined from active descendants only.
- Moving a parent up/down moves its active subtree as one block.
- Completing a parent completes its subtree using the existing completion flow.
- If completion leaves no active rows, the existing empty-row fallback remains available.
- Star sorting applies to the active tree; completed items remain in the completed archive.

Pure structural ownership lives in `outliner-structure.js`.

## Editing

- Outliner rows remain single-line-first editing surfaces.
- Focused row text uses the normal editing font size; non-focused long text may shrink only to the current readable lower bound.
- Enter / indent / outdent / keyboard movement retain their existing behavior.
- Item note, recognized note links, colors and star metadata remain attached to the item when it moves.
- Line-number jump and optional line numbers remain available.
- Full-memo copy remains available in the footer.

## Selection and focus

- Row selection is separate from keyboard focus.
- Multi-selection remains available through the current pointer interaction.
- Selection commands remain `解除` and `移動` in the current UI.
- Keyboard focus must remain visibly identifiable even though the visual language is neutral rather than blue.

## Undo / redo

- Existing history behavior remains available for supported memo mutations.
- Structural refactors must not silently bypass the existing `pushHistory()` boundaries.

## Persistence

- Memo state is stored in `chrome.storage.local` using the existing `tabs`, `activeTabId` and related keys.
- Local rendering may mark state dirty before persistence.
- Save paths normalize the completed archive before writing.
- External storage updates must not blindly replace locally dirty or actively edited state.
- Context-menu capture inserts a new active outliner item before the completed archive.
- Save-state functions and styles exist, but v2.2.0 does **not** mount a persistent `#save-status` element in the Side Panel. Do not treat visual save confirmation as an existing user-facing contract until it is deliberately restored or redesigned.

## Compatibility rule

Do not change storage keys, item schema, tab schema, shortcut names or command ownership without an explicit migration plan.
