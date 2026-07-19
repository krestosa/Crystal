# Implementation status

[Docs index](./README.md)

This page describes what exists in `main`. It is not a delivery schedule. A phase label records how work was organized; implementation status comes from source, tests, validators, runtime wiring, and explicit negative guarantees.

## Reading the status

- **Implemented** means runtime or tooling behavior exists and is validated.
- **Read-only** means the user can inspect or navigate, but not mutate project source.
- **Preview-only / dry-run** means Crystal can describe an operation without executing it.
- **Planning-only** means contracts model a future flow without performing its effects.
- **Intentionally blocked** means validators and UI prevent the behavior.
- **Future** means no current implementation should be inferred.

## Current foundation

| Area | Status | Evidence-backed boundary |
| --- | --- | --- |
| Electron shell | Implemented | Hardened main/preload/renderer separation; renderer has no Node integration. |
| Project Graph | Implemented, shallow | Scans files, pages, direct dependencies, assets, missing local routes, issues, byte size, and real file modification timestamps. |
| Repository Graph View | Implemented, read-only | Files are rectangular nodes and resolved internal dependencies are directed SVG edges, with deterministic layout, navigation, session-only drag, search, filters, and file detail. No persistence, editing, Git history, semantic clustering, or advanced graph layout. |
| Watcher and cache | Implemented foundation | Normalized batched events and in-memory cache; no disk cache. |
| Project Preview | Implemented, read-only | Root-contained protocol, target state, reload planning, bounded diagnostics. |
| DOM Snapshot | Implemented, read-only | Static source parser with limits and issues; not the live browser DOM. |
| Preview Selection | Implemented, read-only | Bounded messages and defensive snapshot mapping. |
| Preview Inspector | Implemented, read-only | Derived structural details; no editable controls. |
| Design Canvas navigation | Implemented, read-only | Pan, zoom, Fit, Center, Reset, gesture classification, recovery clamps. |
| Visual Selection Overlay | Implemented, read-only | External projection; no DOM injection or edit handles. |

## Editing foundations

| Phase or foundation | Status | What exists | What remains blocked |
| --- | --- | --- | --- |
| Phase 6A | Implemented, preview-only | Element Library intent, target eligibility, insertion modes. | HTML insertion and file writes. |
| Phase 6B | Implemented, dry-run | Source Patch Preview and Command Preview Bus. | Patch apply, write IPC, persistence. |
| Phase 6C | Implemented, planning-only | History transaction preview, refresh-boundary plan, command transaction plan. | Undo/redo execution and refresh execution. |
| Phase 6D | Implemented, preflight-only | Design editing readiness and conflict/capability summaries. | Apply enablement and source mutation. |
| Phase 7A | Implemented, intent-only | Editable Inspector draft and edit-intent contracts. | Applied Inspector edits. |
| Phase 7B | Implemented, read-only | **Editable Inspector read-only draft surface** with disabled controls. | Active input state, Apply handlers, persistence. |
| Source Revision and Freshness Foundation | Implemented, read-only foundation | Canonical `sha256:<byteLength>:<digest>` revisions from exact file bytes, root-contained observation, typed failures, and canonical match/mismatch evidence for `SourceConflictPreview`. | Command execution, writer-time recheck, patch apply, dirty state, history execution, refresh execution, and Apply. |

The source revision token uses SHA-256, lowercase hexadecimal, and byte length without content, Unicode, or line-ending normalization. The Node adapter accepts a project root plus a project-relative path, resolves canonical paths, blocks traversal and symlink escape, bounds reads by `maxBytes`, and returns typed evidence without exposing write authority. A `clean-preview` result remains evidence only: `canApplyWithoutRecheck` is still always `false`, and any future mutation must repeat the revision check immediately before writing.

The existence of a transaction descriptor, readiness result, field draft, disabled control, or source freshness result does not imply an execution path. Current IPC constants and preload methods contain no write channel.

## Style Engine and CSS/Sass Inspector

| Phase | Status | Current result | Explicit limitations |
| --- | --- | --- | --- |
| Phase 8A | Implemented, read-only | **Style Engine read-only source inventory foundation**: source references, inventory, textual selectors/declarations/rules, selected-node readiness. | No source reads by renderer, no cascade, computed styles, CSSOM, editing, or Apply. |
| Phase 8B | Implemented, read-only | **CSS/Sass Inspector read-only visual surface** that presents inventory and preview sections. | Passive UI only; no editable controls or browser stylesheet access. |
| Phase 8C | Implemented, read-only | Authored Style Matching over normalized DOM Snapshot nodes for a limited selector subset. | Candidate correlation only; no live-DOM matching, complex selector engine, cascade, inheritance, conditions, or computed values. |

Supported 8C selector previews include simple element, class, ID, attribute-presence, attribute-equality, and single-node compound selectors. Combinators, pseudo classes/elements, Sass nesting, media/supports/container evaluation, browser defaults, inheritance, and real cascade remain unsupported or future.

## Intentionally blocked system-wide

No current path provides:

- source file writes or patch application;
- write IPC or renderer filesystem authority;
- enabled Apply/Save behavior;
- real undo/redo execution or durable transaction history;
- dirty-state persistence;
- refresh execution after a write;
- project DOM mutation;
- live iframe document access;
- real CSS cascade, computed styles, CSSOM, or box-model inspection;
- WebGPU overlay runtime;
- Rust/WebAssembly analyzer runtime;
- production packaging and distribution.

The read-only source freshness foundation does not complete the write runtime's `conflict-detector` capability because no writer invokes the check at the mutation boundary.

## Canonical phase boundary statements

The repository validators preserve the following historical phase contracts verbatim. They describe the scope of each increment when it landed; they do not erase later read-only additions.

- Phase 6D remained preflight-only.
- Phase 7A was the Editable Inspector draft/intent foundation.
- Phase 7B added the Editable Inspector read-only draft surface.
- Phase 8A introduced the Style Engine read-only source inventory foundation. No CSS/Sass Inspector visual surface is added within that phase.

Across those boundaries: No real cascade is calculated. No computed styles are read. No style editing is implemented. No source files are written. No patch apply is available. No write IPC exists. Apply remains unavailable. No contenteditable is used. No undo/redo execution runs. Dirty-state is not persisted. No refresh execution runs. No Preview DOM mutation occurs.

## Canonical Phase 8C boundary

Phase 8C — Authored Style Matching over DOM Snapshot

Phase 8C boundary: Authored Style Matching over DOM Snapshot only. No real cascade is calculated. No computed styles are read. No document.styleSheets or CSSOM is used. No iframe internals are read. No live Preview DOM matching is performed. No source files are written. No patch apply is available. No write IPC exists. Apply remains unavailable. No contenteditable is used. No undo/redo execution runs. Dirty-state is not persisted. No refresh execution runs. No Preview DOM mutation occurs.

## Validation status model

The canonical quick suite contains 34 required checks. PASS means every required check executed and succeeded. A required skip remains visible and makes strict validation fail unless the caller explicitly opts into `--allow-skips`.

Read [Validation system](./architecture/validation-system.md) for the command graph, [Repository Graph View](./architecture/repository-graph-view.md) for the read-only graph canvas boundary, and [Full product roadmap](./full-product-roadmap.md) for future direction.
