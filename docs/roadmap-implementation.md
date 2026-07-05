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

### Phase 1 — Project Graph foundation

Covered:

- opening a project folder through Electron dialog IPC
- opening an HTML file through Electron dialog IPC and scanning its containing folder
- recursive file scanning with ignored directories and initial limits
- file classification for HTML, CSS, Sass/SCSS, JS, TS, images, SVG, fonts, video, audio, other assets, and unknown files
- HTML page detection including `index.html` and subfolder pages
- direct HTML dependency detection for stylesheets, scripts, images, media, iframes, SVG references, and `srcset`
- CSS/SCSS dependency detection for `@import` and `url(...)`
- basic JS/TS dependency detection for static imports, side-effect imports, dynamic imports, and `require(...)`
- local, external, resolved, and missing route classification
- Project Graph state integration
- project events and command type definitions
- minimal renderer verification panel for files, pages, issues, and file counts
- sample fixture project and `validate:project-graph`

Not covered yet:

- file watcher
- cache
- real Chromium preview pipeline for user projects
- DOM snapshot parsing
- CSS cascade or specificity analysis
- framework alias resolution
- TypeScript semantic analysis
- Rust/WASM analyzer
- WebGPU overlay
- visual Design MVP
- Inspector MVP
- Developer IDE features

## How to verify this phase

```bash
npm install
npm run build
npm run typecheck
npm run validate:structure
npm run validate:project-graph
npm run dev
```

Opening the app should display the Crystal application shell. In the side bar, use `Open Folder` or `Open HTML` to scan a fixture or local HTML project. The side bar should show file counts, detected pages, detected files, and missing-route issues.

## Recommended next module

The next operational chat/module should implement Phase 1 extended reliability: filesystem watcher, graph cache, incremental refresh, and tighter validation around route resolution. That should come before Phase 2 preview so Chromium receives a stable project model.
