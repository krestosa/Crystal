# Project Graph watcher and cache

[Docs index](./README.md)

The watcher keeps Project Graph state responsive without turning raw filesystem events into uncontrolled rescans. Node-specific watching stays behind `packages/adapters/file-watcher/`; core receives normalized events and decides how conservatively the graph should refresh.

## What is watched

The adapter ignores common dependency, build, cache, and VCS directories such as `node_modules`, `.git`, `dist`, `.cache`, `.crystal-cache`, `.next`, `.nuxt`, `.vite`, and `coverage`. Temporary editor and operating-system files are ignored as noise.

Renderer never opens a watcher or imports `fs`. It requests start, stop, state, graph refresh, or cache clearing through the preload API. Main owns the watcher lifecycle and emits sanitized state updates.

## Batching and refresh

Raw notifications are debounced into a short batch. Duplicate path events collapse, while stronger events such as delete or rename take precedence over ordinary change notifications.

Small, unambiguous batches may use the semi-incremental refresh planner. Deletes, renames, unknown events, and large batches force a full rescan. This is deliberately conservative: the current graph is shallow, so correctness is more valuable than pretending every filesystem event can be updated incrementally.

## Cache model

The cache is in-memory only. It stores the active root, graph snapshot, file metadata, scan timestamp, schema/version data, and issues from the last scan. Disk persistence is not implemented.

A future disk cache would need a safe project-relative location, version invalidation, bounded payloads, and explicit cleanup. The existing `.crystal-cache` ignore rule reserves a possible location; it does not mean a disk cache exists.

## Preview relationship

Watcher events do not reload Preview directly. Graph refresh completes first. Preview reload is considered afterward for the active page and its direct dependencies, which keeps file notification noise from bypassing project-state reasoning.

## Validation

Run:

```bash
npm run validate:project-watch
npm run validate:local:watch
```

These gates cover normalization, batching, refresh planning, ignored paths, cache behavior, and lifecycle wiring.
