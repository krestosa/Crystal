# Crystal Architecture

Crystal is a desktop application built from a modular source tree into compact runtime outputs.

## Runtime contexts

Crystal starts with three Electron contexts:

```txt
Electron main process  -> dist/main/main.cjs
Electron preload       -> dist/preload/preload.cjs
Renderer               -> dist/renderer/index.html + main.css + main.js
```

The renderer has no direct Node access. Electron security starts with `contextIsolation: true`, `nodeIntegration: false`, and a controlled preload bridge.

## Project Graph boundary

The Project Graph lives under `packages/core/project/` and is split into graph, file classification, path resolution, dependency detection, scanning, watching, cache, metadata, and refresh modules. The scanner receives a minimal filesystem abstraction and does not depend on Electron.

The Node filesystem implementation is isolated under `packages/adapters/file-system/`. The watcher implementation is isolated under `packages/adapters/file-watcher/`. Electron main wires those adapters to core services and exposes only specific project methods through IPC.

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

## Phase 1 limitations

The current Project Graph is intentionally shallow. It detects files, HTML pages, direct dependencies, basic CSS references, basic script imports, external routes, and missing local routes. It now includes watcher/cache plumbing and conservative semi-incremental refresh planning. It does not implement preview rendering, DOM snapshots, CSS cascade analysis, framework alias resolution, editor features, visual selection, WebGPU overlay, or Rust/WASM analysis.
