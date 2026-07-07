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
  previewTs: "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.ts",
  domTreeHtml: "apps/desktop/electron/renderer/components/project-dom-tree-panel/project-dom-tree-panel.html",
  domTreeTs: "apps/desktop/electron/renderer/components/project-dom-tree-panel/project-dom-tree-panel.ts"
};

const source = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, filePath]) => [key, await readText(filePath)])));
const runtimeSource = Object.entries(source).filter(([key]) => !["packageJson", "validateLocal"].includes(key)).map(([, value]) => value).join("\n");
const packageData = parsePackageJson(source.packageJson);

expect(!source.appShellHtml.includes("top-bar"), "App shell still renders the old internal top bar.");
expect(!source.appShellHtml.includes("activity-bar"), "App shell still renders the internal activity strip.");
expect(source.mainWindow.includes("autoHideMenuBar: true"), "Main window does not hide the default menu chrome.");
expect(source.mainWindow.includes('titleBarStyle: "hidden"'), "Main window does not integrate the title bar into the carbon shell.");
expect(source.mainWindow.includes("titleBarOverlay"), "Main window does not expose native controls over the carbon title area.");
expect(source.mainWindow.includes("webPreferences: getSecureWebPreferences()"), "Main window security preferences were not preserved.");
expect(source.appShellHtml.includes("data-crystal-app-chrome"), "App shell does not expose a compact chrome drag region.");
expect(source.appShellScss.includes("-webkit-app-region: drag"), "App shell chrome is not draggable.");
expect(source.appShellScss.includes("grid-template-rows: 24px minmax(0, 1fr) 20px"), "App shell chrome/status rows are not compactly integrated.");
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
expect(source.designHtml.includes("data-crystal-diagnostics-toggle"), "Design view does not expose the floating diagnostics toggle.");
expect(source.designHtml.includes("data-crystal-diagnostics-popover"), "Design view does not expose the floating diagnostics panel.");
expect(source.designHtml.includes("data-crystal-diagnostics-close"), "Design view does not expose the floating diagnostics close action.");
expect(source.designHtml.includes("data-crystal-diagnostics-pin"), "Design view does not expose the diagnostics pin action.");
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
}
expect(!source.designHtml.includes("data-crystal-diagnostics-resize-corner"), "Diagnostics still expose the old single resize corner hook.");
expect(!source.designHtml.includes("crystal-design-view__bottom-diagnostics"), "Diagnostics still render as a fixed bottom layout row.");
expect(!source.designHtml.includes("data-crystal-bottom-diagnostics-resizer"), "Diagnostics still use the old fixed bottom resize handle.");
expect(source.designHtml.includes("Event diagnostics"), "Diagnostics no longer separate event diagnostics into a readable panel.");
expect(source.designScss.includes("grid-template-columns: minmax(0, 1fr) var(--crystal-right-sidebar-width, 284px)"), "Canvas is not the dominant central column with a resizable right sidebar.");
expect(source.designScss.includes("grid-template-rows: minmax(0, 1fr)"), "Workspace should not reserve a fixed diagnostics row.");
expect(source.designScss.includes(".crystal-design-view__diagnostics-popover"), "Floating diagnostics panel is not styled.");
expect(source.designScss.includes("position: fixed"), "Floating diagnostics cannot cover the full renderer workspace.");
expect(source.designScss.includes("100vw") && source.designScss.includes("100vh"), "Floating diagnostics size is not bounded against the renderer viewport.");
expect(source.designScss.includes("data-crystal-diagnostics-pinned"), "Floating diagnostics panel does not expose pinned/unpinned styling.");
expect(source.designScss.includes(".crystal-design-view__diagnostics-resize-handle"), "Diagnostics resize handles are not styled.");
expect(!source.designScss.includes(".crystal-design-view__diagnostics-resize-handle::after"), "Diagnostics resize handles should not draw an explicit marker.");
expect(source.designScss.includes("repeat(auto-fit, minmax(220px, 1fr))"), "Diagnostics grid is not compact and responsive to panel width.");
expect(source.designScss.includes("crystal-design-view__debug-section"), "Diagnostics panels are missing internal micro sections.");
expect(source.designScss.includes("overflow-wrap: anywhere"), "Diagnostics metadata does not wrap long technical text.");
expect(source.designScss.includes(".crystal-design-view__diagnostics-popover[hidden]"), "Closed diagnostics panel may still intercept clicks.");
expect(source.designScss.includes("--crystal-diagnostics-panel-width"), "Floating diagnostics width is not controlled by a clamped resize variable.");
expect(source.designScss.includes("--crystal-diagnostics-panel-height"), "Floating diagnostics height is not controlled by a clamped resize variable.");
expect(source.designTs.includes("data-crystal-diagnostics-toggle"), "Floating diagnostics toggle is not wired.");
expect(source.designTs.includes("data-crystal-diagnostics-close"), "Floating diagnostics close action is not wired.");
expect(source.designTs.includes("data-crystal-diagnostics-pin"), "Floating diagnostics pin action is not wired.");
expect(source.designTs.includes("data-crystal-diagnostics-drag-handle"), "Floating diagnostics drag handle is not wired.");
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
  expect(source.designTs.includes(requiredHandle), `Diagnostics resize is not wired in TS: ${requiredHandle}`);
}
expect(source.designTs.includes("diagnosticsPinned"), "Floating diagnostics does not track pinned runtime state.");
expect(source.designTs.includes("diagnosticsLeft") && source.designTs.includes("diagnosticsTop"), "Floating diagnostics does not track runtime position.");
expect(source.designTs.includes("diagnosticsWidth") && source.designTs.includes("diagnosticsHeight"), "Floating diagnostics does not track runtime size.");
expect(source.designTs.includes("diagnostics-resize-left") && source.designTs.includes("diagnostics-resize-right") && source.designTs.includes("diagnostics-resize-bottom"), "Floating diagnostics does not implement edge resize sessions.");
expect(source.designTs.includes("window.innerWidth") && source.designTs.includes("window.innerHeight"), "Diagnostics bounds are not clamped to the renderer viewport.");
expect(source.designTs.includes("setPointerCapture"), "Design resize/drag handles do not capture pointer drags.");
expect(!source.appShellTs.includes("localStorage") && !source.designTs.includes("localStorage"), "Resizable shell panels introduced persistence without a preferences contract.");

expect(source.designCanvasHtml.includes("data-crystal-start-screen"), "Canvas start block is missing.");
expect(source.designCanvasHtml.includes("Open a project"), "Canvas start block title is missing.");
expect(source.designCanvasHtml.includes("Choose a folder or an HTML file to start."), "Canvas start microcopy is missing.");
expect(source.designCanvasHtml.includes("data-project-open-folder"), "Canvas start block does not expose Open Folder action.");
expect(source.designCanvasHtml.includes("data-project-open-html"), "Canvas start block does not expose Open HTML action.");
expect(source.designCanvasScss.includes(".crystal-project-design-canvas__start-action"), "Start actions are not styled as broad click targets.");
expect(source.designCanvasScss.includes("min-height: 46px"), "Start actions are not compact but still clear click targets.");
expect(source.designCanvasScss.includes("[data-crystal-workspace][data-crystal-project-open=\"true\"] .crystal-project-design-canvas__start"), "Start block is not hidden after a project is open.");

expect(!source.designHtml.includes("Phase 2"), "Design view still exposes phase copy in the workspace.");
expect(!source.sideBarHtml.includes("verification panel"), "Sidebar still reads like a validation panel.");
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

console.log("UI flow validation passed: integrated carbon chrome, full-height workspace, central canvas, clean sidebars, resizable shell panels, viewport-bounded floating diagnostics, eight-way diagnostics resize, compact diagnostics sections, styled UI scrollbars, dependency guard, and iframe safety boundaries.");

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
