# 0002 — Read-only Preview First

[Docs index](../README.md)

## Status

Accepted.

## Context

Crystal eventually needs to edit source, but a visual editor without reliable Preview, snapshot, selection, and diagnostics would be unsafe. The browser can recover malformed HTML differently than the static parser, and scripts can change the live DOM after load.

## Decision

Build read-only Preview, DOM Snapshot, Preview Selection, Visual Selection Overlay, and Preview Inspector before enabling writes. Treat missing, stale, mismatched, or ambiguous mapping as defensive state.

## Consequences

The current product can inspect and preview possible changes, but it cannot edit project files. This keeps source correctness and security ahead of visible editing speed.

## Current implementation

Implemented across:

- `packages/core/project/preview/**`
- `packages/core/project/dom/**`
- `packages/core/project/preview-selection/**`
- `packages/core/project/preview-inspector/**`
- `packages/core/project/design-canvas/selection-overlay/**`

## Related docs

- [Preview architecture](../architecture/preview/README.md)
- [DOM Snapshot](../architecture/preview/dom-snapshot.md)
- [Preview Selection](../architecture/preview/preview-selection.md)
- [Visual Selection Overlay](../architecture/preview/visual-selection-overlay.md)
