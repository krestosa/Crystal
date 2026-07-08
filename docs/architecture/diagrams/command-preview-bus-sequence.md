# Command Preview Bus Sequence Diagram

[Docs index](../../README.md)

## Purpose

This diagram shows the dry-run command preview bus as distinct from future command execution.

## Current implementation

```mermaid
sequenceDiagram
  participant UI as Renderer UI
  participant Bus as Command Preview Bus
  participant Validator as Command validator
  participant Planner as Planner
  participant Result as CommandPreviewResult

  UI->>Bus: Preview command
  Bus->>Validator: Validate command and context
  alt unsupported command
    Validator-->>Bus: unsupported
    Bus-->>Result: status unsupported
  else blocked context
    Validator-->>Bus: blocked reason
    Bus-->>Result: status blocked
  else previewable command
    Bus->>Planner: Build dry-run preview
    Planner-->>Bus: SourcePatchPreview
    Bus-->>Result: status preview-ready
  end
  Result-->>UI: Render read-only result
```

## Key files

- `packages/core/commands/command-preview-bus/command-preview-bus.types.ts`
- `packages/core/commands/command-preview-bus/command-preview-bus.preview.ts`
- `packages/core/commands/html-insertion/html-insertion-command.validators.ts`

## Data flow

The bus normalizes command preview outcomes for renderer display.

## Boundaries

No execution side effects belong in the preview bus.

## Validation

Covered by `validate:source-patch-preview`.

## Related docs

- [Command Preview Bus](../commands/command-preview-bus.md)
- [Future command execution](../commands/future-command-execution.md)

## Future work

A future execution bus should use separate names and stronger guarantees.
