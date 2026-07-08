# Command Preview Bus Sequence Diagram

[Docs index](../../README.md)

## Purpose

This sequence shows the dry-run bus as a classification and planning path, not as execution.

## Current implementation

The bus receives command intent, validates context, and returns unsupported, blocked, or preview-ready state. It does not replace `packages/core/commands/command-bus.ts` and does not call a writer.

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

These files define the dry-run bus and its current HTML insertion preview path.

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
