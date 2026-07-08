# 0002 — Read-only Preview First

[Docs index](../README.md)

## Status

Accepted.

## Context

Crystal must eventually edit real HTML projects, but early editing without trustworthy Preview, DOM Snapshot, selection mapping, and diagnostics would create unsafe source mutation.

## Decision

Build read-only Preview, DOM Snapshot, Preview Selection, Visual Selection Overlay, and Preview Inspector before enabling writes. Treat mismatched, stale, ambiguous, or missing snapshot states as defensive states.

## Consequences

The current product surface can inspect and preview but cannot edit. This keeps security and source correctness ahead of feature velocity.

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
