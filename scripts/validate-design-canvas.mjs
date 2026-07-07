import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const tempDir = path.resolve(".tmp/validation/design-canvas");
const bundledViewport = path.join(tempDir, "project-design-canvas-viewport.mjs");
const failures = [];

const coreViewportPath = "packages/core/project/design-canvas/project-design-canvas-viewport.ts";
const designCanvasHtmlPath = "apps/desktop/electron/renderer/components/design-canvas/project-design-canvas.html";
const designCanvasSourcePath = "apps/desktop/electron/renderer/components/design-canvas/project-design-canvas.ts";
const designCanvasTypesPath = "apps/desktop/electron/renderer/components/design-canvas/project-design-canvas.types.ts";
const designCanvasScssPath = "apps/desktop/electron/renderer/components/design-canvas/project-design-canvas.scss";
const previewPanelHtmlPath = "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html";
const designViewHtmlPath = "apps/desktop/electron/renderer/views/design/design.html";
const designViewSourcePath = "apps/desktop/electron/renderer/views/design/design.ts";
const mainScssPath = "apps/desktop/electron/renderer/main.scss";
const packageJsonPath = "package.json";
const validateLocalPath = "scripts/validate-local.mjs";

const coreViewportSource = await readText(coreViewportPath);
const designCanvasHtml = await readText(designCanvasHtmlPath);
const designCanvasSource = await readText(designCanvasSourcePath);
const designCanvasTypes = await readText(designCanvasTypesPath);
const designCanvasScss = await readText(designCanvasScssPath);
const previewPanelHtml = await readText(previewPanelHtmlPath);
const designViewHtml = await readText(designViewHtmlPath);
const designViewSource = await readText(designViewSourcePath);
const mainScss = await readText(mainScssPath);
const packageJson = await readText(packageJsonPath);
const validateLocal = await readText(validateLocalPath);
const viewport = await loadBundledModule(coreViewportPath, bundledViewport);

try {
  expect(coreViewportSource.includes("PROJECT_DESIGN_CANVAS_MIN_ZOOM = 0.02"), "Design Canvas minimum zoom is not the wider safe minimum.");
  expect(coreViewportSource.includes("PROJECT_DESIGN_CANVAS_MAX_ZOOM = 64"), "Design Canvas maximum zoom is not the wider safe maximum.");
  expect(coreViewportSource.includes("calculateProjectDesignCanvasWheelZoom"), "Design Canvas multiplicative wheel zoom helper is missing.");
  expect(coreViewportSource.includes("normalizeProjectDesignCanvasWheelDelta"), "Design Canvas wheel/trackpad delta normalization helper is missing.");
  expect(coreViewportSource.includes("clampProjectDesignCanvasPan"), "Design Canvas pan clamp helper is missing.");

  expect(designCanvasHtml.includes("data-project-design-canvas-toolbar"), "Design Canvas toolbar is missing.");
  expect(designCanvasHtml.includes("data-project-design-canvas-surface"), "Design Canvas surface is missing.");
  expect(designCanvasHtml.includes("data-project-design-canvas-stage"), "Design Canvas transform stage is missing.");
  expect(designCanvasHtml.includes("data-project-design-canvas-capture"), "Design Canvas capture layer is missing.");
  expect(designCanvasHtml.includes("tabindex=\"0\""), "Design Canvas surface cannot receive focus for keyboard navigation.");
  expect(designCanvasHtml.includes("data-project-preview-frame"), "Preview iframe is not inside the Design Canvas frame.");
  expect(designCanvasHtml.includes("sandbox=\"allow-scripts allow-forms allow-popups\""), "Preview iframe sandbox changed unexpectedly.");
  expect(designViewHtml.includes("../../components/design-canvas/project-design-canvas.html"), "Design view does not own the Design Canvas frame partial.");
  expect(!previewPanelHtml.includes("../design-canvas/project-design-canvas.html"), "Preview panel still owns the Design Canvas partial.");
  expect(!previewPanelHtml.includes("data-project-design-canvas-stage"), "Preview panel owns the transform stage instead of delegating to Design Canvas.");

  expect(designCanvasSource.includes("ProjectDesignCanvasNavigationMode"), "Explicit Design Canvas navigation mode is missing.");
  expect(designCanvasSource.includes('"idle" | "panning" | "zooming-wheel" | "zooming-drag"'), "Design Canvas navigation mode does not cover idle, panning, wheel zoom, and drag zoom.");
  expect(designCanvasSource.includes("classifyCanvasWheelGesture"), "Explicit wheel/trackpad/pinch gesture classifier is missing.");
  expect(designCanvasSource.includes("classifyCanvasPointerGesture"), "Explicit pointer gesture classifier is missing.");
  expect(designCanvasSource.includes('"pass-through-iframe-scroll"'), "Gesture classifier does not expose pass-through iframe scroll.");
  expect(designCanvasSource.includes("setPointerCapture"), "Design Canvas pan pointer capture is missing.");
  expect(designCanvasSource.includes("releasePointerCapture"), "Design Canvas pan pointer capture release is missing.");
  expect(designCanvasSource.includes("sessionViewportState"), "Design Canvas session viewport state is missing.");
  expect(designViewSource.includes("initializeProjectDesignCanvas"), "Design view does not initialize Design Canvas.");
  expect(mainScss.includes("./components/design-canvas/project-design-canvas"), "main.scss does not include Design Canvas styles.");

  expect(designCanvasScss.includes(".crystal-project-design-canvas__surface"), "Design Canvas surface styles are missing.");
  expect(designCanvasScss.includes("overflow: hidden"), "Design Canvas surface does not hide overflow to avoid scrollbar navigation.");
  expect(designCanvasScss.includes("overscroll-behavior: contain"), "Design Canvas does not contain scroll chaining.");
  expect(!/\.crystal-project-design-canvas__surface[\s\S]*overflow:\s*(auto|scroll)/.test(designCanvasScss), "Design Canvas surface uses scrollbars as navigation.");
  expect(!/\.crystal-project-design-canvas__stage[\s\S]*overflow:\s*(auto|scroll)/.test(designCanvasScss), "Design Canvas stage uses scrollbars as navigation.");
  expect(designCanvasScss.includes("pointer-events: none"), "Capture layer is not disabled by default.");
  expect(designCanvasScss.includes("pointer-events: auto"), "Capture layer or iframe interaction state does not explicitly enable pointer events where needed.");
  expect(designCanvasScss.includes("touch-action: auto"), "Design Canvas surface does not allow normal interaction by default.");
  expect(designCanvasScss.includes("touch-action: none"), "Design Canvas capture layer does not reserve touch action during capture.");

  const runtimeSource = [coreViewportSource, designCanvasHtml, designCanvasSource, designCanvasTypes, designCanvasScss, previewPanelHtml, designViewHtml, designViewSource].join("\n");
  for (const forbidden of ["iframe.contentDocument", "iframe.contentWindow.document", ".contentDocument", ".contentWindow.document", "allow-same-origin", "getComputedStyle", "getContext(", "navigator.gpu", "GPUCanvasContext", "requestAdapter", "insertAdjacentHTML", "execCommand"]) {
    expect(!runtimeSource.includes(forbidden), `Design Canvas introduced forbidden token: ${forbidden}`);
  }
  expect(!/<canvas\b/i.test(runtimeSource), "Design Canvas introduced a canvas overlay element.");

  const lineDelta = viewport.normalizeProjectDesignCanvasWheelDelta({ deltaX: 2, deltaY: -3, deltaMode: 1 });
  expect(lineDelta.x === 32 && lineDelta.y === -48, "Line-mode wheel delta was not normalized.");
  const tinyFit = viewport.calculateProjectDesignCanvasFitViewport({ viewportWidth: 80, viewportHeight: 80, frameWidth: 1280, frameHeight: 748 }, 10);
  expect(tinyFit.zoom < 0.25 && tinyFit.zoom >= viewport.PROJECT_DESIGN_CANVAS_MIN_ZOOM, "Fit zoom does not support wide safe zoom-out.");
  const reset = viewport.calculateProjectDesignCanvasResetViewport({ viewportWidth: 1280, viewportHeight: 720, frameWidth: 1280, frameHeight: 748 }, 40);
  expect(reset.zoom === viewport.PROJECT_DESIGN_CANVAS_DEFAULT_ZOOM && !reset.isPanning, "Reset did not restore default zoom and panning state.");

  const packageData = JSON.parse(packageJson);
  expect(packageData.scripts?.["validate:design-canvas"] === "node scripts/validate-design-canvas.mjs", "package.json does not expose validate:design-canvas.");
  expect(validateLocal.includes("npm run validate:design-canvas"), "validate-local does not run validate:design-canvas.");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("Design Canvas validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Design Canvas validation passed: central canvas ownership, navigation model, scroll containment, safe zoom, sandbox limits, read-only boundaries, and local validation integration.");

async function readText(filePath) {
  return readFile(path.resolve(filePath), "utf8");
}

async function loadBundledModule(entryPoint, outfile) {
  await mkdir(tempDir, { recursive: true });
  await build({ entryPoints: [entryPoint], bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent" });
  return import(`${pathToFileURL(outfile).href}?cache=${Date.now()}`);
}

function expect(ok, message) {
  if (!ok) failures.push(message);
}
