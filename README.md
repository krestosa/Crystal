# Crystal

Crystal is a new desktop application for creating, inspecting, and modifying real HTML projects and their related assets.

This repository now covers roadmap Phase -1, the minimal Phase 0 tooling foundation, and the Phase 1 Project Graph foundation with watcher/cache support.

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

The development command builds the current source and opens the Electron shell from `dist/main/main.cjs`. Electron main and preload are emitted as explicit CommonJS outputs so the root `"type": "module"` setting can remain unchanged.

## Local validation

Run the full local validation runner before asking for a PR merge:

```bash
npm run validate:local
```

The runner executes the local install/build/typecheck/validation sequence, stops at the first failure, prints each command, prints per-step duration, and returns a non-zero exit code when a check fails.

`validate:local` does not launch Electron by default. To include the interactive development shell check, run:

```bash
npm run validate:local -- --with-dev
```

With `--with-dev`, Electron opens during `npm run dev`. Close the app manually to let the validation runner finish.

## Build and validation

The required pre-merge validation command is:

```bash
npm run validate:local
```

The equivalent manual sequence is:

```bash
npm install
npm run build
npm run typecheck
npm run validate:structure
npm run validate:project-graph
npm run validate:project-watch
npm run validate:local:watch
npm run doctor:electron
```

Use `npm run validate:local -- --with-dev` when the PR also needs the manual Electron launch check.

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
- fixtures and Project Graph validation scripts
- filesystem watcher adapter
- Project Graph watcher/cache validation
- local validation runner for pre-merge checks
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
- Electron UI automation frameworks such as Playwright, Cypress, or Spectron

## Project Graph scan

Use the app side bar buttons to open a folder or an HTML file. Crystal scans the selected project root through main-process IPC, builds a Project Graph in core, and sends a serializable result to the renderer.

The scanner detects local HTML pages, stylesheets, scripts, static imports, CSS `@import`, CSS `url(...)`, common media references, assets, external routes, and missing local references. It does not execute scripts, render HTML, resolve framework aliases, analyze CSS cascade, or parse TypeScript semantics.
