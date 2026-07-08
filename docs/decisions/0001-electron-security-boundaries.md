# 0001 — Electron Security Boundaries

[Docs index](../README.md)

## Status

Accepted.

## Context

Crystal loads real user HTML projects and also runs privileged desktop code. Without strict boundaries, a project preview or renderer bug could access filesystem capabilities that belong only to Electron main.

## Decision

Keep Electron renderer unprivileged. Use `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and `webSecurity: true`. Expose only a controlled preload API. Keep filesystem access in main/adapters. Keep Preview iframe isolated and avoid live iframe DOM reads.

## Consequences

Renderer features must request data through typed preload/main paths. Some UI features are slower to implement because shortcuts such as direct iframe DOM reads, raw IPC, or relaxed sandboxing are not allowed. This is intentional.

## Current implementation

Implemented in:

- `apps/desktop/electron/main/security/web-preferences.ts`
- `apps/desktop/electron/preload/bridges/crystal-api.bridge.ts`
- `apps/desktop/electron/main/preview/project-preview-protocol.ts`

## Related docs

- [Security model](../architecture/security-model.md)
- [Preview safety](../architecture/preview/preview-safety.md)
- [Security boundaries diagram](../architecture/diagrams/security-boundaries.md)
