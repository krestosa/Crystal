# Development environment

Crystal currently targets a Node 24.18.0 local development environment. Use the `.nvmrc` version as the project baseline.

Electron 43.1.0 embeds Node 24.18.0 internally, and the local toolchain uses `@types/node` 24.x. Keeping the host Node runtime on Node 24.18.0 keeps Crystal aligned with the Node runtime embedded by the stable Electron baseline.

## Windows baseline

Expected local versions:

```txt
Node 24.18.0
npm >=10.0.0
Electron 43.1.0
Electron internal Node.js 24.18.0
```

With nvm-windows:

```powershell
nvm install 24.18.0
nvm use 24.18.0
node --version
npm --version
```

`node --version` should print `v24.18.0`. npm should satisfy `>=10.0.0`; Node 24.18.0 may ship npm 11.x, and npm 10 remains accepted by the project engines.

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
npm ci --foreground-scripts
npx electron --version
npm run doctor:electron
npm run dev
```

`npm ci --foreground-scripts` is intentional. Electron downloads and prepares its runtime binary from its install script; running scripts in the foreground makes Electron install failures visible instead of hiding them behind npm output buffering.

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

## Local validation runner

Before requesting a PR merge, run:

```bash
npm run validate:local
```

The runner executes the local validation command graph. For reproducible setup before validation, use `npm ci` from the committed `package-lock.json`.

```txt
npm ci
npm run build
npm run typecheck
npm run validate:structure
npm run validate:project-graph
npm run validate:project-watch
npm run validate:preview
npm run validate:dom-snapshot
npm run validate:local:watch
npm run doctor:electron
```

It prints each command, measures duration per step, stops on the first failure, prints a final summary, exits with code `1` on failure, and exits with code `0` only when every check passes.

`npm run validate:local` does not run `npm run dev` by default. To include the interactive Electron launch check:

```bash
npm run validate:local -- --with-dev
```

With `--with-dev`, Electron opens during `npm run dev`. The user must close the app manually before the validation runner can finish.

## Preview validation

Use:

```bash
npm run validate:preview
```

This is a non-visual validation. It checks Preview target resolution, traversal blocking, outside-root guard reporting, MIME mapping and fallback reporting, missing asset diagnostics, issue coalescing, Project Graph target selection, Preview URL handling, and watcher reload planning. It intentionally does not use Playwright, Cypress, Spectron, or screenshot testing.

Preview diagnostics must not expose absolute filesystem paths. Validation checks that missing-resource and outside-root issues keep only safe relative paths or sanitized request URLs.

## DOM snapshot validation

Use:

```bash
npm run validate:dom-snapshot
```

This is a non-visual validation for the read-only DOM snapshot foundation. It checks the static HTML fixture, document root creation, `html`/`head`/`body` element detection, basic attributes, text preview truncation, node/depth limits, missing-file issues, traversal blocking, absolute path rejection, and absence of absolute filesystem paths in issues.

The DOM snapshot parser is intentionally minimal. It is not a browser DOM implementation and does not validate CSS cascade, layout, script execution, iframe runtime state, computed styles, selection, overlays, or screenshots.

## Preview manual check

Use `fixtures/sample-html-project` for manual Preview checks:

1. Run `npm run dev`.
2. Open the fixture folder from the Project Graph panel.
3. In the Design view, load `preview.html` and press `Load Preview`.
4. Confirm the HTML renders and `styles/preview.css`, `scripts/preview.js`, and `assets/preview-icon.svg` load without critical issues.
5. Load `preview-missing-assets.html`.
6. Confirm the Preview issues section shows `file-not-found` entries for missing local CSS, script, or image resources.
7. Press `Reload Preview` and confirm repeated resource failures are coalesced with a count instead of creating noisy duplicate rows.
8. Start the watcher, change `preview.html` or `styles/preview.css`, and confirm controlled reload after Project Graph refresh.
9. Create an ignored file such as `scratch.tmp` and confirm Preview does not reload because of it.

The Preview issues panel is diagnostic only. It is not an Inspector, browser console, visual editing surface, or overlay engine.

## DOM snapshot manual check

Use `fixtures/sample-html-project` for manual DOM snapshot checks:

1. Run `npm run dev`.
2. Open the fixture folder from the Project Graph panel.
3. Load a Preview target.
4. Press `Build DOM Snapshot` in the DOM Tree panel.
5. Confirm a read-only textual tree appears.
6. Confirm tags and basic attributes are visible.
7. Confirm long text nodes are truncated.
8. Confirm there is no click selection, hover highlight, overlay, bounding box, scroll-to-node behavior, style inspector, or editing.
9. Press `Reload Preview` and confirm Preview still reloads normally.
10. Run `npm run validate:local` before merge.

## Watcher filesystem validation

Use:

```bash
npm run validate:local:watch
```

This check creates a temporary project under `.tmp/validation/watch-run-<timestamp>`, performs real filesystem operations, validates graph-relevant and ignored paths, verifies that ignored paths do not count as refresh-triggering events, stops the watcher harness, and removes the temporary project in a `finally` cleanup block.

The temporary project includes:

```txt
index.html
styles/main.css
styles/delete-watch.css
scripts/main.js
```

The validation modifies HTML and JavaScript files, creates a CSS file, deletes a CSS file, creates/deletes `scratch.tmp`, and verifies `.crystal-cache` as ignored.

The script uses Node standard library APIs only. It intentionally does not use Playwright, Cypress, Spectron, or another UI automation framework.

## Project Graph watcher development

After opening a project folder or HTML file in the app, the Project Graph panel can start and stop the watcher, manually refresh the graph, clear the in-memory cache, and display recent file events.

Use `fixtures/sample-html-project` for manual local checks. Modify `styles/watch-target.css`, create a small SVG placeholder, or delete a temporary fixture file to verify event classification and refresh behavior. Ambiguous events should fall back to full rescan.

Manual UI checks remain required only where there is not enough automation yet. The validation runner must be updated whenever a roadmap phase adds new required checks.

## Dependency installation policy

Use `npm ci` for reproducible local installation from the committed `package-lock.json`.

Use `npm install` only when intentionally updating dependencies, such as refreshing the Electron/Node baseline. `package-lock.json` must remain versioned, must not be ignored, and must not be deleted.

## Do not use forced audit fixes

Do not run:

```bash
npm audit fix --force
```

Forced audit fixes may replace major dependency versions, rewrite the lockfile, and change Electron or build tooling outside the scope of the current phase. Security fixes must be reviewed as explicit dependency updates.

## Required validation sequence

After a clean install, run:

```bash
npm run validate:local
```

For the explicit Electron launch check, run:

```bash
npm run validate:local -- --with-dev
```
