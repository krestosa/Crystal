# Validation Gates Diagram

[Docs index](../../README.md)

## Purpose

This diagram shows how documentation and runtime checks fit into the local validation path.

## Current implementation

The docs validator runs before the quick build/typecheck gate. It does not prove runtime behavior; it keeps the architecture map and safety language intact.

```mermaid
flowchart TD
  Source[Source/docs change] --> Docs[validate:architecture-docs]
  Docs --> Build[build]
  Build --> Typecheck[typecheck]
  Typecheck --> Structure[validate:structure]
  Structure --> Core[validate:local:quick:core]
  Core --> Preview[validate:local:quick:preview]
  Preview --> UI[validate:local:quick:ui]
  UI --> Watch[validate:local:watch]
  Watch --> Doctor[doctor:electron]
  Docs --> Review[Documentation review]
```

## Key files

These files define the validation command graph and docs-specific checks.

- `package.json`
- `scripts/validate-local.mjs`
- `scripts/validate-architecture-docs.mjs`
- `scripts/validate-source-patch-preview.mjs`
- `scripts/validate-ui-flow.mjs`

## Data flow

Code validation and docs validation are separate static gates. The docs gate checks navigation, sections, Mermaid coverage, roadmap links, and blocked write claims.

## Boundaries

Docs validation does not replace runtime validation. Runtime validation does not prove future features are implemented.

## Validation

Run `npm run validate:architecture-docs` and the normal local validation command appropriate for the branch.

## Related docs

- [Validation system](../validation-system.md)
- [Validation flow](../flows/validation-flow.md)

## Future work

Add import-boundary validation and docs path drift checks after the docs structure stabilizes.
