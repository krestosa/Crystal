# Crystal documentation

Crystal has enough moving parts that a flat list of pages is not a useful starting point. Use this index to answer a question, then follow the links embedded in the page you choose.

## Start here

A first reading should establish three things: what the product does now, where authority lives, and where current behavior stops.

1. [Repository README](../README.md) for installation and the present product boundary.
2. [Guided reading](./guided-reading.md) for a route matched to your task.
3. [Architecture overview](./architecture/README.md) for the runtime and subsystem model.
4. [Implementation status](./roadmap-implementation.md) for evidence-backed phase status.

## What Crystal is

Crystal is an Electron desktop application for opening and reasoning about real HTML projects. It keeps source files in their existing format, renders pages through Chromium, and builds separate source-derived models for graph analysis, DOM Snapshot, selection mapping, inspection, style-source inventory, and dry-run command planning.

## What Crystal is not yet

Crystal is not yet a write-capable visual editor. It does not apply source patches, save project changes, execute undo/redo, calculate a real CSS cascade, read computed styles, or match authored rules against the live Preview DOM. WebGPU, Rust, WebAssembly, packaging, and broad cross-platform distribution remain future work.

## How to read the documentation

The documentation is organized by ownership rather than by marketing feature. Architecture pages explain the model and boundaries. Flow pages follow a request across runtimes. Diagram pages compress those relationships. ADRs preserve the reasons behind decisions. The two roadmap pages deliberately separate current evidence from future direction.

```mermaid
flowchart LR
  Start[Get Started] --> Concepts[Core concepts]
  Concepts --> Architecture[Electron/security model]
  Architecture --> Project[Project Graph]
  Project --> Preview[Preview Pipeline]
  Preview --> Snapshot[DOM Snapshot]
  Snapshot --> Selection[Selection & Inspector]
  Selection --> Editing[Editing Foundations]
  Editing --> Style[Style Engine Preparation]
  Style --> Validation[Validation System]
  Validation --> Roadmap[Roadmap]
```

## Read by goal

| Goal | Begin with | Continue with |
| --- | --- | --- |
| Run the project | [Development](./development.md) | [Validation system](./architecture/validation-system.md) |
| Understand the product | [System overview](./architecture/system-overview.md) | [Implementation status](./roadmap-implementation.md) |
| Change Preview | [Preview architecture](./architecture/preview/README.md) | [Preview safety](./architecture/preview/preview-safety.md) |
| Trace a selection | [Preview Selection flow](./architecture/flows/preview-selection-flow.md) | [Preview Inspector](./architecture/preview/preview-inspector.md) |
| Work on future editing | [Commands architecture](./architecture/commands/README.md) | [Future write flow](./architecture/flows/future-write-flow.md) |
| Change validation | [Validation system](./architecture/validation-system.md) | [Validation flow](./architecture/flows/validation-flow.md) |

## Read by subsystem

- **Project Graph:** [Repository map](./architecture/repository-map.md), [Project open flow](./architecture/flows/project-open-flow.md), and [Watcher/cache](./project-watch-cache.md).
- **Preview Pipeline:** [Preview architecture](./architecture/preview/README.md), [Project Preview](./architecture/preview/project-preview.md), and [DOM Snapshot](./architecture/preview/dom-snapshot.md).
- **Selection & Inspector:** [Preview Selection](./architecture/preview/preview-selection.md), [Visual Selection Overlay](./architecture/preview/visual-selection-overlay.md), and [Preview Inspector](./architecture/preview/preview-inspector.md).
- **Editing Foundations:** [Commands architecture](./architecture/commands/README.md), [Source Patch Preview](./architecture/commands/source-patch-preview.md), and [Future command execution](./architecture/commands/future-command-execution.md).
- **Style Engine Preparation:** [CSS/Sass Inspector read-only visual surface](./architecture/css-sass-inspector-readonly-surface.md) and [Authored Style Matching](./architecture/authored-style-matching-dom-snapshot.md).
- **Validation System:** [Validation system](./architecture/validation-system.md) and [Validation platform hardening](./architecture/validation-platform-hardening-phase-2.md).

## Read by safety concern

| Concern | Canonical page |
| --- | --- |
| Electron authority and preload exposure | [Security model](./architecture/security-model.md) |
| Iframe isolation and untrusted project HTML | [Preview safety](./architecture/preview/preview-safety.md) |
| Runtime dependency direction | [Runtime boundaries](./architecture/runtime-boundaries.md) |
| Physical source ownership | [Module boundaries](./architecture/module-boundaries.md) |
| Preview versus source identity | [DOM Snapshot](./architecture/preview/dom-snapshot.md) |
| Dry-run versus mutation | [Source Patch Preview](./architecture/commands/source-patch-preview.md) |
| Future persistence requirements | [Future write flow](./architecture/flows/future-write-flow.md) |

## Read by implementation phase

The phase names are historical coordination labels, not proof of behavior. Use [Implementation status](./roadmap-implementation.md) for current evidence. Use [Full product roadmap](./full-product-roadmap.md) only for direction.

- Foundations through Preview and selection: Project Graph, Preview Pipeline, DOM Snapshot, Selection & Inspector.
- Editing foundations: command intent, source anchors, dry-run previews, transaction planning, and Apply-blocked readiness.
- Style Engine and CSS/Sass Inspector preparation: source inventory, read-only UI, and conservative DOM Snapshot candidate matching.
- Future product work: persistence, history execution, real editing, cascade/computed-style analysis, developer tools, WebGPU, Rust/WASM, packaging, and distribution.

## Reader profiles

- **New contributor:** follow [Guided reading](./guided-reading.md) from Get Started through Validation System.
- **Renderer contributor:** read the [Renderer shell](./architecture/renderer-shell/README.md), then the feature page for the panel you are changing.
- **Main/preload contributor:** read [Runtime boundaries](./architecture/runtime-boundaries.md), [Security model](./architecture/security-model.md), and the relevant flow.
- **Core contributor:** start with [Module boundaries](./architecture/module-boundaries.md), then read the model and validator that own the change.
- **Reviewer:** compare the diff with [Implementation status](./roadmap-implementation.md) and the relevant validator before accepting capability claims.

## Complete reference


### Architecture and runtime

- [Architecture overview](./architecture/README.md)
- [System overview](./architecture/system-overview.md)
- [Repository map](./architecture/repository-map.md)
- [Module boundaries](./architecture/module-boundaries.md)
- [Runtime boundaries](./architecture/runtime-boundaries.md)
- [Security model](./architecture/security-model.md)
- [Event and state flow](./architecture/event-and-state-flow.md)
- [Validation system](./architecture/validation-system.md)
- [Validation platform hardening, phase 2](./architecture/validation-platform-hardening-phase-2.md)
- [CSS/Sass Inspector read-only visual surface](./architecture/css-sass-inspector-readonly-surface.md)
- [Authored Style Matching over DOM Snapshot](./architecture/authored-style-matching-dom-snapshot.md)

### Renderer shell

- [Renderer shell architecture](./architecture/renderer-shell/README.md)
- [Shell UI primitives](./architecture/renderer-shell/shell-ui-primitives.md)
- [Design view](./architecture/renderer-shell/design-view.md)
- [Diagnostics](./architecture/renderer-shell/diagnostics.md)
- [Status bar](./architecture/renderer-shell/status-bar.md)
- [Sidebar composition](./architecture/renderer-shell/sidebar-composition.md)

### Preview and inspection

- [Preview architecture](./architecture/preview/README.md)
- [Project Preview](./architecture/preview/project-preview.md)
- [DOM Snapshot](./architecture/preview/dom-snapshot.md)
- [Preview Selection](./architecture/preview/preview-selection.md)
- [Visual Selection Overlay](./architecture/preview/visual-selection-overlay.md)
- [Preview Inspector](./architecture/preview/preview-inspector.md)
- [Preview safety](./architecture/preview/preview-safety.md)

### Commands and editing foundations

- [Commands architecture](./architecture/commands/README.md)
- [HTML Element Library](./architecture/commands/html-element-library.md)
- [HTML insertion preview planner](./architecture/commands/html-insertion-preview-planner.md)
- [Source Patch Preview](./architecture/commands/source-patch-preview.md)
- [Command Preview Bus](./architecture/commands/command-preview-bus.md)
- [Future command execution](./architecture/commands/future-command-execution.md)

### Cross-runtime flows

- [Architecture flows](./architecture/flows/README.md)
- [Project open flow](./architecture/flows/project-open-flow.md)
- [DOM Snapshot flow](./architecture/flows/dom-snapshot-flow.md)
- [Preview Selection flow](./architecture/flows/preview-selection-flow.md)
- [Element Library preview flow](./architecture/flows/element-library-preview-flow.md)
- [Source Patch Preview flow](./architecture/flows/source-patch-preview-flow.md)
- [Validation flow](./architecture/flows/validation-flow.md)
- [Future write flow](./architecture/flows/future-write-flow.md)

### Diagrams

- [Architecture diagrams](./architecture/diagrams/README.md)
- [System context diagram](./architecture/diagrams/system-context.md)
- [Runtime boundaries diagram](./architecture/diagrams/runtime-boundaries.md)
- [Preview Selection sequence](./architecture/diagrams/preview-selection-sequence.md)
- [Source Patch Preview sequence](./architecture/diagrams/source-patch-preview-sequence.md)
- [Command Preview Bus sequence](./architecture/diagrams/command-preview-bus-sequence.md)
- [Security boundaries diagram](./architecture/diagrams/security-boundaries.md)
- [Validation gates diagram](./architecture/diagrams/validation-gates.md)

### Decisions

- [Architecture Decision Records](./decisions/README.md)
- [0001 — Electron Security Boundaries](./decisions/0001-electron-security-boundaries.md)
- [0002 — Read-only Preview First](./decisions/0002-read-only-preview-first.md)
- [0003 — Command Preview Before Write](./decisions/0003-command-preview-before-write.md)
- [0004 — Modular Shell UI Primitives](./decisions/0004-modular-shell-ui-primitives.md)


Additional project-level pages:

- [Development](./development.md)
- [Glossary](./glossary.md)
- [Architecture summary](./architecture.md)
- [Project watcher and cache](./project-watch-cache.md)
- [Visual Selection Overlay MVP note](./visual-selection-overlay.md)
- [Implementation status](./roadmap-implementation.md)
- [Full product roadmap](./full-product-roadmap.md)

## Read next

You are here: documentation entrypoint.

Next:
- [Guided reading](./guided-reading.md) turns the corpus into task-specific paths.
- [Architecture overview](./architecture/README.md) introduces runtime ownership and the current read-only boundary.

Why this matters:
The index prevents a reader from treating roadmap pages, diagrams, or preview models as isolated proof of implementation. It gives each kind of document a clear role before technical detail begins.
