# Crystal Architecture

Crystal is a desktop application built from a modular source tree into compact runtime outputs.

## Runtime contexts

Crystal starts with three Electron contexts:

```txt
Electron main process  -> dist/main/main.js
Electron preload       -> dist/preload/preload.js
Renderer               -> dist/renderer/index.html + main.css + main.js
```

The renderer has no direct Node access. Electron security starts with `contextIsolation: true`, `nodeIntegration: false`, and a controlled preload bridge.

## Source-to-output rule

```txt
HTML partials -> dist/renderer/index.html
SCSS modules  -> dist/renderer/main.css
TS modules    -> dist/*/*.js
```

CSS and JavaScript are treated as generated runtime outputs. The human-authored source is HTML, SCSS, and TypeScript.

## Monorepo shape

```txt
apps/       Product applications.
packages/   Shared core, engines, adapters, build tools, and utilities.
docs/       Project architecture and roadmap documentation.
scripts/    Build and validation entrypoints.
```

## Core boundary

Core contains command, event, and state skeletons.

Commands execute actions. Events notify changes. State is centralized in Crystal-owned modules. UI components must not mutate project files directly; future mutations must pass through commands.

## Adapter boundary

The project uses external tools only where they are structural: Electron, TypeScript, Dart Sass, and esbuild at this stage. Build-facing external APIs are isolated behind adapter folders when practical.

Current adapters:

```txt
packages/adapters/bundler/
packages/adapters/sass-compiler/
packages/adapters/html-assembler/
```

## Intentional non-features in this bootstrap

This bootstrap does not create the Project Graph, real preview, Design MVP, Inspector MVP, Developer MVP, WebGPU overlay engine, or Rust/WASM analyzer. Those belong to later roadmap phases.
