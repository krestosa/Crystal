# 0001 — Electron Security Boundaries

[Docs index](../README.md)

## Status

Accepted.

## Context

Crystal loads real user HTML next to privileged desktop code. Without strict boundaries, a project page, renderer bug, or convenience shortcut could reach filesystem capabilities that belong only to Electron main.

## Decision

Keep renderer unprivileged. Use `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and `webSecurity: true`. Expose only a controlled preload API. Keep filesystem access in main/adapters. Keep Preview iframe isolation and avoid live iframe DOM reads from renderer.

## Consequences

Feature work must cross explicit APIs even when a shortcut would be faster. Direct iframe access, raw IPC, and relaxed sandboxing are not acceptable ways to implement inspection or editing.

## Current implementation

Implemented in:

- `apps/desktop/electron/main/security/web-preferences.ts`
- `apps/desktop/electron/preload/bridges/crystal-api.bridge.ts`
- `apps/desktop/electron/main/preview/project-preview-protocol.ts`

## Related docs

- [Security model](../architecture/security-model.md)
- [Preview safety](../architecture/preview/preview-safety.md)
- [Security boundaries diagram](../architecture/diagrams/security-boundaries.md)
