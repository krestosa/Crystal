# Crystal

Crystal is a desktop application for creating a safe visual/code workbench around real HTML projects and their related assets.

> **Read this first:** Crystal currently provides read-only and dry-run foundations. It can inspect, preview, map, and describe possible edits, but it does not write project files.

## At a glance

| Question | Answer |
| --- | --- |
| Current product shape | Electron/Node desktop workbench for real HTML projects. |
| Implemented today | Project Graph, secure Preview, DOM Snapshot, Preview Selection, Inspector, Design Canvas navigation, Visual Selection Overlay, Element Library intent, Source Patch Preview, Command Preview Bus dry-run. |
| Blocked today | Real file writes, patch apply, write IPC, DOM mutation, real undo/redo, editable Inspector. |
| Main safety rule | Renderer displays state and intent; main owns privileged effects; core owns portable models and planning. |
| Start reading | `docs/README.md`, then architecture, runtime, security, Preview, and commands docs. |

## Documentation

| Goal | Start with | Then read |
| --- | --- | --- |
| Understand the app boundary | [Runtime boundaries](docs/architecture/runtime-boundaries.md) | [Security model](docs/architecture/security-model.md) |
| Understand Preview and selection | [Preview architecture](docs/architecture/preview/README.md) | [Preview Selection](docs/architecture/preview/preview-selection.md), [DOM Snapshot flow](docs/architecture/flows/dom-snapshot-flow.md) |
| Understand command previews | [Commands overview](docs/architecture/commands/README.md) | [Source Patch Preview](docs/architecture/commands/source-patch-preview.md), [Command Preview Bus](docs/architecture/commands/command-preview-bus.md) |
| Understand future writing | [Future write flow](docs/architecture/flows/future-write-flow.md) | [ADR 0003](docs/decisions/0003-command-preview-before-write.md) |
| Validate a docs-only change | [Validation system](docs/architecture/validation-system.md) | `npm run validate:architecture-docs` |

Primary references:

- [Documentation index](docs/README.md)
- [Architecture documentation](docs/architecture/README.md)
- [Architecture decisions](docs/decisions/README.md)
- [Glossary](docs/glossary.md)
- [Current implementation status](docs/roadmap-implementation.md)
- [Full product roadmap](docs/full-product-roadmap.md)

## Requirements

| Requirement | Notes |
| --- | --- |
| Node.js | 22.x for local development. |
| npm | 10.x recommended. |
| Electron | 35.x from the locked dependency tree. |
| Setup reference | See [development setup](docs/development.md). |

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

The development command builds the current source and opens the Electron shell from `dist/main/main.cjs`. Electron main and preload are emitted as explicit CommonJS outputs so the root `"type": "module"` setting can remain unchanged.

## Build and validation

| Command | Use when |
| --- | --- |
| `npm run validate:architecture-docs` | Reviewing architecture docs only. |
| `npm run validate:local:quick` | Dependencies are installed and a quick local gate is enough. |
| `npm run validate:local` | Full local validation before asking for PR merge. |
| `npm run validate:local -- --with-dev` | The branch also needs the manual Electron launch check. |

Manual sequence:

```bash
npm install
npm run build
npm run typecheck
npm run validate:structure
npm run validate:project-graph
npm run validate:project-watch
npm run validate:preview
npm run validate:dom-snapshot
npm run validate:preview-selection
npm run validate:preview-inspector
npm run validate:design-canvas
npm run validate:visual-selection-overlay
npm run validate:html-element-library
npm run validate:source-patch-preview
npm run validate:architecture-docs
npm run validate:ui-flow
npm run validate:local:watch
npm run doctor:electron
```

## Current scope

| Implemented | Blocked | Future |
| --- | --- | --- |
| Project Graph scanner, watcher, cache, validation foundation. | Real file write. | Transaction skeletons and refresh-boundary planning. |
| Secure `crystal-preview://current/<relative-project-path>` Preview protocol. | Patch apply. | Controlled command execution after validators exist. |
| Static DOM Snapshot and read-only DOM Tree. | Write IPC channels. | Dirty-state and save/apply workflow. |
| Read-only Preview Selection and Inspector. | DOM mutation and editable Inspector. | Reversible undo/redo transactions. |
| Source Patch Preview and Command Preview Bus dry-run. | Real undo/redo execution. | WebGPU/Rust/WASM hardening in later phases. |

> **Safety boundary:** A dry-run command preview is not permission to mutate files. Any future write path must be explicit, typed, reversible, and owned by main/core services.

## Architecture rule

Crystal favors highly modular source code and compact runtime outputs. Renderer UI presents state and intent. Main owns privileged effects. Preload exposes only controlled APIs. Core owns portable models, selectors, validators, planners, and state contracts. Future write-capable behavior must go through validated commands, reversible source patches, transaction history, refresh planning, and main/core persistence services.
