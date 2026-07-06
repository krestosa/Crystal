# Roadmap Implementation Status

This document tracks implementation status. The complete product roadmap lives in [`docs/full-product-roadmap.md`](./full-product-roadmap.md).

Crystal is a new Electron/Node desktop application for creating, inspecting, and modifying real HTML projects and their dependencies. This status file should stay conservative: it records what has landed, what is intentionally out of scope, and what validation is required before merge.

## Implemented foundations

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

### Phase 2 — Real Preview, DOM Snapshot, and Preview Selection

Covered:

- Preview state model, target model, issue model, and reload reason model
- Preview event and command type definitions
- Project Graph page target selection
- secure project-relative Preview path resolver
- custom `crystal-preview://current/<relative-project-path>` protocol
- basic MIME serving for HTML, CSS, JavaScript, SVG, images, and fonts
- unsupported MIME fallback reporting as warning
- missing Preview resource reporting
- blocked path traversal and outside-root request reporting
- coalesced Preview issues with bounded recent history
- active Preview load correlation for stale issue prevention
- typed IPC and preload Preview API
- minimal renderer Preview panel in the Design view
- visible Preview issues section in the Preview panel
- manual Load Preview and Reload Preview
- target change reload from Project Graph pages
- controlled Preview reload after relevant watcher-driven Project Graph refreshes
- non-visual `validate:preview` script
- read-only DOM snapshot state model
- static HTML DOM snapshot builder
- hardened DOM snapshot parser for common malformed and edge-case HTML patterns
- stable DOM snapshot `snapshotPath`, path-based `id`, and `siblingIndex`
- bounded DOM snapshot issues and limits
- typed IPC and preload DOM snapshot API
- minimal read-only DOM Tree panel in the Design view
- non-visual `validate:dom-snapshot` script
- injected inactive-by-default Preview selection script for HTML responses
- sandbox-preserving renderer `postMessage` bridge for Preview selection
- minimal `previewSelection` state and selected-node summary
- conservative read-only mapping between selected Preview nodes and DOM Snapshot paths
- `matched`, `mismatched`, `ambiguous`, `stale`, and `missing-snapshot` mapping states
- non-visual `validate:preview-selection` script

Not covered yet:

- read-only Preview Inspector, unless landed in a later PR
- visual Design Canvas MVP
- Figma-like pan and zoom canvas controls
- rulers, guides, grids, snapping, measurement overlays, and persistent bounding boxes
- safe mode surface in Design when Preview fails beyond current diagnostics
- visual breadcrumbs and DOM Tree interaction
- layout visualization for block, flex, grid, absolute, fixed, and sticky contexts
- hover, focus, and active visual state tooling
- HTML5 element insertion library
- grouped HTML5 element panel by intent: structure, text, media, forms, lists/tables, interaction, semantic/accessibility
- Webflow/Pinegrow-like structural editing commands
- source mutation, save/apply, dirty state, and undo/redo
- editable attributes or text editing
- class management and Class Composer
- CSS cascade or specificity analysis
- Style Engine and CSS/Sass Inspector
- visual style editor categories: layout, spacing, size, position, typography, color, background, border, effects, transform, flex, grid, responsive, custom properties, and states
- style write policy: existing class, new class, selector, stylesheet, Sass partial, CSS variable, and explicit-only inline style
- responsive breakpoint tooling
- component/snippet library
- asset/font/SVG/media management UI
- Developer Mode / IDE tools
- separate system terminal and Preview Browser Console
- browser console integration
- Project Graph target expansion for DOM, classes, selectors, applied styles, unused files, unused assets, inferred components, and workspace status
- worker-backed parser/analyzer/asset/css/html/ts/preview-sync/wasm processing
- fallbacks for WebGPU, WASM, Preview, malformed HTML, failed CSS/assets, blocking scripts, and terminal failure
- explicit build pipeline for source validation, HTML assembly, SCSS compilation, TypeScript bundling, Rust/WASM compilation, assets, manifest, and dist validation
- command bus and mutation commands
- event bus and domain events
- state domains for workspace, graph, selection, preview, inspector, developer, files, build, history, and UI
- WebGPU overlay implementation
- Rust/WASM analyzer implementation
- framework alias resolution
- TypeScript semantic analysis
- Electron UI automation framework
- screenshot testing
- pending decisions for bundler, code editor, terminal, parser, UI strategy, plugins, testing, theming, visual/code source maps, Sass editing, external frameworks, and Preview sandbox policy

## Full roadmap summary

The complete roadmap is documented in [`docs/full-product-roadmap.md`](./full-product-roadmap.md). The high-level sequence after the current Preview foundations is:

1. Preview Inspector read-only.
2. Design Canvas Navigation MVP.
3. Visual Selection and Overlay MVP.
4. HTML5 Element Library and Insertion.
5. Design Editing MVP with commands and undo/redo.
6. Editable Inspector MVP.
7. Style Engine and CSS/Sass Inspector.
8. Responsive Design and Layout Tools.
9. Components, snippets, and reusable blocks.
10. Assets, fonts, SVG, and media management.
11. Developer Mode and IDE tools.
12. WebGPU Overlay Engine.
13. Rust/WASM Analyzer.
14. Automation, assistant workflows, packaging, testing, and product hardening.

Directive-level roadmap details are now tracked in `docs/full-product-roadmap.md`, including Design Mode, Inspector submodules, Developer Mode console separation, workers, fallbacks, build pipeline, command/event/state roadmaps, non-negotiable rules, and pending decisions.

## Required validation before PR merge

Run:

```bash
npm run validate:local
```

The runner executes the current install, build, typecheck, Project Graph, watcher/cache, Preview, DOM snapshot, watcher filesystem, Electron diagnostic checks, and any feature-specific validation scripts that have been wired into it. It stops on the first failure and returns a non-zero exit code.

For the explicit Electron launch check, run:

```bash
npm run validate:local -- --with-dev
```

`--with-dev` opens Electron through `npm run dev`; the user must close the app manually to let the runner finish.

The validation runner is mandatory before requesting PR merge. It must be updated whenever a phase adds new required validation. Manual UI verification remains required where automation is not yet sufficient.

## Recommended next module

After the current Preview selection mapping foundation, the next module should be the minimal read-only Preview Inspector. After that, move to Design Canvas navigation before broad visual editing. Do not jump directly to editable Inspector, full Design Editing, Developer Mode, WebGPU, or Rust/WASM before the required intermediate foundations are in place.
