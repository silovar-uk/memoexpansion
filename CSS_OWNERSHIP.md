# MemoTool — CSS Ownership Map

Baseline: **v2.4.3**  
Updated: **2026-08-25**

The UI is split by responsibility. A selector should have one long-term owner. `sidepanel-maintenance.css` remains a refinement/migration layer, not a permanent dumping ground.

## `sidepanel-navigation.css`

Owns the temporary Navigation Confidence surface introduced in v2.4.0:
- Quick Switch panel geometry;
- search field presentation;
- result row states;
- mode labels and empty state;
- narrow-width / coarse-pointer adaptation for the switcher.

It does **not** own the persistent tab bar. The search trigger button remains a normal Quiet Shell utility control and inherits its persistent geometry from `sidepanel-shell.css`.

## `sidepanel-shell.css`

Owns the persistent top chrome introduced in v2.2.0:
- tab-first shell layout;
- top-shell spacing and density;
- final persistent tab presentation;
- active/inactive tab visual states;
- left/right tab scroll controls;
- contextual utility group beside tabs, including the persistent search trigger;
- contextual instance warning presentation;
- narrow-width / coarse-pointer adaptation for shell controls.

`sidepanel-tabs.css` may still provide tab mechanics and baseline geometry, but generic shell presentation must not be redefined in `sidepanel-components.css` or `sidepanel-maintenance.css`.

## `sidepanel-base.css`

Owns:
- page/canvas layout;
- global button baseline;
- generic typography primitives.

The old header/status selectors are legacy CSS because the dedicated header row was removed in v2.2.0. They may be deleted in a later cleanup-only release after regression coverage confirms no hidden dependency.

## `sidepanel-tabs.css`

Owns:
- tab-strip mechanics;
- tab scrolling behavior;
- rename field;
- close/new-tab mechanics;
- new-tab mode menu positioning defaults.

Final persistent shell presentation belongs to `sidepanel-shell.css`.

## `sidepanel-editor.css`

Owns:
- editor viewport and remaining-height behavior;
- responsive editor padding and line-number padding;
- Quiet Text Canvas presentation and Text Mode scrolling;
- Text Mode wrapping, focus cue, selection color and textarea scrollbar styling;
- outliner row geometry baseline;
- fold/guide structure baseline;
- item text/note/link presentation baseline;
- row action geometry baseline;
- selection bar and primary editor action geometry baseline;
- text/editor background variants.

Quiet Text Canvas contract:
- Text Mode wraps within Side Panel width using `pre-wrap` + `overflow-wrap:anywhere` rather than depending on horizontal scrolling;
- `.text-editor-area` owns vertical scrolling while the surrounding `#editor` suppresses a competing scroll surface in Text Mode;
- vertical scrollbar styling remains thin and neutral, while the horizontal scrollbar is not part of normal Text Mode interaction;
- Text Mode focus uses a low-contrast neutral cue;
- selection, caret and placeholder colors remain subordinate to body text;
- rules remain scoped to `.text-editor-area` so Outliner input behavior is unchanged.

v2.4.3 ownership change:
- `#editor-container`, final `#editor` padding, responsive editor padding and Text Mode focus no longer depend on `sidepanel-maintenance.css` overrides;
- the old maintenance-layer dark Text Mode focus declaration was removed rather than overridden with higher specificity.

The v2.1.6 row/action overlap fix and neutral Outliner selection language remain accepted behavior in `sidepanel-maintenance.css` for now and should be promoted separately after visual regression coverage exists.

## `sidepanel-components.css`

Owns reusable secondary components, including:
- Footer layout and Cool Precision footer presentation;
- footer icon/copy controls;
- save-status styling;
- line-number/jump UI;
- other self-contained utilities that are not part of core row/tab mechanics.

Save Confidence contract:
- `.save-status` keeps a fixed 66px footprint so state changes never shift footer controls;
- `saved` is visually hidden because healthy persistence is the quiet steady state;
- `dirty`, `saving`, `error`, and transient feedback are visible;
- error styling remains persistent until a later save attempt changes state;
- Shell or Navigation CSS must not redefine save-state semantics.

v2.4.3 ownership change:
- the final Cool Precision footer background, border, compact geometry and hover treatment now live here;
- `sidepanel-maintenance.css` no longer restyles Footer presentation.

## `sidepanel-maintenance.css`

Current role: **cross-cutting refinement/migration layer inherited from v2.1.6**.

It still contains accepted visual language such as:
- design tokens currently used by the app;
- neutral Outliner row/selection refinements;
- row-action overlap fix and timestamp suppression;
- menu/selection-command refinements;
- shared keyboard focus treatment for non-Text-Canvas controls;
- narrow-width and reduced-motion refinements not yet promoted to final owners.

It no longer owns or overrides:
- editor viewport / editor padding;
- Text Mode focus;
- Footer presentation;
- persistent tab/Shell presentation.

Rules:
1. Do not add a new broad visual theme here by default.
2. When a rule has remained stable for multiple releases, move it to its owning CSS file in a dedicated low-risk change.
3. Do not migrate every remaining refinement in one release.
4. After migration, delete duplicate maintenance rules rather than accumulating override pairs.
5. Visual behavior must remain unchanged during ownership-only migration.

## UI architecture contract after v2.4.3

- Text Mode vertical scroll owner: `.text-editor-area`.
- Outliner vertical scroll owner: `#editor`.
- Tab strip horizontal navigation owner: tab strip mechanics in `sidepanel-tabs.css`, final persistent presentation in `sidepanel-shell.css`.
- Quick Switch result scroll owner: `sidepanel-navigation.css` surface.
- Footer final presentation owner: `sidepanel-components.css`.
- Text Mode focus owner: `sidepanel-editor.css`.

`tests/ui-architecture-contract.test.js` prevents these responsibilities from drifting back into the maintenance layer.

## Recommended next cleanup after v2.4.3

1. move stable Cool Precision/design tokens from `sidepanel-maintenance.css` to the base/design-token owner without changing values;
2. promote row/action overlap + neutral selection from maintenance -> `sidepanel-editor.css` in one dedicated release;
3. consolidate remaining line-number refinements into `sidepanel-components.css`;
4. remove dead header/status CSS after confirming no runtime dependency;
5. only after ownership is stable, perform a separate Micro Interaction Polish pass for hover/reveal/timing behavior.
