# MemoTool — CSS Ownership Map

Baseline: **v2.4.0**  
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
- outliner row geometry;
- fold/guide structure;
- item text/note/link presentation;
- row action geometry;
- selection bar and primary editor action geometry;
- text/editor background variants.

The v2.1.6 overlap fix and neutral selection language remain accepted behavior and should eventually be promoted here after visual regression coverage exists.

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

Some historical tab/header rules are superseded by the explicit `sidepanel-shell.css` owner.

Rules:
1. Do not add a new broad visual theme here by default.
2. When a rule has remained stable for multiple releases, move it to its owning CSS file in a dedicated low-risk change.
3. Do not migrate tabs, rows and footer in one release.
4. After migration, delete duplicate maintenance rules rather than accumulating override pairs.
5. Visual behavior must remain unchanged during ownership-only migration.

## Ownership migration order after v2.4.0

Recommended:
1. remove dead legacy header/status CSS after confirming Quiet Shell stability;
2. promote row/action overlap + selection -> `sidepanel-editor.css`;
3. consolidate remaining reusable line-number/footer utilities -> `sidepanel-components.css` without changing Save Confidence behavior;
4. prune superseded tab rules from `sidepanel-maintenance.css` only after the shell has survived multiple releases;
5. keep Navigation Confidence isolated until actual usage shows whether it deserves broader workspace navigation behavior.
