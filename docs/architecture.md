# Crystal Architecture

Crystal is a desktop application built from a modular source tree into compact runtime outputs.

## Runtime contexts

Crystal starts with three Electron contexts:

```txt
Electron main process  -> dist/main/main.cjs
Electron preload       -> dist/preload/preload.cjs
Renderer               -> dist/renderer/index.html + main.css + main.js
```

The renderer has no direct Node access. Electron security starts with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, and a controlled preload bridge.

## Product roadmap boundary

The full product roadmap is documented in `docs/full-product-roadmap.md`. It extends beyond the current Preview foundations into Design Canvas navigation, visual overlays, HTML5 element insertion, safe visual editing, editable Inspector, Style Engine, Developer Mode, WebGPU overlays, Rust/WASM analysis, and product hardening.

Those later phases do not change the core architecture boundaries:

- renderer UI must not write project files directly;
- file mutation must go through validated commands and main/core services;
- Preview iframe isolation remains the default;
- WebGPU overlays must belong to Crystal UI, not the user's DOM;
- Rust/WASM analyzers must be introduced behind typed boundaries;
- feature modules must remain small, explicit, and replaceable.

## Project Graph boundary

The Project Graph lives under `packages/core/project/` and is split into graph, file classification, path resolution, dependency detection, scanning, watching, cache, metadata, and refresh modules. The scanner receives a minimal filesystem abstraction and does not depend on Electron.

The Node filesystem implementation is isolated under `packages/adapters/file-system/`. The watcher implementation is isolated under `packages/adapters/file-watcher/`. Electron main wires those adapters to core services and exposes only specific project methods through IPC.

## Preview boundary

The Phase 2 Preview model lives under `packages/core/project/preview/`. It defines Preview state, target selection, safe relative path resolution, issue modeling, issue coalescing, and reload planning without depending on Electron renderer code.

Electron main owns the actual Preview service and the `crystal-preview://current/<relative-project-path>` protocol. The protocol scheme privileges are registered before app readiness. The protocol handler is registered after app readiness, resolves requests against the active project root, and rejects traversal or out-of-project paths.

The protocol reports failed or blocked requests into Preview state as sanitized issues. Missing files, invalid preview URLs, path traversal, realpath targets outside the active root, read failures, and unsupported MIME fallback are produced in main. The renderer displays only relative paths or sanitized `crystal-preview://current/...` request URLs.

Preview issues are coalesced by issue type, safe path, and reason. The state keeps a bounded recent list of 50 issues, plus `issueCount` and `lastIssueAt`. This prevents repeated iframe retries for the same missing asset from producing unbounded UI noise.

The renderer does not build absolute file paths. It calls explicit preload methods for load, reload, target selection, and state. Main resolves targets from the active Project Graph and returns a safe Preview URL.

The Preview frame is intentionally limited to real HTML rendering, diagnostics, read-only DOM snapshots, basic read-only node selection, conservative selection-to-snapshot mapping, and minimal read-only structural inspection. It is not an editor, browser console, CSS Inspector, or overlay engine in this phase.

## Design Canvas navigation boundary

The first Design Canvas navigation layer is split between pure core viewport math and renderer UI. Core owns wide safe zoom bounds, viewport state shape, fit, center, reset, panning, focal zoom, pan recovery clamp, finite-number normalization, and wheel/trackpad delta normalization under `packages/core/project/design-canvas/`. It has no Electron, DOM, filesystem, or renderer dependencies.

Renderer Design Canvas code lives under `apps/desktop/electron/renderer/components/design-canvas/`. The component owns the toolbar, visual surface, transform stage, simple desktop page frame, zoom display, Space + drag panning, middle mouse panning where the event reaches the canvas, focused-canvas keyboard navigation, Ctrl/Cmd + wheel or trackpad zooming, Fit, Center, Reset, and in-memory viewport persistence for the renderer session. Normal mouse wheel and trackpad two-finger input remain available to the Preview iframe for page scrolling.

The transform is intentionally scoped to the visual Preview frame stage only. Preview panel controls, target selection, Preview issues, selected-node summary, and Preview Inspector stay outside the transform so Crystal UI remains readable and clickable at every zoom level.

The zoom model is intentionally broad, not mathematically infinite. It uses a low safe minimum, a high safe maximum, exponential wheel zoom, finite-number normalization, `deltaMode` normalization, and pan clamps so a frame cannot be moved completely outside recoverability. Fit, Center, and Reset are explicit recovery commands.

The external capture layer belongs to Crystal UI, not the user's document. It defaults to `pointer-events: none`; it only captures while Space, Ctrl/Cmd, or pan mode is active. When the interaction ends, the layer returns to non-blocking mode so the iframe can receive normal click, wheel, scroll, and Preview selection events.

Design Canvas navigation is read-only. It must not edit HTML, insert elements, move nodes, mutate attributes, edit text, write files, call computed styles, inspect box model, draw persistent bounding boxes, create a canvas overlay, access WebGPU, use Rust/WASM, or relax iframe sandboxing. It must not read `iframe.contentDocument`, `iframe.contentWindow.document`, `.contentDocument`, or `.contentWindow.document`. Outside active navigation capture states, iframe click, wheel, scroll, and Preview selection interaction remain enabled.

The next layer is Visual Selection and Overlay MVP. That future layer may add technical read-only overlays, but editing still requires command-backed source mutation, write policy, and undo/redo.

## Preview selection boundary

The Phase 2 Preview selection model lives under `packages/core/project/preview-selection/`. It defines `previewSelection` state separately from Preview load state and DOM snapshot state. The state stores whether selection mode is enabled, the current mode, a sanitized selected-node summary, the last selected timestamp, one controlled issue, and read-only mapping metadata.

Electron main owns the authoritative Preview selection state and exposes only explicit IPC channels for get-state, enable, disable, clear, set-selected-node, and state-changed. Main validates every selected-node payload before saving it. Invalid payloads do not replace the current `selectedNode`; they only produce a controlled `lastIssue` without absolute paths or raw dangerous data.

The Preview document receives an injected script only for HTML responses served through `crystal-preview://`. The script is inactive by default. The renderer toggles it with namespaced `postMessage` commands: `crystal:preview-selection:enable`, `crystal:preview-selection:disable`, and `crystal:preview-selection:clear`.

The Preview iframe remains sandboxed without `allow-same-origin`. Since the iframe can have an opaque origin, the renderer does not depend on `event.origin`. It accepts selected-node messages only when `event.source === iframe.contentWindow` and the message type is `crystal:preview-selection:selected`.

The renderer bridge never reads `iframe.contentDocument`, never reads `iframe.contentWindow.document`, and never exposes Node or filesystem APIs to the iframe. It validates selected-node payloads locally before IPC, then main validates the sanitized payload again.

Selected-node data is read-only UI state. It can show `snapshotPath`, normalized `tagName`, `siblingIndex`, `depth`, limited `attributesPreview`, limited `textPreview`, limited `selectorPreview`, `mappingStatus`, `mappedSnapshotPath`, and `mappingReason`. It cannot edit attributes, mutate project files, compute styles, scroll to source, drive editable Inspector behavior, or navigate the DOM Tree.

Live-DOM `snapshotPath` values can diverge from static DOM snapshot paths because the browser can insert implicit nodes, recover malformed HTML differently, or execute project scripts that mutate the DOM. Crystal now makes that relationship explicit instead of assuming equivalence.

Selection mapping is resolved in core against the current `ProjectDomSnapshotState`. The primary identity is the selected `snapshotPath`. A `matched` result requires a static DOM Snapshot node at that path and a matching `tagName`. If no snapshot exists, the state is `missing-snapshot`. If the snapshot is marked stale or belongs to a different Preview target, the state is `stale`. If the path is absent or the tag differs, the state is `mismatched` with a short reason such as `path not found` or `tag mismatch`.

Diagnostic fallback is intentionally weak. Selector, tag, and attribute hints can only identify ambiguity; they cannot create a `matched` identity. If fallback finds multiple plausible static nodes after the primary path fails, the mapping is `ambiguous` with `ambiguous fallback`. If fallback finds zero or one candidate, the primary failure remains `mismatched`.

## Preview Inspector boundary

The minimal Phase 2 Preview Inspector lives under `packages/core/project/preview-inspector/` and renderer `project-preview-panel/inspector/`. It is a derived read-only view model, not a standalone global state. Its inputs are the existing `previewSelection`, `domSnapshot`, and `preview` states.

The core selector resolves structural Inspector data without Electron or DOM access. For `matched` selections, it looks up `mappedSnapshotPath` inside the current static DOM Snapshot and returns snapshot node details: node type, tag name, `snapshotPath`, depth, sibling index, child count, text preview, attributes, source location when available, and truncation state.

Every other mapping state is defensive. `missing-snapshot` asks for a DOM Snapshot build. `stale` recommends rebuilding the DOM Snapshot. `mismatched` and `ambiguous` keep the selected-node identity visible but do not show snapshot node details. If mapping says `matched` but the path is absent from the current snapshot, the Inspector reports a defensive state instead of fabricating a match.

The renderer re-derives the Inspector when Preview selection changes and when DOM Snapshot state changes. It may also re-render from Preview state so snapshot target mismatches remain visible. The Inspector UI is compact and strictly read-only: no inputs, no textareas, no `contenteditable`, no editing buttons, no attribute mutation, no text mutation, no computed styles, no box model, no layout inspector, no CSS inspector, no scroll-to-node, no hover overlay, no bounding boxes, and no live iframe DOM reads.

## DOM snapshot boundary

The Phase 2 DOM snapshot model lives under `packages/core/project/dom/`. It defines a read-only `ProjectDomSnapshot`, `ProjectDomNode`, attributes, status, bounded issues, limits, text preview helpers, and a minimal static HTML snapshot builder.

Electron main owns the DOM snapshot service. It reads only the current Preview target that was already resolved by the Preview service and returns sanitized state through explicit IPC channels. The renderer can request build, get state, clear state, and subscribe to snapshot updates through preload. The renderer never receives absolute filesystem paths.

The first DOM snapshot source is `html-source`: static HTML read from the active target file. Crystal does not inspect the live iframe DOM, does not add runtime code to the Preview document, and does not relax Preview frame isolation for this feature.

Serialized DOM snapshot nodes use structural metadata. The document root uses `snapshotPath: "0"` and `id: "dom-node:0"`. Children derive their path from their serialized sibling position, for example `0/1/3`, and expose `siblingIndex`, `tagName`, and `depth`. This is deterministic for the same static HTML and traversal, but it is not a CSS selector and not a browser live-node identity.

The parser is intentionally limited. It recognizes doctype, comments, elements, double-quoted attributes, single-quoted attributes, unquoted attributes, boolean attributes, void elements, self-closing syntax, text before or after elements, basic nesting recovery, and simple raw text handling for `script` and `style`.

The parser is not browser-grade. It does not execute scripts, inspect iframe runtime DOM, evaluate templates, model framework components, compute styles, infer layout, or reproduce every browser error-recovery rule. Common malformed or unsupported patterns are recovered with controlled issues such as `malformed-tag`, `unclosed-tag`, and `unsupported-html-pattern` when possible.

The snapshot is bounded by `maxNodes`, `maxDepth`, `maxTextPreviewLength`, `maxAttributeValueLength`, and `maxAttributesPerNode`. Limit handling marks affected nodes as truncated, renders `… truncated`, sets `isTruncated`, keeps `nodeCount` aligned with serialized nodes including `#document`, and reports issues such as `text-truncated`, `attributes-truncated`, `max-nodes-reached`, and `max-depth-reached` without absolute paths.

The DOM Tree panel remains read-only text output. It may show subtle path metadata, but it does not implement click-to-select, hover highlight, overlays, bounding boxes, scroll-to-node, breadcrumbs, style inspection, computed styles, or editing.

## Design, editing, and overlay boundaries

Design Canvas, visual overlays, and editing are separate layers. The current Design Canvas owns only navigation: viewport state, page framing, mouse and trackpad pan, wide safe zoom, pan recovery, fit, center, and reset. It does not mutate HTML source by itself.

Visual editing must go through a command pipeline. Commands validate the selected node, mapping state, target source file, allowed operation, and resulting source patch. The renderer may request actions, but main/core services own persistence. Undo/redo must be available before destructive editing becomes normal workflow.

The HTML5 Element Library should produce real HTML through insert commands. It may offer Webflow/Pinegrow-like authoring primitives, but it should not introduce framework lock-in or write opaque proprietary components.

The Style Engine should distinguish authored Sass/SCSS/CSS sources from generated runtime CSS. Style edits must preserve source ownership and should not blindly patch compiled outputs when modular sources exist.

WebGPU overlays belong to Crystal's own technical UI. They may render bounding boxes, handles, guides, rulers, and measurements, but they must not become DOM nodes in the user's project.

Rust/WASM analyzers should accelerate parsing and analysis behind typed boundaries. They should not replace TypeScript core modules wholesale until benchmarks and validation prove the benefit.

## Adapter boundary

Current adapters:

```txt
packages/adapters/bundler/
packages/adapters/sass-compiler/
packages/adapters/html-assembler/
packages/adapters/file-system/
packages/adapters/file-watcher/
```

## Watch/cache boundary

Watch events are normalized in core, batched, and then passed through a controlled refresh planner. The current cache is in-memory and stores graph snapshot, file metadata, timestamps, versions, and issues. Disk cache is deferred.

Preview reload is downstream of Project Graph refresh. Watcher events do not reload Preview directly. After refresh completion, Preview reload is considered for the active page and direct dependencies only.

## Current limitations

The current Project Graph is intentionally shallow. It detects files, HTML pages, direct dependencies, basic CSS references, basic script imports, external routes, and missing local routes. It now includes watcher/cache plumbing, conservative semi-incremental refresh planning, the first real Chromium Preview, sanitized Preview diagnostics, a hardened read-only static DOM snapshot foundation, a basic read-only Preview selection bridge, conservative read-only selection mapping, a minimal read-only Preview Inspector, and read-only Design Canvas navigation with broad safe zoom, trackpad/mouse input handling, and iframe interaction passthrough. It does not implement Inspector MVP editing, visual editing, editable attributes, computed styles, box model inspection, CSS cascade analysis, framework alias resolution, editor features, WebGPU overlay, or Rust/WASM analysis.
