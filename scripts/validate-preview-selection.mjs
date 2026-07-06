import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const tempDir = path.resolve(".tmp/validation/preview-selection");
const bundledValidators = path.join(tempDir, "project-preview-selection-validators.mjs");
const failures = [];

const scriptPath = "apps/desktop/electron/main/preview-selection/project-preview-selection-script.ts";
const previewPanelHtmlPath = "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html";
const bridgePath = "apps/desktop/electron/renderer/components/project-preview-panel/selection/project-preview-selection-message-bridge.ts";

const scriptSource = await readText(scriptPath);
const previewPanelHtml = await readText(previewPanelHtmlPath);
const bridgeSource = await readText(bridgePath);
const validators = await loadPreviewSelectionValidators();

try {
  expect(scriptSource.includes("export const PROJECT_PREVIEW_SELECTION_SCRIPT = ["), "Injected selection script is not represented as a string array.");
  expect(scriptSource.includes("].join(\"\\n\");"), "Injected selection script does not use join(\"\\n\").");
  expect(!scriptSource.includes("String.raw"), "Injected selection script uses String.raw.");
  expect(!scriptSource.includes("`"), "Injected selection script uses template literals.");
  expect(scriptSource.includes("window.__CRYSTAL_PREVIEW_SELECTION__"), "Injected selection script lost its idempotent guard.");

  expect(!previewPanelHtml.includes("allow-same-origin"), "Preview iframe sandbox includes allow-same-origin.");
  expect(previewPanelHtml.includes("sandbox=\"allow-scripts allow-forms allow-popups\""), "Preview iframe sandbox changed unexpectedly.");
  expect(!bridgeSource.includes("contentDocument"), "Preview selection bridge accesses iframe.contentDocument.");
  expect(!bridgeSource.includes("contentWindow.document"), "Preview selection bridge accesses iframe.contentWindow.document.");
  expect(!bridgeSource.includes("event.origin"), "Preview selection bridge depends on event.origin.");
  expect(bridgeSource.includes("event.source !== frameWindow"), "Preview selection bridge does not validate event.source against iframe.contentWindow.");
  expect(bridgeSource.includes("frameWindow.postMessage"), "Preview selection bridge does not use iframe.contentWindow.postMessage.");

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

console.log("Preview selection validation passed: injected script shape, sandbox constraints, renderer bridge guards, payload validation, and preview limits.");

async function readText(filePath) {
  return readFile(path.resolve(filePath), "utf8");
}

async function loadPreviewSelectionValidators() {
  await mkdir(tempDir, { recursive: true });
  await build({
    entryPoints: ["packages/core/project/preview-selection/project-preview-selection-validators.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: bundledValidators,
    logLevel: "silent"
  });
  const module = await import(`${pathToFileURL(bundledValidators).href}?cache=${Date.now()}`);
  if (typeof module.validateProjectPreviewSelectedNodePayload !== "function") failures.push("Preview selection validators did not export validateProjectPreviewSelectedNodePayload.");
  return module;
}

function expect(ok, message) {
  if (!ok) failures.push(message);
}
