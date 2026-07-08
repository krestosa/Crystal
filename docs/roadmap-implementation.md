# Roadmap Implementation Status

This document tracks implementation status. The complete product roadmap lives in [`docs/full-product-roadmap.md`](./full-product-roadmap.md).

Crystal is a new Electron/Node desktop application for creating, inspecting, and modifying real HTML projects and their dependencies. This status file stays conservative: it records what has landed, what is intentionally out of scope, and what validation is required before merge.

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

### Phase 0 — Tooling foundation

Covered:

- Electron minimum application shell
- TypeScript configuration
- esbuild bundling for main, preload, and renderer
- Sass compilation
- HTML include assembler
- preload bridge with typed IPC contract
- structure validation script
- build scripts
- local validation runner for pre-merge checks
- quick local validation scripts that skip dependency installation after the local workspace is already installed:
  - `validate:local:quick`
  - `validate:local:quick:core`
  - `validate:local:quick:preview`
  - `validate:local:quick:ui`
- Electron diagnostic script
- optional manual DevTools opening through the status bar button only; DevTools no longer auto-opens from `npm run dev`

Still future hardening:

- source tree boundary validation
- import boundary validation
- dist manifest validation
- worker bundle validation
- WASM build validation
- HTML include source map support
- circular include reporting

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
- renderer Project panel for files, pages, issues, file counts, watcher state, refresh state, and cache state
- sample fixture project and validation scripts
- filesystem watcher adapter
- Project Graph watch event normalization
- batched watch events
- in-memory Project Graph cache foundation
- file metadata for cache/invalidation
- conservative semi-incremental refresh planning with full-rescan fallback
- typed IPC for watcher/cache control
- automated local watcher filesystem validation over a temporary project

Still future hardening:

- parsed DOM per HTML page in the Project Graph model
- class usage expansion
- selector/rule ownership expansion
- unused files/assets candidates
- project health signals
- framework alias resolution
- TypeScript path alias resolution
- Sass include path support
- npm package asset resolution
- large-project indexing and persistence
- worker-backed scanning and analysis
- Rust/WASM acceleration behind typed boundaries

### Phase 2 — Real Preview, DOM Snapshot, Preview Selection

Covered:

- Preview state model, target model, issue model, and reload reason model
- Preview event and command type definitions
- Project Graph page target selection
- secure project-relative Preview path resolver
- custom `crystal-preview://current/<relative-project-path>` protocol
- basic MIME serving for HTML, CSS, JavaScript, SVG, images, fonts, media, and safe unsupported-MIME fallback reporting
- missing Preview resource reporting
- blocked path traversal and outside-root request reporting
- coalesced Preview issues with bounded recent history
- active Preview load correlation for stale issue prevention
- typed IPC and preload Preview API
- renderer Preview panel in the Design view
- visible Preview issues section in the Preview panel and floating Diagnostics panel
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
- read-only DOM Tree panel in the Design view
- non-visual `validate:dom-snapshot` script
- injected inactive-by-default Preview selection script for HTML responses
- sandbox-preserving renderer `postMessage` bridge for Preview selection
- minimal `previewSelection` state and selected-node summary
- conservative read-only mapping between selected Preview nodes and DOM Snapshot paths
- `matched`, `mismatched`, `ambiguous`, `stale`, and `missing-snapshot` mapping states
- non-visual `validate:preview-selection` script

### Phase 3 — Preview Inspector read-only

Covered:

- minimal read-only Preview Inspector model and selector
- mapped DOM Snapshot node details for trusted `matched` selections
- defensive Inspector states for missing snapshot, stale snapshot, mismatched mapping, ambiguous mapping, and matched path missing from the current snapshot
- compact read-only Preview Inspector panel
- target/page selector styling integrated with the carbon shell
- non-visual `validate:preview-inspector` script

Still out of scope:

- attribute editing
- text editing
- computed styles
- box model
- CSS rule editing
- DOM Tree navigation
- scroll-to-node

### Phase 4 — Design Canvas Navigation MVP

Covered:

- pure Design Canvas viewport model under `packages/core/project/design-canvas/`
- wide safe zoom state with 2% minimum, 6400% maximum, and 100% default
- wheel and trackpad delta normalization for pixel, line, and page delta modes
- explicit wheel/trackpad/pinch classification for zoom, free pan, iframe scroll passthrough, and safe ignore
- explicit pointer classification for canvas pan, zoom-drag, and safe ignore
- explicit navigation modes: `idle`, `panning`, `zooming-wheel`, and `zooming-drag`
- pan state with transient panning marker and last interaction timestamp
- fit, center, reset, focal zoom, panning, pan clamp, and finite-number viewport helpers
- pan recovery margin so the frame cannot be lost completely
- renderer Design Canvas component around the Preview frame
- toolbar controls outside the transformed stage
- Preview visual frame inside the transformed stage only
- simple desktop page frame at 1280 × 720
- no scrollbars, straight vertical scroll, or straight horizontal scroll as the primary Design Canvas navigation model
- overflow-hidden and overscroll-contained Design Canvas surface
- free pan vector handling so diagonal canvas gestures move diagonally instead of mapping to page scroll
- Space + drag panning
- middle mouse panning where the event reaches the canvas
- empty-background drag and wheel/trackpad panning without blocking the iframe
- Ctrl/Cmd + wheel or Chromium-emulated pinch canvas zooming while normal wheel and two-finger trackpad scroll remain available to Preview
- double tap/click plus upward or downward movement for focal zoom-drag when Chromium/Electron exposes a detectable pointer sequence
- safe zoom-drag cancellation on pointer release, pointer cancel, blur, or Escape
- focused-canvas keyboard zoom, reset, fit, center, and arrow-key pan
- Fit, Center, and Reset recovery controls
- visible zoom percentage
- temporary Space/Ctrl/Cmd/pan/wheel-zoom/zoom-drag capture states so Preview returns to normal interaction outside canvas gestures
- external capture layer that defaults to `pointer-events: none`
- in-memory viewport state persistence for the current renderer session
- non-visual `validate:design-canvas` script
- `validate:design-canvas` wired into local validation
- documentation of read-only Design Canvas limits

Still out of scope:

- persistent viewport state across app restarts
- device viewport presets
- rulers, guides, grids, snapping, and measurement overlays beyond current shell/canvas visuals
- safe mode surface in Design when Preview fails beyond current diagnostics
- keyboard shortcut registry as a full app-level system

### Phase 5 — Visual Selection and Overlay MVP

Covered:

- external read-only Visual Selection Overlay outside the Preview iframe
- bounding-box/highlight projection for matched Preview selections
- defensive states for missing snapshot or unavailable overlay data
- overlay lifecycle tied to Preview selection/state rather than persistent DOM mutation
- no mutation of user DOM beyond the existing temporary selection script
- non-visual `validate:visual-selection-overlay` script

Partially covered / still future:

- hover highlight as a separate optional state
- read-only selection handles beyond basic selection visualization
- multi-frame awareness for multiple preview viewports
- visual breadcrumbs foundation
- layout type badges for `block`, `flex`, `grid`, `absolute`, `fixed`, and `sticky`
- overlay desync hardening after iframe scroll/resize/reflow
- ruler/guide/measurement overlay integration

### Phase 6A — HTML Element Library command foundation

Covered:

- compact modular Element Library panel grouped by intent: structure, text, media, forms, lists/tables, interaction, semantic/accessibility, and presets
- read-only HTML element catalog with explicit future insertion modes, required attributes, recommended attributes, child hints, and accessibility notes
- `AddHtmlElementCommand` contracts, constants, validator, and execution blocker
- target eligibility selector based on Project Graph, Preview target, DOM Snapshot, and Preview Selection mapping state
- defensive UI states for no project, no preview target, missing snapshot, stale snapshot, mismatched selection, ambiguous selection, unsupported target, and matched target
- compact Element Library integration with shell UI primitives and disabled future command action
- non-visual `validate:html-element-library` script wired into quick UI validation

Still out of scope:

- source patch preview
- command bus preview/dry-run routing
- source writes
- DOM mutation
- apply/save workflow
- undo/redo history

### Cross-cutting shell, Diagnostics, and UI system polish

Covered:

- carbon shell theme with compact density
- resizable left and right shell panels
- integrated status bar with runtime badge, Diagnostics button, and manual DevTools button
- floating Diagnostics panel with open/close, pin/unpin, drag, viewport recovery, and eight-direction resize
- Diagnostics scroll containment and responsive grid for Graph, Preview, DOM, and Events
- dark Preview fixture styling
- dark Inspector select styling
- compact control tokens for shared button/select/icon-button styling
- no-install quick validation path
- UI flow validator coverage for shell, Diagnostics, DevTools button, dark fixtures, compact controls, and security guards

Still out of scope:

- theme customization UI
- persisted user UI preferences
- screenshot/UI automation testing
- full accessibility pass beyond targeted labels/focus states

## Recommended next module

### Phase 6B — Source Patch Preview and Command Bus Foundation

Recommended scope:

- source patch preview model for proposed edits without applying them
- source insertion anchor model based on DOM Snapshot `sourceLocation`
- dry-run command bus contracts that route preview planning but block execution
- `AddHtmlElementCommand` preview planner for safe one-node HTML insertion previews
- compact Element Library patch preview UI that keeps Apply/Insert disabled
- validation guarding against file writes, IPC write channels, iframe internals, and unsafe renderer APIs

Phase 6B must still avoid real source writes. The first real write should only come after patch preview, command bus routing, preview refresh boundaries, history/undo skeleton, and validation are present and tested.

## Not implemented yet

The following roadmap items remain intentionally pending:

- real source mutation command runtime
- source mutation service in main/core, not renderer
- source patch application and reversible patch persistence
- undo/redo transaction log
- save/apply dirty-state workflow
- Webflow/Pinegrow-like structural editing commands
- editable attributes or text editing
- moving/reordering DOM nodes
- class management and Class Composer
- CSS cascade or specificity analysis
- Style Engine and CSS/Sass Inspector
- visual style editor categories: layout, spacing, size, position, typography, color, background, border, effects, transform, flex, grid, responsive, custom properties, and states
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
- full event bus and domain event expansion
- state domains for workspace, graph, selection, preview, inspector, developer, files, build, history, and UI
- WebGPU overlay implementation
- Rust/WASM analyzer implementation
- framework alias resolution
- TypeScript semantic analysis
- Electron UI automation framework
- screenshot testing
- pending decisions for bundler, code editor, terminal, parser, UI strategy, plugins, testing, theming, visual/code source maps, Sass editing, external frameworks, and Preview sandbox policy

## Full roadmap summary

The complete roadmap is documented in [`docs/full-product-roadmap.md`](./full-product-roadmap.md). The high-level sequence now is:

1. ~~Read-only Preview Inspector.~~ Implemented.
2. ~~Design Canvas Navigation MVP.~~ Implemented foundation.
3. ~~Visual Selection and Overlay MVP.~~ Implemented MVP; hardening remains.
4. ~~HTML5 Element Library and safe insertion command foundation.~~ Implemented as read-only Phase 6A foundation.
5. Source Patch Preview and Command Bus Foundation.
6. Design Editing MVP with commands and undo/redo.
7. Editable Inspector MVP.
8. Style Engine and CSS/Sass Inspector.
9. Responsive Design and Layout Tools.
10. Components, snippets, and reusable blocks.
11. Assets, fonts, SVG, and media management.
12. Developer Mode and IDE tools.
13. WebGPU Overlay Engine.
14. Rust/WASM Analyzer.
15. Automation, assistant workflows, packaging, testing, and product hardening.

## Required validation before PR merge

For a full install-backed local gate, run:

```bash
npm run validate:local
```

For iterative validation after dependencies are already installed, run:

```bash
npm run validate:local:quick
```

For Electron launch checks, run manually:

```bash
npm run dev
```

Feature-specific scripts should be added as phases land, for example:

- `validate:html-element-library`.
- `validate:source-patch-preview`.
- `validate:design-editing`.
- `validate:style-engine`.
- `validate:webgpu-overlay`.
- `validate:wasm-analyzer`.

The validation runner is mandatory before requesting PR merge. It must be updated whenever a phase adds new required validation. Manual UI verification remains required where automation is not yet sufficient.
