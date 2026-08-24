# MemoTool — CSS Ownership Map

Baseline: **v2.2.0**  
Updated: **2026-08-25**

The UI is split by responsibility. A selector should have one long-term owner. `sidepanel-maintenance.css` remains a refinement/migration layer, not a permanent dumping ground.

## `sidepanel-shell.css`

Owns the persistent top chrome introduced in v2.2.0:
- tab-first shell layout;
- top-shell spacing and density;
- stable tab presentation while inside the shell;
- left/right tab scroll controls;
- contextual utility group beside tabs;
- contextual instance warning presentation;
- narrow-width shell adaptation.

`sidepanel-shell.css` loads after the older refinement layer because it is the explicit owner of the final top-shell presentation, not an experimental polish layer.

## `sidepanel-base.css`

Owns:
- page/canvas layout;
- global button baseline;
- generic typography primitives.

The old header/status selectors are now legacy CSS because the dedicated header row was removed in v2.2.0. They may be deleted in a later cleanup-only release after regression coverage confirms no hidden dependency.

## `sidepanel-tabs.css`

Owns:
- tab-strip mechanics;
- tab scrolling behavior;
- rename field;
- close/new-tab mechanics;
- new-tab mode menu positioning defaults.

Final persistent shell geometry is allowed to be specialized by `sidepanel-shell.css`. Do not add another broad tab override layer.

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

Note: save-status styles currently exist without mounted `#save-status` markup. That is a product/system gap, not a reason to add more CSS.

## `sidepanel-maintenance.css`

Current role: **cross-cutting refinement layer inherited from v2.1.6**.

It contains accepted visual language such as:
- neutral selection/focus;
- timestamp overlap fix;
- neutral menus and selection command bar;
- footer refinement;
- narrow-width adjustments.

Some historical tab/header rules are now superseded by the explicit `sidepanel-shell.css` owner.

Rules:
1. Do not add a new broad visual theme here by default.
2. When a rule has remained stable for multiple releases, move it to its owning CSS file in a dedicated low-risk change.
3. Do not migrate tabs, rows and footer in one release.
4. After migration, delete duplicate maintenance rules rather than accumulating override pairs.
5. Visual behavior must remain unchanged during ownership-only migration.

## Ownership migration order after v2.2.0

Recommended:
1. remove dead legacy header/status CSS after confirming Quiet Shell stability;
2. promote row/action overlap + selection -> `sidepanel-editor.css`;
3. consolidate reusable line-number/footer utilities -> `sidepanel-components.css`;
4. prune superseded tab rules from `sidepanel-maintenance.css` only after the shell has survived at least one release.
