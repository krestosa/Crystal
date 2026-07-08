# Source Patch Preview Sequence Diagram

[Docs index](../../README.md)

## Purpose

This diagram details how a dry-run insertion preview becomes a source patch preview.

## Current implementation

```mermaid
sequenceDiagram
  participant UI as Element Library UI
  participant Bus as Command Preview Bus
  participant Planner as HTML insertion planner
  participant Anchor as Source anchor selector
  participant Patch as SourcePatchPreview

  UI->>Bus: previewAddHtmlElementCommand(command, context)
  Bus->>Planner: dry-run supported command
  Planner->>Anchor: resolve before/after/inside anchor
  alt source location missing or unsafe
    Anchor-->>Planner: blocked reason
    Planner-->>Bus: blocked result
  else source anchor available
    Anchor-->>Planner: source anchor
    Planner->>Patch: create inserted text preview
    Patch-->>Bus: source patch preview
  end
  Bus-->>UI: CommandPreviewResult
```

## Key files

- `packages/core/source-patch/html-source-anchor.selectors.ts`
- `packages/core/commands/html-insertion/html-insertion-command.planner.ts`
- `packages/core/commands/html-insertion/html-insertion-command.preview.ts`

## Data flow

The preview result explains a potential source edit. It does not apply the edit.

## Boundaries

No patch apply, no write IPC, no file persistence.

## Validation

Covered by `validate:source-patch-preview`.

## Related docs

- [Source Patch Preview](../commands/source-patch-preview.md)
- [Source Patch Preview flow](../flows/source-patch-preview-flow.md)

## Future work

Future patch application must be separate and transaction-aware.
