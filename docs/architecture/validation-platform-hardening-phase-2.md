# Validation Platform Hardening Phase 2

[Docs index](../README.md)

> **Navigation:** [Architecture overview](./README.md) → [Validation System](./validation-system.md) → Validation Platform Hardening Phase 2

## At a glance

| Concern | Phase 2 contract |
| --- | --- |
| Canonical ownership | Configuration and the validator catalog own derivable metadata. |
| Generation | Build-time generation writes only registered derived outputs. |
| Validation | Validators remain read-only and fail on drift or malformed contracts. |
| npm resolution | npm remains the sole owner of dependency graph resolution. |
| Product scope | No product runtime, `apps/**`, or `packages/**` behavior changes. |

## Architecture boundary

```text
Canonical configuration
        |
        v
Deterministic generator
        |
        v
Generated artifacts
        |
        v
Read-only validators
        |
        v
CI drift detection
```

The normal build is the application entrypoint that synchronizes registered derived outputs before compilation. `sync:project-metadata` remains an explicit maintenance command for reviewing or committing those same outputs. Validators never write source or generated files.

## Validator catalog ownership

Every materialized validator entry declares its npm script, execution mode, arguments, suite flags, and `scriptOwnership`.

- `generated` means the catalog owns the npm command. A missing command may be generated, an identical command remains stable, and a different existing command is a collision rather than an overwrite.
- `external` means `package.json` owns the command manually. The generator verifies existence but does not modify it.

For direct Node validators, both the npm representation and local execution derive from `directScriptPath` plus the same argument array. Display quoting never becomes process execution parsing.

## Generated document markers

Generated Markdown blocks must already have exactly one valid start/end marker pair. Check and write modes fail when markers are missing, inverted, duplicated, or nested. Normal build does not append a missing block, move it, or rewrite surrounding human content.

## Transactional metadata synchronization

Metadata synchronization calculates and validates all outputs before touching targets. Write mode then:

1. acquires `.tmp/project-metadata-sync.lock` by exclusive creation;
2. stages each target in its own directory;
3. rereads staged content;
4. records backups and a transaction journal;
5. replaces targets one at a time;
6. rolls every target back if any replacement fails;
7. removes staging files, backups, journal, and lock in `finally` cleanup.

A second active process fails immediately. Stale recovery is conservative and never removes a lock owned by a live process. Filesystem atomicity is per target; cross-file consistency is supplied by rollback rather than claimed as a single operating-system transaction.

## Strict command-line interfaces

New tooling CLIs accept only documented flags. Project metadata supports `--write`, `--check`, `--json`, and `--help`; change policy and Markdown validation expose their narrower documented options. Unknown, duplicate, partial, or conflicting flags fail. JSON mode emits machine-readable JSON for both success and argument errors.

## Process execution contracts

The tooling process runner uses argument arrays with `shell: false`. It applies explicit default timeout and output-buffer limits, supports per-call overrides, and returns normalized results with duration and failure taxonomy:

- `COMMAND_NOT_FOUND`
- `PROCESS_TIMEOUT`
- `PROCESS_OUTPUT_LIMIT`
- `PROCESS_SIGNALLED`
- `PROCESS_EXIT_FAILURE`
- `PROCESS_SPAWN_FAILURE`
- `NPM_CLI_NOT_FOUND`

Command formatting exists only for diagnostics. Environment values and credentials are not included in formatted commands.

## Strict schemas and version policy

Node-standard-library schema checks reject unknown keys and invalid types in the project baseline, change policy, documentation contract, metadata consumer manifest, and validator catalog. Canonical Node, Electron, embedded Node, and `@types/node` baselines must be stable releases. Prerelease baselines are rejected because Crystal intentionally supports only the exact, caret, and simple-comparator range subset used by managed metadata.

Unmanaged dependency ranges are compared structurally between `package.json` and the lockfile root. Crystal does not interpret arbitrary npm range syntax or simulate dependency resolution; dependency changes require npm.

## Canonical metadata consumers

`config/project-metadata-consumers.json` registers generated files, generated JSON, generated document blocks, runtime imports, and doctor checks that consume baseline fields. Validation checks field existence, normalized paths, marker ownership, canonical imports, duplicates, and independent hardcoded equivalents. This replaces reliance on searching only for the current version string.

## Behavioral and structural validation

`docs/metadata/validation-behavior-contracts.json` maps important reporter, runner, catalog, marker, and drift contracts to executable fixtures. JSON purity, raw ANSI behavior, skip/fail-fast semantics, missing scripts, process failures, slowest ranking, visible-width helpers, direct arguments, generated drift, and marker failure are behavioral tests.

Literal checks remain only where structure itself is the contract: required files and exports, parseable schemas and catalog data, declared scripts, markers, absence of `shell: true`, and ownership of `node:child_process`. A source token alone is not treated as proof that a validator executed or finalized correctly.

## Markdown navigation validation

Markdown integrity validates inline links, local and cross-file fragments, reference and collapsed references, defined shortcut references, simple HTML `href` values, URL-encoded paths, and duplicate-heading suffixes. It ignores external protocols and fenced code, does not access the network, and rejects repository traversal.

The heading slugger approximates GitHub Markdown for the repository's documented heading patterns. It is intentionally not a complete CommonMark or HTML parser.

## Change-policy base resolution

For pull requests, CI passes `github.event.pull_request.base.sha` as the exact comparison base. Push events pass `github.event.before`; an all-zero branch-creation value triggers the documented fallback rather than being treated as a commit. The validator reports branch, branch source, base, base source, event type, and comparison range, and fails closed in CI when an authoritative SHA cannot be resolved.

## GitHub Actions security

The Validation workflow keeps `contents: read`, disables persisted checkout credentials, does not use `pull_request_target`, does not upload the workspace or sensitive paths, and pins allowlisted external actions to verified full commit SHAs with human-readable version comments. CI checks metadata and build idempotence and rejects transaction residue.

## Documentation ownership

Metadata that can be derived safely—toolchain values, validator tables, suite membership, and registered links—may be generated. Explanatory prose remains human-authored. Editorial requirements are declarative validation contracts, not generated paragraphs. No roadmap phase manifest was added because this phase did not identify a narrow generated index that would reduce duplication without moving editorial roadmap ownership into JSON.

## Validation

Run:

```bash
npm run test:tooling-hardening
npm run validate:project-metadata
npm run validate:validation-system
npm run validate:change-policy
npm run validate:markdown-integrity
npm run validate:local:quick
npm --silent run validate:local:quick:json
npm run build
```

## Read next

You are here: Validation Platform Hardening Phase 2.

Before this:
- [Validation System](./validation-system.md) defines reporter semantics, phase safeguards, and validator responsibilities.

Next:
- [Validation flow](./flows/validation-flow.md) shows how validation gates compose.

Related:
- [Development setup](../development.md)
- [Repository map](./repository-map.md)
- [Future write flow](./flows/future-write-flow.md)

Why this matters:
This phase makes deterministic generation and validation safer without expanding product capability. It prevents silent script ownership changes, partial metadata writes, ambiguous process failures, stale baseline consumers, broken internal navigation, and credential-bearing CI artifacts while keeping validators read-only.
