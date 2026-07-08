# Runtime Boundaries Diagram

[Docs index](../../README.md)

## Purpose

This diagram shows runtime ownership. It is meant to prevent a common mistake: solving a renderer feature by importing main-process authority directly into the browser runtime.

## Current implementation

The allowed path is renderer → preload → main → core/adapters. Core is portable; adapters own effects. Renderer UI does not touch filesystem or watcher effects directly.

```mermaid
flowchart LR
  subgraph Renderer[Renderer browser runtime]
    Shell[Shell UI]
    Panels[Panels]
    Canvas[Design Canvas]
  end
  subgraph Preload[Preload isolated bridge]
    CrystalAPI[window.crystal]
    ChannelValidation[Channel validation]
  end
  subgraph Main[Electron main runtime]
    IPC[IPC handlers]
    PreviewService[Preview service]
    DomService[DOM Snapshot service]
    Watcher[Watcher service]
  end
  subgraph Core[Core packages]
    Models[Models]
    Selectors[Selectors]
    Validators[Validators]
    Planners[Dry-run planners]
  end
  subgraph Effects[Adapters and effects]
    FS[Filesystem]
    FileWatcher[File watcher]
  end

  Renderer --> Preload
  Preload --> Main
  Main --> Core
  Main --> Effects
  Core -. no Electron .-> Main
  Renderer -. blocked .-> Effects
```

## Key files

Read these directories by runtime, not by feature.

- `apps/desktop/electron/main/**`
- `apps/desktop/electron/preload/**`
- `apps/desktop/electron/renderer/**`
- `packages/core/**`
- `packages/adapters/**`

## Data flow

Renderer expresses intent; preload exposes a constrained API; main performs privileged work; core calculates model results; adapters perform effects.

## Boundaries

Renderer cannot bypass preload. Core should not import Electron. Adapters isolate side effects.

## Validation

Covered by `validate:structure`, `validate:ui-flow`, and feature validators.

## Related docs

- [Runtime boundaries](../runtime-boundaries.md)
- [Module boundaries](../module-boundaries.md)
- [Security model](../security-model.md)

## Future work

Future workers, WASM, and WebGPU need dedicated runtime boxes and explicit bridges.
