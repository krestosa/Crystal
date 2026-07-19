# Full product roadmap

[Docs index](./README.md)

This roadmap describes product direction. It is not a release schedule, commitment, or implementation report. Current evidence belongs in [Implementation status](./roadmap-implementation.md); when these pages disagree, source and validators decide what exists.

## Product intent

Crystal aims to become a desktop environment for opening, understanding, and eventually editing real HTML projects while preserving source ownership. Chromium remains responsible for rendering the page. Crystal owns project analysis, editor UI, state, validation, commands, and future technical overlays.

The roadmap keeps one invariant across every phase: visible convenience must not bypass source identity, security, command policy, reversibility, or user review.

## Phase sequence

### Foundation: shell, graph, and Preview

Build the Electron shell, modular renderer composition, Project Graph, watcher/cache, secure project-relative Preview, diagnostics, DOM Snapshot, selection mapping, read-only Inspector, Design Canvas navigation, and external selection overlay.

Most of this foundation is implemented. Its purpose is to make project identity and source reasoning trustworthy before mutation.

### Editing foundations

Introduce an HTML Element Library, typed command intent, target eligibility, source anchors, Source Patch Preview, dry-run command routing, transaction descriptors, refresh-boundary planning, readiness checks, Inspector field drafts, and disabled editing surfaces.

These planning and read-only layers are implemented through Phase 7B. They intentionally stop before file mutation.

### Style Engine preparation

Inventory authored style sources, represent selectors/declarations/rules as bounded previews, expose a read-only CSS/Sass Inspector, and correlate a limited selector subset with normalized DOM Snapshot nodes.

Phases 8A, 8B, and 8C are implemented within those limits. Real cascade, computed styles, CSSOM, complex selector evaluation, Sass semantics, style editing, and Apply remain future.

### Write runtime and safe HTML editing

A write-capable phase must design the entire mutation lifecycle together:

1. revalidate project root, target file, source freshness, selection mapping, and command policy;
2. produce an exact patch with conflict detection and formatting policy;
3. create an executable transaction record and reversible before/after state;
4. apply through main/core services using safe file IO;
5. persist dirty/save state;
6. invalidate and refresh graph, Preview, DOM Snapshot, selection, Inspector, overlays, and style state deliberately;
7. expose explicit Apply, Save, Undo, and Redo behavior;
8. keep failure recovery visible and testable.

Only after that boundary exists should Crystal enable text edits, attributes, class management, duplicate/delete, wrapping, sibling movement, or HTML insertion.

### Editable Inspector and Style Engine

Future Inspector work may add validated attribute, text, class, accessibility, layout, and style controls. A full Style Engine may add authored-source ownership, selector parsing, cascade/specificity, inherited and conditional rules, computed-style correlation, class authoring, design tokens, and safe source placement.

Compiled CSS must not automatically become the write target when the project owns Sass/SCSS sources. Inline styles should require explicit intent rather than becoming the default output.

### Responsive layout tools

Potential work includes breakpoint management, device widths, media-query awareness, flex/grid helpers, spacing measurement, guides, snapping, and responsive diagnostics. These tools depend on trustworthy layout/style information and should not be implemented as opaque mutations.

### Reusable blocks, assets, and project tooling

Later phases may add plain-source snippets, project blocks, section templates, asset and font discovery, SVG/media tools, file exploration, lightweight code editing, search, problems, configured command running, Preview console, project terminal, dependency views, and code-to-element navigation.

Developer tools must keep the Preview console separate from system command execution. Arbitrary shell access should never appear as an implicit project capability.

### WebGPU overlay engine

WebGPU may render Crystal-owned bounding boxes, handles, guides, rulers, grids, minimaps, and measurement lines outside the user's DOM. Canvas2D should remain a fallback when appropriate.

WebGPU is not intended to render the webpage itself. The browser remains the page renderer, and overlays remain Crystal UI.

### Rust/WebAssembly analysis

Rust/WASM may accelerate tokenization, parsing, selector analysis, dependency graph work, incremental diffs, and asset analysis behind typed worker boundaries. Adoption should follow measured correctness or performance gains rather than replacing the TypeScript core wholesale.

Fallback behavior must remain available when WASM cannot load or does not outperform the current implementation.

### Automation and assisted workflows

Automation may propose accessibility, metadata, broken-link, asset, and structural improvements. Any generated change must enter the same command-preview, review, transaction, Apply, and undo path as a manual operation. No autonomous write belongs in the product model.

### Packaging and hardening

A shippable product needs expanded behavioral tests, stable UI smoke coverage, fixture projects, security regression tests, crash recovery, backups before destructive writes, local draft recovery, versioned history, packaging, update policy, performance profiling, and watcher/memory stress testing.

No current documentation should claim packaged cross-platform distribution until artifacts and validation demonstrate it.

## Worker direction

Parsing, scanning, analysis, and other expensive work should move off the UI thread when measurement justifies it. Potential workers include parser, analyzer, asset, CSS, HTML, TypeScript, Preview synchronization, and WASM hosts. Worker messages must be typed and validated before they update application state.

## Fallback principles

- If Preview fails, retain a diagnostic safe state.
- If HTML is malformed, return bounded parser issues rather than crashing or inventing certainty.
- If style or asset data is unavailable, show an explicit unsupported or incomplete state.
- If WebGPU is unavailable, use a deliberate fallback or disable the overlay with a reason.
- If WASM is unavailable, keep the TypeScript path or a reduced analysis mode.
- If a future write cannot prove freshness, safety, or reversibility, block it.

## Command and event direction

Commands request actions; events report observed changes. They should remain separate even when the product gains persistence. Representative future command families include HTML insertion/removal, text and attribute updates, class operations, style property updates, node movement, and duplication. Representative events include project, file, graph, Preview, snapshot, selection, style, asset, and build state changes.

A name in this roadmap does not reserve an API or prove that a module exists.

## Architectural rules that remain fixed

- Renderer and Preview content remain unprivileged.
- Filesystem effects remain main-owned and adapter-isolated.
- The Preview iframe remains separate from Crystal UI.
- Meaningful mutation passes through explicit commands and reviewable patches.
- Undo/redo and refresh are part of the write contract, not later polish.
- External dependencies require a narrow justification and boundary.
- WebGPU overlays do not contaminate project DOM.
- Rust/WASM performs analysis, not UI ownership.
- Failure states remain explicit and bounded.

## Decisions intentionally left open

The project has not frozen a long-term code-editor adapter, terminal adapter, incremental parser, UI framework, include/source-map strategy, plugin boundary, UI testing stack, theming model, final command bus, Project Graph schema, visual-to-source map, Sass editing strategy, external-framework strategy, or Preview console policy.

Those choices should be made when a concrete phase needs them and evidence can compare alternatives. The roadmap should not manufacture commitment through early naming.

## Validation policy

Every implementation phase should add focused non-visual validation where possible and document manual checks where automation is insufficient. The normal merge gate for a broad runtime change remains:

```bash
npm run validate:local
```

Documentation changes must also preserve metadata, Markdown integrity, guided navigation, architecture contracts, and change policy.
