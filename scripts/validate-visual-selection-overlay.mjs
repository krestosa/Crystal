import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const tempDir = path.resolve(".tmp/validation/visual-selection-overlay");
const bundledOverlay = path.join(tempDir, "project-design-canvas-selection-overlay.mjs");
const bundledValidators = path.join(tempDir, "project-preview-selection-validators.mjs");
const failures = [];

const paths = {
  packageJson: "package.json",
  validateLocal: "scripts/validate-local.mjs",
  previewSelectionScript: "apps/desktop/electron/main/preview-selection/project-preview-selection-script.ts",
  previewSelectionBridge: "apps/desktop/electron/renderer/components/project-preview-panel/selection/project-preview-selection-message-bridge.ts",
  previewSelectionTypes: "packages/core/project/preview-selection/project-preview-selection.types.ts",
  previewSelectionValidators: "packages/core/project/preview-selection/project-preview-selection-validators.ts",
  overlayCore: "packages/core/project/design-canvas/selection-overlay/project-design-canvas-selection-overlay.ts",
  overlayCoreTypes: "packages/core/project/design-canvas/selection-overlay/project-design-canvas-selection-overlay.types.ts",
  designCanvasHtml: "apps/desktop/electron/renderer/components/design-canvas/project-design-canvas.html",
  designCanvasSource: "apps/desktop/electron/renderer/components/design-canvas/project-design-canvas.ts",
  overlayRenderer: "apps/desktop/electron/renderer/components/design-canvas/selection-overlay/project-design-canvas-selection-overlay.ts",
  overlayRendererTypes: "apps/desktop/electron/renderer/components/design-canvas/selection-overlay/project-design-canvas-selection-overlay.types.ts",
  overlayScss: "apps/desktop/electron/renderer/components/design-canvas/selection-overlay/project-design-canvas-selection-overlay.scss",
  designViewSource: "apps/desktop/electron/renderer/views/design/design.ts",
  mainScss: "apps/desktop/electron/renderer/main.scss",
  docs: "docs/visual-selection-overlay.md"
};

const source = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, filePath]) => [key, await readText(filePath)])));
const overlay = await loadBundledModule(paths.overlayCore, bundledOverlay);
const validators = await loadBundledModule(paths.previewSelectionValidators, bundledValidators);

try {
  const packageData = JSON.parse(source.packageJson);
  expect(packageData.scripts?.["validate:visual-selection-overlay"] === "node scripts/validate-visual-selection-overlay.mjs", "package.json does not expose validate:visual-selection-overlay.");
  expect(source.validateLocal.includes("npm run validate:visual-selection-overlay"), "validate-local does not run validate:visual-selection-overlay.");

  expect(source.designCanvasHtml.includes("data-project-design-canvas-stage"), "Design Canvas transform stage is missing.");
  expect(source.designCanvasHtml.includes("data-project-design-canvas-selection-overlay-toggle"), "Design Canvas overlay toggle is missing.");
  expect(source.designCanvasHtml.includes("data-project-design-canvas-selection-overlay"), "Selection overlay root is missing.");
  expect(source.designCanvasHtml.includes("data-project-design-canvas-selection-box"), "Selection overlay box is missing.");
  expect(source.designCanvasHtml.includes("data-project-design-canvas-selection-message"), "Selection overlay defensive message is missing.");
  expect(source.designCanvasHtml.indexOf("data-project-preview-frame") < source.designCanvasHtml.indexOf("data-project-design-canvas-selection-overlay"), "Selection overlay is not external to the iframe.");
  expect(source.designCanvasHtml.indexOf("data-project-design-canvas-stage") < source.designCanvasHtml.indexOf("data-project-design-canvas-selection-overlay"), "Selection overlay is not inside the transformed Design Canvas stage.");
  expect(source.designCanvasHtml.includes("sandbox=\"allow-scripts allow-forms allow-popups\""), "Preview iframe sandbox changed unexpectedly.");
  expect(!source.designCanvasHtml.includes("allow-same-origin"), "Preview iframe sandbox was relaxed with allow-same-origin.");

  expect(source.overlayScss.includes(".crystal-project-design-canvas .crystal-project-preview-panel__frame-wrap"), "Overlay SCSS does not anchor to the Preview frame wrapper.");
  expect(source.overlayScss.includes("position: relative"), "Preview frame wrapper is not positioned for overlay projection.");
  expect(source.overlayScss.includes("position: absolute"), "Selection overlay is not absolutely positioned over the Preview frame.");
  expect(source.overlayScss.includes("pointer-events: none"), "Selection overlay should not block iframe interaction.");
  expect(!/\.crystal-project-design-canvas__selection-overlay[\s\S]*overflow:\s*(auto|scroll)/.test(source.overlayScss), "Selection overlay introduces scrollbars.");
  expect(source.mainScss.includes("./components/design-canvas/selection-overlay/project-design-canvas-selection-overlay"), "main.scss does not include overlay styles.");

  expect(source.designViewSource.includes("initializeProjectDesignCanvasSelectionOverlay"), "Design view does not initialize the overlay.");
  expect(source.overlayRenderer.includes("onPreviewSelectionStateChanged"), "Overlay renderer is not integrated with Preview selection updates.");
  expect(source.overlayRenderer.includes("getPreviewSelectionState"), "Overlay renderer does not hydrate from current Preview selection state.");
  expect(source.overlayRenderer.includes("selectProjectDesignCanvasSelectionOverlayState"), "Overlay renderer does not use the core selector.");
  expect(source.overlayRenderer.includes("overlayState.status === \"matched\""), "Overlay renderer does not handle matched state explicitly.");
  expect(source.overlayRenderer.includes("overlayState.projection"), "Overlay renderer does not use validated projection data.");
  expect(source.overlayRenderer.includes("renderHiddenOverlay"), "Overlay renderer does not hide no-selection state.");

  expect(source.previewSelectionTypes.includes("ProjectPreviewSelectionRect"), "Preview selection rect type is missing.");
  expect(source.previewSelectionTypes.includes("iframe-viewport"), "Preview selection rect coordinate space is missing.");
  expect(source.previewSelectionTypes.includes("selectionRect: ProjectPreviewSelectionRect | null"), "Selected node does not carry nullable selectionRect.");
  expect(source.previewSelectionValidators.includes("invalid-selection-rect"), "Validators do not reject invalid selectionRect payloads.");
  expect(source.previewSelectionValidators.includes("Number.isFinite"), "Rect validation does not reject NaN or Infinity.");
  expect(source.previewSelectionValidators.includes("maxRectCoordinateAbs"), "Rect coordinate range limit is missing.");

  expect(source.previewSelectionScript.includes("getBoundingClientRect"), "Injected script does not collect a selection rect.");
  expect(source.previewSelectionScript.includes("selectionRect: getSelectionRect(element)"), "Injected script does not serialize selectionRect.");
  expect(source.previewSelectionScript.includes("coordinateSpace: 'iframe-viewport'"), "Injected script does not label rect coordinate space.");
  expect(!source.previewSelectionScript.includes("element.style"), "Injected script mutates Preview element styles.");
  expect(!source.previewSelectionScript.includes("outline"), "Injected script still paints an internal outline.");
  expect(!source.previewSelectionScript.includes("removeProperty"), "Injected script still restores internal style properties.");
  expect(!source.previewSelectionScript.includes("setAttribute"), "Injected script mutates Preview DOM attributes.");

  expect(source.overlayCoreTypes.includes("matched") && source.overlayCoreTypes.includes("missing-snapshot") && source.overlayCoreTypes.includes("stale") && source.overlayCoreTypes.includes("ambiguous") && source.overlayCoreTypes.includes("unavailable"), "Overlay status model does not cover required states.");
  expect(source.overlayCore.includes("mappingStatus !== \"matched\""), "Overlay selector does not suppress non-matched highlights.");
  expect(source.overlayCore.includes("isProjectPreviewSelectionRectReliable"), "Overlay selector does not require reliable coordinates.");
  expect(source.overlayCore.includes("projectPreviewSelectionRectToDesignCanvasOverlayProjection"), "Overlay projection helper is missing.");

  expect(source.docs.includes("read-only"), "Visual selection overlay docs do not document read-only status.");
  expect(source.docs.includes("external to the Preview iframe"), "Visual selection overlay docs do not document external iframe overlay.");
  expect(source.docs.includes("does not read `iframe.contentDocument`"), "Visual selection overlay docs do not document live iframe DOM boundary.");
  expect(source.docs.includes("mappingStatus` is `matched`"), "Visual selection overlay docs do not document matched-only highlight trust.");

  const runtimeSource = [
    source.designCanvasHtml,
    source.designCanvasSource,
    source.overlayRenderer,
    source.overlayRendererTypes,
    source.overlayScss,
    source.overlayCore,
    source.overlayCoreTypes,
    source.previewSelectionScript,
    source.previewSelectionBridge,
    source.previewSelectionTypes,
    source.previewSelectionValidators
  ].join("\n");

  expect(!runtimeSource.includes("iframe.contentDocument"), "Overlay accesses iframe.contentDocument.");
  expect(!runtimeSource.includes("iframe.contentWindow.document"), "Overlay accesses iframe.contentWindow.document.");
  expect(!runtimeSource.includes(".contentDocument"), "Overlay accesses a contentDocument.");
  expect(!runtimeSource.includes(".contentWindow.document"), "Overlay accesses a contentWindow document.");
  expect(!runtimeSource.includes("allow-same-origin"), "Overlay relaxed iframe sandbox.");
  expect(!runtimeSource.includes("getComputedStyle"), "Overlay introduced computed style inspection.");
  expect(!/<canvas\b/i.test(runtimeSource), "Overlay introduced a canvas element.");
  expect(!runtimeSource.includes("getContext("), "Overlay introduced canvas context usage.");
  expect(!runtimeSource.includes("navigator.gpu"), "Overlay introduced WebGPU access.");
  expect(!runtimeSource.includes("GPUCanvasContext"), "Overlay introduced GPUCanvasContext usage.");
  expect(!runtimeSource.includes("requestAdapter"), "Overlay introduced WebGPU adapter requests.");
  expect(!runtimeSource.includes("insertAdjacentHTML"), "Overlay introduced HTML insertion.");
  expect(!runtimeSource.includes("execCommand"), "Overlay introduced document editing commands.");
  expect(!runtimeSource.includes("frame.querySelector") && !runtimeSource.includes("iframe.querySelector"), "Overlay queries inside the Preview iframe.");
  expect(!/\b(React|Vue|Angular|Tailwind|Bootstrap|Playwright|Cypress|Spectron)\b/.test(runtimeSource), "Overlay introduced a prohibited framework or UI automation dependency.");
  expect(!runtimeSource.toLowerCase().includes("local" + "flow"), "Overlay introduced a prohibited previous-project reference.");

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
  const selectedNode = overrides.selectedNode === null ? null : createSelectedNodePayload({ selectionRect: overrides.selectionRect ?? { coordinateSpace: "iframe-viewport", x: 0, y: 0, width: 10, height: 10 }, ...(overrides.selectedNode ?? {}) });
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
    snapshotGeneratedAt: 900
  };
}

function expect(ok, message) {
  if (!ok) failures.push(message);
}
