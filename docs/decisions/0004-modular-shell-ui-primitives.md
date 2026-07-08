# 0004 — Modular Shell UI Primitives

[Docs index](../README.md)

> **Decision in one sentence:** Crystal uses small presentational shell primitives so feature panels share structure without sharing feature logic.

## Status

Accepted.

## Context

Crystal's renderer shell has several panels with similar chrome: Project Graph, Preview, DOM Tree, Inspector, Diagnostics, Element Library, and Design Canvas controls. Without shared primitives, each panel would drift visually and structurally.

## Decision

Use small shell UI primitives for panel headers, sections, scroll regions, sidebar stacks, metadata rows, empty states, status badges, and compact controls. Keep primitives presentational. Feature logic should stay in feature modules.

## Options considered

| Option | Why rejected or accepted |
| --- | --- |
| Presentational shell primitives | Accepted because it reduces UI drift without centralizing feature logic. |
| Feature-specific duplicated chrome | Rejected because panels would visually diverge. |
| Primitives calling preload directly | Rejected because presentation components should not own effects. |
| Single monolithic shell component | Rejected because it fights the modular source architecture. |

## Consequences

Panels share a consistent carbon-shell grammar while preserving modular ownership. Primitive modules must not call preload, mutate project state, or implement feature commands.

## Current implementation

Implemented under:

- `apps/desktop/electron/renderer/components/shell-ui/**`
- `apps/desktop/electron/renderer/layout/**`
- `apps/desktop/electron/renderer/components/html-element-library-panel/**`

## Related docs

- [Shell UI primitives](../architecture/renderer-shell/shell-ui-primitives.md)
- [Renderer shell architecture](../architecture/renderer-shell/README.md)
- [Sidebar composition](../architecture/renderer-shell/sidebar-composition.md)
