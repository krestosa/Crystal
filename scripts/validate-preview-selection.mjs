import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const tempDir = path.resolve(".tmp/validation/preview-selection");
const bundledValidators = path.join(tempDir, "project-preview-selection-validators.mjs");
const bundledMapping = path.join(tempDir, "project-preview-selection-mapping.mjs");
const failures = [];

const scriptPath = "apps/desktop/electron/main/preview-selection/project-preview-selection-script.ts";
const previewPanelHtmlPath = "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html";
const designViewHtmlPath = "apps/desktop/electron/renderer/views/design/design.html";
const designCanvasHtmlPath = "apps/desktop/electron/renderer/components/design-canvas/project-design-canvas.html";
const bridgePath = "apps/desktop/electron/renderer/components/project-preview-panel/selection/project-preview-selection-message-bridge.ts";
const validatorsPath = "packages/core/project/preview-selection/project-preview-selection-validators.ts";
const mappingPath = "packages/core/project/preview-selection/mapping/project-preview-selection-mapping.ts";

const scriptSource = await readText(scriptPath);
const previewPanelHtml = await readText(previewPanelHtmlPath);
const designViewHtml = await readText(designViewHtmlPath);
const designCanvasHtml = await readText(designCanvasHtmlPath);
const bridgeSource = await readText(bridgePath);
const validatorsSource = await readText(validatorsPath);
const mappingSource = await readText(mappingPath);
const validators = await loadBundledModule(validatorsPath, bundledValidators, "validateProjectPreviewSelectedNodePayload");
const mapping = await loadBundledModule(mappingPath, bundledMapping, "mapProjectPreviewSelectionToDomSnapshot");

try {
  expect(scriptSource.includes("export const PROJECT_PREVIEW_SELECTION_SCRIPT = ["), "Injected selection script is not represented as a string array.");
  expect(scriptSource.includes("].join(\"\\n\");"), "Injected selection script does not use join(\"\\n\").");
  expect(!scriptSource.includes("String.raw"), "Injected selection script uses String.raw.");
  expect(!scriptSource.includes("`"), "Injected selection script uses template literals.");
  expect(scriptSource.includes("window.__CRYSTAL_PREVIEW_SELECTION__"), "Injected selection script lost its idempotent guard.");

  const previewFrameHtml = `${previewPanelHtml}\n${designCanvasHtml}`;
  const previewSelectionUiHtml = `${previewPanelHtml}\n${designViewHtml}\n${designCanvasHtml}`;
  expect(!previewFrameHtml.includes("allow-same-origin"), "Preview iframe sandbox includes allow-same-origin.");
  expect(previewFrameHtml.includes("sandbox=\"allow-scripts allow-forms allow-popups\""), "Preview iframe sandbox changed unexpectedly.");
  expect(previewSelectionUiHtml.includes("data-project-preview-selection-mapping-status"), "Preview selection mapping status is not rendered in the Crystal UI.");
  expect(previewSelectionUiHtml.includes("data-project-preview-mapped-snapshot-path"), "Preview selection mapped snapshotPath is not rendered in the Crystal UI.");
  expect(previewSelectionUiHtml.includes("data-project-preview-selection-mapping-reason"), "Preview selection mapping reason is not rendered in the Crystal UI.");

  expect(!bridgeSource.includes("contentDocument"), "Preview selection bridge accesses iframe.contentDocument.");
  expect(!bridgeSource.includes("contentWindow.document"), "Preview selection bridge accesses iframe.contentWindow.document.");
  expect(!bridgeSource.includes("event.origin"), "Preview selection bridge depends on event.origin.");
  expect(bridgeSource.includes("event.source !== frameWindow"), "Preview selection bridge does not validate event.source against iframe.contentWindow.");
  expect(bridgeSource.includes("frameWindow.postMessage"), "Preview selection bridge does not use iframe.contentWindow.postMessage.");

  const previewSelectionSource = `${previewSelectionUiHtml}\n${bridgeSource}`;
  expect(!previewSelectionSource.includes("getComputedStyle"), "Preview selection introduced computed styles.");
  expect(!previewSelectionSource.toLowerCase().includes("bounding"), "Preview selection introduced bounding box UI.");

  const selectionSources = [
    ["Injected selection script", scriptSource],
    ["Preview selection bridge", bridgeSource],
    ["Preview selection validators", validatorsSource],
    ["Preview selection mapping", mappingSource]
  ];
  for (const [label, source] of selectionSources) {
    expect(!source.includes("Inspector"), `${label} introduced Inspector UI.`);
    expect(!source.includes("preview-inspector"), `${label} imports Preview Inspector code.`);
    expect(!source.includes("data-project-preview-inspector"), `${label} references Preview Inspector DOM.`);
    expect(!source.includes("renderProjectPreviewInspector"), `${label} references Preview Inspector renderer.`);
  }

  const valid = validators.validateProjectPreviewSelectedNodePayload({
    snapshotPath: "0/1/2",
    tagName: "DIV",
    siblingIndex: 2,
    depth: 2,
    attributesPreview: [{ name: "class", value: "hero" }, { name: "hidden", value: null }],
    textPreview: "Selected content",
    selectorPreview: "div.hero"
  });
  expect(valid.ok, "Valid selected node payload was rejected.");
  expect(valid.selectedNode?.tagName === "div", "Selected node tagName was not normalized.");
  expect(valid.selectedNode?.snapshotPath === "0/1/2", "Selected node snapshotPath was not preserved.");
  expect(valid.selectedNode?.attributesPreview.length === 2, "Selected node attributesPreview was not preserved.");

  const invalidPath = validators.validateProjectPreviewSelectedNodePayload({
    snapshotPath: "../package.json",
    tagName: "div",
    siblingIndex: 0,
    depth: 0,
    attributesPreview: [],
    textPreview: "",
    selectorPreview: "div"
  });
  expect(!invalidPath.ok && invalidPath.selectedNode === null && invalidPath.issue?.code === "invalid-snapshot-path", "Invalid snapshotPath payload was not rejected.");

  const invalidDepth = validators.validateProjectPreviewSelectedNodePayload({
    snapshotPath: "0/1/2",
    tagName: "div",
    siblingIndex: 2,
    depth: 1,
    attributesPreview: [],
    textPreview: "",
    selectorPreview: "div"
  });
  expect(!invalidDepth.ok && invalidDepth.selectedNode === null && invalidDepth.issue?.code === "invalid-depth", "Mismatched snapshotPath depth was not rejected.");

  const longAttributes = Array.from({ length: 12 }, (_, index) => ({ name: `data-${index}`, value: "x".repeat(140) }));
  const longText = "t".repeat(220);
  const limited = validators.validateProjectPreviewSelectedNodePayload({
    snapshotPath: "0/3",
    tagName: "section",
    siblingIndex: 3,
    depth: 1,
    attributesPreview: longAttributes,
    textPreview: longText,
    selectorPreview: "section".repeat(40)
  });
  expect(limited.ok, "Payload with long previews should be sanitized, not rejected.");
  expect(limited.selectedNode?.attributesPreview.length === 8, "attributesPreview was not limited to 8 entries.");
  expect(limited.selectedNode?.attributesPreview.every((attribute) => attribute.value === null || attribute.value.length <= 120), "Attribute values were not limited.");
  expect((limited.selectedNode?.textPreview.length ?? 0) <= 160, "textPreview was not limited.");
  expect((limited.selectedNode?.selectorPreview.length ?? 0) <= 180, "selectorPreview was not limited.");

  const matchedNode = createSelectedNode({ snapshotPath: "0/0", tagName: "main", siblingIndex: 0, depth: 1 });
  const matched = mapping.mapProjectPreviewSelectionToDomSnapshot({
    selectedNode: matchedNode,
    domSnapshotState: createDomSnapshotState(createDocumentNode([createElementNode("0/0", "main")])),
    previewTargetRelativePath: "index.html",
    checkedAt: 10
  });
  expect(matched.mappingStatus === "matched" && matched.mappedSnapshotPath === "0/0" && matched.mappingReason === "path and tag match", "Existing selected path with matching tag was not mapped as matched.");

  const tagMismatch = mapping.mapProjectPreviewSelectionToDomSnapshot({
    selectedNode: createSelectedNode({ snapshotPath: "0/0", tagName: "section", siblingIndex: 0, depth: 1 }),
    domSnapshotState: createDomSnapshotState(createDocumentNode([createElementNode("0/0", "main")])),
    previewTargetRelativePath: "index.html",
    checkedAt: 20
  });
  expect(tagMismatch.mappingStatus === "mismatched" && tagMismatch.mappingReason === "tag mismatch" && tagMismatch.mappedSnapshotPath === "0/0", "Tag mismatch was not reported as mismatched.");

  const missingPath = mapping.mapProjectPreviewSelectionToDomSnapshot({
    selectedNode: createSelectedNode({ snapshotPath: "0/9", tagName: "section", siblingIndex: 9, depth: 1 }),
    domSnapshotState: createDomSnapshotState(createDocumentNode([createElementNode("0/0", "main")])),
    previewTargetRelativePath: "index.html",
    checkedAt: 30
  });
  expect(missingPath.mappingStatus === "mismatched" && missingPath.mappingReason === "path not found" && missingPath.mappedSnapshotPath === null, "Missing selected path was not reported as mismatched.");

  const missingSnapshot = mapping.mapProjectPreviewSelectionToDomSnapshot({
    selectedNode: matchedNode,
    domSnapshotState: createDomSnapshotState(null, { status: "idle", currentDomSnapshot: null, lastDomSnapshotAt: null }),
    previewTargetRelativePath: "index.html",
    checkedAt: 40
  });
  expect(missingSnapshot.mappingStatus === "missing-snapshot" && missingSnapshot.mappingReason === "missing snapshot", "Missing DOM Snapshot was not reported as missing-snapshot.");

  const stale = mapping.mapProjectPreviewSelectionToDomSnapshot({
    selectedNode: matchedNode,
    domSnapshotState: createDomSnapshotState(createDocumentNode([createElementNode("0/0", "main")]), { status: "stale", isStale: true }),
    previewTargetRelativePath: "index.html",
    checkedAt: 50
  });
  expect(stale.mappingStatus === "stale" && stale.mappingReason === "snapshot stale" && stale.mappedSnapshotPath === null, "Stale DOM Snapshot was not reported as stale.");

  const ambiguous = mapping.mapProjectPreviewSelectionToDomSnapshot({
    selectedNode: createSelectedNode({ snapshotPath: "0/9", tagName: "div", siblingIndex: 9, depth: 1, attributesPreview: [{ name: "class", value: "card" }] }),
    domSnapshotState: createDomSnapshotState(createDocumentNode([createElementNode("0/0", "div", [], [{ name: "class", value: "card", truncated: false }]), createElementNode("0/1", "div", [], [{ name: "class", value: "card", truncated: false }])])),
    previewTargetRelativePath: "index.html",
    checkedAt: 60
  });
  expect(ambiguous.mappingStatus === "ambiguous" && ambiguous.mappingReason === "ambiguous fallback" && ambiguous.mappedSnapshotPath === null, "Ambiguous diagnostic fallback was not reported as ambiguous.");

  const currentRoot = path.resolve(".").replace(/\\/g, "/");
  expect(!JSON.stringify(invalidPath.issue).includes(currentRoot), "Preview selection issue exposed an absolute path.");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("Preview selection validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Preview selection validation passed: injected script shape, sandbox constraints, renderer bridge guards, compact-shell UI hooks, payload validation, selection mapping states, and preview limits.");

async function readText(filePath) {
  return readFile(path.resolve(filePath), "utf8");
}

async function loadBundledModule(entryPoint, outfile, expectedExport) {
  await mkdir(tempDir, { recursive: true });
  await build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    logLevel: "silent"
  });
  const module = await import(`${pathToFileURL(outfile).href}?cache=${Date.now()}`);
  if (typeof module[expectedExport] !== "function") failures.push(`${entryPoint} did not export ${expectedExport}.`);
  return module;
}

function createSelectedNode(overrides = {}) {
  return {
    snapshotPath: "0/0",
    tagName: "div",
    siblingIndex: 0,
    depth: 1,
    attributesPreview: [],
    textPreview: "",
    selectorPreview: "div",
    ...overrides
  };
}

function createDomSnapshotState(rootNode, overrides = {}) {
  const snapshot = rootNode ? {
    id: "snapshot:index.html:1000",
    rootRelativePath: "index.html",
    generatedAt: 1000,
    source: "html-source",
    status: "ready",
    rootNode,
    nodeCount: countNodes(rootNode),
    maxDepth: getMaxDepth(rootNode),
    isTruncated: false,
    issues: []
  } : null;

  return {
    status: snapshot ? "ready" : "idle",
    currentDomSnapshot: snapshot,
    lastDomSnapshotAt: snapshot?.generatedAt ?? null,
    lastClearedAt: null,
    lastError: null,
    domSnapshotIssueCount: 0,
    issues: [],
    isStale: false,
    ...overrides
  };
}

function createDocumentNode(children = []) {
  return {
    id: "dom:0",
    snapshotPath: "0",
    siblingIndex: 0,
    type: "document",
    tagName: null,
    textPreview: null,
    attributes: [],
    children,
    depth: 0,
    childCount: children.length,
    truncated: false
  };
}

function createElementNode(snapshotPath, tagName, children = [], attributes = []) {
  return {
    id: `dom:${snapshotPath}`,
    snapshotPath,
    siblingIndex: Number(snapshotPath.split("/").at(-1) ?? 0),
    type: "element",
    tagName,
    textPreview: null,
    attributes,
    children,
    depth: snapshotPath.split("/").length - 1,
    childCount: children.length,
    sourceLocation: { offset: 12, line: 2, column: 3 },
    truncated: false
  };
}

function countNodes(node) {
  return 1 + node.children.reduce((total, child) => total + countNodes(child), 0);
}

function getMaxDepth(node) {
  return node.children.reduce((maxDepth, child) => Math.max(maxDepth, getMaxDepth(child)), node.depth);
}

function expect(ok, message) {
  if (!ok) failures.push(message);
}
