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
- local validation runner for pre-merge checks

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
- minimal renderer verification panel for files, pages, issues, file counts, watcher state, refresh state, and cache state
- sample fixture project and validation scripts
- filesystem watcher adapter
- Project Graph watch event normalization
- batched watch events
- in-memory Project Graph cache foundation
- file metadata for cache/invalidation
- conservative semi-incremental refresh planning with full-rescan fallback
- typed IPC for watcher/cache control
- automated local watcher filesystem validation over a temporary project

Not covered yet:

- real Chromium preview pipeline for user projects
- preview reload pipeline
- DOM snapshot parsing
- CSS cascade or specificity analysis
- framework alias resolution
- TypeScript semantic analysis
- Rust/WASM analyzer
- WebGPU overlay
- visual Design MVP
- Inspector MVP
- Developer IDE features
- Electron UI automation framework

## Required validation before PR merge

Run:

```bash
npm run validate:local
```

The runner executes the current install, build, typecheck, Project Graph, watcher/cache, watcher filesystem, and Electron diagnostic checks in sequence. It stops on the first failure and returns a non-zero exit code.

For the explicit Electron launch check, run:

```bash
npm run validate:local -- --with-dev
```

`--with-dev` opens Electron through `npm run dev`; the user must close the app manually to let the runner finish.

The validation runner is mandatory before requesting PR merge. It must be updated whenever a phase adds new required validation. Manual UI verification remains required only where automation is not yet sufficient.

## Recommended next module

After this local validation runner PR is merged and `npm run validate:local` passes on Windows, the next module can begin Phase 2 Preview real. Phase 2 should consume the stable Project Graph and watcher/cache foundation without mixing preview implementation back into the tooling PR.
