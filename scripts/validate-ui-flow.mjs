import { readFile } from "node:fs/promises";
import path from "node:path";

const failures = [];

const paths = {
  packageJson: "package.json",
  validateLocal: "scripts/validate-local.mjs",
  reset: "apps/desktop/electron/renderer/styles/reset/_reset.scss",
  base: "apps/desktop/electron/renderer/styles/base/_base.scss",
  appShellHtml: "apps/desktop/electron/renderer/layout/app-shell/app-shell.html",
  appShellScss: "apps/desktop/electron/renderer/layout/app-shell/app-shell.scss",
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

expect(!source.appShellHtml.includes("top-bar"), "App shell still renders the internal top bar.");
expect(!source.appShellHtml.includes("activity-bar"), "App shell still renders the internal activity strip.");
expect(source.appShellScss.includes("height: 100vh"), "App shell does not lock to the viewport height.");
expect(source.appShellScss.includes("overflow: hidden"), "App shell does not prevent global overflow.");
expect(source.reset.includes("overflow: hidden"), "Document reset does not prevent window-level app scrolling.");
expect(source.base.includes("::-webkit-scrollbar"), "Crystal UI scrollbars are not styled.");

expect(source.designHtml.includes("crystal-design-view__workspace"), "Design view does not expose a workspace shell.");
expect(source.designHtml.includes("crystal-design-view__canvas"), "Design view does not reserve a central canvas area.");
expect(source.designHtml.includes("crystal-design-view__right-sidebar"), "Design view does not expose a right sidebar.");
expect(source.designHtml.includes("crystal-design-view__bottom-diagnostics"), "Design view does not expose a bottom diagnostics dock.");
expect(source.designScss.includes("grid-template-columns: minmax(0, 1fr) 284px"), "Canvas is not the dominant central column.");
expect(source.designScss.includes("grid-template-rows: minmax(0, 1fr) auto"), "Bottom diagnostics are not separated from the main workspace row.");

expect(source.designCanvasHtml.includes("data-crystal-start-screen"), "Canvas start block is missing.");
expect(source.designCanvasHtml.includes("Open a project"), "Canvas start block title is missing.");
expect(source.designCanvasHtml.includes("Choose a folder or an HTML file to start."), "Canvas start microcopy is missing.");
expect(source.designCanvasHtml.includes("data-project-open-folder"), "Canvas start block does not expose Open Folder action.");
expect(source.designCanvasHtml.includes("data-project-open-html"), "Canvas start block does not expose Open HTML action.");
expect(source.designCanvasScss.includes(".crystal-project-design-canvas__start-action"), "Start actions are not styled as broad click targets.");
expect(source.designCanvasScss.includes("min-height: 52px"), "Start actions are not large enough for clear clicking.");
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
  expect(source.designHtml.includes(requiredDebugHook), `Bottom diagnostics are missing hook: ${requiredDebugHook}`);
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

console.log("UI flow validation passed: no internal top bar, full-height workspace, central canvas, clean sidebars, bottom diagnostics, styled UI scrollbars, dependency guard, and iframe safety boundaries.");

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
