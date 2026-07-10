# Development environment

Crystal uses one canonical toolchain baseline and deterministic generated metadata. Change `config/project-baseline.json`; do not edit the generated toolchain block below manually.

## Canonical toolchain

<!-- crystal-generated:toolchain:start -->
<!-- Do not edit manually. Run npm run sync:project-metadata. -->

Crystal reads the selected toolchain baseline from `config/project-baseline.json`.

| Runtime | Canonical value |
| --- | --- |
| Local Node.js | 24.18.0 |
| Node engine | >=24.18.0 <25 |
| npm engine | >=10.0.0 |
| Electron | 43.1.0 |
| Electron package range | ^43.1.0 |
| Electron internal Node.js | 24.18.0 |
| Electron Chromium | 150.0.7871.47 |

With nvm-windows:

```powershell
nvm install 24.18.0
nvm use 24.18.0
node --version
npm --version
```

Install reproducibly with `npm ci --foreground-scripts`. Use `npm install` or `npm install --package-lock-only` only when intentionally resolving a direct dependency change. Metadata synchronization never resolves packages or rewrites transitive dependency nodes.
<!-- crystal-generated:toolchain:end -->

## Clean installation

Use this from the repository root:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron\Cache" -ErrorAction SilentlyContinue
npm ci --foreground-scripts
npm run doctor:electron
```

`npm ci --foreground-scripts` installs exactly the committed lockfile graph and exposes Electron postinstall failures. `npm install` is reserved for intentional dependency resolution.

## Updating the Node or Electron baseline

1. Edit only `config/project-baseline.json` for the selected baseline.
2. When the selected Electron range is not already represented by a compatible lock graph, run `npm install` or `npm install --package-lock-only` explicitly.
3. Run `npm run sync:project-metadata`.
4. Review `.nvmrc`, `package.json`, root lockfile metadata, and generated documentation blocks.
5. Run `npm run validate:project-metadata` and the full validation sequence.

Metadata synchronization can update:

- `.nvmrc`;
- `package.json` engines and canonical direct toolchain ranges;
- `package-lock.json` root package metadata;
- generated toolchain documentation;
- the generated validator catalog.

Metadata synchronization does not:

- contact the registry;
- select a latest version;
- create `resolved` or `integrity` values;
- add or delete transitive nodes;
- run `npm audit fix`;
- change runtime functionality.

If a direct dependency range requires a different resolved graph, synchronization fails and tells the developer to run npm dependency resolution explicitly.

## Build behavior

```bash
npm run build
```

The build performs these operations in order:

1. synchronize deterministic generated project metadata;
2. assemble HTML;
3. compile SCSS;
4. bundle TypeScript.

The same synchronization is called from `scripts/build.mjs`, so direct script execution cannot bypass generated metadata. A second build must not create an additional diff.

## Read-only validation

```bash
npm run validate:project-metadata
npm run validate:validation-system
npm run validate:change-policy
npm run validate:markdown-integrity
npm run validate:guided-docs
npm run validate:architecture-docs
npm run validate:local:quick
```

Validators inspect and report. They never write files. When generated metadata drifts, the validator reports `npm run sync:project-metadata` as the corrective command.

For machine-readable output:

```bash
npm run validate:project-metadata:json
npm --silent run validate:local:quick:json
```

The silent npm form avoids lifecycle banners so stdout remains JSON only.

## Electron diagnostics

```bash
npm run doctor:electron
```

The doctor derives expectations from the canonical baseline and checks:

- current Node and npm against engines;
- `.nvmrc`;
- `@types/node` major alignment;
- declared and locked Electron versions;
- Electron `path.txt` and executable availability;
- the real Electron executable version;
- package/lockfile root metadata consistency;
- known Electron install environment variables.

It runs the installed Electron executable directly. It does not use `npx electron` and does not open the application UI.

## Adding a validator

1. Add the validator script and its npm script.
2. Add one entry to `scripts/validation/validation-suite.mjs`.
3. Set `id`, `label`, `category`, `npmScript`, `required`, `executionMode`, `directScriptPath`, suite inclusion flags, and `documentationGroup`.
4. Run `npm run build` or `npm run sync:project-metadata`.
5. Confirm the generated table in `docs/architecture/validation-system.md` changed automatically.
6. Add behavioral fixtures when the validator introduces a new contract.

Do not duplicate the validator in documentation, aggregate runner arrays, or category counts.

## Adding guided documentation

1. Add the Markdown document.
2. Register its structural requirements in `docs/metadata/documentation-contract.json`.
3. Add `Read next`, `You are here`, and `Why this matters` only when the contract requires them.
4. Run `npm run validate:markdown-integrity` and `npm run validate:guided-docs`.

Editorial prose remains human-authored. Only derivable tables, matrices, indexes, and metadata blocks are generated.

## Change policy

`npm run validate:change-policy` is independent from documentation validation. It detects the branch from an explicit flag, CI variables, or git, resolves an explicit or default base, and parses NUL-delimited `git diff --name-status --find-renames` output.

Documentation branches use an allowlist. Tooling branches may change tooling, canonical configuration, generated docs, package metadata, lockfile root metadata, tests, and CI. CI fails closed when a branch-specific policy cannot resolve the branch or base.

## Process execution

Tooling process launches are centralized in `scripts/tooling/process-runner.mjs`.

- arguments remain arrays;
- `shell` is always false;
- npm uses the active `npm-cli.js` through `process.execPath`;
- Node scripts use `process.execPath` directly;
- Electron uses the installed executable from `node_modules/electron/path.txt`;
- command-not-found failures remain explicit;
- warnings and stderr are not filtered.

This avoids the unsafe shell/argument combination reported by Node deprecation diagnostics.

## Do not use forced audit fixes

Do not run:

```bash
npm audit fix --force
```

Audit findings must be reviewed as explicit dependency changes. Forced fixes may replace major versions, rewrite the dependency graph, and change Electron or build tooling outside the intended scope.

## Required validation sequence

After a clean install:

```bash
npm run validate:project-metadata
npm run validate:validation-system
npm run validate:change-policy
npm run validate:markdown-integrity
npm run validate:guided-docs
npm run validate:architecture-docs
npm run build
npm run typecheck
npm run doctor:electron
npm run validate:local:quick
npm --silent run validate:local:quick:json
npm run test:tooling-hardening
npm audit
```
