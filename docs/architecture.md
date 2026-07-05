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

The Phase 2 Preview model lives under `packages/core/project/preview/`. It defines Preview state, target selection, safe relative path resolution, and reload planning without depending on Electron renderer code.

Electron main owns the actual Preview service and the `crystal-preview://current/<relative-project-path>` protocol. The protocol scheme privileges are registered before app readiness. The protocol handler is registered after app readiness, resolves requests against the active project root, and rejects traversal or out-of-project paths.

The renderer does not build absolute file paths. It calls explicit preload methods for load, reload, target selection, and state. Main resolves targets from the active Project Graph and returns a safe Preview URL.

The Preview frame is intentionally limited to real HTML rendering. It is not a DOM selection surface, Inspector, editor, canvas, or overlay engine in this phase.

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

The current Project Graph is intentionally shallow. It detects files, HTML pages, direct dependencies, basic CSS references, basic script imports, external routes, and missing local routes. It now includes watcher/cache plumbing, conservative semi-incremental refresh planning, and the first real Chromium Preview. It does not implement DOM snapshots, DOM tree, visual selection, CSS cascade analysis, framework alias resolution, editor features, WebGPU overlay, or Rust/WASM analysis.
