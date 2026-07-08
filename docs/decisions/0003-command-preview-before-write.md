# 0003 — Command Preview Before Write

[Docs index](../README.md)

## Status

Accepted.

## Context

HTML insertion and later visual editing need trustworthy source planning before any file mutation is allowed. Applying patches before preview, validation, history, and refresh planning would make the editor unsafe.

## Decision

Introduce command contracts, Source Patch Preview, HTML insertion preview planning, and Command Preview Bus dry-run results before implementing command execution. Keep real writes, apply, write IPC, undo/redo, and save/apply workflow blocked.

## Consequences

The Element Library can show what a future insertion may look like, but it cannot insert. `preview-ready` means previewable only; it is not an applied state.

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
