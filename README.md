# Crystal

Crystal is a desktop workbench for understanding real HTML projects without converting them into a proprietary format. It opens an existing project, builds a structural graph, renders a selected page in Chromium, and connects what you see back to source-derived models that Crystal can validate.

The current application is deliberately read-only at the project boundary. You can inspect a project, navigate the Design Canvas, select rendered elements, review source-derived structure, and preview a possible HTML insertion. Crystal does not yet apply patches, save project files, execute undo or redo, or expose an editing-capable IPC channel.

## What works today

- Open an HTML file or project folder and build a Project Graph.
- Watch the project and refresh the graph through a controlled main-process service.
- Render project files through the root-contained `crystal-preview://` protocol.
- Build a bounded DOM Snapshot from static HTML source.
- Select a rendered node and map it defensively to the snapshot.
- Inspect matched structure and project an external read-only selection overlay.
- Navigate the Design Canvas with pan, zoom, Fit, Center, and Reset.
- Browse the HTML Element Library and produce dry-run Source Patch Preview results.
- Inspect authored style sources and conservative selector candidates derived from DOM Snapshot data.

## What remains unavailable

Crystal has planning and readiness models for future editing, but no write runtime. A `preview-ready` command result is display state, not permission to mutate a file. The disabled Inspector and CSS/Sass surfaces are also read-only: they do not calculate the browser cascade, read computed styles, access CSSOM, inspect the live iframe DOM, or enable Apply.

WebGPU overlays, Rust/WebAssembly analyzers, packaged distribution, and the broader visual editing workflow remain roadmap work. Their presence in planning documents is not evidence of implementation.

## Install

<!-- crystal-generated:toolchain:start -->
<!-- Do not edit manually. Run npm run sync:project-metadata. -->

| Requirement | Canonical value |
| --- | --- |
| Node.js local baseline | 24.18.0 (>=24.18.0 <25) |
| npm engine | >=10.0.0 |
| Electron package | 43.1.0 (^43.1.0) |
| Electron internal Node.js | 24.18.0 |
| Electron Chromium | 150.0.7871.47 |
| Reproducible install | `npm ci` from the committed `package-lock.json` |
| Lockfile policy | Keep `package-lock.json` tracked; use `npm install` only for explicit dependency resolution. |
<!-- crystal-generated:toolchain:end -->

From the repository root:

```bash
npm ci --foreground-scripts
```

The lockfile is part of the reproducible baseline. Use `npm install` only when intentionally changing dependency resolution.

## Run Crystal

```bash
npm run dev
```

The development command builds the application and launches Electron. DevTools open only through the explicit shell action; development mode does not open them automatically.

Useful focused commands:

```bash
npm run build
npm run typecheck
npm run validate:local:quick
npm run validate:local
```

`validate:local:quick` is strict: a required failed or skipped check makes the command fail unless skips are explicitly allowed. Use the full local suite before merging runtime work.

## Start reading

The [documentation index](./docs/README.md) offers short routes by goal, subsystem, risk, and implementation phase. New contributors should continue with [Guided reading](./docs/guided-reading.md), then use the [Architecture overview](./docs/architecture/README.md) to locate runtime ownership.

For current capability, read [Implementation status](./docs/roadmap-implementation.md). For product direction, read the separate [Full product roadmap](./docs/full-product-roadmap.md). Keeping those pages separate prevents planned work from being mistaken for available behavior.

## Repository shape

```text
apps/desktop/electron/   Electron main, preload, and renderer runtimes
packages/core/           portable models, selectors, validators, and planners
packages/shared/         contracts shared across runtimes
packages/adapters/       filesystem, watcher, compiler, bundler, and assembler effects
scripts/                 build, metadata, policy, and validation tooling
docs/                    architecture, flows, decisions, development, and roadmap
```

The renderer has no direct Node or filesystem authority. Privileged operations pass through the constrained preload API to Electron main, which coordinates core logic and adapters.

## Project status

Crystal is an active foundation, not a finished visual editor. The current value is a trustworthy read-only path from source to Preview, selection, inspection, and dry-run command planning. Editing becomes viable only after persistence, conflict handling, history execution, refresh execution, and explicit Apply semantics are implemented together.
