# MemoTool — Current Behavior Contract

Baseline: **v2.4.4**  
Canonical behavior source: **v2.1.7 behavior contract + v2.2.0 Quiet Shell + v2.3.0 Save Confidence + v2.4.0 Navigation Confidence + v2.4.1 Quiet Text Canvas + v2.4.4 Interaction Precision**  
Updated: **2026-08-25**

This file is a regression contract. Refactors may reorganize code, but must not change the behaviors below unless a later product decision explicitly updates this contract.

## Side Panel lifecycle

- Chrome action opens the Side Panel using Chrome's standard Side Panel behavior.
- `Alt+A` is the dedicated `open-memo-panel` command.
- `Alt+A`: closed -> open; open -> close.
- `chrome.sidePanel.open()` must be started inside the original eligible command/user-gesture turn. Do not insert an `await` before it.
- When opening through `Alt+A`, the panel returns to the current memo and attempts to restore the last caret/selection/scroll context.
- If there is no existing memo, `Alt+A` does not create a memo merely because the panel was opened.
- Caret and scroll context are session-only and may be discarded safely; memo content remains the source of truth in local storage.

## Quiet Shell

- The dedicated `memo tool / 起動中` header row is no longer persistent UI.
- The tab strip is the topmost persistent navigation surface.
- Line-number toggle, star sort, tab search and new-tab controls live beside the tab strip as compact utilities.
- Line-number toggle and star sort are visible only while an outliner tab is active.
- Tab search remains available for both outliner and text tabs.
- Single-instance state is visually silent.
- Multiple Side Panel instances are surfaced only when the background reports two or more connected panels.
- `sidepanel-shell.css` owns persistent top-chrome presentation.
- `sidepanel-shell.js` may adapt existing global shell functions but must not own memo content, storage mutation, tab CRUD or outliner structure.

## Navigation Confidence

- The tab-search button and `Alt+Q` open the same Quick Switch surface inside the Side Panel.
- Quick Switch searches existing tab titles using normalized substring matching; it does not use fuzzy ranking, AI search or usage history.
- Empty-query results preserve the existing tab order.
- When opening with an empty query, the current tab is selected if present.
- Arrow Up/Down moves the selected candidate, Enter activates it, and Escape closes the switcher.
- Activating a different candidate reuses the existing `switchTab()` behavior; focus restoration is owned by the shared MemoFocus continuity path rather than duplicated inside Quick Switch.
- Activating the already-current candidate closes Quick Switch and returns focus to the current memo.
- Quick Switch does not reorder tabs, mutate tab metadata, create storage keys or persist navigation history.
- `tab-navigation-core.js` owns DOM-free title normalization/filtering and result-index movement.
- `sidepanel-navigation.js` owns the temporary switcher UI only; it does not own tab CRUD or persistence.

## Interaction Precision

- Before an actual tab switch or new-tab creation replaces the editor DOM, MemoFocus captures the current memo's caret context and current vertical scroll position when available.
- Text Mode restores the textarea's vertical scroll position; Outliner restores the `#editor` vertical scroll position.
- Interaction continuity state remains in the existing `chrome.storage.session` caret map. v2.4.4 adds no `chrome.storage.local` key and no persistent navigation history.
- After switching to a different tab, focus returns to that tab's remembered editing target or the established fallback target.
- After creating a new memo, focus moves into that memo's writing/editing surface so the next action can be typing.
- New-tab mode choices expose menu/menuitem semantics for keyboard use.
- When the new-tab menu is opened from keyboard activation, focus enters the first mode choice; Arrow Up/Down moves between choices and Enter/Space activates the choice.
- Escape closes the new-tab menu and returns focus to the new-tab trigger.
- Clicking outside the new-tab menu closes it without forcibly stealing focus from the clicked destination.
- Interaction Precision must not introduce decorative animation, new layout chrome, new local-storage schema or a second tab-switch implementation.

## Quiet Text Canvas

- Text Mode is treated as a writing surface rather than a boxed form control.
- Normal text flow is vertical: text wraps to the available Side Panel width and does not rely on horizontal scrolling.
- Long URLs and long unbroken strings may break to preserve readable content inside the panel rather than creating horizontal overflow.
- The Text Mode textarea is the single vertical scrolling surface for the writing canvas; the surrounding editor viewport does not add a competing scrollbar.
- Vertical scrolling remains available. Its scrollbar is thin, neutral and secondary to the text; the horizontal scrollbar is not part of the normal Text Mode interaction.
- Mouse/text-entry focus must not surface a dark browser-style perimeter. Focus remains perceivable through a very low-contrast neutral cue.
- Text selection uses a neutral selection color rather than a bright application accent.
- Text Canvas rules are scoped to `.text-editor-area`; they must not alter Outliner `.item-input` or `.item-note` overflow/focus behavior.
- `sidepanel-editor.css` is the long-term owner of Text Canvas presentation.

## Tabs

- Tabs retain their existing IDs, titles, mode, order, colors/background metadata and active-tab behavior.
- New tabs may be created in text or outliner mode through the existing UI.
- Tab rename, close, reorder and mode switching remain available.
- `activeTabId` identifies the current tab and is persisted with memo state.
- Switching tabs is itself a persisted state change: `activeTabId` must mark the app dirty before a save is scheduled.
- Tab switching must preserve the outgoing memo's session-only focus/scroll context before rerender and restore the incoming memo context after rerender.

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
- `sidepanel-focus.js` owns session-only caret and vertical-scroll continuity across tab/new-memo transitions and shortcut restoration.

## Undo / redo

- Existing history behavior remains available for supported memo mutations.
- Structural refactors must not silently bypass the existing `pushHistory()` boundaries.

## Persistence / Save Confidence

- Memo state is stored in `chrome.storage.local` using the existing `tabs`, `activeTabId` and related keys.
- A save snapshot is the pair **serialized `tabs` + `activeTabId`**. Pure snapshot comparison lives in `save-state.js`.
- Local rendering may mark state dirty before persistence.
- Writes remain serialized through `sidepanel-runtime.js`.
- If memo content or `activeTabId` changes while a storage write is in flight, completion of that older write must not clear the newer dirty state; the newer snapshot is queued again.
- Save paths normalize the completed archive before writing.
- Storage write failure leaves the app dirty and exposes the error state so a later scheduled save can retry.
- `visibilitychange` and `pagehide` request an immediate best-effort flush when dirty; they supplement the normal 180ms debounce rather than replacing it.
- External storage updates must not blindly replace locally dirty or actively edited state.
- Context-menu capture inserts a new active outliner item before the completed archive.
- The footer mounts `#save-status`. The steady `saved` state is visually hidden; `dirty`, `saving`, `error`, and transient feedback states are visible without changing footer geometry.

## Compatibility rule

Do not change storage keys, item schema, tab schema, shortcut names or command ownership without an explicit migration plan.
