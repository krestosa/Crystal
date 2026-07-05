# Project Graph watcher and cache

This document describes the extended Phase 1 watcher/cache foundation.

## Watcher

The filesystem watcher lives behind `packages/adapters/file-watcher/`. Core modules receive normalized Project Graph watch events and do not import Electron or Node watcher APIs directly.

Ignored directories include `node_modules`, `.git`, `dist`, `.cache`, `.crystal-cache`, `.next`, `.nuxt`, `.vite`, and `coverage`. Temporary files such as `.tmp`, `.temp`, `.swp`, `.DS_Store`, and `Thumbs.db` are ignored.

The renderer does not access `fs`. It can only call explicit preload methods for starting/stopping the watcher, reading watcher state, refreshing the graph, and clearing the graph cache.

## Batching

Watch events are batched with a short debounce window. Duplicate path events are collapsed, and stronger events such as deletes dominate ordinary changes. This prevents one graph refresh per raw filesystem notification.

## Cache

The current cache is in-memory only. It stores:

- root path
- graph snapshot
- file metadata
- scan timestamp
- cache schema version
- Crystal cache version
- issues from the last scan

Disk cache is deferred. If added later, it should use `.crystal-cache/`, avoid unsafe path writes, and avoid heavy content payloads.

## Refresh

The refresh strategy is conservative:

- clear small changes use `semi-incremental` mode
- deletes, renames, unknown events, or large batches force a full Project Graph rescan

This is not a perfect incremental parser. It is a controlled Phase 1 foundation designed to be replaced or hardened by a future diff/parser pipeline.

## Phase 2 boundary

Real Chromium preview, preview reload, DOM tree, DOM selection, bounding boxes, Design MVP, Inspector MVP, Developer IDE, WebGPU overlay, and Rust/WASM analyzer are not implemented here.
