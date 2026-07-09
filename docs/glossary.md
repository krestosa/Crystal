# Crystal Glossary

[Docs index](./README.md)

> **Read this first:** Terms in Crystal often encode a boundary. In particular, `Preview`, `Snapshot`, `Patch Preview`, `Transaction Preview`, `Refresh Boundary`, `Dirty-State Preview`, `Source Conflict Preview`, `Write Runtime Capability Preview`, `Inspector Edit Draft`, `Inspector Edit Intent`, `Editable Inspector Surface`, `Style Source Inventory`, `Selected Node Style Readiness`, and `Write` are intentionally different concepts.

## At a glance

| Category | Why it matters |
| --- | --- |
| Runtime and security | Defines where authority lives. |
| Preview and inspection | Separates rendered HTML from source-derived state. |
| Commands and patch planning | Separates intent, dry-run preview, and future execution. |
| History and refresh planning | Names Phase 6C contracts without claiming execution. |
| Design editing preflight | Names Phase 6D readiness contracts without enabling Apply. |
| Editable Inspector draft/intent foundation | Names Phase 7A Inspector editing contracts without applying edits. |
| Editable Inspector read-only draft surface | Names Phase 7B disabled Inspector UI without enabling editing. |
| Style Engine source inventory foundation | Names Phase 8A style inventory contracts without CSS/Sass editing. |
| Future write system | Names blocked capabilities without claiming implementation. |
| Validation | Names the checks that keep boundaries visible. |

## Runtime and security

| Term | Short meaning | Implemented today? | Related docs |
| --- | --- | --- | --- |
| Active project root | Filesystem root selected or inferred for the current project. | Yes | [Project open flow](./architecture/flows/project-open-flow.md) |
| Main | Electron runtime that owns privileged services. | Yes | [Runtime boundaries](./architecture/runtime-boundaries.md) |
| Preload | Isolated bridge exposing `window.crystal`. | Yes | [Security model](./architecture/security-model.md) |
| Renderer | Browser UI runtime for Crystal shell. | Yes | [Module boundaries](./architecture/module-boundaries.md) |
| Preview iframe | Sandboxed iframe rendering project HTML. | Yes | [Preview safety](./architecture/preview/preview-safety.md) |
| Write IPC | Future explicit IPC layer for write-capable operations. | No | [Future write flow](./architecture/flows/future-write-flow.md) |

## Preview and inspection

| Term | Short meaning | Implemented today? | Related docs |
| --- | --- | --- | --- |
| Project Graph | Scanned model of pages, dependencies, assets, missing routes, and issues. | Yes | [Project open flow](./architecture/flows/project-open-flow.md) |
| Project Preview | Safe rendering of an active Project Graph page. | Yes | [Project Preview](./architecture/preview/project-preview.md) |
| DOM Snapshot | Static source-derived structural tree. | Yes | [DOM Snapshot](./architecture/preview/dom-snapshot.md) |
| Preview Selection | Read-only selected-node state from the Preview iframe. | Yes | [Preview Selection](./architecture/preview/preview-selection.md) |
| Preview Inspector | Read-only derived panel for selected structural details. | Yes | [Preview Inspector](./architecture/preview/preview-inspector.md) |
| Visual Selection Overlay | External overlay projected over Preview, outside user DOM. | Yes | [Visual Selection Overlay](./architecture/preview/visual-selection-overlay.md) |

## Commands and patch planning

| Term | Short meaning | Implemented today? | Related docs |
| --- | --- | --- | --- |
| HTML Element Library | Catalog and intent producer for future insertion. | Yes, preview-only | [HTML Element Library](./architecture/commands/html-element-library.md) |
| AddHtmlElementCommand | Command-shaped dry-run intent for element insertion. | Yes, preview-only | [HTML insertion preview planner](./architecture/commands/html-insertion-preview-planner.md) |
| Command Preview Bus | Dry-run bus under `packages/core/commands/command-preview-bus/`. | Yes, preview-only | [Command Preview Bus](./architecture/commands/command-preview-bus.md) |
| Source Patch Preview | Verifiable description of a possible source change. | Yes, preview-only | [Source Patch Preview](./architecture/commands/source-patch-preview.md) |
| Source anchor | Static source position used to preview before/after/inside insertion. | Yes, preview-only | [Source Patch Preview flow](./architecture/flows/source-patch-preview-flow.md) |

## History and refresh planning

| Term | Short meaning | Implemented today? | Related docs |
| --- | --- | --- | --- |
| HistoryTransactionPreview | Planning descriptor for a future reversible transaction. | Yes, preview-only | [Future write flow](./architecture/flows/future-write-flow.md) |
| Undo strategy descriptor | Label such as `reverse-patch`, `restore-snapshot`, `unsupported`, or `unavailable`. | Yes, descriptor only | [Future write flow](./architecture/flows/future-write-flow.md) |
| Redo strategy descriptor | Label such as `replay-command`, `replay-patch`, `unsupported`, or `unavailable`. | Yes, descriptor only | [Future command execution](./architecture/commands/future-command-execution.md) |
| RefreshBoundaryPlan | Planning descriptor for derived state that would become stale after a future write. | Yes, planning-only | [Future write flow](./architecture/flows/future-write-flow.md) |
| CommandTransactionPlanPreview | Preview-only bridge across command preview, Source Patch Preview, transaction preview, and refresh boundary. | Yes, preview-only | [Future command execution](./architecture/commands/future-command-execution.md) |

## Design editing preflight

| Term | Short meaning | Implemented today? | Related docs |
| --- | --- | --- | --- |
| DirtyStatePreview | Planning descriptor for future unsaved-change state. | Yes, preview-only | [Roadmap implementation](./roadmap-implementation.md) |
| SourceConflictPreview | Planning descriptor for future source freshness/conflict checks. | Yes, preview-only | [Future write flow](./architecture/flows/future-write-flow.md) |
| WriteRuntimeCapabilityPreview | Explicit model showing write runtime capability is unavailable. | Yes, blocked preview | [Future command execution](./architecture/commands/future-command-execution.md) |
| DesignEditingReadinessPreview | Summary that combines transaction plan, dirty state, conflict preflight, and write runtime capability while keeping Apply blocked. | Yes, preview-only | [Future write flow](./architecture/flows/future-write-flow.md) |

## Editable Inspector draft/intent foundation

| Term | Short meaning | Implemented today? | Related docs |
| --- | --- | --- | --- |
| InspectorEditableFieldPreview | Draftable, readonly, blocked, or unsupported field descriptor for a selected Inspector node. | Yes, preview-only | [Future command execution](./architecture/commands/future-command-execution.md) |
| InspectorEditDraftPreview | In-memory draft summary for selected-node field values. | Yes, preview-only | [Roadmap implementation](./roadmap-implementation.md) |
| InspectorEditIntentPreview | Future edit intent for text or attribute changes. | Yes, preview-only | [Future write flow](./architecture/flows/future-write-flow.md) |
| InspectorEditingReadinessPreview | Readiness summary linking Inspector draft/intent state to design editing readiness and transaction planning while keeping Apply blocked. | Yes, preview-only | [Validation system](./architecture/validation-system.md) |

## Editable Inspector read-only draft surface

| Term | Short meaning | Implemented today? | Related docs |
| --- | --- | --- | --- |
| Editable Inspector Surface | Disabled/read-only renderer surface showing future Inspector editing fields. | Yes, disabled only | [Roadmap implementation](./roadmap-implementation.md) |
| InspectorEditingReadOnlySurfaceViewModel | Core view model that derives the disabled surface from Preview Inspector state and Phase 7A models. | Yes, preview-only | [Future command execution](./architecture/commands/future-command-execution.md) |
| Disabled Inspector field control | Readonly and disabled input representing a future text-content or attribute field. | Yes, disabled only | [Validation system](./architecture/validation-system.md) |
| Apply unavailable affordance | Visual Apply copy that remains disabled because write runtime is absent. | Yes, disabled only | [Future write flow](./architecture/flows/future-write-flow.md) |

## Style Engine source inventory foundation

| Term | Short meaning | Implemented today? | Related docs |
| --- | --- | --- | --- |
| StyleSourceReferencePreview | Read-only descriptor for linked CSS, linked Sass/SCSS, inline style blocks, inline style attributes, or unknown style sources. | Yes, inventory-only | [Roadmap implementation](./roadmap-implementation.md) |
| StyleSourceInventoryPreview | Read-only inventory of style source references for a target HTML path. | Yes, inventory-only | [Validation system](./architecture/validation-system.md) |
| StyleSelectorPreview | Textual selector descriptor with match status kept `not-evaluated` by default. | Yes, preview-only | [Future command execution](./architecture/commands/future-command-execution.md) |
| StyleDeclarationPreview | Textual CSS declaration descriptor with `canEdit: false` and `canApply: false`. | Yes, preview-only | [Future write flow](./architecture/flows/future-write-flow.md) |
| StyleRulePreview | Textual rule preview composed from selector and declaration previews. | Yes, preview-only | [Roadmap implementation](./roadmap-implementation.md) |
| SelectedNodeStyleReadinessPreview | Selected-node readiness summary for future CSS/Sass Inspector inventory inspection, with computed styles and Apply blocked. | Yes, inventory-only | [Validation system](./architecture/validation-system.md) |

Phase 8A boundary: Style Engine read-only source inventory foundation only. No CSS/Sass Inspector visual surface is added. No real cascade is calculated. No computed styles are read. No style editing is implemented. No source files are written. No patch apply is available. No write IPC exists. Apply remains unavailable. No contenteditable is used. No undo/redo execution runs. Dirty-state is not persisted. No refresh execution runs. No Preview DOM mutation occurs.

## Future write system

| Term | Short meaning | Implemented today? | Related docs |
| --- | --- | --- | --- |
| Blocked | Deliberately unavailable because safety/correctness contracts are missing. | Yes, as state/docs | [Future write flow](./architecture/flows/future-write-flow.md) |
| Future command execution | Later runtime that may execute validated commands. | No | [Future command execution](./architecture/commands/future-command-execution.md) |
| Patch apply | Later operation that would persist a source patch. | No | [Source Patch Preview](./architecture/commands/source-patch-preview.md) |
| Real undo/redo | Later transaction-backed history execution. | No | [Future write flow](./architecture/flows/future-write-flow.md) |
| Dirty state | Later save/apply state for changed files. | No | [Future write flow](./architecture/flows/future-write-flow.md) |
| Applied Inspector edit | Later operation that may turn an Inspector edit intent into a validated source mutation. | No | [Future command execution](./architecture/commands/future-command-execution.md) |
| Applied style edit | Later operation that may turn a style declaration edit into a validated source mutation. | No | [Future write flow](./architecture/flows/future-write-flow.md) |

## Validation

| Term | Short meaning | Implemented today? | Related docs |
| --- | --- | --- | --- |
| Architecture docs validator | Checks docs shape, links, diagrams, tables, callouts, and safety language. | Yes | [Validation system](./architecture/validation-system.md) |
| Feature validator | Script checking a specific runtime or source boundary. | Yes | [Validation flow](./architecture/flows/validation-flow.md) |
| History foundation validator | Checks Phase 6C planning contracts and forbidden write behavior. | Yes | [Validation system](./architecture/validation-system.md) |
| Design editing preflight validator | Checks Phase 6D preflight contracts and blocked Apply/write behavior. | Yes | [Validation system](./architecture/validation-system.md) |
| Inspector editing foundation validator | Checks Phase 7A Inspector draft/intent contracts and blocked Apply/write behavior. | Yes | [Validation system](./architecture/validation-system.md) |
| Editable Inspector surface validator | Checks Phase 7B renderer surface, disabled controls, unavailable Apply, and blocked write behavior. | Yes | [Validation system](./architecture/validation-system.md) |
| Style Engine foundation validator | Checks Phase 8A Style Engine inventory contracts, no computed styles, no real cascade, no style editing, and no write behavior. | Yes | [Validation system](./architecture/validation-system.md) |
| Local quick validation | Installed-workspace aggregate gate. | Yes | [Validation gates](./architecture/diagrams/validation-gates.md) |

## Common misunderstanding

> **Common misunderstanding:** `Preview`, `Source Patch Preview`, `HistoryTransactionPreview`, `RefreshBoundaryPlan`, `DesignEditingReadinessPreview`, `InspectorEditIntentPreview`, `Editable Inspector Surface`, `StyleSourceInventoryPreview`, `SelectedNodeStyleReadinessPreview`, and `Future write` are different states. Current preflight, draft/intent, disabled-surface, and inventory models describe blocked future work; none of them mutate project files.
