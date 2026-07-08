# Crystal Glossary

[Docs index](./README.md)

## Active project root

The filesystem root selected by the user through Open Folder or inferred from Open HTML. Main uses it to resolve Project Graph and Preview requests.

## Command Preview Bus

A dry-run bus that returns `CommandPreviewResult` states. It is not a command execution runtime.

## Design Canvas

The renderer component that wraps the visual Preview frame and provides pan, zoom, fit, center, reset, and read-only overlay projection boundaries.

## DOM Snapshot

A bounded static structural tree built from the active Preview target source. It is not the live browser DOM.

## Future

A planned capability that is not implemented. Documentation must not describe Future items as working.

## Preview iframe

The sandboxed iframe that renders project HTML through `crystal-preview://current/<relative-project-path>`.

## Preview Inspector

A read-only derived panel that combines Preview, Preview Selection, and DOM Snapshot state to show structural details.

## Preview Selection

A read-only selection mode that sends bounded selected-node summaries from the Preview iframe to renderer/main/core. It does not edit.

## Project Graph

The core model describing scanned project files, pages, dependencies, assets, missing routes, watcher/cache state, and issues.

## Source Patch Preview

A dry-run source-text preview of a potential future change. It does not apply a patch or persist data.

## Visual Selection Overlay

An external Crystal UI overlay that projects selected-element visualization outside the user document.

## Write IPC

A future explicit IPC layer for write-capable operations. It does not exist in the current implementation.

## Related docs

- [Architecture index](./architecture/README.md)
- [Commands architecture](./architecture/commands/README.md)
- [Preview architecture](./architecture/preview/README.md)
- [Future write flow](./architecture/flows/future-write-flow.md)
