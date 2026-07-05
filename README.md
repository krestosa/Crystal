# Crystal

Crystal is a new desktop application for creating, inspecting, and modifying real HTML projects and their related assets.

This repository bootstrap covers roadmap Phase -1 and a minimal foundation for Phase 0. It establishes the physical architecture, source modularity rules, Electron separation, and the first build pipeline. It does not implement product features yet.

## Requirements

- Node.js 22+
- npm 10+

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

The development command builds the current source and opens the Electron shell from `dist/main/main.js`.

## Build

```bash
npm run build
npm run typecheck
npm run validate:structure
```

The build pipeline produces:

```txt
dist/
  main/main.js
  preload/preload.js
  renderer/index.html
  renderer/main.css
  renderer/main.js
```

`dist/` is generated output and is intentionally ignored by Git.

## Current scope

Implemented:

- npm workspaces monorepo base
- `/apps` and `/packages` architecture
- Electron main/preload/renderer split
- `contextIsolation: true`
- no direct Node access from the renderer
- controlled preload bridge
- minimal typed IPC contract
- modular renderer HTML/SCSS/TypeScript
- simple HTML include assembler
- Sass compilation
- esbuild TypeScript bundling
- command/event/state skeletons
- adapters for bundler, Sass compiler, and HTML assembler
- structure validation script

Intentionally out of scope:

- Project Graph
- real Chromium preview pipeline
- visual Design MVP editing
- Inspector MVP
- Developer IDE features
- WebGPU overlay implementation
- Rust/WASM analyzer implementation

## Architecture notes

The source tree is intentionally modular. HTML partials, SCSS modules, and TypeScript modules are assembled or bundled into compact runtime entrypoints. External dependencies are isolated behind adapter boundaries where practical.

The next operational phase should be handled by a Project Graph implementation chat/module, because Phase 1 requires file scanning, dependency detection, page detection, asset validation, and the first internal project model.
