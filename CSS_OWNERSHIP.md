# MemoTool — CSS Ownership Map

Baseline: **v2.4.1**  
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
- stable tab presentation while inside the shell;
- left/right tab scroll controls;
- contextual utility group beside tabs, including the persistent search trigger;
- contextual instance warning presentation;
- narrow-width shell adaptation.

`sidepanel-shell.css` loads after the older refinement layer because it is the explicit owner of the final top-shell presentation, not an experimental polish layer.

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

Final persistent shell geometry is allowed to be specialized by `sidepanel-shell.css`. Quick Switch must not become a second owner of tab geometry.

## `sidepanel-editor.css`

Owns:
- editor viewport;
- Quiet Text Canvas presentation and Text Mode scrolling;
- Text Mode wrapping, focus cue, selection color and textarea scrollbar styling;
- outliner row geometry;
- fold/guide structure;
- item text/note/link presentation;
- row action geometry;
- selection bar and primary editor action geometry;
- text/editor background variants.

Quiet Text Canvas contract in v2.4.1:
- Text Mode wraps within Side Panel width using `pre-wrap` + `overflow-wrap:anywhere` rather than depending on horizontal scrolling;
- `.text-editor-area` owns vertical scrolling while the surrounding `#editor` suppresses a competing scroll surface in Text Mode;
- vertical scrollbar styling remains thin and neutral, while the horizontal scrollbar is not part of normal Text Mode interaction;
- Text Mode focus uses a low-contrast neutral cue rather than the inherited dark 2px perimeter;
- selection, caret and placeholder colors remain subordinate to body text;
- rules remain scoped to `.text-editor-area` so Outliner input behavior is unchanged.

The legacy `.text-editor-area:focus-visible` declaration still exists in `sidepanel-maintenance.css` during this patch release. The higher-specificity owner rule in `sidepanel-editor.css` deliberately supersedes it. Remove the inert legacy declaration in a cleanup-only release rather than mixing broad maintenance-file surgery into this UI patch.

The v2.1.6 overlap fix and neutral Outliner selection language remain accepted behavior and should eventually be promoted here after visual regression coverage exists.

## `sidepanel-components.css`

Owns reusable secondary components, including footer/icon controls, save-status styling, line-number/jump UI and other self-contained utilities that are not part of core row/tab mechanics.

Save Confidence contract in v2.3.0:
- `.save-status` keeps a fixed 66px footprint so state changes never shift footer controls;
- `saved` is visually hidden because healthy persistence is the quiet steady state;
- `dirty`, `saving`, `error`, and transient feedback are visible;
- error styling remains persistent until a later save attempt changes state;
- Shell or Navigation CSS must not redefine save-state semantics.

## `sidepanel-maintenance.css`

Current role: **cross-cutting refinement layer inherited from v2.1.6**.

It contains accepted visual language such as:
- neutral selection/focus;
- timestamp overlap fix;
- neutral menus and selection command bar;
- footer refinement;
- narrow-width adjustments.

Some historical tab/header rules are superseded by the explicit `sidepanel-shell.css` owner. Its old Text Mode focus declaration is also superseded by the v2.4.1 `sidepanel-editor.css` owner and should not receive further Text Canvas changes.

Rules:
1. Do not add a new broad visual theme here by default.
2. When a rule has remained stable for multiple releases, move it to its owning CSS file in a dedicated low-risk change.
3. Do not migrate tabs, rows and footer in one release.
4. After migration, delete duplicate maintenance rules rather than accumulating override pairs.
5. Visual behavior must remain unchanged during ownership-only migration.

## Ownership migration order after v2.4.1

Recommended:
1. remove the inert legacy Text Mode focus declaration from `sidepanel-maintenance.css` after v2.4.1 visual verification;
2. remove dead legacy header/status CSS after confirming Quiet Shell stability;
3. promote row/action overlap + selection -> `sidepanel-editor.css`;
4. consolidate remaining reusable line-number/footer utilities -> `sidepanel-components.css` without changing Save Confidence behavior;
5. prune superseded tab rules from `sidepanel-maintenance.css` only after the shell has survived multiple releases;
6. keep Navigation Confidence isolated until actual usage shows whether it deserves broader workspace navigation behavior.
