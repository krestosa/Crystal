# 0003 — Command Preview Before Write

[Docs index](../README.md)

> **Decision in one sentence:** Crystal makes command intent and source effects inspectable as dry-run previews before creating any write execution path.

## Status

Accepted.

## Context

HTML insertion and later visual editing need more than a target and a string. They need source locations, command validation, reviewable output, conflict checks, reversibility, dirty state, refresh behavior, and user approval.

Applying patches before those contracts exist would couple UI intent directly to fragile source mutation and make failures difficult to explain or undo.

## Decision

Introduce typed command intent, target eligibility, source anchors, HTML insertion preview planning, Source Patch Preview, and Command Preview Bus result states before implementing execution.

Keep file writes, patch application, write IPC, real undo/redo, save/apply, and refresh execution blocked. `preview-ready` means that Crystal can display a dry-run result; it is not a write-ready status.

## Options considered

| Option | Why rejected or accepted |
| --- | --- |
| Preview before write | Accepted because intent and source effects become reviewable and testable. |
| Hidden apply inside preview helpers | Rejected because side effects would escape transaction and policy gates. |
| Renderer-owned writes | Rejected because privileged mutation belongs to main/core services. |
| Treat `preview-ready` as permission | Rejected because preview does not prove freshness, persistence, or reversibility. |

## Consequences

The Element Library can provide useful feedback without inserting HTML. Transaction, refresh, editing-readiness, Inspector, and style models may build on preview metadata while remaining read-only or planning-only.

A future execution runtime must be separately named and must own the complete lifecycle rather than appending a writer call to current planners.

## Current implementation

Dry-run command modules live under command-preview, HTML insertion, source-patch, and Element Library paths. Planning and readiness foundations extend the evidence but do not execute it.

## Related docs

- [Commands architecture](../architecture/commands/README.md)
- [Source Patch Preview](../architecture/commands/source-patch-preview.md)
- [Command Preview Bus](../architecture/commands/command-preview-bus.md)
- [Future write flow](../architecture/flows/future-write-flow.md)
