# 0001 — Electron Security Boundaries

[Docs index](../README.md)

> **Decision in one sentence:** Crystal keeps renderer and Preview content unprivileged; Electron main owns filesystem and protocol authority behind a constrained preload API.

## Status

Accepted.

## Context

Crystal displays real project HTML next to desktop code that can read local files. Project scripts, malformed pages, renderer defects, and convenience-oriented implementation choices must not gain the same authority as Electron main.

The product also needs source-derived inspection. Relaxing the iframe or exposing generic IPC would make that work easier in the short term but would erase the boundary the editor depends on.

## Decision

Use hardened BrowserWindow preferences: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and `webSecurity: true`.

Expose named typed operations through preload instead of raw `ipcRenderer`. Keep filesystem, watcher, protocol, and future persistence effects in main and adapters. Serve Preview resources only after active-root containment. Keep the Preview iframe isolated and obtain selection through bounded messages rather than live iframe document access.

## Options considered

| Option | Why rejected or accepted |
| --- | --- |
| Hardened Electron preferences and constrained preload | Accepted because authority remains explicit and reviewable. |
| Raw IPC in renderer | Rejected because browser UI could call arbitrary privileged channels. |
| `allow-same-origin` or live iframe inspection | Rejected because project content would become too tightly coupled to trusted UI. |
| Renderer filesystem helpers | Rejected because source effects belong to main-owned services. |

## Consequences

Features must cross explicit APIs even when that adds work. Direct `iframe.contentDocument` access, raw IPC, renderer `fs`, and relaxed sandboxing are not acceptable implementations of inspection or editing.

Missing information should become a bounded source-derived model or a visible unsupported state. A future writer must add gates behind main-owned authority rather than weakening the current model.

## Current implementation

The decision is represented in `web-preferences.ts`, `crystal-api.bridge.ts`, shared IPC contracts, the Preview protocol, DOM Snapshot source reads, and selection-message validation.

## Related docs

- [Security model](../architecture/security-model.md)
- [Preview safety](../architecture/preview/preview-safety.md)
- [Security boundaries diagram](../architecture/diagrams/security-boundaries.md)
