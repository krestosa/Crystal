# Validation system

[Docs index](../README.md)

## At a glance

| Question | Answer |
| --- | --- |
| Canonical checks | 32 required checks in quick and full validation. |
| Result semantics | PASS, FAIL, and visible SKIPPED. |
| Mutation policy | Validators read and fail; they do not repair source. |
| Reporter modes | Human, plain, raw, and JSON summary without semantic drift. |
| Documentation role | Checks navigation, generated markers, links, and capability language. |

## Purpose

Many of Crystal’s most important guarantees are negative: renderer cannot reach the filesystem, Preview cannot become trusted source, planners cannot write, and read-only style surfaces cannot claim browser truth. Validators turn those boundaries into observable gates.

## Current implementation

The script graph covers generated metadata, change policy, Markdown integrity, guided docs, architecture docs, build outputs, typecheck, source ownership, project models, Preview, selection, Inspector, canvas, overlays, command previews, editing readiness, style inventory, authored matching, local watch, Electron diagnostics, and validation-system self-checks. The strict quick runner fails on required failures and required skips by default.

## Generated validator catalog

<!-- crystal-generated:validation-catalog:start -->
<!-- Do not edit manually. Run npm run sync:project-metadata. -->

Canonical checks: 32. Local quick checks: 32. Full validation checks: 32.

| Group | ID | Label | npm script | Ownership | Required | Local quick | Full | Execution | Direct script | Args |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Validation foundation | `validation-system` | Validation System | `validate:validation-system` | generated | yes | yes | yes | direct-node | `scripts/validate-validation-system.mjs` | — |
| Generated metadata | `project-metadata` | Project Metadata | `validate:project-metadata` | generated | yes | yes | yes | direct-node | `scripts/sync-project-metadata.mjs` | `["--check"]` |
| Change policy | `change-policy` | Change Policy | `validate:change-policy` | generated | yes | yes | yes | direct-node | `scripts/validate-change-policy.mjs` | — |
| Documentation | `markdown-integrity` | Markdown Integrity | `validate:markdown-integrity` | generated | yes | yes | yes | direct-node | `scripts/validate-markdown-integrity.mjs` | — |
| Documentation | `guided-docs` | Guided docs | `validate:guided-docs` | generated | yes | yes | yes | direct-node | `scripts/validate-guided-docs.mjs` | — |
| Documentation | `architecture-docs` | Architecture docs | `validate:architecture-docs` | generated | yes | yes | yes | direct-node | `scripts/validate-architecture-docs.mjs` | — |
| Build | `build-html` | Build HTML | `build:html` | generated | yes | yes | yes | direct-node | `scripts/build-html.mjs` | — |
| Build | `build-scss` | Build SCSS | `build:scss` | generated | yes | yes | yes | direct-node | `scripts/build-scss.mjs` | — |
| Build | `build-ts` | Build TS | `build:ts` | generated | yes | yes | yes | direct-node | `scripts/build-ts.mjs` | — |
| Build | `typecheck` | Typecheck | `typecheck` | external | yes | yes | yes | npm | — | — |
| Core | `structure` | Structure | `validate:structure` | generated | yes | yes | yes | direct-node | `scripts/validate-structure.mjs` | — |
| Core | `source-tree-boundaries` | Source Tree Boundaries | `validate:source-tree-boundaries` | generated | yes | yes | yes | direct-node | `scripts/validate-source-tree-boundaries.mjs` | — |
| Core | `project-graph` | Project Graph | `validate:project-graph` | generated | yes | yes | yes | direct-node | `scripts/validate-project-graph.mjs` | — |
| Core | `project-watch` | Project Watch | `validate:project-watch` | generated | yes | yes | yes | direct-node | `scripts/validate-project-watch.mjs` | — |
| Core | `history-foundation` | History Foundation | `validate:history-foundation` | generated | yes | yes | yes | direct-node | `scripts/validate-history-foundation.mjs` | — |
| Core | `design-editing-preflight` | Design Editing Preflight | `validate:design-editing-preflight` | generated | yes | yes | yes | direct-node | `scripts/validate-design-editing-preflight.mjs` | — |
| Core | `inspector-editing-foundation` | Inspector Editing Foundation | `validate:inspector-editing-foundation` | generated | yes | yes | yes | direct-node | `scripts/validate-inspector-editing-foundation.mjs` | — |
| Core | `style-engine-foundation` | Style Engine Foundation | `validate:style-engine-foundation` | generated | yes | yes | yes | direct-node | `scripts/validate-style-engine-foundation.mjs` | — |
| Core | `authored-style-matching` | Authored Style Matching | `validate:authored-style-matching` | generated | yes | yes | yes | direct-node | `scripts/validate-authored-style-matching.mjs` | — |
| Preview | `preview` | Preview | `validate:preview` | generated | yes | yes | yes | direct-node | `scripts/validate-preview.mjs` | — |
| Preview | `dom-snapshot` | DOM Snapshot | `validate:dom-snapshot` | generated | yes | yes | yes | direct-node | `scripts/validate-dom-snapshot.mjs` | — |
| Preview | `preview-selection` | Preview Selection | `validate:preview-selection` | generated | yes | yes | yes | direct-node | `scripts/validate-preview-selection.mjs` | — |
| Preview | `preview-inspector` | Preview Inspector | `validate:preview-inspector` | generated | yes | yes | yes | direct-node | `scripts/validate-preview-inspector.mjs` | — |
| UI | `design-canvas` | Design Canvas | `validate:design-canvas` | generated | yes | yes | yes | direct-node | `scripts/validate-design-canvas.mjs` | — |
| UI | `visual-selection-overlay` | Visual Selection Overlay | `validate:visual-selection-overlay` | generated | yes | yes | yes | direct-node | `scripts/validate-visual-selection-overlay.mjs` | — |
| UI | `html-element-library` | HTML Element Library | `validate:html-element-library` | generated | yes | yes | yes | direct-node | `scripts/validate-html-element-library.mjs` | — |
| UI | `source-patch-preview` | Source Patch Preview | `validate:source-patch-preview` | generated | yes | yes | yes | direct-node | `scripts/validate-source-patch-preview.mjs` | — |
| UI | `editable-inspector-surface` | Editable Inspector Surface | `validate:editable-inspector-surface` | generated | yes | yes | yes | direct-node | `scripts/validate-editable-inspector-surface.mjs` | — |
| UI | `css-sass-inspector-surface` | CSS/Sass Inspector Surface | `validate:css-sass-inspector-surface` | generated | yes | yes | yes | direct-node | `scripts/validate-css-sass-inspector-surface.mjs` | — |
| UI | `ui-flow` | UI Flow | `validate:ui-flow` | generated | yes | yes | yes | direct-node | `scripts/validate-ui-flow.mjs` | — |
| Environment | `local-watch` | Local Watch | `validate:local:watch` | generated | yes | yes | yes | direct-node | `scripts/validate-local-watch.mjs` | — |
| Environment | `electron-doctor` | Electron Doctor | `doctor:electron` | generated | yes | yes | yes | direct-node | `scripts/doctor-electron.mjs` | — |
<!-- crystal-generated:validation-catalog:end -->

## Key files

The following paths are the shortest reliable entry points. They are not a substitute for following the data flow through the subsystem.

## Key files and responsibilities

| File or path | Responsibility | Reads | Must not do |
| --- | --- | --- | --- |
| `package.json` | Public command graph. | script declarations | hide required checks |
| `scripts/validation/validation-suite.mjs` | Canonical suite metadata. | check descriptors | invent successful checks |
| `scripts/validation/validation-runner.mjs` | Executes checks and calculates status. | child-process results | convert failure to warning |
| `scripts/validation/validation-reporter.mjs` | Formats terminal, raw, and JSON output. | observed results | change status semantics |
| `scripts/validate-validation-system.mjs` | Meta-validates validation wiring. | scripts, metadata, and docs | recursively run the quick suite |

## Data flow

| Input | Decision | Output |
| --- | --- | --- |
| Required check | Does its command or direct script resolve? | Execution or explicit failure |
| Child process | What exit status and output were observed? | PASS, FAIL, or SKIPPED |
| Render mode | Where is output going? | Different presentation, same result |
| Aggregate suite | Did every required check execute and pass? | Zero or non-zero process exit |
| Generated metadata | Does checked content match canonical inputs? | Stable output or drift failure |

```mermaid
flowchart TD
  Change[Repository change] --> Metadata[Metadata and policy]
  Change --> Docs[Documentation gates]
  Change --> Build[Build and typecheck]
  Change --> Features[Feature validators]
  Metadata --> Runner[Strict quick runner]
  Docs --> Runner
  Build --> Runner
  Features --> Runner
  Runner -->|all required pass| Pass[PASS]
  Runner -->|failure or required skip| Fail[FAIL]
```

## Boundaries

A passing documentation gate does not prove runtime behavior. A passing feature gate does not make a planned capability real. Validators must not mutate files, conceal skipped checks, or print language suggesting they repaired source.

> **Safety boundary:** State that crosses a boundary is evidence to validate, not authority to perform a privileged effect.

## What this does not do

| Not provided | Why |
| --- | --- |
| Autofix | Validation reports drift; generation is a separate explicit operation. |
| Future capability proof | Checks preserve boundaries but do not implement features. |
| Import graph completeness | Physical ownership is covered; full dependency linting remains future. |
| Merge decision | Review and CI remain separate evidence. |

## Common misunderstanding

> **Common misunderstanding:** A validator is evidence only for the contract it actually executed. Passing Markdown integrity does not prove Preview behavior, and a missing runtime check cannot be restated as success.

## Validation

Run `npm run validate:validation-system` to check the validator platform itself. Use `npm run validate:local:quick` for the canonical strict local suite and `npm --silent run validate:local:quick:json` for parseable summary output.

## Related docs

- [Validation platform hardening](./validation-platform-hardening-phase-2.md)
- [Validation flow](./flows/validation-flow.md)
- [Validation gates diagram](./diagrams/validation-gates.md)
- [Development](../development.md)

## Future work

Add import-boundary and write-runtime checks when corresponding contracts exist. New checks must remain deterministic, required where appropriate, and honest about missing execution.

## Read next

You are here: Validation System.

Before this:
- [Architecture overview](./README.md) explains which boundaries validation protects.

Next:
- [Authored Style Matching over DOM Snapshot](./authored-style-matching-dom-snapshot.md) is a concrete example of a narrowly guarded read-only capability.
- [Validation platform hardening](./validation-platform-hardening-phase-2.md) explains metadata generation, process execution, and CI constraints.

Why this matters:
Validation is the evidence layer that keeps documentation, code, generated metadata, and negative guarantees synchronized without pretending that unexecuted work passed.
