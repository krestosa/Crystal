# Crystal Glossary

[Docs index](./README.md)

## Active project root

The filesystem root selected through Open Folder or inferred from Open HTML. Main uses it to resolve Project Graph scans, Preview targets, DOM Snapshot source reads, and safe project-relative paths.

## Blocked

A deliberate non-feature. A blocked path is not missing because of UI polish; it is unavailable because the system lacks the safety or correctness contracts required to enable it.

## Command Preview Bus

The dry-run bus under `packages/core/commands/command-preview-bus/`. It returns preview-ready, blocked, or unsupported results for command previews. It does not replace `packages/core/commands/command-bus.ts` and does not execute writes.

## Design Canvas

The renderer component that wraps the visual Preview frame and provides pan, zoom, fit, center, reset, and read-only overlay projection boundaries.

## DOM Snapshot

A bounded static structural tree built from the active Preview target source. It is not the live browser DOM.

## Future

A planned capability that is not implemented. Future items should not be described as available behavior.

## Preview iframe

The sandboxed iframe that renders project HTML through `crystal-preview://current/<relative-project-path>`.

## Preview Inspector

A read-only derived panel that combines Preview, Preview Selection, and DOM Snapshot state to show structural details.

## Preview Selection

A read-only selection mode that sends bounded selected-node summaries from the Preview iframe to renderer/main/core. It does not edit.

## Project Graph

The core model describing scanned project files, pages, dependencies, assets, missing routes, watcher/cache state, and issues.

## Source Patch Preview

A dry-run, verifiable description of a possible source change. It does not apply a patch or persist data.

## Visual Selection Overlay

An external Crystal UI overlay that projects selected-element visualization outside the user document.

## Write IPC

A future explicit IPC layer for write-capable operations. It does not exist in the current implementation.

## Related docs

- [Architecture index](./architecture/README.md)
- [Commands architecture](./architecture/commands/README.md)
- [Preview architecture](./architecture/preview/README.md)
- [Future write flow](./architecture/flows/future-write-flow.md)
