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
const designViewSource = await readText(designViewSourcePath);
const mainScss = await readText(mainScssPath);
const packageJson = await readText(packageJsonPath);
const validateLocal = await readText(validateLocalPath);
const viewport = await loadBundledModule(coreViewportPath, bundledViewport);

try {
  expect(coreViewportSource.includes("PROJECT_DESIGN_CANVAS_MIN_ZOOM = 0.02"), "Design Canvas minimum zoom is not the wider safe minimum.");
  expect(coreViewportSource.includes("PROJECT_DESIGN_CANVAS_MAX_ZOOM = 64"), "Design Canvas maximum zoom is not the wider safe maximum.");
  expect(!coreViewportSource.includes("PROJECT_DESIGN_CANVAS_MIN_ZOOM = 0.25"), "Design Canvas is still limited to the old 25% minimum zoom.");
  expect(!coreViewportSource.includes("PROJECT_DESIGN_CANVAS_MAX_ZOOM = 3"), "Design Canvas is still limited to the old 300% maximum zoom.");
  expect(coreViewportSource.includes("calculateProjectDesignCanvasWheelZoom"), "Design Canvas multiplicative wheel zoom helper is missing.");
  expect(coreViewportSource.includes("normalizeProjectDesignCanvasWheelDelta"), "Design Canvas wheel/trackpad delta normalization helper is missing.");
  expect(coreViewportSource.includes("deltaX"), "Design Canvas wheel/trackpad deltaX support is missing.");
  expect(coreViewportSource.includes("deltaY"), "Design Canvas wheel/trackpad deltaY support is missing.");
  expect(coreViewportSource.includes("deltaMode"), "Design Canvas wheel deltaMode support is missing.");
  expect(coreViewportSource.includes("PROJECT_DESIGN_CANVAS_WHEEL_LINE_SIZE"), "Design Canvas wheel line-mode normalization is missing.");
  expect(coreViewportSource.includes("PROJECT_DESIGN_CANVAS_WHEEL_PAGE_SIZE"), "Design Canvas wheel page-mode normalization is missing.");
  expect(coreViewportSource.includes("clampProjectDesignCanvasPan"), "Design Canvas pan clamp helper is missing.");
  expect(coreViewportSource.includes("PROJECT_DESIGN_CANVAS_PAN_RECOVERY_MARGIN"), "Design Canvas pan recovery margin is missing.");
  expect(coreViewportSource.includes("Math.exp"), "Design Canvas wheel zoom is not exponential/multiplicative.");

  expect(designCanvasHtml.includes("data-project-design-canvas-toolbar"), "Design Canvas toolbar is missing.");
  expect(designCanvasHtml.includes("data-project-design-canvas-surface"), "Design Canvas surface is missing.");
  expect(designCanvasHtml.includes("data-project-design-canvas-stage"), "Design Canvas transform stage is missing.");
  expect(designCanvasHtml.includes("data-project-design-canvas-capture"), "Design Canvas capture layer is missing.");
  expect(designCanvasHtml.includes("tabindex=\"0\""), "Design Canvas surface cannot receive focus for keyboard navigation.");
  expect(designCanvasHtml.includes("data-project-preview-frame"), "Preview iframe is not inside the Design Canvas frame.");
  expect(designCanvasHtml.includes("sandbox=\"allow-scripts allow-forms allow-popups\""), "Preview iframe sandbox changed unexpectedly.");
  expect(previewPanelHtml.includes("../design-canvas/project-design-canvas.html"), "Preview panel does not include the Design Canvas frame partial.");
  expect(!previewPanelHtml.includes("data-project-design-canvas-stage"), "Preview panel owns the transform stage instead of delegating to Design Canvas.");

  expect(designCanvasSource.includes("classifyCanvasWheelGesture"), "Explicit wheel/trackpad/pinch gesture classifier is missing.");
  expect(designCanvasSource.includes('"zoom-canvas"'), "Gesture classifier does not expose zoom-canvas.");
  expect(designCanvasSource.includes('"pan-canvas"'), "Gesture classifier does not expose pan-canvas.");
  expect(designCanvasSource.includes('"pass-through-iframe-scroll"'), "Gesture classifier does not expose pass-through iframe scroll.");
  expect(designCanvasSource.includes('"ignore"'), "Gesture classifier does not expose ignore.");
  expect(designCanvasSource.includes("isCanvasZoomGesture"), "Canvas zoom gesture helper is missing.");
  expect(designCanvasSource.includes("event.ctrlKey || event.metaKey || modifierPressed"), "Ctrl/Cmd/pinch wheel gesture is not consistently classified as zoom.");
  expect(designCanvasSource.includes("normalizeProjectDesignCanvasWheelDelta"), "Renderer does not normalize wheel/trackpad delta.");
  expect(designCanvasSource.includes("deltaX: event.deltaX"), "Renderer does not pass trackpad horizontal delta.");
  expect(designCanvasSource.includes("deltaY: event.deltaY"), "Renderer does not pass trackpad vertical delta.");
  expect(designCanvasSource.includes("deltaMode: event.deltaMode"), "Renderer does not pass wheel deltaMode.");
  expect(designCanvasSource.includes("gesture.kind === \"pass-through-iframe-scroll\""), "Wheel over iframe is not explicitly passed through.");
  expect(designCanvasSource.includes("gesture.kind === \"zoom-canvas\""), "Zoom gesture branch is missing.");
  expect(designCanvasSource.includes("gesture.kind === \"ignore\""), "Invalid or empty deltas are not ignored safely.");
  expect(designCanvasSource.indexOf("gesture.kind === \"pass-through-iframe-scroll\"") < designCanvasSource.indexOf("gesture.kind === \"zoom-canvas\""), "Iframe pass-through classification is not isolated from default pan handling.");
  expect(/gesture\.kind === "zoom-canvas"[\s\S]*event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);[\s\S]*activateZoomCapture\(\);/.test(designCanvasSource), "Zoom gesture does not prevent default, contain propagation, and activate capture.");
  expect(designCanvasSource.includes("calculateProjectDesignCanvasZoomAtPoint(viewportState, bounds, gesture.focusPoint"), "Zoom does not use pointer-focused coordinates.");
  expect(designCanvasSource.includes("panCanvasBy(-gesture.delta.x, -gesture.delta.y"), "Wheel/trackpad pan does not use normalized X/Y deltas naturally.");
  expect(designCanvasSource.includes("event.button === 1"), "Middle mouse pan support is missing.");
  expect(designCanvasSource.includes("event.code !== \"Space\""), "Space + drag pan reservation is missing.");
  expect(designCanvasSource.includes("setPointerCapture"), "Design Canvas pan pointer capture is missing.");
  expect(designCanvasSource.includes("releasePointerCapture"), "Design Canvas pan pointer capture release is missing.");
  expect(designCanvasSource.includes("zoomGestureActive"), "Transient zoom capture state is missing.");
  expect(designCanvasSource.includes("PROJECT_DESIGN_CANVAS_ZOOM_CAPTURE_RELEASE_DELAY"), "Zoom capture release delay is missing.");
  expect(designCanvasSource.includes("crystal-project-design-canvas--capture-active"), "Design Canvas does not expose a capture-active state.");
  expect(designCanvasSource.includes("window.addEventListener(\"blur\""), "Design Canvas does not release transient capture state on blur.");
  expect(designCanvasSource.includes("clampProjectDesignCanvasPan"), "Design Canvas renderer does not clamp pan after viewport changes.");
  expect(designCanvasSource.includes("PROJECT_DESIGN_CANVAS_KEYBOARD_ZOOM_STEP"), "Keyboard zoom shortcut support is missing.");
  expect(designCanvasSource.includes("ArrowLeft") && designCanvasSource.includes("ArrowRight"), "Focused canvas arrow-key pan support is missing.");
  expect(designCanvasSource.includes("sessionViewportState"), "Design Canvas session viewport state is missing.");
  expect(designCanvasSource.includes("initializeProjectDesignCanvas"), "Design Canvas initializer is missing.");
  expect(designViewSource.includes("initializeProjectDesignCanvas"), "Design view does not initialize Design Canvas.");
  expect(mainScss.includes("./components/design-canvas/project-design-canvas"), "main.scss does not include Design Canvas styles.");

  expect(designCanvasScss.includes(".crystal-project-design-canvas__surface"), "Design Canvas surface styles are missing.");
  expect(designCanvasScss.includes("overflow: hidden"), "Design Canvas surface does not hide overflow to avoid scrollbar navigation.");
  expect(designCanvasScss.includes("overscroll-behavior: contain"), "Design Canvas does not contain scroll chaining.");
  expect(designCanvasScss.includes(".crystal-project-design-canvas__stage"), "Design Canvas stage styles are missing.");
  expect(!/\.crystal-project-design-canvas__surface[\s\S]*overflow:\s*(auto|scroll)/.test(designCanvasScss), "Design Canvas surface uses scrollbars as navigation.");
  expect(!/\.crystal-project-design-canvas__stage[\s\S]*overflow:\s*(auto|scroll)/.test(designCanvasScss), "Design Canvas stage uses scrollbars as navigation.");
  expect(designCanvasScss.includes(".crystal-project-design-canvas__capture"), "Capture layer styles are missing.");
  expect(designCanvasScss.includes("pointer-events: none"), "Capture layer is not disabled by default.");
  expect(designCanvasScss.includes("crystal-project-design-canvas--capture-active .crystal-project-design-canvas__capture"), "Capture layer is not activated only through capture-active state.");
  expect(designCanvasScss.includes("pointer-events: auto"), "Capture layer or iframe interaction state does not explicitly enable pointer events where needed.");
  expect(designCanvasScss.includes("touch-action: auto"), "Design Canvas surface does not allow normal interaction by default.");
  expect(designCanvasScss.includes("touch-action: none"), "Design Canvas capture layer does not reserve touch action during capture.");
  expect(!designCanvasScss.includes(".crystal-project-preview-panel__frame {\n  pointer-events: none"), "Preview iframe is permanently blocked by pointer-events none.");

  const runtimeSource = [coreViewportSource, designCanvasHtml, designCanvasSource, designCanvasTypes, designCanvasScss, previewPanelHtml, designViewSource].join("\n");
  expect(!runtimeSource.includes("iframe.contentDocument"), "Design Canvas accesses iframe.contentDocument.");
  expect(!runtimeSource.includes("iframe.contentWindow.document"), "Design Canvas accesses iframe.contentWindow.document.");
  expect(!runtimeSource.includes(".contentDocument"), "Design Canvas accesses a contentDocument.");
  expect(!runtimeSource.includes(".contentWindow.document"), "Design Canvas accesses a contentWindow document.");
  expect(!runtimeSource.includes("allow-same-origin"), "Design Canvas relaxed iframe sandbox with allow-same-origin.");
  expect(!runtimeSource.includes("getComputedStyle"), "Design Canvas introduced computed styles.");
  expect(!/<canvas\b/i.test(runtimeSource), "Design Canvas introduced a canvas overlay element.");
  expect(!runtimeSource.includes("getContext("), "Design Canvas introduced canvas drawing context usage.");
  expect(!runtimeSource.includes("navigator.gpu"), "Design Canvas introduced WebGPU access.");
  expect(!runtimeSource.includes("GPUCanvasContext"), "Design Canvas introduced GPUCanvasContext usage.");
  expect(!runtimeSource.includes("requestAdapter"), "Design Canvas introduced WebGPU adapter requests.");
  expect(!runtimeSource.includes("writeFile"), "Design Canvas introduced file writes.");
  expect(!runtimeSource.includes("writeFileSync"), "Design Canvas introduced synchronous file writes.");
  expect(!runtimeSource.includes("insertAdjacentHTML"), "Design Canvas introduced DOM insertion editing behavior.");
  expect(!runtimeSource.includes("execCommand"), "Design Canvas introduced document editing commands.");

  const lineDelta = viewport.normalizeProjectDesignCanvasWheelDelta({ deltaX: 2, deltaY: -3, deltaMode: 1 });
  expect(lineDelta.x === 32 && lineDelta.y === -48, "Line-mode wheel delta was not normalized.");
  const pageDelta = viewport.normalizeProjectDesignCanvasWheelDelta({ deltaX: 0, deltaY: 1, deltaMode: 2 });
  expect(pageDelta.y === viewport.PROJECT_DESIGN_CANVAS_WHEEL_PAGE_SIZE, "Page-mode wheel delta was not normalized.");
  const invalidDelta = viewport.normalizeProjectDesignCanvasWheelDelta({ deltaX: Number.NaN, deltaY: Number.POSITIVE_INFINITY, deltaMode: 0 });
  expect(invalidDelta.x === 0 && invalidDelta.y === 0, "Invalid wheel deltas were not normalized safely.");
  const tinyFit = viewport.calculateProjectDesignCanvasFitViewport({ viewportWidth: 80, viewportHeight: 80, frameWidth: 1280, frameHeight: 748 }, 10);
  expect(tinyFit.zoom < 0.25 && tinyFit.zoom >= viewport.PROJECT_DESIGN_CANVAS_MIN_ZOOM, "Fit zoom does not support wide safe zoom-out.");
  const zoomedIn = viewport.calculateProjectDesignCanvasZoomAtPoint(viewport.createProjectDesignCanvasViewportState(), { viewportWidth: 800, viewportHeight: 600, frameWidth: 1280, frameHeight: 748 }, { x: 100, y: 80 }, 1000, 20);
  expect(zoomedIn.zoom === viewport.PROJECT_DESIGN_CANVAS_MAX_ZOOM, "Zoom helper did not clamp above wide maximum zoom.");
  const zoomedOut = viewport.calculateProjectDesignCanvasZoomAtPoint(viewport.createProjectDesignCanvasViewportState(), { viewportWidth: 800, viewportHeight: 600, frameWidth: 1280, frameHeight: 748 }, { x: 100, y: 80 }, 0.001, 20);
  expect(zoomedOut.zoom === viewport.PROJECT_DESIGN_CANVAS_MIN_ZOOM, "Zoom helper did not clamp below safe minimum zoom.");
  const panned = viewport.calculateProjectDesignCanvasPannedViewport(viewport.createProjectDesignCanvasViewportState({ panX: 0, panY: 0, zoom: 1 }), { viewportWidth: 800, viewportHeight: 600, frameWidth: 1280, frameHeight: 748 }, 100000, -100000, 30);
  expect(panned.panX <= 704 && panned.panY >= -652, "Pan clamp did not keep the frame recoverable.");
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

console.log("Design Canvas validation passed: natural mouse, trackpad, pinch classification, scroll containment, wide safe zoom, pan recovery clamp, transient capture layer, sandbox limits, read-only boundaries, and local validation integration.");

async function readText(filePath) {
  return readFile(path.resolve(filePath), "utf8");
}

async function loadBundledModule(entryPoint, outfile) {
  await mkdir(tempDir, { recursive: true });
  await build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    logLevel: "silent"
  });
  return import(`${pathToFileURL(outfile).href}?cache=${Date.now()}`);
}

function expect(ok, message) {
  if (!ok) failures.push(message);
}
