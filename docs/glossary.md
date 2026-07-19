# Glossary

[Docs index](./README.md)

Terms in Crystal often carry an authority boundary. These definitions are intentionally narrow; follow the linked page when a term participates in a larger flow.

## Runtime and security

**Main process**
The Electron runtime that owns application lifecycle, windows, privileged IPC handlers, project services, filesystem-backed effects, and Preview protocol registration. See [Runtime boundaries](./architecture/runtime-boundaries.md).

**Preload**
The isolated bridge that exposes the typed `window.crystal` API. It does not expose raw `ipcRenderer`.

**Renderer**
Crystal's browser UI runtime. It composes panels and interaction state but has no direct Node or filesystem authority.

**Preview iframe**
The sandboxed frame that renders project HTML. It is not part of the trusted renderer shell and cannot access Crystal privileges.

**Adapter**
A module that isolates an effect or external tool, such as filesystem access, file watching, Sass compilation, bundling, or HTML assembly.

## Preview and inspection

**Project Graph**
The source-derived model of project files, pages, dependencies, assets, missing routes, metadata, and issues. It is shallow and static; it does not execute project code.

**Preview target**
The active project-relative HTML page chosen from the Project Graph and served through `crystal-preview://current/...`.

**DOM Snapshot**
A bounded tree parsed from static HTML source. It is not Chromium's live DOM, a CSS selector tree, or an editable object model.

**Snapshot path**
A structural coordinate such as `0/1/3` inside a particular DOM Snapshot traversal. It is useful for identity within that snapshot, not proof of live-node identity.

**Preview Selection**
Read-only state produced from a bounded iframe message and defensive mapping against the DOM Snapshot.

**Mapping status**
The result of comparing visual selection evidence with source-derived state. Material states include `matched`, `missing-snapshot`, `stale`, `mismatched`, and `ambiguous`.

**Preview Inspector**
A derived read-only view of Preview, selection, and snapshot state. It explains structure and mapping confidence; it does not edit attributes, text, classes, or styles.

**Visual Selection Overlay**
A read-only highlight projected by Crystal UI outside the user's DOM. It follows Design Canvas transforms and remains non-interactive.

## Commands and patch planning

**Command intent**
A typed description of what a user wants to do. Intent alone does not authorize execution.

**Command Preview Bus**
A pure dry-run router that returns `preview-ready`, blocked, or unsupported results. It is not an execution bus and does not replace the legacy command bus boundary.

**Source anchor**
A source-derived position used to describe where a future operation might occur. Missing or unsafe anchors block preview planning.

**Source Patch Preview**
An inspectable description of a possible source change. It is not a write operation, a pending mutation, or a patch waiting to be applied.

**Apply**
The future user action that would cross from validated intent into persistence. Current Apply affordances remain unavailable.

## Future write system

**History transaction preview**
A planning descriptor for reversibility and affected source. It is not an executed transaction and cannot undo or redo anything.

**Refresh boundary plan**
A descriptor of state that a future write may invalidate. It does not refresh Project Graph, Preview, Snapshot, selection, or UI.

**Dirty state**
Future persisted knowledge that source differs from the last saved state. Current readiness models may refer to dirty-state requirements, but no dirty-state workflow is active.

**Write runtime**
A future main/core path responsible for source freshness, policy, patch application, persistence, history execution, dirty state, and refresh orchestration.

## Style Engine preparation

**Style source inventory**
A read-only classification of authored CSS, SCSS, Sass, inline, generated, external, or unknown style references. It does not calculate applied styles.

**Authored style candidate**
A conservative result saying that a supported textual selector can correlate with normalized DOM Snapshot data. It is not browser cascade truth.

**Cascade**
The browser process that resolves origin, importance, layers, specificity, source order, inheritance, conditions, and defaults into applied values. Crystal does not currently reproduce it.

**Computed style**
A browser-resolved style value for a live element. Current Crystal code does not call `getComputedStyle` for Inspector functionality.

## Validation

**Validator**
A read-only script that checks observed source, documentation, metadata, or behavior contracts and exits non-zero on failure.

**PASS**
Every required check ran and succeeded.

**FAIL**
At least one required check ran and failed, or a required check could not be resolved.

**SKIPPED**
A check did not run. The strict quick suite treats required skips as failure unless `--allow-skips` is explicitly supplied.

**Generated block**
Content between `crystal-generated` markers. The metadata synchronizer owns the block; human editing belongs outside it.

## Read next

You are here: terminology shared across the documentation.

Next:
- [Architecture overview](./architecture/README.md) places these terms in the runtime model.
- [Implementation status](./roadmap-implementation.md) shows which terms describe current behavior and which remain future-facing.

Why this matters:
Precise terms stop a source-derived preview, visual correlation, or readiness descriptor from being mistaken for browser truth or write authority.
