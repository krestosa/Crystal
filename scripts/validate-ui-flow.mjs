import { readFile } from "node:fs/promises";
import path from "node:path";

const failures = [];

const paths = {
  packageJson: "package.json",
  validateLocal: "scripts/validate-local.mjs",
  reset: "apps/desktop/electron/renderer/styles/reset/_reset.scss",
  base: "apps/desktop/electron/renderer/styles/base/_base.scss",
  tokensScss: "apps/desktop/electron/renderer/styles/tokens/_tokens.scss",
  ipcConstants: "packages/shared/constants/ipc.constants.ts",
  ipcTypes: "packages/shared/types/ipc.types.ts",
  mainWindow: "apps/desktop/electron/main/windows/create-main-window.ts",
  appIpc: "apps/desktop/electron/main/ipc/register-app-ipc.ts",
  preloadBridge: "apps/desktop/electron/preload/bridges/crystal-api.bridge.ts",
  preloadTypes: "apps/desktop/electron/preload/types/preload-api.types.ts",
  appShellHtml: "apps/desktop/electron/renderer/layout/app-shell/app-shell.html",
  appShellScss: "apps/desktop/electron/renderer/layout/app-shell/app-shell.scss",
  appShellTs: "apps/desktop/electron/renderer/layout/app-shell/app-shell.ts",
  statusBarHtml: "apps/desktop/electron/renderer/layout/status-bar/status-bar.html",
  statusBarScss: "apps/desktop/electron/renderer/layout/status-bar/status-bar.scss",
  sideBarHtml: "apps/desktop/electron/renderer/layout/side-bar/side-bar.html",
  sideBarScss: "apps/desktop/electron/renderer/layout/side-bar/side-bar.scss",
  workbenchScss: "apps/desktop/electron/renderer/layout/workbench/workbench.scss",
  designHtml: "apps/desktop/electron/renderer/views/design/design.html",
  designScss: "apps/desktop/electron/renderer/views/design/design.scss",
  designTs: "apps/desktop/electron/renderer/views/design/design.ts",
  designCanvasHtml: "apps/desktop/electron/renderer/components/design-canvas/project-design-canvas.html",
  designCanvasScss: "apps/desktop/electron/renderer/components/design-canvas/project-design-canvas.scss",
  graphScss: "apps/desktop/electron/renderer/components/project-graph-panel/project-graph-panel.scss",
  graphTs: "apps/desktop/electron/renderer/components/project-graph-panel/project-graph-panel.ts",
  previewHtml: "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html",
  previewScss: "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.scss",
  previewTs: "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.ts",
  domTreeScss: "apps/desktop/electron/renderer/components/project-dom-tree-panel/project-dom-tree-panel.scss",
  domTreeTs: "apps/desktop/electron/renderer/components/project-dom-tree-panel/project-dom-tree-panel.ts",
  previewFixtureCss: "fixtures/sample-html-project/styles/preview.css",
  domSnapshotHtml: "fixtures/sample-html-project/dom-snapshot.html",
  domSnapshotEdgeCasesHtml: "fixtures/sample-html-project/dom-snapshot-edge-cases.html"
};

const source = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, filePath]) => [key, await readText(filePath)])));
const runtimeSource = Object.entries(source)
  .filter(([key]) => !["packageJson", "validateLocal", "previewFixtureCss", "domSnapshotHtml", "domSnapshotEdgeCasesHtml"].includes(key))
  .map(([, value]) => value)
  .join("\n");
const packageData = parsePackageJson(source.packageJson);
const triggerCount = countToken(`${source.appShellHtml}\n${source.statusBarHtml}\n${source.designHtml}`, "data-crystal-diagnostics-toggle");
const devtoolsButtonCount = countToken(`${source.appShellHtml}\n${source.statusBarHtml}\n${source.designHtml}`, "data-crystal-devtools-toggle");
const diagnosticsBodyBlock = extractBlock(source.designScss, ".crystal-design-view__diagnostics-body");
const debugGridBlock = extractBlock(source.designScss, ".crystal-design-view__debug-grid");
const debugPanelBlock = extractBlock(source.designScss, ".crystal-design-view__debug-panel");
const debugListBlock = extractBlock(source.designScss, ".crystal-design-view__debug-list");
const debugTreeBlock = extractBlock(source.designScss, ".crystal-design-view__debug-tree");

expect(!source.appShellHtml.includes("top-bar"), "App shell still renders the old internal top bar.");
expect(!source.appShellHtml.includes("activity-bar"), "App shell still renders the internal activity strip.");
expect(source.mainWindow.includes("autoHideMenuBar: true"), "Main window does not hide the default menu chrome.");
expect(source.mainWindow.includes('titleBarStyle: "hidden"'), "Main window does not integrate the title bar into the carbon shell.");
expect(source.mainWindow.includes("titleBarOverlay"), "Main window does not expose native controls over the carbon title area.");
expect(source.mainWindow.includes("CRYSTAL_TITLE_BAR_OVERLAY_HEIGHT = 32"), "Native titlebar overlay is not aligned to the compact chrome height.");
expect(source.mainWindow.includes("height: CRYSTAL_TITLE_BAR_OVERLAY_HEIGHT"), "Native titlebar overlay height is not routed through the chrome constant.");
expect(source.mainWindow.includes("webPreferences: getSecureWebPreferences()"), "Main window security preferences were not preserved.");
expect(source.mainWindow.includes('process.env.CRYSTAL_OPEN_DEVTOOLS === CRYSTAL_OPEN_DEVTOOLS'), "Manual Electron DevTools env support was removed.");
expect(source.mainWindow.includes('openDevTools({ mode: "detach" })'), "Electron DevTools launch mode is not explicit.");

expect(source.ipcConstants.includes('appOpenDevTools: "app:open-devtools"'), "DevTools IPC channel is missing or not narrow.");
expect(source.ipcTypes.includes('readonly "app:open-devtools": boolean'), "DevTools IPC response type is missing.");
expect(source.preloadTypes.includes("readonly openDevTools: () => Promise<boolean>"), "Preload API does not expose a narrow DevTools function.");
expect(source.preloadBridge.includes("openDevTools: () => invokeCrystal(crystalIpcChannels.appOpenDevTools)"), "Preload bridge does not invoke the narrow DevTools channel.");
expect(source.appIpc.includes("BrowserWindow.fromWebContents(event.sender)") && source.appIpc.includes("crystalIpcChannels.appOpenDevTools"), "Main IPC handler does not target the sender window for DevTools.");
expect(!source.appIpc.includes("eval") && !source.preloadBridge.includes("eval"), "DevTools bridge introduced eval-like behavior.");

expect(source.appShellHtml.includes("data-crystal-app-chrome"), "App shell does not expose a compact native drag region.");
expect(source.appShellHtml.includes("data-crystal-native-titlebar"), "App shell does not separate the native titlebar row.");
expect(!source.appShellHtml.includes("data-crystal-app-bar"), "Redundant app-bar strip still renders in the app shell.");
expect(!source.appShellHtml.includes("Compact project shell"), "Decorative compact shell text still renders in the top strip.");
expect(!source.appShellHtml.includes("data-crystal-diagnostics-toggle"), "Diagnostics trigger still renders in the top shell.");
expect(source.statusBarHtml.includes("data-crystal-diagnostics-toggle"), "Diagnostics trigger is not rendered in the status bar.");
expect(source.statusBarHtml.includes("data-crystal-devtools-toggle"), "DevTools trigger is not rendered in the status bar.");
expect(source.statusBarHtml.includes("data-crystal-runtime-status") && source.statusBarHtml.includes("Renderer isolated"), "Status bar runtime indicator was not preserved.");
expect(triggerCount === 1, `Diagnostics trigger must render exactly once; found ${triggerCount}.`);
expect(devtoolsButtonCount === 1, `DevTools trigger must render exactly once; found ${devtoolsButtonCount}.`);
expect(source.statusBarHtml.includes("aria-label=\"Toggle diagnostics\""), "Diagnostics status trigger is missing an accessible label.");
expect(source.statusBarHtml.includes("aria-label=\"Open DevTools\""), "DevTools status trigger is missing an accessible label.");
expect(source.statusBarScss.includes(".crystal-status-bar__badge") && source.statusBarScss.includes(".crystal-status-bar__controls"), "Status bar is not divided into badge/control zones.");
expect(source.statusBarScss.includes(".crystal-status-bar__icon-button") && source.statusBarScss.includes("[aria-expanded=\"true\"]"), "Status bar controls do not share active/open styling.");
expect(source.statusBarScss.includes(":focus-visible"), "Status bar controls have no visible focus state.");
expect(!source.statusBarScss.includes(":hover {\n  border-color: var(--crystal-control-active-border)"), "Status bar hover still uses active accent styling.");

expect(source.appShellTs.includes("data-crystal-devtools-toggle") && source.appShellTs.includes("window.crystal.app.openDevTools()"), "Renderer does not wire the DevTools status button to the preload API.");
expect(source.appShellScss.includes("grid-template-rows: var(--crystal-native-titlebar-height) minmax(0, 1fr) 20px"), "Redundant top strip still consumes shell grid height.");
expect(!source.appShellScss.includes("--crystal-app-bar-height"), "App shell still models a redundant app-bar height.");
expect(!source.appShellScss.includes(".crystal-app-shell__app-bar"), "App shell still styles a redundant app-bar strip.");
expect(source.appShellScss.includes("--crystal-window-controls-width"), "App chrome does not reserve native window control width.");
expect(source.appShellScss.includes("env(titlebar-area-width"), "App chrome does not use native titlebar area env data when available.");
expect(source.appShellScss.includes(".crystal-app-shell__native-titlebar::before"), "Native titlebar row does not reserve/paint the window controls area.");
expect(!source.appShellScss.includes(".crystal-app-shell__chrome::after"), "Chrome wrapper still draws a divider under native controls.");
expect(source.appShellScss.includes("-webkit-app-region: drag"), "App shell chrome is not draggable.");
expect(source.appShellScss.includes("height: 100vh") && source.appShellScss.includes("overflow: hidden"), "App shell does not lock to the viewport without global overflow.");
expect(source.reset.includes("overflow: hidden"), "Document reset does not prevent window-level app scrolling.");
expect(source.base.includes("::-webkit-scrollbar"), "Crystal UI scrollbars are not styled.");
expect(!source.base.includes("rgba(249, 115, 22") && !source.workbenchScss.includes("rgba(249, 115, 22"), "Decorative orange scrollbar/workbench accents remain.");

expect(source.appShellHtml.includes("data-crystal-left-sidebar-resizer"), "App shell does not expose the left sidebar resize handle.");
expect(source.appShellTs.includes("CRYSTAL_MIN_WORKBENCH_WIDTH"), "App shell resize logic does not clamp against a minimum workbench width.");
expect(source.appShellTs.includes("setPointerCapture"), "App shell resize handle does not capture pointer drags.");

expect(source.designHtml.includes("data-crystal-diagnostics-popover"), "Design view does not expose the floating diagnostics panel.");
expect(source.designHtml.includes("data-crystal-diagnostics-close"), "Design view does not expose the floating diagnostics close action.");
expect(source.designHtml.includes("data-crystal-diagnostics-pin"), "Design view does not expose the diagnostics pin action.");
expect(source.designHtml.includes("aria-label=\"Unpin Diagnostics\""), "Diagnostics pin icon button is missing the exact accessible active-state label.");
expect(!source.designHtml.includes("Graph · Preview · DOM · Events"), "Diagnostics header still renders redundant section text.");
expect(source.designHtml.includes("<h2>Diagnostics</h2>"), "Diagnostics title was not preserved.");
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
expect(source.designScss.includes("width: 18px") && source.designScss.includes("height: 18px") && source.designScss.includes("top: -18px") && source.designScss.includes("right: -18px"), "Diagnostics resize handles are not large/external enough.");
expect(source.designScss.includes("z-index: 10"), "Diagnostics resize handles do not have sufficient stacking priority.");
expect(source.designScss.includes("contain: layout style") && !source.designScss.includes("contain: layout paint"), "Diagnostics paint containment can still block external resize handles.");
expect(source.designTs.includes("if (isDiagnosticsResizeKind(kind) && diagnosticsPinned) setDiagnosticsPinned(false)"), "Pinned diagnostics do not unpin before edge/corner resize.");
expect(source.designTs.includes("setPointerCapture"), "Design resize/drag handles do not capture pointer drags.");
expect(source.designTs.includes("CRYSTAL_DIAGNOSTICS_PANEL_RECOVERY_SIZE = 32"), "Diagnostics drag bounds do not keep a recoverable panel area.");
expect(source.designTs.includes("CRYSTAL_DIAGNOSTICS_PANEL_MAX_VIEWPORT_RATIO = 2"), "Diagnostics resize still caps to a small viewport-only size.");
expect(!source.designTs.includes("CRYSTAL_DIAGNOSTICS_PANEL_MAX_WIDTH") && !source.designTs.includes("CRYSTAL_DIAGNOSTICS_PANEL_MAX_HEIGHT"), "Diagnostics resize still uses artificial max dimensions.");

for (const areaClass of ["debug-panel--graph", "debug-panel--preview", "debug-panel--dom", "debug-panel--events"]) {
  expect(source.designHtml.includes(areaClass), `Diagnostics section is missing grid area class: ${areaClass}`);
}
expect(source.designScss.includes("grid-template-areas") && source.designScss.includes("graph preview") && source.designScss.includes("dom events"), "Diagnostics sections are not separated by grid areas.");
expect(source.designScss.includes('"graph preview dom"') && source.designScss.includes('"events events dom"'), "Diagnostics medium layout does not prevent DOM/Events overlap.");
expect(diagnosticsBodyBlock.includes("overflow: auto") && diagnosticsBodyBlock.includes("scrollbar-gutter: stable") && diagnosticsBodyBlock.includes("padding-inline-end: calc(var(--crystal-space-2) + 12px)"), "Diagnostics body does not reserve a stable principal scrollbar gutter.");
expect(debugGridBlock.includes("overflow: clip") && !debugGridBlock.includes("overflow: auto") && !debugGridBlock.includes("overflow: visible"), "Diagnostics grid should be layout-only and must not create a competing scrollbar.");
expect(debugPanelBlock.includes("overflow: hidden") && debugPanelBlock.includes("box-sizing: border-box"), "Diagnostics panels do not contain their own boxes safely.");
expect(debugListBlock.includes("overflow: auto") && debugListBlock.includes("scrollbar-gutter: stable") && debugListBlock.includes("padding-inline-end"), "Diagnostics lists do not reserve internal scrollbar space.");
expect(debugTreeBlock.includes("overflow: auto") && debugTreeBlock.includes("scrollbar-gutter: stable") && debugTreeBlock.includes("white-space: pre") && debugTreeBlock.includes("font-family: monospace"), "DOM tree diagnostics scroll/formatting is not preserved.");
expect(!source.designScss.includes(".crystal-design-view__debug-panel {\n  position: absolute"), "Diagnostics panels must not use absolute layout.");
expect(!source.designScss.includes("transform: translate") || source.designScss.includes("crystal-project-design-canvas__start"), "Transforms appear to be used as layout patches.");
expect(source.designScss.includes("grid-auto-rows: minmax(min-content, max-content)"), "Diagnostics grid rows are not robust for intermediate sizes.");
expect(source.designScss.includes("max-height: clamp(64px, 22cqh, 260px)") && source.designScss.includes("max-height: clamp(96px, 38cqh, 460px)"), "Diagnostics scroll regions do not scale with panel height.");
expect(source.designScss.includes("overflow-wrap: anywhere") && source.designScss.includes("word-break: normal"), "Diagnostics metadata does not wrap long technical text safely.");
expect(source.designScss.includes("height: var(--crystal-control-height-compact)") && source.designScss.includes("flex: 0 0 auto"), "Diagnostics action buttons can still stretch across the grid.");

expect(source.designCanvasHtml.includes("data-crystal-start-screen"), "Canvas start block is missing.");
expect(source.designCanvasScss.includes("box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14)"), "Canvas focus-visible still uses an invasive accent frame or lacks a neutral alternative.");
expect(!source.designCanvasScss.includes("box-shadow: 0 0 0 2px var(--crystal-focus-ring)"), "Canvas click/focus still shows the orange focus frame.");
expect(source.previewScss.includes("appearance: none") && source.previewScss.includes("background-image: linear-gradient") && source.previewScss.includes("color-scheme: dark"), "Inspector select is not aligned to the system control style.");
expect(source.previewScss.includes(".crystal-project-preview-panel__target option") && source.previewScss.includes("option:checked"), "Inspector select options are not explicitly dark styled.");
expect(source.previewFixtureCss.includes("color-scheme: dark") && source.previewFixtureCss.includes("background: #070604") && source.previewFixtureCss.includes("color: #f7f2ec"), "Preview fixture CSS is not dark themed.");
expect(source.domSnapshotHtml.includes("./styles/preview.css"), "DOM snapshot fixture does not use the shared dark fixture stylesheet.");
expect(source.domSnapshotEdgeCasesHtml.includes("background: #070604") && source.domSnapshotEdgeCasesHtml.includes("color: #f7f2ec"), "DOM edge-case fixture does not preserve dark local styling.");

for (const requiredToken of [
  "--crystal-control-height-compact",
  "--crystal-control-size-compact",
  "--crystal-control-padding-x",
  "--crystal-control-bg",
  "--crystal-control-border",
  "--crystal-control-hover-bg",
  "--crystal-control-active-bg",
  "--crystal-control-active-border",
  "--crystal-space-1",
  "--crystal-space-2"
]) {
  expect(source.tokensScss.includes(requiredToken), `Missing shared compact shell token: ${requiredToken}`);
}
expect(source.statusBarScss.includes("var(--crystal-control-size-compact)") && source.designScss.includes("var(--crystal-control-bg)") && source.previewScss.includes("var(--crystal-control-bg)"), "New compact control tokens are not used across touched UI surfaces.");
expect(source.graphScss.includes("var(--crystal-control-hover-bg)") && source.domTreeScss.includes("var(--crystal-control-hover-bg)"), "Graph/DOM controls still use detached button styling.");
expect(!source.graphScss.includes(":hover,\n.crystal-project-graph-panel__button:focus-visible") && !source.domTreeScss.includes("border-color: var(--crystal-color-accent-border);\n  background: rgba(255, 255, 255, 0.06)"), "Panel hover states still use decorative accent styling.");

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
  "localStorage",
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

for (const [scriptName, scriptCommand] of getPackageScriptEntries(packageData)) {
  for (const forbiddenDevToolsToken of ["CRYSTAL_OPEN_DEVTOOLS=1", "$env:CRYSTAL_OPEN_DEVTOOLS", "set CRYSTAL_OPEN_DEVTOOLS", "cross-env CRYSTAL_OPEN_DEVTOOLS"]) {
    expect(!scriptCommand.includes(forbiddenDevToolsToken), `package.json script ${scriptName} auto-launches DevTools with ${forbiddenDevToolsToken}.`);
  }
}

if (failures.length > 0) {
  console.error("UI flow validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("UI flow validation passed: final compact shell polish, contained Diagnostics scrollbar hierarchy, status-bar Diagnostics and DevTools controls, secure DevTools IPC bridge, no scripted DevTools auto-launch, compact control tokens, neutral hover states, dark fixtures, and iframe/security boundaries.");

async function readText(filePath) {
  return readFile(path.resolve(filePath), "utf8");
}

function countToken(sourceText, token) {
  return sourceText.split(token).length - 1;
}

function extractBlock(sourceText, selector) {
  const start = sourceText.indexOf(selector);
  if (start === -1) return "";
  const end = sourceText.indexOf("}\n", start);
  return end === -1 ? sourceText.slice(start) : sourceText.slice(start, end + 1);
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

function getPackageScriptEntries(packageData) {
  const scripts = packageData.scripts;
  if (!scripts) return [];
  if (typeof scripts !== "object" || Array.isArray(scripts)) {
    expect(false, "package.json scripts must be an object.");
    return [];
  }
  return Object.entries(scripts).filter(([, command]) => typeof command === "string");
}

function expect(ok, message) {
  if (!ok) failures.push(message);
}
