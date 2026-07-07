import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const tempDir = path.resolve(".tmp/validation/visual-selection-overlay");
const bundledOverlay = path.join(tempDir, "project-design-canvas-selection-overlay.mjs");
const bundledValidators = path.join(tempDir, "project-preview-selection-validators.mjs");
const failures = [];

const packageJsonPath = "package.json";
const validateLocalPath = "scripts/validate-local.mjs";
const previewSelectionScriptPath = "apps/desktop/electron/main/preview-selection/project-preview-selection-script.ts";
const previewSelectionBridgePath = "apps/desktop/electron/renderer/components/project-preview-panel/selection/project-preview-selection-message-bridge.ts";
const previewSelectionTypesPath = "packages/core/project/preview-selection/project-preview-selection.types.ts";
const previewSelectionValidatorsPath = "packages/core/project/preview-selection/project-preview-selection-validators.ts";
const overlayCorePath = "packages/core/project/design-canvas/selection-overlay/project-design-canvas-selection-overlay.ts";
const overlayCoreTypesPath = "packages/core/project/design-canvas/selection-overlay/project-design-canvas-selection-overlay.types.ts";
const designCanvasHtmlPath = "apps/desktop/electron/renderer/components/design-canvas/project-design-canvas.html";
const designCanvasSourcePath = "apps/desktop/electron/renderer/components/design-canvas/project-design-canvas.ts";
const overlayRendererPath = "apps/desktop/electron/renderer/components/design-canvas/selection-overlay/project-design-canvas-selection-overlay.ts";
const overlayRendererTypesPath = "apps/desktop/electron/renderer/components/design-canvas/selection-overlay/project-design-canvas-selection-overlay.types.ts";
const overlayScssPath = "apps/desktop/electron/renderer/components/design-canvas/selection-overlay/project-design-canvas-selection-overlay.scss";
const designViewSourcePath = "apps/desktop/electron/renderer/views/design/design.ts";
const mainScssPath = "apps/desktop/electron/renderer/main.scss";

const packageJson = await readText(packageJsonPath);
const validateLocal = await readText(validateLocalPath);
const previewSelectionScript = await readText(previewSelectionScriptPath);
const previewSelectionBridge = await readText(previewSelectionBridgePath);
const previewSelectionTypes = await readText(previewSelectionTypesPath);
const previewSelectionValidatorsSource = await readText(previewSelectionValidatorsPath);
const overlayCoreSource = await readText(overlayCorePath);
const overlayCoreTypes = await readText(overlayCoreTypesPath);
const designCanvasHtml = await readText(designCanvasHtmlPath);
const designCanvasSource = await readText(designCanvasSourcePath);
const overlayRendererSource = await readText(overlayRendererPath);
const overlayRendererTypes = await readText(overlayRendererTypesPath);
const overlayScss = await readText(overlayScssPath);
const designViewSource = await readText(designViewSourcePath);
const mainScss = await readText(mainScssPath);
const overlay = await loadBundledModule(overlayCorePath, bundledOverlay);
const validators = await loadBundledModule(previewSelectionValidatorsPath, bundledValidators);

try {
  const packageData = JSON.parse(packageJson);
  expect(packageData.scripts?.["validate:visual-selection-overlay"] === "node scripts/validate-visual-selection-overlay.mjs", "package.json does not expose validate:visual-selection-overlay.");
  expect(validateLocal.includes("npm run validate:visual-selection-overlay"), "validate-local does not run validate:visual-selection-overlay.");

  expect(designCanvasHtml.includes("data-project-design-canvas-selection-overlay-toggle"), "Design Canvas overlay toggle control is missing.");
  expect(designCanvasHtml.includes("data-project-design-canvas-selection-overlay"), "Selection overlay root is missing from Design Canvas HTML.");
  expect(designCanvasHtml.includes("data-project-design-canvas-selection-box"), "Selection overlay box is missing from Design Canvas HTML.");
  expect(designCanvasHtml.includes("data-project-design-canvas-selection-message"), "Selection overlay defensive message is missing from Design Canvas HTML.");
  expect(designCanvasHtml.indexOf("data-project-preview-frame") < designCanvasHtml.indexOf("data-project-design-canvas-selection-overlay"), "Selection overlay is not an external sibling after the Preview iframe.");
  expect(designCanvasHtml.indexOf("data-project-design-canvas-stage") < designCanvasHtml.indexOf("data-project-design-canvas-selection-overlay"), "Selection overlay is not inside the transformed Design Canvas stage.");
  expect(designCanvasHtml.includes("sandbox=\"allow-scripts allow-forms allow-popups\""), "Preview iframe sandbox changed unexpectedly.");
  expect(!designCanvasHtml.includes("allow-same-origin"), "Preview iframe sandbox was relaxed with allow-same-origin.");

  expect(overlayScss.includes(".crystal-project-design-canvas .crystal-project-preview-panel__frame-wrap"), "Overlay SCSS does not anchor to the Preview frame wrapper.");
  expect(overlayScss.includes("position: relative"), "Preview frame wrapper is not positioned for external overlay projection.");
  expect(overlayScss.includes(".crystal-project-design-canvas__selection-overlay"), "Overlay SCSS root selector is missing.");
  expect(overlayScss.includes("position: absolute"), "Selection overlay is not absolutely positioned over the Preview frame.");
  expect(overlayScss.includes("pointer-events: none"), "Selection overlay should not block iframe interaction.");
  expect(mainScss.includes("./components/design-canvas/selection-overlay/project-design-canvas-selection-overlay"), "main.scss does not include visual selection overlay styles.");

  expect(designViewSource.includes("initializeProjectDesignCanvasSelectionOverlay"), "Design view does not initialize the visual selection overlay.");
  expect(overlayRendererSource.includes("onPreviewSelectionStateChanged"), "Overlay renderer is not wired to Preview selection state changes.");
  expect(overlayRendererSource.includes("getPreviewSelectionState"), "Overlay renderer does not hydrate from current Preview selection state.");
  expect(overlayRendererSource.includes("selectProjectDesignCanvasSelectionOverlayState"), "Overlay renderer does not use the core overlay selector.");
  expect(overlayRendererSource.includes("overlayState.status === \"matched\""), "Overlay renderer does not handle matched state explicitly.");
  expect(overlayRendererSource.includes("overlayState.projection"), "Overlay renderer does not use validated overlay projection data.");
  expect(overlayRendererSource.includes("renderHiddenOverlay"), "Overlay renderer does not hide when selection is absent or disabled.");

  expect(previewSelectionTypes.includes("ProjectPreviewSelectionRect"), "Preview selection rect type is missing.");
  expect(previewSelectionTypes.includes("iframe-viewport"), "Preview selection rect coordinate space is not documented in the type model.");
  expect(previewSelectionTypes.includes("selectionRect: ProjectPreviewSelectionRect | null"), "Selected node does not carry nullable validated selectionRect.");
  expect(previewSelectionValidatorsSource.includes("invalid-selection-rect"), "Preview selection validators do not reject invalid selectionRect payloads.");
  expect(previewSelectionValidatorsSource.includes("Number.isFinite"), "Preview selection rect validation does not reject NaN or Infinity.");
  expect(previewSelectionValidatorsSource.includes("maxRectCoordinateAbs"), "Preview selection rect coordinate range limit is missing.");

  expect(previewSelectionScript.includes("getBoundingClientRect"), "Injected Preview selection script does not collect a selection rect.");
  expect(previewSelectionScript.includes("selectionRect: getSelectionRect(element)"), "Injected Preview selection script does not serialize selectionRect.");
  expect(previewSelectionScript.includes("coordinateSpace: 'iframe-viewport'"), "Injected Preview selection script does not label rect coordinate space.");
  expect(!previewSelectionScript.includes("element.style"), "Injected Preview selection script mutates element styles.");
  expect(!previewSelectionScript.includes("outline"), "Injected Preview selection script still paints an internal outline.");
  expect(!previewSelectionScript.includes("removeProperty"), "Injected Preview selection script still restores internal style properties.");
  expect(!previewSelectionScript.includes("setAttribute"), "Injected Preview selection script mutates Preview DOM attributes.");

  expect(overlayCoreTypes.includes("matched") && overlayCoreTypes.includes("missing-snapshot") && overlayCoreTypes.includes("stale") && overlayCoreTypes.includes("ambiguous") && overlayCoreTypes.includes("unavailable"), "Overlay status model does not cover required defensive states.");
  expect(overlayCoreSource.includes("mappingStatus !== \"matched\""), "Overlay selector does not hide highlights for non-matched mappings.");
  expect(overlayCoreSource.includes("isProjectPreviewSelectionRectReliable"), "Overlay selector does not require reliable coordinates.");
  expect(overlayCoreSource.includes("projectPreviewSelectionRectToDesignCanvasOverlayProjection"), "Overlay projection helper is missing.");

  const runtimeSource = [
    designCanvasHtml,
    designCanvasSource,
    overlayRendererSource,
    overlayRendererTypes,
    overlayScss,
    overlayCoreSource,
    overlayCoreTypes,
    previewSelectionScript,
    previewSelectionBridge,
    previewSelectionTypes,
    previewSelectionValidatorsSource
  ].join("\n");

  expect(!runtimeSource.includes("iframe.contentDocument"), "Visual selection overlay accesses iframe.contentDocument.");
  expect(!runtimeSource.includes("iframe.contentWindow.document"), "Visual selection overlay accesses iframe.contentWindow.document.");
  expect(!runtimeSource.includes(".contentDocument"), "Visual selection overlay accesses a contentDocument.");
  expect(!runtimeSource.includes(".contentWindow.document"), "Visual selection overlay accesses a contentWindow document.");
  expect(!runtimeSource.includes("allow-same-origin"), "Visual selection overlay relaxed iframe sandbox.");
  expect(!runtimeSource.includes("getComputedStyle"), "Visual selection overlay introduced computed style inspection.");
  expect(!/<canvas\b/i.test(runtimeSource), "Visual selection overlay introduced a canvas element.");
  expect(!runtimeSource.includes("getContext("), "Visual selection overlay introduced canvas context usage.");
  expect(!runtimeSource.includes("navigator.gpu"), "Visual selection overlay introduced WebGPU access.");
  expect(!runtimeSource.includes("GPUCanvasContext"), "Visual selection overlay introduced GPUCanvasContext usage.");
  expect(!runtimeSource.includes("requestAdapter"), "Visual selection overlay introduced WebGPU adapter requests.");
  expect(!runtimeSource.includes("insertAdjacentHTML"), "Visual selection overlay introduced HTML insertion.");
  expect(!runtimeSource.includes("execCommand"), "Visual selection overlay introduced document editing commands.");
  expect(!/\b(React|Vue|Angular|Tailwind|Bootstrap|Playwright|Cypress|Spectron)\b/.test(runtimeSource), "Visual selection overlay introduced a prohibited framework or UI automation dependency.");

  const validSelectedNode = validators.validateProjectPreviewSelectedNodePayload(createSelectedNodePayload({ selectionRect: { coordinateSpace: "iframe-viewport", x: 12, y: -4, width: 120, height: 48 } }));
  expect(validSelectedNode.ok && validSelectedNode.selectedNode?.selectionRect?.x === 12, "Valid finite selectionRect payload was rejected or not preserved.");

  const invalidNaNRect = validators.validateProjectPreviewSelectedNodePayload(createSelectedNodePayload({ selectionRect: { coordinateSpace: "iframe-viewport", x: Number.NaN, y: 0, width: 10, height: 10 } }));
  expect(!invalidNaNRect.ok && invalidNaNRect.issue?.code === "invalid-selection-rect", "NaN selectionRect was not rejected.");

  const invalidInfinityRect = validators.validateProjectPreviewSelectedNodePayload(createSelectedNodePayload({ selectionRect: { coordinateSpace: "iframe-viewport", x: 0, y: Number.POSITIVE_INFINITY, width: 10, height: 10 } }));
  expect(!invalidInfinityRect.ok && invalidInfinityRect.issue?.code === "invalid-selection-rect", "Infinity selectionRect was not rejected.");

  const matched = overlay.selectProjectDesignCanvasSelectionOverlayState({ enabled: true, previewSelection: createPreviewSelectionState("matched", { selectionRect: { coordinateSpace: "iframe-viewport", x: 8, y: 16, width: 80, height: 40 } }) });
  expect(matched.status === "matched" && matched.projection?.left === 8 && matched.projection?.width === 80, "Matched selection did not produce a projected overlay rect.");

  const disabled = overlay.selectProjectDesignCanvasSelectionOverlayState({ enabled: false, previewSelection: createPreviewSelectionState("matched", { selectionRect: { coordinateSpace: "iframe-viewport", x: 0, y: 0, width: 80, height: 40 } }) });
  expect(disabled.status === "hidden" && disabled.enabled === false, "Disabled overlay is not hidden.");

  const noSelection = overlay.selectProjectDesignCanvasSelectionOverlayState({ enabled: true, previewSelection: createPreviewSelectionState("unknown", { selectedNode: null }) });
  expect(noSelection.status === "hidden", "No selection should hide the overlay.");

  const missingSnapshot = overlay.selectProjectDesignCanvasSelectionOverlayState({ enabled: true, previewSelection: createPreviewSelectionState("missing-snapshot") });
  expect(missingSnapshot.status === "missing-snapshot" && missingSnapshot.projection === null, "Missing snapshot should not produce a highlight projection.");

  const stale = overlay.selectProjectDesignCanvasSelectionOverlayState({ enabled: true, previewSelection: createPreviewSelectionState("stale") });
  expect(stale.status === "stale" && stale.projection === null, "Stale mapping should not produce a highlight projection.");

  const ambiguous = overlay.selectProjectDesignCanvasSelectionOverlayState({ enabled: true, previewSelection: createPreviewSelectionState("ambiguous") });
  expect(ambiguous.status === "ambiguous" && ambiguous.projection === null, "Ambiguous mapping should not produce a highlight projection.");

  const unavailable = overlay.selectProjectDesignCanvasSelectionOverlayState({ enabled: true, previewSelection: createPreviewSelectionState("matched", { selectionRect: null }) });
  expect(unavailable.status === "unavailable" && unavailable.projection === null, "Matched selection without reliable coordinates should not produce a highlight projection.");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("Visual selection overlay validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Visual selection overlay validation passed: external iframe overlay, validated iframe-viewport rects, matched-only highlight projection, defensive mapping states, no live iframe document access, no Preview DOM mutation, no canvas/WebGPU, and validate-local integration.");

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

function createSelectedNodePayload(overrides = {}) {
  return {
    snapshotPath: "0/0",
    tagName: "div",
    siblingIndex: 0,
    depth: 1,
    attributesPreview: [],
    textPreview: "",
    selectorPreview: "div",
    selectionRect: { coordinateSpace: "iframe-viewport", x: 0, y: 0, width: 10, height: 10 },
    ...overrides
  };
}

function createPreviewSelectionState(mappingStatus, overrides = {}) {
  const selectedNode = overrides.selectedNode === null ? null : createSelectedNodePayload({ selectionRect: { coordinateSpace: "iframe-viewport", x: 0, y: 0, width: 10, height: 10 }, ...(overrides.selectedNode ?? {}) });
  return {
    enabled: true,
    mode: selectedNode ? "selected" : "idle",
    selectedNode,
    lastSelectedAt: selectedNode ? 1000 : null,
    lastIssue: null,
    mappingStatus,
    mappedSnapshotPath: mappingStatus === "matched" ? "0/0" : null,
    mappingReason: mappingStatus === "matched" ? "path and tag match" : mappingStatus,
    mappingCheckedAt: 1000,
    snapshotGeneratedAt: 900,
    ...overrides,
    selectedNode
  };
}

function expect(ok, message) {
  if (!ok) failures.push(message);
}
