# MemoTool — CSS Ownership Map

Baseline: **v2.1.7**  
Updated: **2026-08-24**

The current UI is intentionally split by responsibility. A selector should have one long-term owner. `sidepanel-maintenance.css` is a refinement/migration layer, not a permanent dumping ground.

## `sidepanel-base.css`

Owns:
- page/canvas layout;
- header and status-bar geometry;
- global button baseline;
- status and instance-warning structure.

Future Quiet Shell header work belongs here after its design is stable.

## `sidepanel-tabs.css`

Owns:
- tab-strip layout;
- tab size and active/inactive geometry;
- tab scrolling;
- rename field;
- close/new-tab controls;
- new-tab mode menu positioning.

Stable v2.1.6 tab refinements currently overridden from maintenance should eventually be promoted here one responsibility at a time.

## `sidepanel-editor.css`

Owns:
- editor viewport;
- outliner row geometry;
- fold/guide structure;
- item text/note/link presentation;
- row action geometry;
- selection bar and primary editor action geometry;
- text/editor background variants.

The v2.1.6 overlap fix and neutral selection language should eventually be promoted here after visual regression coverage exists.

## `sidepanel-components.css`

Owns reusable secondary components, including footer/icon controls, save status, line-number/jump UI and other self-contained utility components that are not part of the core row/tab geometry.

## `sidepanel-maintenance.css`

Current role: **cross-cutting refinement layer**.

It currently contains the accepted v2.1.6 visual language:
- neutral selection/focus;
- fixed-height quiet tabs;
- timestamp overlap fix;
- neutral menus and selection command bar;
- footer/header polish;
- narrow-width adjustments.

Rules:
1. Do not add a new broad visual theme here by default.
2. When a rule has remained stable for multiple releases, move it to its owning CSS file in a dedicated low-risk change.
3. Do not migrate tabs, rows, header and footer in one release.
4. After migration, delete the duplicate maintenance rule rather than leaving an override pair.
5. Visual behavior must remain unchanged during ownership migration.

## Ownership migration order

Recommended:
1. tabs -> `sidepanel-tabs.css`;
2. row/action overlap + selection -> `sidepanel-editor.css`;
3. header -> `sidepanel-base.css` together with the future Quiet Shell decision;
4. footer/line-number utilities -> `sidepanel-components.css`.
