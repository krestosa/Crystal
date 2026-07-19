# Security boundaries diagram

[Docs index](../../README.md)

## Purpose

This view separates current allowed authority, forbidden shortcuts, and future-only write concepts so a convenience edge cannot hide inside a broader architecture diagram.

## Current implementation

Renderer reaches main only through the context-isolated preload API. Main reaches the active project root and serves root-contained resources. Preview iframe returns bounded messages. Raw IPC, direct renderer filesystem access, live iframe inspection, traversal, and project-content privilege are blocked.

```mermaid
flowchart TD
  subgraph Allowed[Allowed today]
    Renderer[Renderer shell] --> Preload[Constrained preload]
    Preload --> Main[Electron main]
    Main --> Root[(Active project root)]
    Main --> Protocol[crystal-preview protocol]
    Protocol --> Frame[Sandboxed Preview iframe]
    Frame --> Message[Bounded postMessage]
    Message --> Renderer
  end
  subgraph Forbidden[Forbidden today]
    Node[Node APIs in renderer]
    RawIPC[raw ipcRenderer]
    DirectFS[direct filesystem]
    LiveDOM[live iframe document]
    Privilege[Crystal APIs from project content]
    Traversal[outside-root serving]
  end
  subgraph Future[Future only]
    WriteIPC[Write IPC]
    Apply[Patch application]
    History[Executable undo/redo]
  end
  Renderer -. blocked .-> Node
  Renderer -. blocked .-> RawIPC
  Renderer -. blocked .-> DirectFS
  Renderer -. blocked .-> LiveDOM
  Frame -. blocked .-> Privilege
  Protocol -. blocks .-> Traversal
  Main -. not implemented .-> WriteIPC
  WriteIPC -. gated .-> Apply --> History
```

## Key files

- `web-preferences.ts`
- `crystal-api.bridge.ts`
- `ipc.constants.ts`
- `project-preview-protocol.ts`
- `project-preview-selection-message-bridge.ts`

## Data flow

Only typed, sanitized, bounded data crosses trust boundaries. The active project root constrains filesystem reads. Future write nodes are disconnected from current IPC.

## Boundaries

No `allow-same-origin` shortcut, live iframe document access, renderer file helper, hidden write channel, or absolute-path diagnostic belongs in the allowed graph.

## Validation

Feature validators and architecture docs checks preserve these claims; direct review remains required for Electron and protocol changes.

## Related docs

- [Security model](../security-model.md)
- [Preview safety](../preview/preview-safety.md)
- [ADR 0001](../../decisions/0001-electron-security-boundaries.md)

## Future work

A writer must add new gates behind main-owned authority. It must not convert a forbidden current edge into an allowed shortcut.
