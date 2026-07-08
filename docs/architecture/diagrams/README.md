# Architecture Diagrams

[Docs index](../../README.md)

## Purpose

This directory collects Mermaid diagrams for the major Crystal subsystems and safety boundaries.

## Current implementation

The diagrams represent the current read-only and dry-run implementation after PR #21, plus explicitly marked future/blocked flows.

```mermaid
flowchart TD
  Diagrams[Architecture diagrams] --> Context[System context]
  Diagrams --> Runtime[Runtime boundaries]
  Diagrams --> Selection[Preview Selection]
  Diagrams --> Patch[Source Patch Preview]
  Diagrams --> Bus[Command Preview Bus]
  Diagrams --> Security[Security boundaries]
  Diagrams --> Validation[Validation gates]
```

## Key files

- `docs/architecture/diagrams/system-context.md`
- `docs/architecture/diagrams/runtime-boundaries.md`
- `docs/architecture/diagrams/preview-selection-sequence.md`
- `docs/architecture/diagrams/source-patch-preview-sequence.md`
- `docs/architecture/diagrams/command-preview-bus-sequence.md`
- `docs/architecture/diagrams/security-boundaries.md`
- `docs/architecture/diagrams/validation-gates.md`

## Data flow

Each diagram references the source docs that define the actual behavior. The diagrams are explanatory, not separate specifications.

## Boundaries

Diagram arrows must not imply unimplemented writes, direct renderer filesystem access, live iframe document access, or trusted Preview iframe privileges.

## Validation

`validate:architecture-docs` checks for Mermaid coverage and required diagram files.

## Related docs

- [Architecture README](../README.md)
- [Security model](../security-model.md)
- [Validation system](../validation-system.md)

## Future work

Add diagrams for workers, WASM, WebGPU, and write execution only when those systems have concrete contracts.
