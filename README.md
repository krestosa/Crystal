# Crystal

Crystal is a new desktop application for creating, inspecting, and modifying real HTML projects and their related assets.

This repository now covers roadmap Phase -1, the minimal Phase 0 tooling foundation, and the first Phase 1 Project Graph foundation.

## Requirements

- Node.js 22+
- npm 10+

## Install

```bash
npm install
```

## Build and validation

```bash
npm run build
npm run typecheck
npm run validate:structure
npm run validate:project-graph
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
