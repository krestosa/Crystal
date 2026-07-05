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

## Project Graph boundary

The Project Graph lives under `packages/core/project/` and is split into graph, file classification, path resolution, dependency detection, scanning, watching, cache, metadata, and refresh modules. The scanner receives a minimal filesystem abstraction and does not depend on Electron.

The Node filesystem implementation is isolated under `packages/adapters/file-system/`. The watcher implementation is isolated under `packages/adapters/file-watcher/`. Electron main wires those adapters to core services and exposes only specific project methods through IPC.

## Preview boundary

The Phase 2 Preview model lives under `packages/core/project/preview/`. It defines Preview state, target selection, safe relative path resolution, issue modeling, issue coalescing, and reload planning without depending on Electron renderer code.

Electron main owns the actual Preview service and the `crystal-preview://current/<relative-project-path>` protocol. The protocol scheme privileges are registered before app readiness. The protocol handler is registered after app readiness, resolves requests against the active project root, and rejects traversal or out-of-project paths.

The protocol reports failed or blocked requests into Preview state as sanitized issues. Missing files, invalid preview URLs, path traversal, realpath targets outside the active root, read failures, and unsupported MIME fallback are produced in main. The renderer displays only relative paths or sanitized `crystal-preview://current/...` request URLs.

Preview issues are coalesced by issue type, safe path, and reason. The state keeps a bounded recent list of 50 issues, plus `issueCount` and `lastIssueAt`. This prevents repeated iframe retries for the same missing asset from producing unbounded UI noise.

The renderer does not build absolute file paths. It calls explicit preload methods for load, reload, target selection, and state. Main resolves targets from the active Project Graph and returns a safe Preview URL.

The Preview frame is intentionally limited to real HTML rendering, diagnostics, read-only DOM snapshots, and basic read-only node selection. It is not an Inspector, editor, browser console, canvas, or overlay engine in this phase.

## Preview selection boundary

The Phase 2 Preview selection model lives under `packages/core/project/preview-selection/`. It defines `previewSelection` state separately from Preview load state and DOM snapshot state. The state stores only whether selection mode is enabled, the current mode, a sanitized selected-node summary, the last selected timestamp, and one controlled issue.

Electron main owns the authoritative Preview selection state and exposes only explicit IPC channels for get-state, enable, disable, clear, set-selected-node, and state-changed. Main validates every selected-node payload before saving it. Invalid payloads do not replace the current `selectedNode`; they only produce a controlled `lastIssue` without absolute paths or raw dangerous data.

The Preview document receives an injected script only for HTML responses served through `crystal-preview://`. The script is inactive by default. The renderer toggles it with namespaced `postMessage` commands: `crystal:preview-selection:enable`, `crystal:preview-selection:disable`, and `crystal:preview-selection:clear`.

The Preview iframe remains sandboxed without `allow-same-origin`. Since the iframe can have an opaque origin, the renderer does not depend on `event.origin`. It accepts selected-node messages only when `event.source === iframe.contentWindow` and the message type is `crystal:preview-selection:selected`.

The renderer bridge never reads `iframe.contentDocument`, never reads `iframe.contentWindow.document`, and never exposes Node or filesystem APIs to the iframe. It validates selected-node payloads locally before IPC, then main validates the sanitized payload again.

Selected-node data is read-only UI state. It can show `snapshotPath`, normalized `tagName`, `siblingIndex`, `depth`, limited `attributesPreview`, limited `textPreview`, and limited `selectorPreview`. It cannot edit attributes, mutate project files, compute styles, scroll to source, or drive Inspector behavior.

Live-DOM `snapshotPath` values can diverge from static DOM snapshot paths because the browser can insert implicit nodes, recover malformed HTML differently, or execute project scripts that mutate the DOM. Exact live-DOM to static-source mapping is deferred.

## DOM snapshot boundary

The Phase 2 DOM snapshot model lives under `packages/core/project/dom/`. It defines a read-only `ProjectDomSnapshot`, `ProjectDomNode`, attributes, status, bounded issues, limits, text preview helpers, and a minimal static HTML snapshot builder.

Electron main owns the DOM snapshot service. It reads only the current Preview target that was already resolved by the Preview service and returns sanitized state through explicit IPC channels. The renderer can request build, get state, clear state, and subscribe to snapshot updates through preload. The renderer never receives absolute filesystem paths.

The first DOM snapshot source is `html-source`: static HTML read from the active target file. Crystal does not inspect the live iframe DOM, does not add runtime code to the Preview document, and does not relax Preview frame isolation for this feature.

Serialized DOM snapshot nodes use structural metadata. The document root uses `snapshotPath: "0"` and `id: "dom-node:0"`. Children derive their path from their serialized sibling position, for example `0/1/3`, and expose `siblingIndex`, `tagName`, and `depth`. This is deterministic for the same static HTML and traversal, but it is not a CSS selector and not a browser live-node identity.

The parser is intentionally limited. It recognizes doctype, comments, elements, double-quoted attributes, single-quoted attributes, unquoted attributes, boolean attributes, void elements, self-closing syntax, text before or after elements, basic nesting recovery, and simple raw text handling for `script` and `style`.

The parser is not browser-grade. It does not execute scripts, inspect iframe runtime DOM, evaluate templates, model framework components, compute styles, infer layout, or reproduce every browser error-recovery rule. Common malformed or unsupported patterns are recovered with controlled issues such as `malformed-tag`, `unclosed-tag`, and `unsupported-html-pattern` when possible.

The snapshot is bounded by `maxNodes`, `maxDepth`, `maxTextPreviewLength`, `maxAttributeValueLength`, and `maxAttributesPerNode`. Limit handling marks affected nodes as truncated, renders `… truncated`, sets `isTruncated`, keeps `nodeCount` aligned with serialized nodes including `#document`, and reports issues such as `text-truncated`, `attributes-truncated`, `max-nodes-reached`, and `max-depth-reached` without absolute paths.

The DOM Tree panel remains read-only text output. It may show subtle path metadata, but it does not implement click-to-select, hover highlight, overlays, bounding boxes, scroll-to-node, breadcrumbs, style inspection, computed styles, or editing.

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

The current Project Graph is intentionally shallow. It detects files, HTML pages, direct dependencies, basic CSS references, basic script imports, external routes, and missing local routes. It now includes watcher/cache plumbing, conservative semi-incremental refresh planning, the first real Chromium Preview, sanitized Preview diagnostics, a hardened read-only static DOM snapshot foundation, and a basic read-only Preview selection bridge. It does not implement Inspector MVP, visual editing, editable attributes, computed styles, live/static DOM path reconciliation, CSS cascade analysis, framework alias resolution, editor features, WebGPU overlay, or Rust/WASM analysis.
