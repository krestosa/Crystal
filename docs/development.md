# Development

[Docs index](./README.md)

Crystal's local workflow is intentionally explicit: select the canonical runtime, install from the lockfile, build generated outputs deterministically, and use validators that report exactly what ran.

## Toolchain

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

## Install and build

From the repository root:

```bash
npm ci --foreground-scripts
npm run build
```

The build synchronizes registered project metadata, assembles renderer HTML, compiles SCSS, and bundles TypeScript into the compact Electron outputs under `dist/`. Generated metadata must be stable: a second metadata check should produce no diff.

## Run the application

```bash
npm run dev
```

Use the Status Bar action when you need DevTools. The development command does not open them automatically.

For watcher work:

```bash
npm run dev:watch
npm run validate:local:watch
```

The watcher is a development convenience, not an alternate authority model. Main still owns filesystem-backed project services.

## Validation during development

Choose the smallest gate that proves the change, then finish with the aggregate suite appropriate to the branch.

| Change | First focused command |
| --- | --- |
| Documentation | `npm run validate:markdown-integrity` |
| Guided navigation | `npm run validate:guided-docs` |
| Architecture docs | `npm run validate:architecture-docs` |
| Preview | `npm run validate:preview` |
| DOM Snapshot | `npm run validate:dom-snapshot` |
| Selection or Inspector | `npm run validate:preview-selection` / `npm run validate:preview-inspector` |
| Command previews | `npm run validate:source-patch-preview` |
| Style inventory or matching | `npm run validate:style-engine-foundation` / `npm run validate:authored-style-matching` |

Then run:

```bash
npm run validate:local:quick
```

Use the full suite before merging broader runtime changes:

```bash
npm run validate:local
```

For machine-readable quick validation:

```bash
npm --silent run validate:local:quick:json
```

Plain `npm run ... -- --json-summary` can print npm lifecycle banners before the JSON payload; silent npm or direct Node invocation avoids that ambiguity.

## Source ownership

Runtime code belongs under registered owners: `main`, `preload`, `renderer`, `core`, `shared`, and `adapters`. Do not place product source directly under the `apps/` or `packages/` container roots. The physical source-tree validator enforces registered paths; import-direction review remains necessary because complete static import graph enforcement is not implemented.

## Documentation changes

Generated blocks are not prose-editing surfaces. Change canonical configuration and run `npm run sync:project-metadata` when a generated value must move. Human-authored explanation should stay outside marker pairs.

For documentation-only work, the permitted change boundary is `README.md` and `docs/**`. Run metadata, Markdown integrity, guided-docs, architecture-docs, and change-policy validation before the aggregate quick suite.

## Troubleshooting

If Electron fails before the window opens, run:

```bash
npm run doctor:electron
```

If a validation report says SKIPPED, do not restate it as PASS. Resolve the missing command, file, runtime, or dependency and run the gate again.
