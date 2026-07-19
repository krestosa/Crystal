# 0002 — Read-only Preview First

[Docs index](../README.md)

> **Decision in one sentence:** Crystal establishes reliable Preview, source structure, selection, overlay, and Inspector behavior before enabling any source mutation.

## Status

Accepted.

## Context

A visual editor cannot safely write a source node until it knows which project page is active, how the browser rendered it, what static source structure exists, and whether a visual interaction maps to that structure. Chromium may recover malformed markup differently from a bounded parser, and scripts may alter the live DOM after load.

Starting with visible editing would make the easiest implementation—the live DOM—look authoritative even when it diverges from source.

## Decision

Build a root-contained read-only Project Preview, static DOM Snapshot, bounded Preview Selection, defensive source mapping, external Visual Selection Overlay, and read-only Preview Inspector before implementing writes.

Treat missing, stale, mismatched, and ambiguous mapping as valid defensive states. Keep the project page isolated and keep Crystal overlays outside its DOM.

## Options considered

| Option | Why rejected or accepted |
| --- | --- |
| Read-only foundations first | Accepted because source identity and failure states precede mutation. |
| Visual editing before mapping | Rejected because a click alone is not enough authority to patch source. |
| Live iframe DOM as source truth | Rejected because browser runtime state can diverge from authored source. |
| Editable Inspector in the same phase | Rejected because command, transaction, persistence, and refresh contracts were absent. |

## Consequences

The current product can render, navigate, select, inspect, project a highlight, and preview possible source text while remaining read-only. This limits visible editing progress, but it protects project source and creates reusable evidence for later commands.

A matched selection is still not permission to write; future execution must revalidate source freshness and command policy.

## Current implementation

The decision is implemented across Project Preview, DOM Snapshot, Preview Selection, Preview Inspector, Design Canvas, and selection-overlay modules and validators.

## Related docs

- [Preview architecture](../architecture/preview/README.md)
- [DOM Snapshot](../architecture/preview/dom-snapshot.md)
- [Preview Selection](../architecture/preview/preview-selection.md)
- [Visual Selection Overlay](../architecture/preview/visual-selection-overlay.md)
