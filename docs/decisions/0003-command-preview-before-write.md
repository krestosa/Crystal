# 0003 — Command Preview Before Write

[Docs index](../README.md)

> **Decision in one sentence:** Crystal previews command effects as inspectable source descriptions before any write execution path exists.

## Status

Accepted.

## Context

HTML insertion and later visual editing need trustworthy source planning. Applying patches before preview, validation, history, and refresh planning would make source mutation fragile.

## Decision

Introduce command contracts, Source Patch Preview, HTML insertion preview planning, and Command Preview Bus dry-run results before implementing command execution. Keep real writes, patch apply, write IPC, undo/redo, and save/apply workflow blocked.

## Options considered

| Option | Why rejected or accepted |
| --- | --- |
| Preview before write | Accepted because users and validators can inspect intent. |
| Hidden apply inside preview helpers | Rejected because side effects would be hard to validate. |
| Renderer-owned file writes | Rejected because main/core must own privileged mutation. |
| Treat `preview-ready` as write-ready | Rejected because preview lacks transaction and freshness checks. |

## Consequences

The Element Library can show what a future insertion may look like, but it cannot insert. `preview-ready` means previewable only; it is not an applied state and not permission to write.

## Current implementation

Implemented dry-run modules:

- `packages/core/commands/command-preview-bus/**`
- `packages/core/commands/html-insertion/**`
- `packages/core/source-patch/**`
- `apps/desktop/electron/renderer/components/html-element-library-panel/**`

## Related docs

- [Command Preview Bus](../architecture/commands/command-preview-bus.md)
- [Source Patch Preview](../architecture/commands/source-patch-preview.md)
- [Future write flow](../architecture/flows/future-write-flow.md)
