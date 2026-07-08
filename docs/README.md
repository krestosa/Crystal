# Crystal Documentation Index

Crystal is a desktop Electron/Node application for opening, previewing, inspecting, and eventually modifying real HTML projects. The current system is intentionally conservative: it can reason about project structure and preview possible edits, but it does not write source files yet.

> **Read this first:** Use this page as a reading map. The links are grouped by goal, subsystem, safety concern, and implementation phase so a new contributor can enter through the problem they are trying to solve.

## Start here

| Document | When to read it | What it answers |
| --- | --- | --- |
| [Architecture overview](./architecture/README.md) | First architecture pass. | How the major systems fit together. |
| [System overview](./architecture/system-overview.md) | Before changing feature flow. | What exists today and what is blocked. |
| [Runtime boundaries](./architecture/runtime-boundaries.md) | Before crossing renderer/main/preload. | Which runtime owns each kind of authority. |
| [Security model](./architecture/security-model.md) | Before touching Preview, preload, or Electron options. | What risks each boundary prevents. |
| [Glossary](./glossary.md) | When terms sound close but not identical. | Exact meaning of Preview, Snapshot, Source Patch Preview, and write terms. |

## Read by goal

| Goal | Start with | Then read |
| --- | --- | --- |
| Understand the app boundary | [Runtime boundaries](./architecture/runtime-boundaries.md) | [Security model](./architecture/security-model.md), [Security boundaries diagram](./architecture/diagrams/security-boundaries.md) |
| Understand Preview selection | [Preview Selection](./architecture/preview/preview-selection.md) | [DOM Snapshot](./architecture/preview/dom-snapshot.md), [Preview selection flow](./architecture/flows/preview-selection-flow.md) |
| Understand why Preview is read-only | [Preview safety](./architecture/preview/preview-safety.md) | [ADR 0002](./decisions/0002-read-only-preview-first.md) |
| Understand Element Library previews | [HTML Element Library](./architecture/commands/html-element-library.md) | [Command Preview Bus](./architecture/commands/command-preview-bus.md), [Source Patch Preview](./architecture/commands/source-patch-preview.md) |
| Understand future writing | [Future write flow](./architecture/flows/future-write-flow.md) | [Future command execution](./architecture/commands/future-command-execution.md), [ADR 0003](./decisions/0003-command-preview-before-write.md) |
| Validate docs | [Validation system](./architecture/validation-system.md) | [Validation flow](./architecture/flows/validation-flow.md), [Validation gates](./architecture/diagrams/validation-gates.md) |

## Read by subsystem

| Subsystem | Primary docs | Useful companion |
| --- | --- | --- |
| Runtime shell | [Renderer shell](./architecture/renderer-shell/README.md) | [Shell UI primitives](./architecture/renderer-shell/shell-ui-primitives.md), [Sidebar composition](./architecture/renderer-shell/sidebar-composition.md) |
| Preview | [Preview architecture](./architecture/preview/README.md) | [Project Preview](./architecture/preview/project-preview.md), [Preview safety](./architecture/preview/preview-safety.md) |
| Snapshot and inspection | [DOM Snapshot](./architecture/preview/dom-snapshot.md) | [Preview Inspector](./architecture/preview/preview-inspector.md), [DOM Snapshot flow](./architecture/flows/dom-snapshot-flow.md) |
| Command preview | [Commands overview](./architecture/commands/README.md) | [HTML insertion preview planner](./architecture/commands/html-insertion-preview-planner.md) |
| Validation | [Validation system](./architecture/validation-system.md) | [Validation gates](./architecture/diagrams/validation-gates.md) |

## Read by safety concern

| Concern | Read | Boundary to preserve |
| --- | --- | --- |
| Renderer privilege | [Runtime boundaries](./architecture/runtime-boundaries.md) | Renderer must not get direct filesystem or raw IPC authority. |
| Preview iframe access | [Preview safety](./architecture/preview/preview-safety.md) | Renderer must not use `iframe.contentDocument` or `iframe.contentWindow.document`. |
| Patch preview vs write | [Source Patch Preview](./architecture/commands/source-patch-preview.md) | Preview text must not apply or save. |
| Command bus confusion | [Command Preview Bus](./architecture/commands/command-preview-bus.md) | Dry-run preview bus must not replace legacy `command-bus.ts`. |
| Future write claims | [Future write flow](./architecture/flows/future-write-flow.md) | No real file write, patch apply, write IPC, DOM mutation, or real undo/redo. |

## Read by implementation phase

| Phase area | Current state | Read |
| --- | --- | --- |
| Preview foundations | Implemented as read-only. | [Preview architecture](./architecture/preview/README.md) |
| Selection and inspection | Implemented as read-only derived state. | [Preview Selection](./architecture/preview/preview-selection.md), [Preview Inspector](./architecture/preview/preview-inspector.md) |
| Visual overlay | Implemented as external read-only projection. | [Visual Selection Overlay](./architecture/preview/visual-selection-overlay.md) |
| Command previews | Implemented as dry-run infrastructure. | [Commands overview](./architecture/commands/README.md) |
| Phase 6C | Future transaction and refresh-boundary planning. | [Future write flow](./architecture/flows/future-write-flow.md) |

## Full navigation

| Area | Links |
| --- | --- |
| Primary maps | [Architecture overview](./architecture/README.md), [System overview](./architecture/system-overview.md), [Repository map](./architecture/repository-map.md), [Runtime boundaries](./architecture/runtime-boundaries.md), [Security model](./architecture/security-model.md), [Event and state flow](./architecture/event-and-state-flow.md), [Validation system](./architecture/validation-system.md), [Module boundaries](./architecture/module-boundaries.md) |
| Runtime and UI | [Renderer shell](./architecture/renderer-shell/README.md), [Shell UI primitives](./architecture/renderer-shell/shell-ui-primitives.md), [Design view](./architecture/renderer-shell/design-view.md), [Diagnostics](./architecture/renderer-shell/diagnostics.md), [Status bar](./architecture/renderer-shell/status-bar.md), [Sidebar composition](./architecture/renderer-shell/sidebar-composition.md) |
| Preview | [Preview architecture](./architecture/preview/README.md), [Project Preview](./architecture/preview/project-preview.md), [DOM Snapshot](./architecture/preview/dom-snapshot.md), [Preview Selection](./architecture/preview/preview-selection.md), [Visual Selection Overlay](./architecture/preview/visual-selection-overlay.md), [Preview Inspector](./architecture/preview/preview-inspector.md), [Preview safety](./architecture/preview/preview-safety.md) |
| Commands | [Commands overview](./architecture/commands/README.md), [HTML Element Library](./architecture/commands/html-element-library.md), [Source Patch Preview](./architecture/commands/source-patch-preview.md), [Command Preview Bus](./architecture/commands/command-preview-bus.md), [HTML insertion preview planner](./architecture/commands/html-insertion-preview-planner.md), [Future command execution](./architecture/commands/future-command-execution.md) |
| Flows | [Flows overview](./architecture/flows/README.md), [Project open flow](./architecture/flows/project-open-flow.md), [Preview selection flow](./architecture/flows/preview-selection-flow.md), [DOM Snapshot flow](./architecture/flows/dom-snapshot-flow.md), [Element Library preview flow](./architecture/flows/element-library-preview-flow.md), [Source Patch Preview flow](./architecture/flows/source-patch-preview-flow.md), [Validation flow](./architecture/flows/validation-flow.md), [Future write flow](./architecture/flows/future-write-flow.md) |
| Diagrams | [Diagrams overview](./architecture/diagrams/README.md), [System context](./architecture/diagrams/system-context.md), [Runtime boundaries diagram](./architecture/diagrams/runtime-boundaries.md), [Preview selection sequence](./architecture/diagrams/preview-selection-sequence.md), [Source Patch Preview sequence](./architecture/diagrams/source-patch-preview-sequence.md), [Command Preview Bus sequence](./architecture/diagrams/command-preview-bus-sequence.md), [Security boundaries](./architecture/diagrams/security-boundaries.md), [Validation gates](./architecture/diagrams/validation-gates.md) |
| Decisions and reference | [Architecture decisions](./decisions/README.md), [ADR 0001](./decisions/0001-electron-security-boundaries.md), [ADR 0002](./decisions/0002-read-only-preview-first.md), [ADR 0003](./decisions/0003-command-preview-before-write.md), [ADR 0004](./decisions/0004-modular-shell-ui-primitives.md), [Glossary](./glossary.md) |
| Roadmap | [Current implementation status](./roadmap-implementation.md), [Full product roadmap](./full-product-roadmap.md), [Existing architecture note](./architecture.md), [Development setup](./development.md) |

## Documentation rules

> **Safety boundary:** Treat implemented, blocked, and future behavior as separate states. If a feature only previews a possible edit, call it a preview. If a path is intentionally blocked, explain the technical reason.

Do not claim real insertion, source mutation, patch application, undo/redo execution, write IPC, live iframe DOM reads, or relaxed Electron security unless the code and validators support that claim.
