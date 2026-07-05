# Roadmap Implementation Status

## Implemented in this bootstrap

### Phase -1 — Physical architecture

Covered:

- npm workspaces monorepo base
- `/apps` and `/packages` root structure
- Electron app source split into main, preload, and renderer
- modular renderer folders for layout, views, components, styles, and app bootstrap
- command, event, and state folders in core
- adapter folders for build-facing external tools
- documentation of source modularity and runtime outputs

### Phase 0 — Minimal tooling foundation

Partially covered:

- Electron minimum application shell
- TypeScript configuration
- esbuild bundling for main, preload, and renderer
- Sass compilation
- HTML include assembler
- preload bridge with typed IPC contract
- structure validation script
- build scripts

## Out of scope by design

The following roadmap items are not implemented here:

- Project Graph
- real Chromium preview pipeline for user projects
- Design MVP editing
- Inspector MVP
- Developer IDE features
- WebGPU overlay implementation
- Rust/WASM analyzer implementation
- file mutation commands
- undo/redo implementation
- terminal, browser console, or code editor integrations

## How to verify this phase

```bash
npm install
npm run build
npm run typecheck
npm run validate:structure
npm run dev
```

Opening the app should display the Crystal application shell with a top bar, activity bar, side bar, central workbench, status bar, and inert mode buttons for Diseño, Inspector, and Desarrollador.

## Recommended next module

The next operational chat/module should take Phase 1: Project Graph. It should implement opening/scanning a project folder, detecting HTML pages, collecting CSS/Sass/JS/TS/assets dependencies, identifying broken routes, and producing the first shared internal project model consumed later by Diseño, Inspector, and Desarrollador.
