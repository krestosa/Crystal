# Crystal Documentation Index

This is the root index for Crystal documentation. Crystal is a desktop Electron/Node application for opening, previewing, inspecting, and eventually modifying real HTML projects. The current implementation remains conservative: it includes Project Graph, read-only Preview, DOM Snapshot, Preview Selection, Visual Selection Overlay, Preview Inspector, Design Canvas navigation, Element Library command foundations, Source Patch Preview, and Command Preview Bus dry-run foundations. Real source writes are still intentionally blocked.

## Primary maps

- [Architecture overview](./architecture/README.md)
- [System overview](./architecture/system-overview.md)
- [Repository map](./architecture/repository-map.md)
- [Runtime boundaries](./architecture/runtime-boundaries.md)
- [Security model](./architecture/security-model.md)
- [Event and state flow](./architecture/event-and-state-flow.md)
- [Validation system](./architecture/validation-system.md)
- [Module boundaries](./architecture/module-boundaries.md)

## Runtime and UI documentation

- [Renderer shell documentation](./architecture/renderer-shell/README.md)
- [Shell UI primitives](./architecture/renderer-shell/shell-ui-primitives.md)
- [Design view](./architecture/renderer-shell/design-view.md)
- [Diagnostics](./architecture/renderer-shell/diagnostics.md)
- [Status bar](./architecture/renderer-shell/status-bar.md)
- [Sidebar composition](./architecture/renderer-shell/sidebar-composition.md)

## Preview documentation

- [Preview architecture](./architecture/preview/README.md)
- [Project Preview](./architecture/preview/project-preview.md)
- [DOM Snapshot](./architecture/preview/dom-snapshot.md)
- [Preview Selection](./architecture/preview/preview-selection.md)
- [Visual Selection Overlay](./architecture/preview/visual-selection-overlay.md)
- [Preview Inspector](./architecture/preview/preview-inspector.md)
- [Preview safety](./architecture/preview/preview-safety.md)

## Command documentation

- [Commands overview](./architecture/commands/README.md)
- [HTML Element Library](./architecture/commands/html-element-library.md)
- [Source Patch Preview](./architecture/commands/source-patch-preview.md)
- [Command Preview Bus](./architecture/commands/command-preview-bus.md)
- [HTML insertion preview planner](./architecture/commands/html-insertion-preview-planner.md)
- [Future command execution](./architecture/commands/future-command-execution.md)

## Flow documentation

- [Flows overview](./architecture/flows/README.md)
- [Project open flow](./architecture/flows/project-open-flow.md)
- [Preview selection flow](./architecture/flows/preview-selection-flow.md)
- [DOM Snapshot flow](./architecture/flows/dom-snapshot-flow.md)
- [Element Library preview flow](./architecture/flows/element-library-preview-flow.md)
- [Source Patch Preview flow](./architecture/flows/source-patch-preview-flow.md)
- [Validation flow](./architecture/flows/validation-flow.md)
- [Future write flow](./architecture/flows/future-write-flow.md)

## Diagram documentation

- [Diagrams overview](./architecture/diagrams/README.md)
- [System context diagram](./architecture/diagrams/system-context.md)
- [Runtime boundaries diagram](./architecture/diagrams/runtime-boundaries.md)
- [Preview selection sequence](./architecture/diagrams/preview-selection-sequence.md)
- [Source Patch Preview sequence](./architecture/diagrams/source-patch-preview-sequence.md)
- [Command Preview Bus sequence](./architecture/diagrams/command-preview-bus-sequence.md)
- [Security boundaries diagram](./architecture/diagrams/security-boundaries.md)
- [Validation gates diagram](./architecture/diagrams/validation-gates.md)

## Decisions and reference

- [Architecture decisions](./decisions/README.md)
- [ADR 0001: Electron security boundaries](./decisions/0001-electron-security-boundaries.md)
- [ADR 0002: Read-only Preview first](./decisions/0002-read-only-preview-first.md)
- [ADR 0003: Command preview before write](./decisions/0003-command-preview-before-write.md)
- [ADR 0004: Modular shell UI primitives](./decisions/0004-modular-shell-ui-primitives.md)
- [Glossary](./glossary.md)

## Roadmap links

- [Current implementation status](./roadmap-implementation.md)
- [Full product roadmap](./full-product-roadmap.md)
- [Existing architecture note](./architecture.md)
- [Development setup](./development.md)

## Documentation rules

Documentation must distinguish implemented behavior from future behavior. If a module is only planned, label it as `Future`. If a capability is intentionally blocked, state the boundary and the reason. Do not claim real insertion, real source mutation, undo/redo execution, write IPC, live iframe DOM reads, or relaxed Electron security unless those features are implemented and validated.
