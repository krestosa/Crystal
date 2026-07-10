# Crystal

Crystal is an Electron/Node desktop workbench for real HTML projects. Current foundations are read-only and dry-run: they inspect, preview, map, and plan, but do not write project files.

## Documentation

Start with [the docs index](docs/README.md), then review [runtime boundaries](docs/architecture/runtime-boundaries.md), [security](docs/architecture/security-model.md), [Preview](docs/architecture/preview/README.md), [commands](docs/architecture/commands/README.md), and the [current roadmap](docs/roadmap-implementation.md).

## Requirements

<!-- crystal-generated:toolchain:start -->
<!-- Do not edit manually. Run npm run sync:project-metadata. -->

| Requirement | Canonical value |
| --- | --- |
| Node.js local baseline | 24.18.0 (>=24.18.0 <25) |
| npm engine | >=10.0.0 |
| Electron package | 43.1.0 (^43.1.0) |
| Electron internal Node.js | 24.18.0 |
| Electron Chromium | 150.0.7871.47 |
| Reproducible install | `npm ci` from the committed `package-lock.json` |
| Lockfile policy | Keep `package-lock.json` tracked; use `npm install` only for explicit dependency resolution. |
<!-- crystal-generated:toolchain:end -->

## Install and development

```bash
npm ci
npm run dev
```

Use `npm ci` for reproducible installs. Use `npm install` only when intentionally resolving dependency changes.

## Build and validation

`npm run build` synchronizes deterministic generated metadata before HTML, SCSS, and TypeScript compilation. Validators remain read-only.

| Command | Purpose |
| --- | --- |
| `npm run sync:project-metadata` | Regenerate derived metadata. |
| `npm run validate:project-metadata` | Detect generated drift without writing. |
| `npm run validate:change-policy` | Enforce branch-specific changed-file policy. |
| `npm run validate:markdown-integrity` | Detect malformed Markdown. |
| `npm run validate:local:quick` | Run the strict catalog-driven gate. |
| `npm --silent run validate:local:quick:json` | Emit pure JSON. |
| `npm run test:tooling-hardening` | Run tooling regression fixtures. |

## Safety boundary

Renderer code presents state and intent. Main owns privileged effects. Core owns portable models and planning. Future writes must use typed, validated, reversible commands and source patches.
