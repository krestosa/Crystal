import { readFile } from "node:fs/promises";
import path from "node:path";

const failures = [];

const paths = {
  packageJson: "package.json",
  validateLocal: "scripts/validate-local.mjs",
  reset: "apps/desktop/electron/renderer/styles/reset/_reset.scss",
  base: "apps/desktop/electron/renderer/styles/base/_base.scss",
  tokensScss: "apps/desktop/electron/renderer/styles/tokens/_tokens.scss",
  mainWindow: "apps/desktop/electron/main/windows/create-main-window.ts",
  appShellHtml: "apps/desktop/electron/renderer/layout/app-shell/app-shell.html",
  appShellScss: "apps/desktop/electron/renderer/layout/app-shell/app-shell.scss",
  appShellTs: "apps/desktop/electron/renderer/layout/app-shell/app-shell.ts",
  statusBarHtml: "apps/desktop/electron/renderer/layout/status-bar/status-bar.html",
  statusBarScss: "apps/desktop/electron/renderer/layout/status-bar/status-bar.scss",
  sideBarHtml: "apps/desktop/electron/renderer/layout/side-bar/side-bar.html",
  sideBarScss: "apps/desktop/electron/renderer/layout/side-bar/side-bar.scss",
  designHtml: "apps/desktop/electron/renderer/views/design/design.html",
  designScss: "apps/desktop/electron/renderer/views/design/design.scss",
  designTs: "apps/desktop/electron/renderer/views/design/design.ts",
  designCanvasHtml: "apps/desktop/electron/renderer/components/design-canvas/project-design-canvas.html",
  designCanvasScss: "apps/desktop/electron/renderer/components/design-canvas/project-design-canvas.scss",
  graphTs: "apps/desktop/electron/renderer/components/project-graph-panel/project-graph-panel.ts",
  previewHtml: "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html",
  previewScss: "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.scss",
  previewTs: "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.ts",
  domTreeTs: "apps/desktop/electron/renderer/components/project-dom-tree-panel/project-dom-tree-panel.ts",
  previewFixtureCss: "fixtures/sample-html-project/styles/preview.css",
  domSnapshotHtml: "fixtures/sample-html-project/dom-snapshot.html",
  domSnapshotEdgeCasesHtml: "fixtures/sample-html-project/dom-snapshot-edge-cases.html"
};

const source = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, filePath]) => [key, await readText(filePath)])));
const runtimeSource = Object.entries(source).filter(([key]) => !["packageJson", "validateLocal", "previewFixtureCss", "domSnapshotHtml", "domSnapshotEdgeCasesHtml"].includes(key)).map(([, value]) => value).join("\n");
const packageData = parsePackageJson(source.packageJson);
const triggerCount = countToken(`${source.appShellHtml}\n${source.statusBarHtml}\n${source.designHtml}`, "data-crystal-diagnostics-toggle");

expect(!source.appShellHtml.includes("top-bar"), "App shell still renders the old internal top bar.");
expect(!source.appShellHtml.includes("activity-bar"), "App shell still renders the internal activity strip.");
expect(source.mainWindow.includes("autoHideMenuBar: true"), "Main window does not hide the default menu chrome.");
expect(source.mainWindow.includes('titleBarStyle: "hidden"'), "Main window does not integrate the title bar into the carbon shell.");
expect(source.mainWindow.includes("titleBarOverlay"), "Main window does not expose native controls over the carbon title area.");
expect(source.mainWindow.includes("CRYSTAL_TITLE_BAR_OVERLAY_HEIGHT = 32"), "Native titlebar overlay is not aligned to the compact chrome height.");
expect(source.mainWindow.includes("height: CRYSTAL_TITLE_BAR_OVERLAY_HEIGHT"), "Native titlebar overlay height is not routed through the chrome constant.");
expect(source.mainWindow.includes("webPreferences: getSecureWebPreferences()"), "Main window security preferences were not preserved.");
expect(source.mainWindow.includes('process.env.CRYSTAL_OPEN_DEVTOOLS === CRYSTAL_OPEN_DEVTOOLS'), "Electron DevTools are not guarded by CRYSTAL_OPEN_DEVTOOLS.");
expect(source.mainWindow.includes('openDevTools({ mode: "detach" })'), "Electron DevTools launch mode is not explicit.");

expect(source.appShellHtml.includes("data-crystal-app-chrome"), "App shell does not expose a compact native drag region.");
expect(source.appShellHtml.includes("data-crystal-native-titlebar"), "App shell does not separate the native titlebar row.");
expect(!source.appShellHtml.includes("data-crystal-app-bar"), "Redundant app-bar strip still renders in the app shell.");
expect(!source.appShellHtml.includes("Compact project shell"), "Decorative compact shell text still renders in the top strip.");
expect(!source.appShellHtml.includes("data-crystal-diagnostics-toggle"), "Diagnostics trigger still renders in the top shell.");
expect(source.statusBarHtml.includes("data-crystal-diagnostics-toggle"), "Diagnostics trigger is not rendered in the status bar.");
expect(source.statusBarHtml.includes("data-crystal-runtime-status") && source.statusBarHtml.includes("Renderer isolated"), "Status bar runtime indicator was not preserved.");
expect(triggerCount === 1, `Diagnostics trigger must render exactly once; found ${triggerCount}.`);
expect(source.statusBarHtml.includes("aria-label=\"Toggle diagnostics\""), "Diagnostics status trigger is missing an accessible label.");
expect(source.statusBarHtml.includes("aria-expanded=\"false\""), "Diagnostics status trigger is missing aria-expanded.");
expect(source.statusBarScss.includes(".crystal-status-bar__diagnostics-button"), "Status bar diagnostics trigger is not styled.");
expect(source.statusBarScss.includes("[aria-expanded=\"true\"]"), "Status bar diagnostics trigger does not expose an active state.");
expect(source.statusBarScss.includes(":focus-visible"), "Status bar diagnostics trigger has no visible focus state.");
expect(source.appShellScss.includes("grid-template-rows: var(--crystal-native-titlebar-height) minmax(0, 1fr) 20px"), "Redundant top strip still consumes shell grid height.");
expect(!source.appShellScss.includes("--crystal-app-bar-height"), "App shell still models a redundant app-bar height.");
expect(!source.appShellScss.includes(".crystal-app-shell__app-bar"), "App shell still styles a redundant app-bar strip.");
expect(!source.appShellScss.includes(".crystal-app-shell__diagnostics-button"), "Diagnostics trigger styles still live in the top shell.");
expect(source.appShellScss.includes("--crystal-window-controls-width"), "App chrome does not reserve native window control width.");
expect(source.appShellScss.includes("env(titlebar-area-width"), "App chrome does not use native titlebar area env data when available.");
expect(source.appShellScss.includes(".crystal-app-shell__native-titlebar::before"), "Native titlebar row does not reserve/paint the window controls area.");
expect(!source.appShellScss.includes(".crystal-app-shell__chrome::after"), "Chrome wrapper still draws a divider under native controls.");
expect(source.appShellScss.includes("-webkit-app-region: drag"), "App shell chrome is not draggable.");
expect(source.appShellScss.includes("height: 100vh") && source.appShellScss.includes("overflow: hidden"), "App shell does not lock to the viewport without global overflow.");
expect(source.reset.includes("overflow: hidden"), "Document reset does not prevent window-level app scrolling.");
expect(source.base.includes("::-webkit-scrollbar"), "Crystal UI scrollbars are not styled.");

expect(source.appShellHtml.includes("data-crystal-left-sidebar-resizer"), "App shell does not expose the left sidebar resize handle.");
expect(source.appShellTs.includes("CRYSTAL_MIN_WORKBENCH_WIDTH"), "App shell resize logic does not clamp against a minimum workbench width.");
expect(source.appShellTs.includes("setPointerCapture"), "App shell resize handle does not capture pointer drags.");

expect(source.designHtml.includes("data-crystal-diagnostics-popover"), "Design view does not expose the floating diagnostics panel.");
expect(source.designHtml.includes("data-crystal-diagnostics-close"), "Design view does not expose the floating diagnostics close action.");
expect(source.designHtml.includes("data-crystal-diagnostics-pin"), "Design view does not expose the diagnostics pin action.");
expect(source.designHtml.includes("aria-label=\"Unpin Diagnostics\""), "Diagnostics pin icon button is missing the exact accessible active-state label.");
expect(!source.designHtml.includes("Graph · Preview · DOM · Events"), "Diagnostics header still renders redundant section text.");
expect(source.designHtml.includes("<h2>Diagnostics</h2>"), "Diagnostics title was not preserved.");
expect(source.designTs.includes("\"Unpin Diagnostics\" : \"Pin Diagnostics\""), "Diagnostics pin runtime labels do not match the required accessible labels.");
expect(!source.designHtml.includes(">Pinned<") && !source.designHtml.includes(">Unpinned<"), "Diagnostics pin still renders textual state labels.");
for (const requiredHandle of [
  "data-crystal-diagnostics-resize-top-left",
  "data-crystal-diagnostics-resize-top",
  "data-crystal-diagnostics-resize-top-right",
  "data-crystal-diagnostics-resize-right",
  "data-crystal-diagnostics-resize-bottom-right",
  "data-crystal-diagnostics-resize-bottom",
  "data-crystal-diagnostics-resize-bottom-left",
  "data-crystal-diagnostics-resize-left"
]) {
  expect(source.designHtml.includes(requiredHandle), `Diagnostics are missing resize handle: ${requiredHandle}`);
  expect(source.designTs.includes(requiredHandle), `Diagnostics resize is not wired in TS: ${requiredHandle}`);
}
expect(source.designScss.includes("width: 14px") && source.designScss.includes("height: 14px") && source.designScss.includes("top: -14px") && source.designScss.includes("right: -14px"), "Diagnostics resize handles are not large/external enough.");
expect(source.designScss.includes("z-index: 6"), "Diagnostics resize handles do not have sufficient stacking priority.");
expect(source.designScss.includes("contain: layout style") && !source.designScss.includes("contain: layout paint"), "Diagnostics paint containment can still block external resize handles.");
expect(source.designTs.includes("setPointerCapture"), "Design resize/drag handles do not capture pointer drags.");
expect(source.designTs.includes("CRYSTAL_DIAGNOSTICS_PANEL_RECOVERY_SIZE = 32"), "Diagnostics drag bounds do not keep a recoverable panel area.");
expect(source.designTs.includes("CRYSTAL_DIAGNOSTICS_PANEL_MAX_VIEWPORT_RATIO"), "Diagnostics resize still caps to a small viewport-only size.");
expect(source.designTs.includes("if (diagnosticsPinned) setDiagnosticsPinned(false)"), "Dragging diagnostics does not automatically unpin the panel.");
expect(source.designTs.includes(".crystal-design-view__debug-list, .crystal-design-view__debug-tree"), "Diagnostics drag guard does not protect internal scrollable debug controls.");
expect(!source.designTs.includes("CRYSTAL_DIAGNOSTICS_PANEL_MAX_WIDTH") && !source.designTs.includes("CRYSTAL_DIAGNOSTICS_PANEL_MAX_HEIGHT"), "Diagnostics resize still uses artificial max dimensions.");

for (const areaClass of ["debug-panel--graph", "debug-panel--preview", "debug-panel--dom", "debug-panel--events"]) {
  expect(source.designHtml.includes(areaClass), `Diagnostics section is missing grid area class: ${areaClass}`);
}
expect(source.designScss.includes("grid-template-areas") && source.designScss.includes("graph preview") && source.designScss.includes("dom events"), "Diagnostics sections are not separated by grid areas.");
expect(source.designScss.includes("grid-area: events"), "Events diagnostics do not own a separate grid area.");
expect(source.designScss.includes("overflow: hidden") && source.designScss.includes("overflow: auto"), "Diagnostics panels/lists do not contain overflow safely.");
expect(source.designScss.includes("display: flex") && source.designScss.includes("flex: 0 0 auto") && source.designScss.includes("height: var(--crystal-control-compact-size)"), "Diagnostics action buttons can still stretch across the grid.");
expect(source.designScss.includes("white-space: pre") && source.designScss.includes("font-family: monospace"), "DOM tree diagnostics formatting is not preserved.");
expect(source.designScss.includes("overflow-wrap: anywhere") && source.designScss.includes("word-break: normal"), "Diagnostics metadata does not wrap long technical text safely.");

expect(source.designCanvasHtml.includes("data-crystal-start-screen"), "Canvas start block is missing.");
expect(source.designCanvasScss.includes("box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14)"), "Canvas focus-visible still uses an invasive accent frame or lacks a neutral alternative.");
expect(!source.designCanvasScss.includes(".crystal-project-design-canvas__surface:focus-visible {\n  box-shadow: 0 0 0 2px var(--crystal-focus-ring)"), "Canvas click/focus still shows the orange focus frame.");
expect(source.designCanvasScss.includes(".crystal-project-design-canvas__button:hover {") && !source.designCanvasScss.includes(".crystal-project-design-canvas__button:hover,\n.crystal-project-design-canvas__button:focus-visible"), "Canvas hover still shares accent focus styling.");
expect(source.previewScss.includes("appearance: none") && source.previewScss.includes("background-image: linear-gradient") && source.previewScss.includes("color-scheme: dark"), "Inspector select is not aligned to the system control style.");
expect(source.previewScss.includes(".crystal-project-preview-panel__target option") && source.previewScss.includes("option:checked"), "Inspector select options are not explicitly dark styled.");
expect(source.previewFixtureCss.includes("color-scheme: dark") && source.previewFixtureCss.includes("background: #070604") && source.previewFixtureCss.includes("color: #f7f2ec"), "Preview fixture CSS is not dark themed.");
expect(source.domSnapshotHtml.includes("./styles/preview.css"), "DOM snapshot fixture does not use the shared dark fixture stylesheet.");
expect(source.domSnapshotEdgeCasesHtml.includes("background: #070604") && source.domSnapshotEdgeCasesHtml.includes("color: #f7f2ec"), "DOM edge-case fixture does not preserve dark local styling.");

for (const requiredToken of [
  "--crystal-color-control-bg",
  "--crystal-color-control-border",
  "--crystal-color-control-hover-bg",
  "--crystal-color-panel-bg",
  "--crystal-control-compact-size",
  "--crystal-control-radius"
]) {
  expect(source.tokensScss.includes(requiredToken), `Missing shared compact shell token: ${requiredToken}`);
}
expect(source.statusBarScss.includes("var(--crystal-control-compact-size)") && source.designScss.includes("var(--crystal-color-control-bg)") && source.previewScss.includes("var(--crystal-color-control-bg)"), "New compact shell tokens are not used across touched UI surfaces.");

expect(!source.designHtml.includes("Phase 2"), "Design view still exposes phase copy in the workspace.");
expect(!source.sideBarHtml.includes("verification panel"), "Sidebar still reads like a validation panel.");
expect(source.sideBarScss.includes("scrollbar-gutter: stable both-edges"), "Sidebar scrolling is not integrated into the compact shell.");
expect(!source.previewHtml.includes("../design-canvas/project-design-canvas.html"), "Preview panel still owns the Design Canvas partial.");
expect(source.designHtml.includes("../../components/design-canvas/project-design-canvas.html"), "Design view does not own the Design Canvas partial.");
expect(source.graphTs.includes("document.querySelectorAll<HTMLButtonElement>"), "Open actions are not bound across the start screen and sidebar.");
expect(source.previewTs.includes("document.querySelector"), "Preview diagnostics cannot render outside the right sidebar.");
expect(source.domTreeTs.includes("document.querySelector"), "DOM diagnostics cannot render outside the right sidebar.");

for (const requiredDebugHook of [
  "data-project-watch-events",
  "data-project-files",
  "data-project-issues",
  "data-project-preview-issues-list",
  "data-project-dom-tree-output"
]) {
  expect(source.designHtml.includes(requiredDebugHook), `Floating diagnostics are missing hook: ${requiredDebugHook}`);
}

for (const forbidden of [
  "allow-same-origin",
  "iframe.contentDocument",
  "iframe.contentWindow.document",
  ".contentDocument",
  ".contentWindow.document",
  "contenteditable",
  "insertAdjacentHTML",
  "execCommand",
  "navigator.gpu",
  "GPUCanvasContext",
  "requestAdapter"
]) {
  expect(!runtimeSource.includes(forbidden), `UI flow introduced forbidden runtime token: ${forbidden}`);
}

const forbiddenDependencyNames = new Set(["react", "react-dom", "vue", "angular", "@angular/core", "svelte", "tailwindcss", "bootstrap", "@playwright/test", "playwright", "cypress", "spectron"]);
for (const dependencyName of getPackageDependencyNames(packageData)) {
  expect(!forbiddenDependencyNames.has(dependencyName), `Forbidden UI/test dependency detected in package.json dependency maps: ${dependencyName}`);
}

for (const requiredScript of ["validate:local:quick", "validate:local:quick:core", "validate:local:quick:preview", "validate:local:quick:ui"]) {
  expect(typeof packageData.scripts?.[requiredScript] === "string", `package.json is missing required quick validation script: ${requiredScript}`);
}
expect(packageData.scripts?.["validate:ui-flow"] === "node scripts/validate-ui-flow.mjs", "package.json does not expose validate:ui-flow.");
expect(source.validateLocal.includes("npm run validate:ui-flow"), "validate-local does not run validate:ui-flow.");

if (failures.length > 0) {
  console.error("UI flow validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("UI flow validation passed: status-bar diagnostics trigger, minimal native titlebar, functional diagnostics resize handles, separated diagnostics sections, simplified diagnostics header, neutral canvas focus, dark fixtures, system inspector select, compact shell tokens, optional DevTools flag, quick validation scripts, dependency guard, and iframe safety boundaries.");

async function readText(filePath) {
  return readFile(path.resolve(filePath), "utf8");
}

function countToken(sourceText, token) {
  return sourceText.split(token).length - 1;
}

function parsePackageJson(sourceText) {
  try {
    return JSON.parse(sourceText);
  } catch (error) {
    expect(false, `package.json could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}

function getPackageDependencyNames(packageData) {
  const dependencyNames = [];
  for (const mapName of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    const dependencyMap = packageData[mapName];
    if (!dependencyMap) continue;
    if (typeof dependencyMap !== "object" || Array.isArray(dependencyMap)) {
      expect(false, `package.json ${mapName} must be an object when present.`);
      continue;
    }
    dependencyNames.push(...Object.keys(dependencyMap).map((name) => name.toLowerCase()));
  }
  return dependencyNames;
}

function expect(ok, message) {
  if (!ok) failures.push(message);
}
