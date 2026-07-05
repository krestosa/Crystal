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

The Project Graph lives under `packages/core/project/` and is split into graph, file classification, path resolution, dependency detection, and scanning modules. The scanner receives a minimal filesystem abstraction and does not depend on Electron.

The Node filesystem implementation is isolated under `packages/adapters/file-system/`. Electron main wires that adapter to the scanner and exposes only specific project methods through IPC.

## Adapter boundary

Current adapters:

```txt
packages/adapters/bundler/
packages/adapters/sass-compiler/
packages/adapters/html-assembler/
packages/adapters/file-system/
```

## Phase 1 limitations

The current Project Graph is intentionally shallow. It detects files, HTML pages, direct dependencies, basic CSS references, basic script imports, external routes, and missing local routes. It does not implement preview rendering, DOM snapshots, watcher/cache, CSS cascade analysis, framework alias resolution, editor features, or visual selection.
