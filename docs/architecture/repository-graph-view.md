# Repository Graph View

[Docs index](../README.md)

## Status

Repository Graph View is an implemented read-only canvas foundation. It visualizes the current Project Graph without adding filesystem authority, source mutation, persistence, or a separate analysis pipeline.

## Source of truth

The existing `ProjectGraph` remains the only source for repository content and relationships:

- every `ProjectFile` becomes one rectangular node;
- every resolved internal `ProjectDependency` whose source and destination files exist becomes one directed edge;
- missing, external, and unresolved dependencies remain counters on their source node and do not create synthetic nodes;
- isolated files remain visible.

The renderer receives the graph through the existing read-only `project:get-graph` IPC path. Repository Graph View adds no IPC channel and reads no filesystem data directly.

## File metadata

Each node exposes only project-relative information:

- file name;
- extension;
- relative path;
- directory;
- `ProjectFileKind`;
- byte size;
- real modification timestamp from `stat.mtimeMs` propagated as `modifiedAtMs`;
- incoming and outgoing represented edge counts;
- unresolved and external dependency counts.

Absolute paths remain inside the Project Graph model and are not rendered by this view.

## Portable model

`packages/core/project/repository-graph-view/` contains DOM-free and Node-free functions for:

- stable path-derived node IDs;
- deterministic node and edge derivation;
- deterministic first-directory grouping and layout;
- search and filtering;
- viewport pan, pointer-centered zoom, Fit, Reset, and node centering.

The same `ProjectGraph` input produces the same initial view model regardless of file or dependency array order.

## Layout

The initial layout is intentionally simple and deterministic:

1. root files form the first group;
2. remaining files are grouped by their first directory segment;
3. groups are sorted alphabetically and placed in columns;
4. files are sorted by relative path and placed in rows;
5. fixed node dimensions and spacing prevent initial overlap.

No force simulation, graph library, clustering engine, WebGL, or WebGPU runtime is used.

## Renderer behavior

The native HTML, Sass, TypeScript, and SVG component provides:

- a navigable surface and transform stage;
- SVG directed edges;
- HTML rectangular nodes rendered with `textContent`;
- background-drag pan;
- pointer-centered bounded zoom;
- Fit and Reset;
- selection and Center selection;
- double-click centering;
- Pointer Events node drag with zoom compensation and pointer capture;
- case-insensitive search by name or relative path;
- one `ProjectFileKind` filter;
- isolated-node visibility control;
- all, selected, and hidden edge modes;
- a read-only detail panel with selectable connected neighbors;
- explicit no-project, empty-project, and no-results states.

Node drag updates only an in-memory renderer `Map`. Positions are discarded with the session or graph reload.

## Security and read-only boundary

Repository Graph View does not:

- write project files;
- create write IPC;
- expose Node to the renderer;
- change `nodeIntegration` or `contextIsolation`;
- access iframe internals;
- add `allow-same-origin`;
- use `contenteditable`;
- use `localStorage`;
- persist layout;
- enable Apply or Save;
- add dependencies.

## Validation

Run:

```text
npm run validate:repository-graph-view
```

The focused validator bundles and executes the real portable model against deterministic fixtures, then checks renderer integration and read-only boundaries. The required check is also part of the canonical quick and full validation suites.

## Current limits

Deferred work includes layout persistence, minimap, virtualization, intelligent clustering, edge bundling, folders or commits as nodes, Git history and blame, deep semantic analysis, editing, WebGPU, collaboration, and remote synchronization.

## Related documents

- [Implementation status](../roadmap-implementation.md)
- [Project open flow](./flows/project-open-flow.md)
- [Validation system](./validation-system.md)
