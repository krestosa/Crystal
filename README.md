# Crystal

Crystal is a new desktop application for creating, inspecting, and modifying real HTML projects and their related assets.

This repository now covers roadmap Phase -1, the minimal Phase 0 tooling foundation, the Phase 1 Project Graph foundation with watcher/cache support, and the first Phase 2 real project preview with hardened read-only DOM snapshot and basic read-only Preview selection support.

## Requirements

- Node.js 22.x for local development
- npm 10.x recommended
- Electron 35.x from the locked dependency tree

Use the repository `.nvmrc` and see `docs/development.md` for the Windows Electron setup and clean reinstall procedure.

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
- `validate:preview` for non-visual Preview checks
- `validate:dom-snapshot` for non-visual DOM snapshot checks
- `validate:preview-selection` for non-visual Preview selection checks
- local validation runner for pre-merge checks
- Electron local environment diagnostics

Intentionally out of scope:

- visual Design MVP editing
- Inspector MVP
- Developer IDE features
- WebGPU overlay implementation
- Rust/WASM analyzer implementation
- code editor
- integrated terminal
- DOM visual selection canvas, persistent overlays, or bounding boxes
- computed styles and visual style editing
- editable attributes or source mutation from selection
- Electron UI automation frameworks such as Playwright, Cypress, or Spectron

## Project Graph scan

Use the app side bar buttons to open a folder or an HTML file. Crystal scans the selected project root through main-process IPC, builds a Project Graph in core, and sends a serializable result to the renderer.

The scanner detects local HTML pages, stylesheets, scripts, static imports, CSS `@import`, CSS `url(...)`, common media references, assets, external routes, and missing local references. It does not execute scripts, resolve framework aliases, analyze CSS cascade, or parse TypeScript semantics.

## Real project preview

Open `fixtures/sample-html-project` or another HTML project, then use the Preview panel in the Design view.

The renderer calls the typed preload API for load, reload, target selection, and state. Electron main resolves the requested page against the active Project Graph and root, validates that the file remains inside the project, and returns a `crystal-preview://current/<relative-project-path>` URL.

The custom Preview protocol is registered in Electron main before app readiness for scheme privileges, then handled after app readiness. It serves only active-project files and rejects traversal or out-of-project requests.

Preview diagnostics are produced by Electron main and the protocol handler. The renderer only displays sanitized state delivered through `project:preview-updated`; it does not inspect the filesystem and does not receive absolute filesystem paths. Missing assets, traversal attempts, out-of-root resources, read failures, and unsupported MIME fallbacks are reported as Preview issues.

Repeated issues are coalesced by type, safe path, and reason. Crystal keeps at most 50 recent Preview issues in memory. Unsupported MIME fallbacks are warnings only when an existing file is served with `application/octet-stream`.

Watcher reload is conservative. Preview reload is considered after Project Graph refresh completion and only for the current page or direct dependencies. Ignored paths, including `.crystal-cache`, do not request Preview reload.

## Preview selection read-only

Preview selection is a basic read-only bridge built on the injected script served only for HTML responses through `crystal-preview://`. Selection mode is off by default. The renderer toggles it by sending `crystal:preview-selection:enable`, `crystal:preview-selection:disable`, and `crystal:preview-selection:clear` to the iframe with `iframe.contentWindow.postMessage(...)`.

The Preview iframe remains sandboxed without `allow-same-origin`. Because the sandbox can give the iframe an opaque origin, the renderer does not depend on `event.origin`. It accepts selected-node messages only when `event.source === iframe.contentWindow` and the message type is `crystal:preview-selection:selected`.

The renderer never reads `iframe.contentDocument`, never reads `iframe.contentWindow.document`, never exposes Node or filesystem APIs to the iframe, and never writes to project files. The payload is validated locally in the renderer and again in Electron main before it can update `previewSelection` state.

The selected-node summary is strictly read-only. It shows a bounded `snapshotPath`, normalized `tagName`, `selectorPreview`, limited `attributesPreview`, and limited `textPreview`. `Clear Selection` clears `selectedNode` and the temporary highlight. If selection mode is enabled, clearing returns the state to `selecting`; if it is disabled, clearing returns it to `idle`. Reloading Preview or changing target clears the current selected node so stale live-DOM selections are not presented as valid.

The `snapshotPath` comes from the browser's live DOM at click time. The DOM Tree snapshot is built separately from static HTML source. Those paths usually align for simple static HTML, but they can diverge when the browser inserts implicit nodes, repairs malformed HTML differently, or project scripts mutate the DOM. Exact live-DOM to static-snapshot mapping is intentionally not implemented yet.

## DOM snapshot read-only

The DOM Tree panel builds a read-only structural snapshot from the current Preview target's HTML source. It does not inspect the live iframe DOM, add runtime code to the Preview document, expose Node to the Preview frame, or read arbitrary renderer paths.

Each serialized node has a deterministic structural `snapshotPath` such as `0/1/3`, a path-based `id` such as `dom-node:0/1/3`, a `siblingIndex`, `tagName`, and `depth`. The path is based on the serialized snapshot tree, not on a CSS selector and not on browser layout state.

The parser is intentionally minimal and tolerant. It covers doctype, comments, elements, double-quoted attributes, single-quoted attributes, unquoted attributes, boolean attributes, void elements, self-closing syntax, basic nesting recovery, text before or after elements, and simple raw text handling for `script` and `style`.

The parser is not browser-grade. It does not execute scripts, inspect the live DOM, evaluate templates, resolve framework component trees, compute CSS, infer layout, or guarantee exact browser error recovery for every malformed HTML pattern. Unsupported or malformed patterns produce controlled issues when possible.

The snapshot is bounded by `maxNodes`, `maxDepth`, `maxTextPreviewLength`, `maxAttributeValueLength`, and `maxAttributesPerNode`. When truncation happens, affected nodes are marked, the tree renders `… truncated`, `isTruncated` is set, and issues such as `text-truncated`, `attributes-truncated`, `max-nodes-reached`, or `max-depth-reached` are reported without absolute filesystem paths.

Visual editing, Inspector MVP, computed styles, breadcrumbs, scroll-to-node behavior, persistent overlays, bounding boxes, WebGPU overlay rendering, and source mutation remain out of scope.
