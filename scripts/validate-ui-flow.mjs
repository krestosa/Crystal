import { readFile } from "node:fs/promises";
import path from "node:path";

const failures = [];

const paths = {
  packageJson: "package.json",
  validateLocal: "scripts/validate-local.mjs",
  reset: "apps/desktop/electron/renderer/styles/reset/_reset.scss",
  base: "apps/desktop/electron/renderer/styles/base/_base.scss",
  mainWindow: "apps/desktop/electron/main/windows/create-main-window.ts",
  appShellHtml: "apps/desktop/electron/renderer/layout/app-shell/app-shell.html",
  appShellScss: "apps/desktop/electron/renderer/layout/app-shell/app-shell.scss",
  appShellTs: "apps/desktop/electron/renderer/layout/app-shell/app-shell.ts",
  sideBarHtml: "apps/desktop/electron/renderer/layout/side-bar/side-bar.html",
  sideBarScss: "apps/desktop/electron/renderer/layout/side-bar/side-bar.scss",
  workbenchScss: "apps/desktop/electron/renderer/layout/workbench/workbench.scss",
  designHtml: "apps/desktop/electron/renderer/views/design/design.html",
  designScss: "apps/desktop/electron/renderer/views/design/design.scss",
  designTs: "apps/desktop/electron/renderer/views/design/design.ts",
  designCanvasHtml: "apps/desktop/electron/renderer/components/design-canvas/project-design-canvas.html",
  designCanvasScss: "apps/desktop/electron/renderer/components/design-canvas/project-design-canvas.scss",
  graphHtml: "apps/desktop/electron/renderer/components/project-graph-panel/project-graph-panel.html",
  graphTs: "apps/desktop/electron/renderer/components/project-graph-panel/project-graph-panel.ts",
  previewHtml: "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html",
  previewScss: "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.scss",
  previewTs: "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.ts",
  domTreeHtml: "apps/desktop/electron/renderer/components/project-dom-tree-panel/project-dom-tree-panel.html",
  domTreeTs: "apps/desktop/electron/renderer/components/project-dom-tree-panel/project-dom-tree-panel.ts",
  previewFixtureCss: "fixtures/sample-html-project/styles/preview.css"
};

const source = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, filePath]) => [key, await readText(filePath)])));
const runtimeSource = Object.entries(source).filter(([key]) => !["packageJson", "validateLocal", "previewFixtureCss"].includes(key)).map(([, value]) => value).join("\n");
const packageData = parsePackageJson(source.packageJson);
const appBarIndex = source.appShellHtml.indexOf("data-crystal-app-bar");
const diagnosticsToggleIndex = source.appShellHtml.indexOf("data-crystal-diagnostics-toggle");
const nativeTitlebarSection = extractSection(source.appShellHtml, "data-crystal-native-titlebar", "data-crystal-app-bar");

expect(!source.appShellHtml.includes("top-bar"), "App shell still renders the old internal top bar.");
expect(!source.appShellHtml.includes("activity-bar"), "App shell still renders the internal activity strip.");
expect(source.mainWindow.includes("autoHideMenuBar: true"), "Main window does not hide the default menu chrome.");
expect(source.mainWindow.includes('titleBarStyle: "hidden"'), "Main window does not integrate the title bar into the carbon shell.");
expect(source.mainWindow.includes("titleBarOverlay"), "Main window does not expose native controls over the carbon title area.");
expect(source.mainWindow.includes("CRYSTAL_TITLE_BAR_OVERLAY_HEIGHT = 32"), "Native titlebar overlay is not aligned to the compact chrome height.");
expect(source.mainWindow.includes("height: CRYSTAL_TITLE_BAR_OVERLAY_HEIGHT"), "Native titlebar overlay height is not routed through the chrome constant.");
expect(source.mainWindow.includes("webPreferences: getSecureWebPreferences()"), "Main window security preferences were not preserved.");

expect(source.appShellHtml.includes("data-crystal-app-chrome"), "App shell does not expose a compact chrome drag region.");
expect(source.appShellHtml.includes("data-crystal-native-titlebar"), "App shell does not separate the native titlebar row.");
expect(source.appShellHtml.includes("data-crystal-app-bar"), "App shell does not expose the lower app bar row.");
expect(diagnosticsToggleIndex > appBarIndex, "Diagnostics trigger is not placed inside the lower app bar.");
expect(!nativeTitlebarSection.includes("data-crystal-diagnostics-toggle"), "Diagnostics trigger still competes with the native titlebar controls.");
expect(source.appShellHtml.includes("aria-label=\"Toggle diagnostics\""), "Diagnostics chrome trigger is missing an accessible label.");
expect(source.appShellHtml.includes("aria-expanded=\"false\""), "Diagnostics chrome trigger is missing aria-expanded.");
expect(!source.designHtml.includes("data-crystal-diagnostics-toggle"), "Diagnostics trigger still renders as a design-view floating button.");
expect(source.appShellScss.includes("--crystal-native-titlebar-height: 32px"), "Renderer native titlebar row does not match the Electron overlay height.");
expect(source.appShellScss.includes("--crystal-app-bar-height"), "App shell does not model the lower app bar height.");
expect(source.appShellScss.includes("--crystal-window-controls-width"), "App chrome does not reserve native window control width.");
expect(source.appShellScss.includes("env(titlebar-area-width"), "App chrome does not use native titlebar area env data when available.");
expect(source.appShellScss.includes(".crystal-app-shell__native-titlebar::before"), "Native titlebar row does not reserve/paint the window controls area.");
expect(source.appShellScss.includes("border-bottom: 1px solid var(--crystal-color-border-soft)") && source.appShellScss.includes(".crystal-app-shell__app-bar"), "Chrome divider is not owned by the lower app bar.");
expect(!source.appShellScss.includes(".crystal-app-shell__chrome::after"), "Chrome wrapper still draws a divider under the native controls.");
expect(source.appShellScss.includes("-webkit-app-region: drag"), "App shell chrome is not draggable.");
expect(source.appShellScss.includes("-webkit-app-region: no-drag"), "App shell interactive chrome controls may be captured by the drag region.");
expect(source.appShellScss.includes(".crystal-app-shell__diagnostics-button::before") && source.appShellScss.includes(".crystal-app-shell__diagnostics-button::after"), "Diagnostics trigger does not render an internal icon without visible text.");
expect(source.appShellScss.includes(".crystal-app-shell__diagnostics-button:hover {") && !source.appShellScss.includes(".crystal-app-shell__diagnostics-button:hover,\n.crystal-app-shell__diagnostics-button:focus-visible"), "Diagnostics trigger hover still shares active/focus accent styling.");
expect(source.appShellScss.includes(".crystal-app-shell__diagnostics-button[aria-expanded=\"true\"]"), "Diagnostics chrome trigger does not expose an active open state.");
expect(source.appShellScss.includes("height: 100vh"), "App shell does not lock to the viewport height.");
expect(source.appShellScss.includes("overflow: hidden"), "App shell does not prevent global overflow.");
expect(source.reset.includes("overflow: hidden"), "Document reset does not prevent window-level app scrolling.");
expect(source.base.includes("::-webkit-scrollbar"), "Crystal UI scrollbars are not styled.");

expect(source.appShellHtml.includes("data-crystal-left-sidebar-resizer"), "App shell does not expose the left sidebar resize handle.");
expect(source.appShellScss.includes("grid-template-columns: var(--crystal-left-sidebar-width, 232px) minmax(0, 1fr)"), "App shell left sidebar width is not controlled by a clamped resize variable.");
expect(source.appShellTs.includes("CRYSTAL_MIN_WORKBENCH_WIDTH"), "App shell resize logic does not clamp against a minimum workbench width.");
expect(source.appShellTs.includes("setPointerCapture"), "App shell resize handle does not capture pointer drags.");

expect(source.designHtml.includes("crystal-design-view__workspace"), "Design view does not expose a workspace shell.");
expect(source.designHtml.includes("crystal-design-view__canvas"), "Design view does not reserve a central canvas area.");
expect(source.designHtml.includes("crystal-design-view__right-sidebar"), "Design view does not expose a right sidebar.");
expect(source.designHtml.includes("data-crystal-right-sidebar-resizer"), "Design view does not expose the right sidebar resize handle.");
expect(source.designHtml.includes("data-crystal-diagnostics-popover"), "Design view does not expose the floating diagnostics panel.");
expect(source.designHtml.includes("data-crystal-diagnostics-close"), "Design view does not expose the floating diagnostics close action.");
expect(source.designHtml.includes("data-crystal-diagnostics-pin"), "Design view does not expose the diagnostics pin action.");
expect(source.designHtml.includes("aria-label=\"Unpin Diagnostics\""), "Diagnostics pin icon button is missing the exact accessible active-state label.");
expect(source.designTs.includes("\"Unpin Diagnostics\" : \"Pin Diagnostics\""), "Diagnostics pin runtime labels do not match the required accessible labels.");
expect(!source.designHtml.includes(">Pinned<") && !source.designHtml.includes(">Unpinned<"), "Diagnostics pin still renders textual state labels.");
expect(source.designHtml.includes("data-crystal-diagnostics-drag-handle"), "Design view does not expose a diagnostics drag handle.");
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
expect(!source.designHtml.includes("data-crystal-diagnostics-resize-corner"), "Diagnostics still expose the old single resize corner hook.");
expect(!source.designHtml.includes("crystal-design-view__bottom-diagnostics"), "Diagnostics still render as a fixed bottom layout row.");
expect(!source.designHtml.includes("data-crystal-bottom-diagnostics-resizer"), "Diagnostics still use the old fixed bottom resize handle.");
expect(source.designHtml.includes("Event diagnostics"), "Diagnostics no longer separate event diagnostics into a readable panel.");
expect(source.designScss.includes("position: fixed"), "Floating diagnostics cannot cover the full renderer workspace.");
expect(source.designScss.includes("width: var(--crystal-diagnostics-panel-width") && source.designScss.includes("height: var(--crystal-diagnostics-panel-height"), "Floating diagnostics CSS still clamps size directly to the viewport.");
expect(source.designScss.includes("contain: layout paint"), "Floating diagnostics does not isolate layout/paint for extreme resize states.");
expect(source.designScss.includes("container-type: inline-size"), "Diagnostics panel cannot respond to its own width.");
expect(source.designScss.includes("data-crystal-diagnostics-pinned"), "Floating diagnostics panel does not expose pinned/unpinned styling.");
expect(source.designScss.includes("top: -10px") && source.designScss.includes("right: -10px") && source.designScss.includes("bottom: -10px") && source.designScss.includes("left: -10px"), "Diagnostics resize hit areas are not kept outside the scrollable content area.");
expect(source.designScss.includes("grid-auto-rows: minmax(0, auto)"), "Diagnostics grid does not tolerate unusual panel proportions.");
expect(source.designScss.includes("display: flex") && source.designScss.includes("flex: 0 0 auto") && source.designScss.includes("height: 22px"), "Diagnostics action buttons can still stretch across the grid.");
expect(source.designScss.includes("overflow-wrap: anywhere") && source.designScss.includes("word-break: normal"), "Diagnostics metadata does not wrap long technical text safely.");
expect(source.designScss.includes("white-space: pre") && source.designScss.includes("font-family: monospace"), "DOM tree diagnostics formatting is not preserved.");
expect(source.designScss.includes(".crystal-design-view__diagnostics-popover[hidden]"), "Closed diagnostics panel may still intercept clicks.");
expect(source.designTs.includes("CRYSTAL_DIAGNOSTICS_PANEL_RECOVERY_SIZE = 32"), "Diagnostics drag bounds do not keep a recoverable panel area.");
expect(source.designTs.includes("getMinDiagnosticsLeft") && source.designTs.includes("getMaxDiagnosticsLeft") && source.designTs.includes("getMinDiagnosticsTop") && source.designTs.includes("getMaxDiagnosticsTop"), "Diagnostics bounds do not allow partial offscreen movement.");
expect(source.designTs.includes("CRYSTAL_DIAGNOSTICS_PANEL_MAX_VIEWPORT_RATIO"), "Diagnostics resize still caps to a small viewport-only size.");
expect(source.designTs.includes("if (diagnosticsPinned) setDiagnosticsPinned(false)"), "Dragging diagnostics does not automatically unpin the panel.");
expect(source.designTs.includes("setPointerCapture"), "Design resize/drag handles do not capture pointer drags.");
expect(source.designTs.includes(".crystal-design-view__debug-list, .crystal-design-view__debug-tree"), "Diagnostics drag guard does not protect internal scrollable debug controls.");
expect(!source.designTs.includes("CRYSTAL_DIAGNOSTICS_PANEL_MAX_WIDTH") && !source.designTs.includes("CRYSTAL_DIAGNOSTICS_PANEL_MAX_HEIGHT"), "Diagnostics resize still uses artificial max dimensions.");
expect(!source.appShellTs.includes("localStorage") && !source.designTs.includes("localStorage"), "Resizable shell panels introduced persistence without a preferences contract.");

expect(source.designCanvasHtml.includes("data-crystal-start-screen"), "Canvas start block is missing.");
expect(source.designCanvasScss.includes(".crystal-project-design-canvas__button:hover {") && !source.designCanvasScss.includes(".crystal-project-design-canvas__button:hover,\n.crystal-project-design-canvas__button:focus-visible"), "Canvas hover still shares accent focus styling.");
expect(source.designCanvasScss.includes(".crystal-project-design-canvas__start-action:hover {") && !source.designCanvasScss.includes(".crystal-project-design-canvas__start-action:hover,\n.crystal-project-design-canvas__start-action:focus-visible"), "Canvas start hover still shares accent focus styling.");
expect(source.designCanvasScss.includes("[data-crystal-workspace][data-crystal-project-open=\"true\"] .crystal-project-design-canvas__start"), "Start block is not hidden after a project is open.");
expect(source.previewScss.includes(".crystal-project-preview-panel__target option") && source.previewScss.includes("background-color: #100d0a") && source.previewScss.includes("color-scheme: dark"), "Inspector select/options are not protected against a white native dropdown.");
expect(source.previewFixtureCss.includes("color-scheme: dark") && source.previewFixtureCss.includes("background: #070604") && source.previewFixtureCss.includes("color: #f7f2ec"), "Preview fixture pages are not dark themed.");

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
  "getComputedStyle",
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

expect(packageData.scripts?.["validate:ui-flow"] === "node scripts/validate-ui-flow.mjs", "package.json does not expose validate:ui-flow.");
expect(source.validateLocal.includes("npm run validate:ui-flow"), "validate-local does not run validate:ui-flow.");

if (failures.length > 0) {
  console.error("UI flow validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("UI flow validation passed: native titlebar split, app-bar diagnostics trigger, neutral hover states, recoverable floating diagnostics bounds, extreme resize layout, fixed diagnostics action sizing, dark fixture pages, dark inspector selects, dependency guard, and iframe safety boundaries.");

function extractSection(sourceText, startMarker, endMarker) {
  const start = sourceText.indexOf(startMarker);
  const end = sourceText.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) return "";
  return sourceText.slice(start, end);
}

async function readText(filePath) {
  return readFile(path.resolve(filePath), "utf8");
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
