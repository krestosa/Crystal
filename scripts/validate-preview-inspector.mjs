import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const tempDir = path.resolve(".tmp/validation/preview-inspector");
const bundledInspector = path.join(tempDir, "project-preview-inspector-selector.mjs");
const failures = [];

const previewPanelHtmlPath = "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html";
const designCanvasHtmlPath = "apps/desktop/electron/renderer/components/design-canvas/project-design-canvas.html";
const previewPanelSourcePath = "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.ts";
const previewInspectorRendererPath = "apps/desktop/electron/renderer/components/project-preview-panel/inspector/project-preview-inspector-renderer.ts";
const previewInspectorSelectorPath = "packages/core/project/preview-inspector/project-preview-inspector-selector.ts";

const previewPanelHtml = await readText(previewPanelHtmlPath);
const designCanvasHtml = await readText(designCanvasHtmlPath);
const previewPanelSource = await readText(previewPanelSourcePath);
const previewInspectorRendererSource = await readText(previewInspectorRendererPath);
const previewInspectorSelectorSource = await readText(previewInspectorSelectorPath);
const inspector = await loadBundledModule(previewInspectorSelectorPath, bundledInspector, "selectProjectPreviewInspectorViewModel");

try {
  const inspectorSection = extractPreviewInspectorSection(previewPanelHtml);
  expect(inspectorSection.includes("Preview Inspector"), "Preview Inspector panel is not rendered.");
  expect(inspectorSection.includes("data-project-preview-inspector-status"), "Preview Inspector status is missing.");
  expect(inspectorSection.includes("data-project-preview-inspector-selected-details"), "Preview Inspector selected details container is missing.");
  expect(inspectorSection.includes("data-project-preview-inspector-snapshot-details"), "Preview Inspector snapshot details container is missing.");
  expect(!/<input\b/i.test(inspectorSection), "Preview Inspector contains an input.");
  expect(!/<textarea\b/i.test(inspectorSection), "Preview Inspector contains a textarea.");
  expect(!/<button\b/i.test(inspectorSection), "Preview Inspector contains a button.");
  expect(!/contenteditable/i.test(inspectorSection), "Preview Inspector contains contenteditable UI.");

  const previewFrameHtml = `${previewPanelHtml}\n${designCanvasHtml}`;
  expect(!previewFrameHtml.includes("allow-same-origin"), "Preview iframe sandbox includes allow-same-origin.");
  expect(previewFrameHtml.includes("sandbox=\"allow-scripts allow-forms allow-popups\""), "Preview iframe sandbox changed unexpectedly.");

  const runtimeSource = `${previewFrameHtml}\n${previewPanelSource}\n${previewInspectorRendererSource}\n${previewInspectorSelectorSource}`;
  expect(!runtimeSource.includes("getComputedStyle"), "Preview Inspector introduced computed styles.");
  expect(!runtimeSource.includes("contentDocument"), "Preview Inspector accesses iframe.contentDocument.");
  expect(!runtimeSource.includes("contentWindow.document"), "Preview Inspector accesses iframe.contentWindow.document.");
  expect(!runtimeSource.includes("scrollTo"), "Preview Inspector introduced scroll-to-node behavior.");
  expect(!runtimeSource.includes("scroll-to-node"), "Preview Inspector introduced scroll-to-node behavior.");
  expect(!runtimeSource.toLowerCase().includes("bounding"), "Preview Inspector introduced bounding boxes.");

  const noSelection = inspector.selectProjectPreviewInspectorViewModel({
    previewSelection: createPreviewSelectionState(null),
    domSnapshot: createDomSnapshotState(null),
    preview: createPreviewState()
  });
  expect(noSelection.status === "idle" && noSelection.snapshotNode === null, "No selection did not render idle Inspector state.");

  const matched = inspector.selectProjectPreviewInspectorViewModel({
    previewSelection: createPreviewSelectionState(createSelectedNode({ snapshotPath: "0/0", tagName: "main" }), { mappingStatus: "matched", mappedSnapshotPath: "0/0", mappingReason: "path and tag match" }),
    domSnapshot: createDomSnapshotState(createDocumentNode([createElementNode("0/0", "main", [], [{ name: "class", value: "page", truncated: false }])])),
    preview: createPreviewState()
  });
  expect(matched.status === "mapped" && matched.snapshotNode?.tagName === "main" && matched.snapshotNode.snapshotPath === "0/0", "Matched selection did not resolve the DOM Snapshot node.");

  const defensiveMatched = inspector.selectProjectPreviewInspectorViewModel({
    previewSelection: createPreviewSelectionState(createSelectedNode({ snapshotPath: "0/9", tagName: "main" }), { mappingStatus: "matched", mappedSnapshotPath: "0/9", mappingReason: "path and tag match" }),
    domSnapshot: createDomSnapshotState(createDocumentNode([createElementNode("0/0", "main")])),
    preview: createPreviewState()
  });
  expect(defensiveMatched.status === "defensive" && defensiveMatched.snapshotNode === null, "Matched selection with a missing path did not render defensive state.");

  const missingSnapshot = inspector.selectProjectPreviewInspectorViewModel({
    previewSelection: createPreviewSelectionState(createSelectedNode(), { mappingStatus: "missing-snapshot", mappingReason: "missing snapshot" }),
    domSnapshot: createDomSnapshotState(null),
    preview: createPreviewState()
  });
  expect(missingSnapshot.status === "missing-snapshot" && missingSnapshot.message === "Build DOM Snapshot required.", "Missing snapshot did not request DOM Snapshot build.");

  const stale = inspector.selectProjectPreviewInspectorViewModel({
    previewSelection: createPreviewSelectionState(createSelectedNode(), { mappingStatus: "stale", mappingReason: "snapshot stale" }),
    domSnapshot: createDomSnapshotState(createDocumentNode([createElementNode("0/0", "div")]), { status: "stale", isStale: true }),
    preview: createPreviewState()
  });
  expect(stale.status === "stale" && stale.snapshotNode === null, "Stale mapping did not render defensive stale state.");

  const mismatched = inspector.selectProjectPreviewInspectorViewModel({
    previewSelection: createPreviewSelectionState(createSelectedNode(), { mappingStatus: "mismatched", mappingReason: "tag mismatch", mappedSnapshotPath: "0/0" }),
    domSnapshot: createDomSnapshotState(createDocumentNode([createElementNode("0/0", "section")])),
    preview: createPreviewState()
  });
  expect(mismatched.status === "mismatched" && mismatched.snapshotNode === null, "Mismatched mapping attempted to render snapshot details.");

  const ambiguous = inspector.selectProjectPreviewInspectorViewModel({
    previewSelection: createPreviewSelectionState(createSelectedNode(), { mappingStatus: "ambiguous", mappingReason: "ambiguous fallback" }),
    domSnapshot: createDomSnapshotState(createDocumentNode([createElementNode("0/0", "div"), createElementNode("0/1", "div")])),
    preview: createPreviewState()
  });
  expect(ambiguous.status === "ambiguous" && ambiguous.snapshotNode === null, "Ambiguous mapping attempted to force a snapshot match.");

  const targetMismatch = inspector.selectProjectPreviewInspectorViewModel({
    previewSelection: createPreviewSelectionState(createSelectedNode({ snapshotPath: "0/0", tagName: "main" }), { mappingStatus: "matched", mappedSnapshotPath: "0/0", mappingReason: "path and tag match" }),
    domSnapshot: createDomSnapshotState(createDocumentNode([createElementNode("0/0", "main")]), { rootRelativePath: "other.html" }),
    preview: createPreviewState({ targetRelativePath: "index.html" })
  });
  expect(targetMismatch.status === "stale" && targetMismatch.snapshotNode === null, "Preview target mismatch did not render stale Inspector state.");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("Preview Inspector validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Preview Inspector validation passed: model states, defensive snapshot resolution, compact read-only UI, sandbox constraints, and forbidden live-DOM/style behaviors.");

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

function extractPreviewInspectorSection(source) {
  const start = source.indexOf("<section class=\"crystal-project-preview-panel__inspector\"");
  const end = source.indexOf("<section class=\"crystal-project-preview-panel__issues\"", start);
  if (start < 0 || end < 0) return "";
  return source.slice(start, end);
}

function createPreviewState(overrides = {}) {
  const targetRelativePath = overrides.targetRelativePath ?? "index.html";
  return {
    rootPath: "/project",
    target: {
      rootPath: "/project",
      absolutePath: `/project/${targetRelativePath}`,
      relativePath: targetRelativePath,
      displayName: targetRelativePath,
      isEntrypoint: true,
      dependencies: [],
      directDependencyRelativePaths: []
    },
    previewUrl: `crystal-preview://current/${targetRelativePath}`,
    activeLoadId: "load:1",
    status: "ready",
    lastLoadedAt: 1,
    lastReloadedAt: null,
    lastReloadReason: null,
    lastError: null,
    lastIssueAt: null,
    issueCount: 0,
    isSyncedWithProjectGraph: true,
    issues: [],
    ...overrides
  };
}

function createPreviewSelectionState(selectedNode, overrides = {}) {
  return {
    enabled: !!selectedNode,
    mode: selectedNode ? "selected" : "idle",
    selectedNode,
    lastSelectedAt: selectedNode ? 2 : null,
    lastIssue: null,
    mappingStatus: "unknown",
    mappedSnapshotPath: null,
    mappingReason: null,
    mappingCheckedAt: null,
    snapshotGeneratedAt: null,
    ...overrides
  };
}

function createSelectedNode(overrides = {}) {
  return {
    snapshotPath: "0/0",
    tagName: "div",
    siblingIndex: 0,
    depth: 1,
    attributesPreview: [{ name: "class", value: "card" }],
    textPreview: "Preview text",
    selectorPreview: "div.card",
    ...overrides
  };
}

function createDomSnapshotState(rootNode, overrides = {}) {
  const rootRelativePath = overrides.rootRelativePath ?? "index.html";
  const snapshot = rootNode ? {
    id: `snapshot:${rootRelativePath}:1000`,
    rootRelativePath,
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
    ...overrides,
    currentDomSnapshot: overrides.currentDomSnapshot ?? snapshot
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
