# Crystal

Crystal is a new desktop application for creating, previewing, inspecting, and eventually modifying real HTML projects and their related assets.

The current implementation is intentionally conservative. It includes the Project Graph foundation, secure read-only Project Preview, static DOM Snapshot, read-only Preview Selection, Preview Inspector, Design Canvas navigation, Visual Selection Overlay MVP, HTML Element Library command foundation, Source Patch Preview, and Command Preview Bus dry-run foundation. Real source writes, patch application, write IPC, undo/redo execution, DOM mutation, and editable Inspector behavior are still intentionally blocked.

## Documentation

Start here:

- [Documentation index](docs/README.md)
- [Architecture documentation](docs/architecture/README.md)
- [Runtime boundaries](docs/architecture/runtime-boundaries.md)
- [Security model](docs/architecture/security-model.md)
- [Preview architecture](docs/architecture/preview/README.md)
- [Command preview architecture](docs/architecture/commands/README.md)
- [Architecture flows](docs/architecture/flows/README.md)
- [Architecture diagrams](docs/architecture/diagrams/README.md)
- [Architecture decisions](docs/decisions/README.md)
- [Glossary](docs/glossary.md)

Roadmap references:

- [Current implementation status](docs/roadmap-implementation.md)
- [Full product roadmap](docs/full-product-roadmap.md)
- [Development setup](docs/development.md)

## Requirements

- Node.js 22.x for local development
- npm 10.x recommended
- Electron 35.x from the locked dependency tree

Use the repository `.nvmrc` and see [development setup](docs/development.md) for the Windows Electron setup and clean reinstall procedure.

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

For iterative validation after dependencies are already installed:

```bash
npm run validate:local:quick
```

For the full local validation runner before asking for a PR merge:

```bash
npm run validate:local
```

For documentation-only validation on architecture docs:

```bash
npm run validate:architecture-docs
```

Manual validation sequence:

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

Use `npm run validate:local -- --with-dev` only when the branch also needs the manual Electron launch check. With `--with-dev`, Electron opens during `npm run dev`; close the app manually to let the validation runner finish.

## Current scope

Implemented foundations:

- npm workspaces monorepo base
- Electron main/preload/renderer split
- hardened BrowserWindow preferences: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`
- controlled preload bridge and typed IPC contract
- Project Graph scanner, watcher, cache, and validation foundation
- secure custom `crystal-preview://current/<relative-project-path>` protocol
- Preview target selection, load, reload, diagnostics, and bounded issues
- read-only static DOM Snapshot and DOM Tree panel
- inactive-by-default Preview selection script and bounded `postMessage` bridge
- conservative Preview Selection to DOM Snapshot mapping
- read-only Preview Inspector
- read-only Design Canvas navigation with safe zoom/pan controls
- external read-only Visual Selection Overlay MVP
- compact shell UI primitives, diagnostics, status bar, and sidebar composition
- HTML Element Library command foundation
- Source Patch Preview and Command Preview Bus dry-run foundation
- non-visual validators for current feature boundaries

Intentionally out of scope:

- real source writes
- source patch application
- write IPC channels
- real undo/redo transactions
- save/apply workflow
- DOM mutation or live iframe DOM mutation
- editable attributes, text, classes, CSS rules, or source files
- computed styles, box model, CSS cascade, or Style Engine
- Developer Mode / IDE features
- WebGPU overlay engine implementation
- Rust/WASM analyzer implementation

## Architecture rule

Crystal favors highly modular source code and compact runtime outputs. Renderer UI must remain modular. Main owns privileged effects. Preload exposes only controlled APIs. Core owns portable models, selectors, validators, planners, and state contracts. Future write-capable behavior must go through validated commands, reversible source patches, transaction history, refresh planning, and main/core persistence services.
