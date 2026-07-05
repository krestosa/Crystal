# Development environment

Crystal currently targets a Node 22 local development environment. Use the `.nvmrc` version as the project baseline. Do not use Node 24 as the default local runtime for this repository until the project explicitly upgrades to it.

Electron 35.x embeds Node 22 internally, and the local toolchain already uses `@types/node` 22.x. Keeping the host Node runtime on Node 22 avoids mixing the project baseline with a newer, unapproved host runtime.

## Windows baseline

Expected local versions:

```txt
Node 22.22.0
npm 10.x
Electron 35.x
```

With nvm-windows:

```powershell
nvm install 22.22.0
nvm use 22.22.0
node --version
npm --version
```

`node --version` should print `v22.22.0`. npm should be the npm version bundled with that Node release, or another npm 10.x release.

## Clean Electron install on Windows

Use this when Electron installs without its runtime binary, for example when these files are missing:

```txt
node_modules/electron/path.txt
node_modules/electron/dist/electron.exe
```

Run from the repository root:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron\Cache" -ErrorAction SilentlyContinue
npm install --foreground-scripts
npx electron --version
npm run doctor:electron
npm run dev
```

`npm install --foreground-scripts` is intentional. Electron downloads and prepares its runtime binary from its install script; running scripts in the foreground makes Electron install failures visible instead of hiding them behind npm output buffering.

## Electron diagnostics

Use:

```bash
npm run doctor:electron
```

The diagnostic checks Node, npm, Electron install files, Electron executable availability, and known Electron install environment variables.

## Development command

The development command is:

```bash
npm run build && electron dist/main/main.cjs
```

The command first builds the app and then launches the Electron main entrypoint from `dist/main/main.cjs`. Electron main and preload are emitted as explicit CommonJS files, `dist/main/main.cjs` and `dist/preload/preload.cjs`, because the repository root keeps `"type": "module"` for `.js` files. If Electron is missing, corrupted, or blocked by install settings, the command must fail visibly.

## Project Graph watcher development

After opening a project folder or HTML file in the app, the Project Graph panel can start and stop the watcher, manually refresh the graph, clear the in-memory cache, and display recent file events.

Use `fixtures/sample-html-project` for local checks. Modify `styles/watch-target.css`, create a small SVG placeholder, or delete a temporary fixture file to verify event classification and refresh behavior. Ambiguous events should fall back to full rescan.

## Do not use forced audit fixes

Do not run:

```bash
npm audit fix --force
```

Forced audit fixes may replace major dependency versions, rewrite the lockfile, and change Electron or build tooling outside the scope of the current phase. Security fixes must be reviewed as explicit dependency updates.

## Required validation sequence

After a clean install, run:

```bash
npm run build
npm run typecheck
npm run validate:structure
npm run validate:project-graph
npm run validate:project-watch
npm run doctor:electron
npm run dev
```
