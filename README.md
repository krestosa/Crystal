# Crystal

Crystal is a new desktop application for creating, inspecting, and modifying real HTML projects and their related assets.

This repository now covers roadmap Phase -1, the minimal Phase 0 tooling foundation, and the first Phase 1 Project Graph foundation.

## Requirements

- Node.js 22.x for local development
- npm 10.x recommended
- Electron 35.x from the locked dependency tree

Use the repository `.nvmrc` and see `docs/development.md` for the Windows Electron setup and clean reinstall procedure.

## Install

```bash
npm install
```

For Windows Electron binary repair, use the clean install procedure in `docs/development.md` instead of deleting random cache paths manually.

## Development

```bash
npm run dev
```

The development command builds the current source and opens the Electron shell from `dist/main/main.js`. It intentionally does not hide Electron install failures.

## Build and validation

```bash
npm run build
npm run typecheck
npm run validate:structure
npm run validate:project-graph
npm run doctor:electron
```

## Current scope

Implemented:

- npm workspaces monorepo base
- Electron main/preload/renderer split
- `contextIsolation: true`
- `nodeIntegration: false`
- controlled preload bridge
- typed IPC contract
- initial Project Graph types and scanner
- HTML/CSS/SCSS/JS/TS dependency detection
- asset and page detection
- missing route reporting
- minimal renderer Project Graph verification panel
- fixtures and `validate:project-graph`
- Electron local environment diagnostics

Intentionally out of scope:

- real Chromium preview pipeline for user projects
- visual Design MVP editing
- Inspector MVP
- Developer IDE features
- WebGPU overlay implementation
- Rust/WASM analyzer implementation
- code editor
- integrated terminal
- DOM visual selection, canvas, or bounding boxes

## Project Graph scan

Use the app side bar buttons to open a folder or an HTML file. Crystal scans the selected project root through main-process IPC, builds a Project Graph in core, and sends a serializable result to the renderer.

The initial scanner detects local HTML pages, stylesheets, scripts, static imports, CSS `@import`, CSS `url(...)`, common media references, assets, external routes, and missing local references. It does not execute scripts, render HTML, resolve framework aliases, analyze CSS cascade, or parse TypeScript semantics.
