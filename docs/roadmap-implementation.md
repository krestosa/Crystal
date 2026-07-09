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

### Phase 6D — Design Editing MVP preflight

Covered:

- `DirtyStatePreview` contracts under `packages/core/dirty-state/`
- `SourceConflictPreview` contracts under `packages/core/source-conflict/`
- `WriteRuntimeCapabilityPreview` contracts under `packages/core/write-runtime/`
- `DesignEditingReadinessPreview` contracts under `packages/core/design-editing/`
- preview-only linkage from CommandTransactionPlanPreview to DirtyStatePreview, SourceConflictPreview, and WriteRuntimeCapabilityPreview
- validation guarding that Phase 6D remains preflight-only and Apply-blocked
- `validate:design-editing-preflight` wired into `validate:local:quick:core`

Phase 6D boundary: No source files are written. No patch apply is available. No write IPC exists. Apply remains unavailable. No undo/redo execution runs. Dirty-state is not persisted. No refresh execution runs. No Preview DOM mutation occurs.

Still out of scope:

- real source writes
- patch apply
- IPC write
- save/apply workflow
- real undo/redo execution
- dirty-state persistence
- conflict detection against real source files
- refresh execution
- DOM mutation
- Apply enablement

### Phase 7A — Editable Inspector draft/intent foundation

Covered:

- `InspectorEditableFieldPreview` contracts under `packages/core/inspector-editing/`
- `InspectorEditDraftPreview` contracts for selected-node draft state without persistence
- `InspectorEditIntentPreview` contracts for text and attribute edit intent without source mutation
- `InspectorEditingReadinessPreview` contracts linking Inspector draft/intent state to DesignEditingReadinessPreview
- preview-only reference to `CommandTransactionPlanPreview` as planning context, not execution
- validation guarding that Phase 7A remains draft/intent-only and Apply-blocked
- `validate:inspector-editing-foundation` wired into `validate:local:quick:core`

Phase 7A boundary: Editable Inspector draft/intent foundation only. No source files are written. No patch apply is available. No write IPC exists. Apply remains unavailable. No contenteditable is used. No undo/redo execution runs. Dirty-state is not persisted. No refresh execution runs. No Preview DOM mutation occurs.

Still out of scope:

- applied Inspector editing
- real source writes
- patch apply
- IPC write
- save/apply workflow
- real undo/redo execution
- dirty-state persistence
- refresh execution
- DOM mutation
- Apply enablement
- renderer editable controls beyond disabled/read-only affordances

### Phase 7B — Editable Inspector read-only draft surface

Covered:

- `InspectorEditingReadOnlySurfaceViewModel` under `packages/core/inspector-editing/`
- renderer `editable-inspector` surface under `apps/desktop/electron/renderer/views/inspector/`
- disabled/read-only field controls for future text-content and attribute editing
- unsupported field display for tag-name, class-list, and inline-style
- compact readiness, blocked reason, safety notes, changed-field summary, and preview-only intent display
- disabled Apply affordance with “Apply unavailable — write runtime not enabled” copy
- `validate:editable-inspector-surface` wired into `validate:local:quick:ui`
- `validate:inspector-editing-foundation` remains wired into `validate:local:quick:core`

Phase 7B boundary: Editable Inspector read-only draft surface only. No source files are written. No patch apply is available. No write IPC exists. Apply remains unavailable. No contenteditable is used. No undo/redo execution runs. Dirty-state is not persisted. No refresh execution runs. No Preview DOM mutation occurs.

Still out of scope:

- applied Inspector editing
- editable input state mutation
- real source writes
- patch apply
- IPC write
- save/apply workflow
- real undo/redo execution
- dirty-state persistence
- refresh execution
- DOM mutation
- Apply enablement

### Phase 8A — Style Engine read-only source inventory foundation

Covered:

- `StyleSourceReferencePreview` contracts under `packages/core/style-engine/`
- `StyleSourceInventoryPreview` contracts for read-only stylesheet and inline style inventory
- `StyleSelectorPreview`, `StyleDeclarationPreview`, and `StyleRulePreview` contracts for textual previews only
- `SelectedNodeStyleReadinessPreview` contracts linking selected-node style readiness to inventory and optional Inspector editing readiness
- minimal textual detection for stylesheet links, inline style blocks, inline style attributes, simple selectors, simple declarations, and simple rule previews from source text already supplied as input
- validation guarding that Phase 8A remains source-inventory-only and Apply-blocked
- `validate:style-engine-foundation` wired into `validate:local:quick:core`

Phase 8A boundary: Style Engine read-only source inventory foundation only. No CSS/Sass Inspector visual surface is added. No real cascade is calculated. No computed styles are read. No style editing is implemented. No source files are written. No patch apply is available. No write IPC exists. Apply remains unavailable. No contenteditable is used. No undo/redo execution runs. Dirty-state is not persisted. No refresh execution runs. No Preview DOM mutation occurs.

Still out of scope:

- CSS/Sass Inspector visual surface
- real cascade calculation
- computed style inspection
- applied style matching against live Preview DOM
- style editing
- real source writes
- patch apply
- IPC write
- save/apply workflow
- real undo/redo execution
- dirty-state persistence
- refresh execution
- DOM mutation
- Apply enablement

### Phase 8B — CSS/Sass Inspector read-only visual surface

Covered:

- renderer CSS/Sass Inspector read-only surface integrated into the Preview Inspector
- compact authored/computed/apply summary
- selected DOM Snapshot path and target file context
- source inventory display based on Phase 8A Style Engine inventory
- compact source cards for linked/inline authored style references
- rule preview empty state when source text is unavailable
- compact Safety Boundary
- passive Apply unavailable affordance
- `validate:css-sass-inspector-surface` wired into quick UI validation
- documentation of the Phase 8B boundary

Phase 8B boundary: CSS/Sass Inspector read-only visual surface only. No real cascade is calculated. No computed styles are read. No document.styleSheets or CSSOM is used. No iframe internals are read. No source files are written. No patch apply is available. No write IPC exists. Apply remains unavailable. No contenteditable is used. No undo/redo execution runs. Dirty-state is not persisted. No refresh execution runs. No Preview DOM mutation occurs.

Still out of scope:

- authored style matching against selected DOM Snapshot nodes
- real cascade calculation
- specificity resolution beyond textual selector preview
- computed style inspection
- applied style matching against live Preview DOM
- style editing
- class management
- source writes
- patch apply
- write IPC
- save/apply workflow
- undo/redo execution
- dirty-state persistence
- refresh execution
- DOM mutation
- Apply enablement

### Cross-cutting validation hardening and strict reporter

Covered:

- strict local quick validation runner with granular per-check reporting
- PASS/FAIL/SKIPPED final summary
- 27-check suite including Validation System meta-validator
- direct-node execution for known Node scripts while preserving npm script contracts
- Windows-safe npm fallback and command-execution failure reporting
- render modes for unicode, ascii/plain, raw, json-summary, compact, verbose, no-progress, color/no-color
- ANSI-safe raw/json/no-color output contracts
- parseable JSON invocation documented through Node direct or npm --silent
- color-aware reporter rendering that remains decorative and not state-bearing
- validation-system meta-validator for suite wiring, render modes, failure types, and critical validator check counts
- hardening for guided docs and CSS/Sass Inspector validators

PASS means executed and verified.

FAIL means at least one required check failed.

SKIPPED means a check did not run and must be visible in the final summary.

Strict validation reporter boundary: validation reporting and validator hardening only. It does not modify runtime behavior, does not change Electron security, does not add dependencies, does not apply fixes automatically, does not convert failures into warnings, and does not hide skipped checks.

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

### Authored Style Matching over DOM Snapshot

Recommended scope:

- use Phase 8A Style Engine source inventory and Phase 8B CSS/Sass Inspector surface as inputs
- match selected DOM Snapshot nodes against authored selector previews using DOM Snapshot data only
- add read-only candidate match models for authored rules
- surface candidate authored-style matches in the CSS/Sass Inspector
- classify unsupported selectors explicitly
- keep unmatched and not-evaluated states visible
- keep source-text-unavailable and inventory-unavailable states explicit
- do not calculate real cascade
- do not read computed styles
- do not use document.styleSheets or CSSOM
- do not read iframe internals
- do not evaluate against live Preview DOM
- do not mutate Preview DOM
- do not write source files
- do not apply patches
- do not add write IPC
- keep Apply unavailable

Phase 8C should move the CSS/Sass Inspector from inventory-only toward read-only authored-style candidate matching. It must use DOM Snapshot data and textual selector previews only. Real cascade, computed styles, live DOM inspection, style editing, patch application, write IPC, dirty-state persistence, refresh execution, and undo/redo execution remain future-only.

## Not implemented yet

The following roadmap items remain intentionally pending:

- authored style matching against DOM Snapshot nodes
- real source mutation command runtime
- source mutation service in main/core, not renderer
- source patch application and reversible patch persistence
- undo/redo transaction log
- save/apply dirty-state workflow
- Webflow/Pinegrow-like structural editing commands
- editable attributes or text editing with Apply
- moving/reordering DOM nodes
- class management and Class Composer
- real CSS cascade or specificity analysis beyond textual selector preview
- computed style inspection
- visual style editor categories
- style editing and class management
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
7. ~~Design Editing MVP preflight with write-runtime and dirty-state contracts.~~ Implemented as Phase 6D preflight foundation.
8. ~~Editable Inspector draft/intent foundation.~~ Implemented as Phase 7A draft/intent foundation.
9. ~~Editable Inspector read-only draft surface.~~ Implemented as Phase 7B disabled surface.
10. ~~Style Engine source inventory foundation.~~ Implemented as Phase 8A read-only inventory foundation.
11. ~~CSS/Sass Inspector read-only visual surface.~~ Implemented as Phase 8B read-only surface.
12. Authored Style Matching over DOM Snapshot.
13. Responsive Design and Layout Tools.
14. Components, snippets, and reusable blocks.
15. Assets, fonts, SVG, and media management.
16. Developer Mode and IDE tools.
17. WebGPU Overlay Engine.
18. Rust/WASM Analyzer.
19. Automation, assistant workflows, packaging, testing, and product hardening.

## Required validation before PR merge

For a full install-backed local gate, run:

```bash
npm run validate:local
```

For iterative validation after dependencies are already installed, run:

```bash
npm run validate:local:quick
```

For Phase 8B-specific validation, run:

```bash
npm run validate:css-sass-inspector-surface
```

For validation reporter/meta-validation, run:

```bash
npm run validate:validation-system
npm run validate:local:quick
npm --silent run validate:local:quick:json
```

For documentation validation, run:

```bash
npm run validate:guided-docs
npm run validate:architecture-docs
```

For Phase 8A-specific validation, run:

```bash
npm run validate:style-engine-foundation
```

For Phase 7B-specific validation, run:

```bash
npm run validate:editable-inspector-surface
```

For Phase 7A-specific validation, run:

```bash
npm run validate:inspector-editing-foundation
```

For Phase 6D-specific validation, run:

```bash
npm run validate:design-editing-preflight
```

For Electron launch checks, run manually:

```bash
npm run dev
```

Feature-specific scripts should be added as phases land, for example: