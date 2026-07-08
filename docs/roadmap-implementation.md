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
- command, event, state, history, refresh-boundary, source-patch, and planning folders in core
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
- optional manual DevTools opening through the status bar button only

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

- opening a project folder or an HTML file through Electron dialog IPC
- recursive file scanning with ignored directories and initial limits
- file classification for HTML, CSS, Sass/SCSS, JS, TS, images, SVG, fonts, media, assets, and unknown files
- HTML page detection
- direct HTML dependency detection
- CSS/SCSS dependency detection for `@import` and `url(...)`
- basic JS/TS dependency detection
- local, external, resolved, and missing route classification
- Project Graph state integration
- renderer Project panel
- sample fixture project and validation scripts
- filesystem watcher adapter
- batched watch events
- in-memory Project Graph cache foundation
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

- secure real Preview protocol and renderer Preview panel
- safe Preview target selection and reload controls
- bounded Preview diagnostics
- read-only DOM Snapshot model and parser
- read-only DOM Tree panel
- inactive-by-default Preview selection script
- sandbox-preserving renderer message bridge
- conservative read-only mapping between Preview selection and DOM Snapshot paths
- non-visual Preview, DOM Snapshot, Preview Selection, and Preview Inspector validators

Still out of scope:

- source writes
- patch apply
- write IPC
- DOM mutation
- editable Inspector behavior

### Phase 3 — Preview Inspector read-only

Covered:

- minimal read-only Preview Inspector model and selector
- mapped DOM Snapshot node details for trusted selections
- defensive Inspector states for missing, stale, mismatched, ambiguous, and missing-path cases
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
- safe zoom, pan, fit, center, reset, focal zoom, and finite-number helpers
- wheel, trackpad, pinch, keyboard, pointer, and zoom-drag navigation classification
- renderer Design Canvas component around the Preview frame
- external capture layer that defaults to `pointer-events: none`
- in-memory viewport state persistence for the current renderer session
- non-visual `validate:design-canvas` script wired into local validation

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
- layout type badges
- overlay desync hardening after iframe scroll/resize/reflow
- ruler/guide/measurement overlay integration

### Phase 6A — HTML Element Library command foundation

Covered:

- compact modular Element Library panel grouped by intent
- read-only HTML element catalog
- `AddHtmlElementCommand` contracts, constants, validator, and execution blocker
- target eligibility selector based on Project Graph, Preview target, DOM Snapshot, and Preview Selection mapping state
- compact Element Library integration with shell UI primitives and disabled future command action
- non-visual `validate:html-element-library` script wired into quick UI validation

Still out of scope:

- real source writes
- patch apply
- IPC write
- save/apply workflow
- undo/redo real history
- DOM mutation

### Phase 6B — Source Patch Preview and Command Bus Foundation

Covered:

- source patch preview model
- source insertion anchor model based on DOM Snapshot `sourceLocation`
- dry-run command bus contracts
- `AddHtmlElementCommand` preview planner
- compact Element Library patch preview UI
- validation guarding against writes, IPC write channels, and iframe internals

Still out of scope:

- real source writes
- patch apply
- IPC write
- save/apply workflow
- undo/redo real history
- DOM mutation

### Phase 6C — History/Undo transaction skeleton and refresh boundary planning

Covered:

- `HistoryTransactionPreview` contracts under `packages/core/history/`
- undo/redo strategy descriptors without real undo/redo behavior
- deterministic history transaction preview factory that accepts an optional timestamp marker instead of calling the clock directly
- `RefreshBoundaryPlan` contracts under `packages/core/refresh-boundary/`
- invalidation targets for Project Graph, DOM Snapshot, Preview render, selection state, Inspector state, Visual Overlay, and diagnostics
- `CommandTransactionPlanPreview` contracts under `packages/core/commands/transaction-planning/`
- preview-only linkage from Command Preview Result to Source Patch Preview, HistoryTransactionPreview, and RefreshBoundaryPlan
- validation guarding that Phase 6C remains dry-run/planning only
- `validate:history-foundation` wired into `validate:local:quick:core`

Still out of scope:

- real source writes
- patch apply
- IPC write
- save/apply workflow
- real undo/redo execution
- history persistence
- dirty-state mutation
- refresh execution
- DOM mutation
- Apply enablement

### Cross-cutting shell, Diagnostics, and UI system polish

Covered:

- carbon shell theme with compact density
- resizable left and right shell panels
- integrated status bar with runtime badge, Diagnostics button, and manual DevTools button
- floating Diagnostics panel with open/close, pin/unpin, drag, viewport recovery, and resize
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

### Design Editing MVP preflight

Recommended scope:

- keep Apply unavailable until a real write runtime is explicitly introduced
- define dirty-state models before persistence
- define conflict detection before source mutation
- define a write-capable command execution runtime behind main/core boundaries
- connect refresh-boundary execution only after writes are real and validated
- connect real undo/redo only after durable transaction records exist

Phase 6C prepared history and refresh boundaries but did not make any write-capable command land.

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
- visual style editor categories
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
5. ~~Source Patch Preview and Command Bus Foundation.~~ Implemented as read-only Phase 6B foundation.
6. ~~History/Undo transaction skeleton and refresh boundary planning.~~ Implemented as Phase 6C planning foundation.
7. Design Editing MVP preflight with write-runtime and dirty-state contracts.
8. Editable Inspector MVP.
9. Style Engine and CSS/Sass Inspector.
10. Responsive Design and Layout Tools.
11. Components, snippets, and reusable blocks.
12. Assets, fonts, SVG, and media management.
13. Developer Mode and IDE tools.
14. WebGPU Overlay Engine.
15. Rust/WASM Analyzer.
16. Automation, assistant workflows, packaging, testing, and product hardening.

## Required validation before PR merge

For a full install-backed local gate, run:

```bash
npm run validate:local
```

For iterative validation after dependencies are already installed, run:

```bash
npm run validate:local:quick
```

For Phase 6C-specific validation, run:

```bash
npm run validate:history-foundation
```

For Electron launch checks, run manually:

```bash
npm run dev
```

Feature-specific scripts should be added as phases land, for example:

- `validate:html-element-library`.
- `validate:source-patch-preview`.
- `validate:history-foundation`.
- `validate:design-editing`.
- `validate:style-engine`.
- `validate:webgpu-overlay`.
- `validate:wasm-analyzer`.

The validation runner is mandatory before requesting PR merge. It must be updated whenever a phase adds new required validation. Manual UI verification remains required where automation is not yet sufficient.
