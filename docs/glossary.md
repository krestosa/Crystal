# Crystal Glossary

[Docs index](./README.md)

> **Read this first:** Terms in Crystal often encode a boundary. In particular, `Preview`, `Snapshot`, `Patch Preview`, `Transaction Preview`, `Refresh Boundary`, and `Write` are intentionally different concepts.

## At a glance

| Category | Why it matters |
| --- | --- |
| Runtime and security | Defines where authority lives. |
| Preview and inspection | Separates rendered HTML from source-derived state. |
| Commands and patch planning | Separates intent, dry-run preview, and future execution. |
| History and refresh planning | Names Phase 6C contracts without claiming execution. |
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

## Future write system

| Term | Short meaning | Implemented today? | Related docs |
| --- | --- | --- | --- |
| Blocked | Deliberately unavailable because safety/correctness contracts are missing. | Yes, as state/docs | [Future write flow](./architecture/flows/future-write-flow.md) |
| Future command execution | Later runtime that may execute validated commands. | No | [Future command execution](./architecture/commands/future-command-execution.md) |
| Patch apply | Later operation that would persist a source patch. | No | [Source Patch Preview](./architecture/commands/source-patch-preview.md) |
| Real undo/redo | Later transaction-backed history execution. | No | [Future write flow](./architecture/flows/future-write-flow.md) |
| Dirty state | Later save/apply state for changed files. | No | [Future write flow](./architecture/flows/future-write-flow.md) |

## Validation

| Term | Short meaning | Implemented today? | Related docs |
| --- | --- | --- | --- |
| Architecture docs validator | Checks docs shape, links, diagrams, tables, callouts, and safety language. | Yes | [Validation system](./architecture/validation-system.md) |
| Feature validator | Script checking a specific runtime or source boundary. | Yes | [Validation flow](./architecture/flows/validation-flow.md) |
| History foundation validator | Checks Phase 6C planning contracts and forbidden write behavior. | Yes | [Validation system](./architecture/validation-system.md) |
| Local quick validation | Installed-workspace aggregate gate. | Yes | [Validation gates](./architecture/diagrams/validation-gates.md) |

## Common misunderstanding

> **Common misunderstanding:** `Preview`, `Source Patch Preview`, `HistoryTransactionPreview`, `RefreshBoundaryPlan`, and `Future write` are different states. Only the first two interact with existing UI, and none of them mutate project files.
