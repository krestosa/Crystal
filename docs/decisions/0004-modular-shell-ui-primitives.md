# 0004 — Modular Shell UI Primitives

[Docs index](../README.md)

> **Decision in one sentence:** Crystal shares small presentational shell primitives while keeping feature state and behavior inside feature modules.

## Status

Accepted.

## Context

Project Graph, Preview, DOM Tree, Inspector, Element Library, Diagnostics, and Status Bar use related panel chrome. Duplicating every header, section, metadata row, empty state, and compact control would create visual drift. A monolithic shell component or behavior-rich component library would create the opposite problem: hidden coupling and unclear ownership.

## Decision

Use small HTML, SCSS, and TypeScript primitives for repeated presentation patterns. Feature modules compose those primitives and keep their own subscriptions, actions, state derivation, and validation.

Primitives remain unaware of preload, project state, Preview internals, commands, and persistence.

## Options considered

| Option | Why rejected or accepted |
| --- | --- |
| Small presentational primitives | Accepted because repeated structure is shared without centralizing behavior. |
| Duplicate feature-specific chrome | Rejected because spacing, hierarchy, and states would drift. |
| Primitives that call preload or own state | Rejected because presentation would hide authority and feature logic. |
| One monolithic shell component | Rejected because it conflicts with modular ownership and independent validation. |

## Consequences

Panels share a consistent shell grammar while retaining clear feature boundaries. A primitive should grow only after multiple concrete uses demonstrate the shared need.

This decision does not require every page or panel to use an identical template. Shared structure and distinct feature composition remain compatible.

## Current implementation

Shell primitives live under renderer `components/shell-ui/**` and are composed by layout and feature-panel modules.

## Related docs

- [Shell UI primitives](../architecture/renderer-shell/shell-ui-primitives.md)
- [Renderer shell architecture](../architecture/renderer-shell/README.md)
- [Sidebar composition](../architecture/renderer-shell/sidebar-composition.md)
