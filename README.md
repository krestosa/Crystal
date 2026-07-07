# Crystal

Crystal is a new desktop application for creating, inspecting, and modifying real HTML projects and their related assets.

This repository now covers roadmap Phase -1, the minimal Phase 0 tooling foundation, the Phase 1 Project Graph foundation with watcher/cache support, the first Phase 2 real project preview with hardened read-only DOM snapshot, basic read-only Preview selection, conservative selection-to-snapshot mapping, a minimal read-only Preview Inspector, the first read-only Design Canvas navigation layer, the first Visual Selection Overlay MVP, and a compact current-feature UI flow shell polish.

## Requirements

- Node.js 22.x for local development
- npm 10.x recommended
- Electron 35.x from the locked dependency tree

Use the repository `.nvmrc` and see `docs/development.md` for the Windows Electron setup and clean reinstall procedure.

## Product roadmap

The current implementation status is tracked in `docs/roadmap-implementation.md`. The complete product roadmap is documented in `docs/full-product-roadmap.md` and includes the planned Design Canvas, Webflow/Pinegrow-like HTML5 element insertion, visual editing, editable Inspector, Style Engine, Developer Mode, WebGPU overlay, Rust/WASM analyzer, and product hardening phases.

The near-term sequence after the Preview/selection/Inspector foundations is conservative: Design Canvas navigation, visual overlay hardening, HTML5 insertion commands, then safe editing with undo/redo.

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
npm run validate:preview
npm run validate:dom-snapshot
npm run validate:preview-selection
npm run validate:preview-inspector
npm run validate:design-canvas
npm run validate:visual-selection-overlay
npm run validate:ui-flow
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
- filesystem watcher adapter
- Project Graph watcher/cache validation
- secure custom `crystal-preview://current/<relative-project-path>` protocol
- Preview target selection from Project Graph pages
- manual Load Preview and Reload Preview actions
- controlled Preview reload after relevant watcher refreshes
- visible Preview diagnostics for missing, blocked, or fallback-served resources
- read-only DOM snapshot from static HTML source
- stable DOM snapshot node path metadata
- minimal read-only DOM Tree panel
- injected inactive-by-default Preview selection script for HTML responses
- renderer `postMessage` bridge for read-only Preview selection
- minimal `previewSelection` state and selected-node summary
- conservative read-only mapping between selected Preview nodes and DOM Snapshot paths
- minimal read-only Preview Inspector derived from Preview selection, Preview state, and DOM Snapshot state
- read-only Design Canvas frame around the Preview surface
- Design Canvas viewport state with pan, wide safe zoom, fit, center, and reset
- natural mouse, middle-button, keyboard, trackpad, pinch, and zoom-drag canvas navigation with normalized wheel deltas
- explicit wheel/trackpad/pinch gesture classification for zoom, free pan, iframe scroll passthrough, and safe ignore
- explicit pointer gesture classification for canvas pan and double tap/click zoom-drag
- Space + drag canvas panning and Ctrl/Cmd + wheel or Chromium-emulated pinch canvas zooming while normal wheel and two-finger trackpad scroll remain available to the Preview iframe
- double tap/click plus upward or downward pointer movement for focal canvas zoom-drag when Chromium/Electron exposes a detectable sequence
- first read-only Visual Selection Overlay projected outside the Preview iframe
- compact current-feature UI flow shell with clearer action groups, status badges, metadata, and empty states
- `validate:preview` for non-visual Preview checks
- `validate:dom-snapshot` for non-visual DOM snapshot checks
- `validate:preview-selection` for non-visual Preview selection and mapping checks
- `validate:preview-inspector` for non-visual Preview Inspector model, UI, and boundary checks
- `validate:design-canvas` for non-visual Design Canvas navigation and boundary checks
- `validate:visual-selection-overlay` for non-visual Visual Selection Overlay checks
- `validate:ui-flow` for static current-feature shell, label, action hierarchy, and forbidden UI behavior checks
- local validation runner for pre-merge checks
- Electron local environment diagnostics

Intentionally out of scope:

- visual Design MVP editing
- Inspector MVP editing and CSS analysis
- Developer IDE features
- WebGPU overlay implementation
- Rust/WASM analyzer implementation
- code editor
- integrated terminal
- persistent overlays, rulers, guides, grids, snapping, or bounding boxes
- computed styles and visual style editing
- editable attributes or source mutation from selection
- HTML insertion, text editing, attribute editing, or DOM movement
- scroll-to-node, functional breadcrumbs, or DOM Tree navigation from Preview selection
- Electron UI automation frameworks such as Playwright, Cypress, or Spectron

## Project Graph scan

Use the app side bar buttons to open a folder or an HTML file. Crystal scans the selected project root through main-process IPC, builds a Project Graph in core, and sends a serializable result to the renderer.

The scanner detects local HTML pages, stylesheets, scripts, static imports, CSS `@import`, CSS `url(...)`, common media references, assets, external routes, and missing local references. It does not execute scripts, resolve framework aliases, analyze CSS cascade, or parse TypeScript semantics.

## Current feature UI flow shell

The current shell polish does not add product features. It clarifies the existing read-only flow: Open Project or Open HTML, inspect Project Graph status, Load Preview, Reload Preview when needed, enable Select Mode, inspect the selected node, use DOM Snapshot when mapping needs it, and read Preview issues separately from Project Graph and DOM Snapshot issues.

The renderer groups actions by intent: primary entry actions, secondary refresh/navigation actions, and contextual actions such as Clear Selection, Clear DOM Snapshot, watcher controls, and Visual Overlay toggling. Status badges and compact metadata are presentation-only; they do not change IPC, Preview protocol, DOM Snapshot parsing, Design Canvas navigation, or Visual Selection Overlay projection.

## Real project preview

Open `fixtures/sample-html-project` or another HTML project, then use the Preview panel in the Design view.

The renderer calls the typed preload API for load, reload, target selection, and state. Electron main resolves the requested page against the active Project Graph and root, validates that the file remains inside the project, and returns a `crystal-preview://current/<relative-project-path>` URL.

The custom Preview protocol is registered in Electron main before app readiness for scheme privileges, then handled after app readiness. It serves only active-project files and rejects traversal or out-of-project requests.

Preview diagnostics are produced by Electron main and the protocol handler. The renderer only displays sanitized state delivered through `project:preview-updated`; it does not inspect the filesystem and does not receive absolute filesystem paths. Missing assets, traversal attempts, out-of-root resources, read failures, and unsupported MIME fallbacks are reported as Preview issues.

Repeated issues are coalesced by type, safe path, and reason. Crystal keeps at most 50 recent Preview issues in memory. Unsupported MIME fallbacks are warnings only when an existing file is served with `application/octet-stream`.

Watcher reload is conservative. Preview reload is considered after Project Graph refresh completion and only for the current page or direct dependencies. Ignored paths, including `.crystal-cache`, do not request Preview reload.

## Design Canvas navigation read-only

The Design Canvas wraps only the visual Preview frame. Preview panel controls, target selection, Preview issues, selected-node summary, and Preview Inspector remain outside the transform and are not scaled by pan or zoom.

The current Design Canvas supports Space + drag panning, middle mouse panning where the event reaches the canvas, empty-background drag panning, natural wheel/trackpad panning on the canvas background, Ctrl/Cmd + wheel or trackpad zooming, double tap/click plus vertical zoom-drag when the platform emits a detectable sequence, Fit, Center, Reset, visible zoom percentage, a simple desktop page frame, and in-memory viewport state for the current renderer session. Zoom is intentionally broad with explicit safety limits, not mathematically infinite: it supports very large zoom out/in while clamping invalid values, preserving numeric stability, normalizing wheel and trackpad delta modes, and keeping the frame recoverable through pan bounds.

The canvas does not use scrollbars, straight vertical scroll, or straight horizontal scroll as its primary navigation model. Its surface hides overflow, contains overscroll, and moves the Preview frame through transform-based pan and zoom. Normal mouse wheel input and normal trackpad two-finger scroll are left to the Preview iframe so the loaded page can scroll. Wheel or trackpad gestures on empty canvas background become free pan vectors in X/Y, so diagonal input moves diagonally and the gesture is contained instead of scrolling the surrounding Crystal UI.

Ctrl/Cmd + wheel or Chromium's Ctrl-emulated trackpad pinch is reserved for Design Canvas zoom. The zoom is focal: it uses the pointer position over the Design Canvas surface to keep the point under the cursor visually stable where possible. Pinch support depends on how Chromium and the operating system emit the gesture, but Crystal consistently treats `wheel` + `ctrlKey` as canvas zoom and prevents that gesture from becoming Crystal UI scroll.

Double tap, double click, or a detectable equivalent sequence on the navigable canvas surface starts temporary zoom-drag. During zoom-drag, moving upward zooms in and moving downward zooms out using the same safe multiplicative zoom path and the double-tap focus point. If Chromium/Electron or the operating system does not expose the sequence distinctly, Crystal falls back to Ctrl/Cmd + wheel, Ctrl-emulated pinch, Fit, Center, and Reset.

The capture layer is external to the user document and has `pointer-events: none` in the normal state. It is enabled only during explicit canvas navigation states such as Space, Ctrl/Cmd, active pan, wheel zoom, or zoom-drag, then returns to non-blocking mode so the iframe receives normal click, wheel, scroll, and selection interaction again.

Fit, Center, and Reset are recovery controls. Fit brings the frame back into the visible work area, Center recenters at the current zoom, and Reset returns to 100% zoom centered.

This layer does not edit HTML, insert elements, move DOM nodes, edit text, edit attributes, query the live iframe document, call `iframe.contentDocument`, call `iframe.contentWindow.document`, compute styles, inspect box model, draw persistent bounding boxes, use a canvas overlay, access WebGPU, write files, or relax the iframe sandbox.

## Preview selection read-only

Preview selection remains read-only. It uses the existing injected selection script and message bridge, keeps selection mode off by default, and reports only a bounded selected-node summary plus conservative mapping metadata.

Selection mapping still requires a trusted DOM Snapshot match before downstream panels present a mapped snapshot node. Missing, stale, mismatched, and ambiguous mapping states remain defensive states; this PR only makes those states easier to read in the current UI.

## Preview Inspector read-only

The Preview Inspector remains a derived read-only panel based on Preview state, Preview selection state, and DOM Snapshot state. It does not introduce editable Inspector behavior, independent Inspector state, computed styles, box model data, source mutation, or scroll-to-node behavior.

When mapping is trusted, the panel shows structural snapshot details. When mapping is missing, stale, mismatched, ambiguous, or defensive, it keeps selected-node identity visible without inventing trusted snapshot details.

## DOM snapshot read-only

The DOM Tree panel still builds a structural snapshot from the current Preview target source. The snapshot remains bounded, tolerant of limited malformed HTML, and explicitly reports truncation and parser issues without absolute filesystem paths.

This PR does not change DOM Snapshot parsing, source resolution, snapshot path generation, parser limits, or tree rendering semantics. It only clarifies the surrounding action hierarchy and empty/stale/issue messages.
