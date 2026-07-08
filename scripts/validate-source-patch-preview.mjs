import { readFile } from "node:fs/promises";

const failures = [];

const paths = {
  packageJson: "package.json",
  validateLocal: "scripts/validate-local.mjs",
  sourcePatchIndex: "packages/core/source-patch/index.ts",
  sourcePatchTypes: "packages/core/source-patch/source-patch.types.ts",
  sourcePatchConstants: "packages/core/source-patch/source-patch.constants.ts",
  sourcePatchValidators: "packages/core/source-patch/source-patch.validators.ts",
  sourcePatchPreview: "packages/core/source-patch/source-patch.preview.ts",
  htmlSourceAnchorTypes: "packages/core/source-patch/html-source-anchor.types.ts",
  htmlSourceAnchorSelectors: "packages/core/source-patch/html-source-anchor.selectors.ts",
  htmlSourceAnchorValidators: "packages/core/source-patch/html-source-anchor.validators.ts",
  commandBusIndex: "packages/core/commands/command-bus/index.ts",
  commandBusTypes: "packages/core/commands/command-bus/command-bus.types.ts",
  commandBusConstants: "packages/core/commands/command-bus/command-bus.constants.ts",
  commandBusValidators: "packages/core/commands/command-bus/command-bus.validators.ts",
  commandBusPreview: "packages/core/commands/command-bus/command-bus.preview.ts",
  htmlInsertionIndex: "packages/core/commands/html-insertion/index.ts",
  htmlInsertionPlanner: "packages/core/commands/html-insertion/html-insertion-command.planner.ts",
  htmlInsertionPreview: "packages/core/commands/html-insertion/html-insertion-command.preview.ts",
  panelHtml: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.html",
  panelTs: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.ts",
  panelTypes: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.types.ts",
  panelState: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.state.ts",
  panelDom: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.dom.ts",
  panelScss: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.scss",
  commandPreviewRenderer: "apps/desktop/electron/renderer/components/html-element-library-panel/renderers/command-preview.renderer.ts",
  insertionModePickerRenderer: "apps/desktop/electron/renderer/components/html-element-library-panel/renderers/insertion-mode-picker.renderer.ts"
};

const source = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, filePath]) => [key, await readText(filePath)])));
const packageData = parsePackageJson(source.packageJson);
const sourcePatchSource = [source.sourcePatchIndex, source.sourcePatchTypes, source.sourcePatchConstants, source.sourcePatchValidators, source.sourcePatchPreview].join("\n");
const anchorSource = [source.htmlSourceAnchorTypes, source.htmlSourceAnchorSelectors, source.htmlSourceAnchorValidators].join("\n");
const commandBusSource = [source.commandBusIndex, source.commandBusTypes, source.commandBusConstants, source.commandBusValidators, source.commandBusPreview].join("\n");
const plannerSource = [source.htmlInsertionIndex, source.htmlInsertionPlanner, source.htmlInsertionPreview].join("\n");
const panelSource = [source.panelHtml, source.panelTs, source.panelTypes, source.panelState, source.panelDom, source.panelScss, source.commandPreviewRenderer, source.insertionModePickerRenderer].join("\n");
const dryRunSource = [sourcePatchSource, anchorSource, commandBusSource, plannerSource, panelSource].join("\n");

expect(packageData.scripts?.["validate:source-patch-preview"] === "node scripts/validate-source-patch-preview.mjs", "package.json does not expose validate:source-patch-preview.");
expect(packageData.scripts?.["validate:local:quick:ui"]?.includes("validate:source-patch-preview"), "validate:local:quick:ui does not include validate:source-patch-preview.");
expect(source.validateLocal.includes("validate:source-patch-preview"), "validate-local.mjs does not include validate:source-patch-preview.");
expect(packageData.scripts?.["validate:html-element-library"], "validate:html-element-library must remain exposed.");
expect(packageData.scripts?.["validate:local:quick"], "validate:local:quick must remain exposed.");
expect(packageData.scripts?.["validate:local:quick:core"], "validate:local:quick:core must remain exposed.");
expect(packageData.scripts?.["validate:local:quick:preview"], "validate:local:quick:preview must remain exposed.");
expect(packageData.scripts?.["validate:local:quick:ui"], "validate:local:quick:ui must remain exposed.");

expectIsBarrel(source.sourcePatchIndex, "source-patch index.ts");
for (const token of ["SourcePatchOperationKind", "insert-text", "replace-text", "remove-text", "SourcePatchPreview", "SourcePatchValidationResult", "SOURCE_PATCH_MAX_PREVIEW_CHARS", "SOURCE_PATCH_MAX_INSERTED_CHARS", "SOURCE_PATCH_MAX_CONTEXT_CHARS"]) {
  expect(sourcePatchSource.includes(token), `Source patch model token missing: ${token}`);
}
for (const token of ["targetFilePath", "startOffset", "endOffset", "beforeTextPreview", "insertedTextPreview", "afterTextPreview", "humanSummary", "reversible", "warnings", "errors"]) {
  expect(source.sourcePatchTypes.includes(token), `SourcePatchPreview field missing: ${token}`);
}
expect(source.sourcePatchValidators.includes("validateSourcePatchPreview"), "Source patch validator is missing.");
expect(source.sourcePatchValidators.includes("hasUnsafeProjectRelativePath"), "Source patch path safety validator is missing.");
expect(source.sourcePatchValidators.includes("range.startOffset > range.endOffset"), "Source patch validator does not guard offset order.");
expect(source.sourcePatchValidators.includes("insertedTextPreview is required"), "Source patch validator does not require inserted text for ready previews.");
expect(source.sourcePatchPreview.includes("createInsertTextSourcePatchPreview"), "Insert text source patch preview builder is missing.");

for (const token of ["HtmlSourceInsertionAnchor", "targetFilePath", "targetSnapshotPath", "targetTagName", "insertionMode", "sourceLocation", "confidence", "missing-source-location", "unsupported-mode"]) {
  expect(anchorSource.includes(token), `HTML source anchor token missing: ${token}`);
}
expect(source.htmlSourceAnchorSelectors.includes("createHtmlSourceInsertionAnchor"), "HTML source insertion anchor selector is missing.");
expect(source.htmlSourceAnchorSelectors.includes("Target DOM Snapshot node has no sourceLocation"), "Missing sourceLocation path is not guarded.");
expect(source.htmlSourceAnchorSelectors.includes("end-tag source location"), "after/inside unsupported source-location boundary is missing.");
expect(source.htmlSourceAnchorSelectors.includes("Cannot insert inside void element"), "Void element inside insertion guard is missing.");
expect(!anchorSource.includes("DOMParser"), "HTML source anchor must not parse live DOM or full HTML in Phase 6B.");

expectIsBarrel(source.commandBusIndex, "command-bus index.ts");
for (const token of ["CommandEnvelope", "CommandPreviewResult", "CommandExecutionBlocker", "CommandBusValidationResult", "dryRun: true", "preview-ready", "blocked", "invalid", "unsupported"]) {
  expect(commandBusSource.includes(token), `Command bus token missing: ${token}`);
}
expect(source.commandBusValidators.includes("validateCommandEnvelope"), "Command bus validator is missing.");
expect(source.commandBusPreview.includes("previewCommandEnvelope"), "Command bus dry-run preview function is missing.");
expect(source.commandBusPreview.includes("executeCommandEnvelope") && source.commandBusPreview.includes("createCommandExecutionBlocker"), "Command bus execution blocker is missing.");
expect(source.commandBusPreview.includes("Command execution is blocked in Phase 6B"), "Command bus does not explicitly block execution.");

expect(source.htmlInsertionIndex.includes("html-insertion-command.planner"), "HTML insertion barrel does not export planner.");
expect(source.htmlInsertionIndex.includes("html-insertion-command.preview"), "HTML insertion barrel does not export preview builder.");
expect(source.htmlInsertionPlanner.includes("previewAddHtmlElementCommand"), "AddHtmlElementCommand preview planner is missing.");
expect(source.htmlInsertionPlanner.includes("HTML_INSERTION_NOT_IMPLEMENTED_REASON"), "Planner must treat execution-not-implemented as a dry-run boundary.");
expect(source.htmlInsertionPlanner.includes("createHtmlSourceInsertionAnchor"), "Planner does not use source insertion anchors.");
expect(source.htmlInsertionPlanner.includes("sourcePatchPreview"), "Planner does not return sourcePatchPreview.");
expect(source.htmlInsertionPreview.includes("<${tagName}></${tagName}>"), "Planner preview must generate simple non-void element snippets.");
expect(source.htmlInsertionPreview.includes("<${tagName}>"), "Planner preview must generate simple void element snippets.");
expect(source.htmlInsertionPlanner.includes("Only simple HTML element previews are supported"), "Planner must block presets/helpers without safe templates.");

expect(source.panelHtml.includes("data-html-element-library-patch-preview"), "Element Library patch preview container is missing.");
expect(source.panelHtml.includes("data-html-element-library-insertion-mode-picker"), "Element Library insertion mode picker is missing.");
expect(source.panelHtml.includes("Apply unavailable") && source.panelHtml.includes("disabled"), "Apply/Insert action must remain disabled and unavailable.");
expect(source.panelTs.includes("previewAddHtmlElementCommand"), "Element Library panel does not call the dry-run planner.");
expect(source.panelTs.includes("HTML_ELEMENT_LIBRARY_COMMAND_SOURCE"), "Element Library panel does not wrap AddHtmlElementCommand metadata.");
expect(source.commandPreviewRenderer.includes("Ready preview"), "Patch preview UI does not expose ready state.");
expect(source.commandPreviewRenderer.includes("Missing source location"), "Patch preview UI does not expose missing source location state.");
expect(source.commandPreviewRenderer.includes("Unsupported"), "Patch preview UI does not expose unsupported state.");
expect(source.commandPreviewRenderer.includes("Blocked"), "Patch preview UI does not expose blocked state.");
expect(source.commandPreviewRenderer.includes("insertedTextPreview"), "Patch preview UI does not render insertedTextPreview.");
expect(source.insertionModePickerRenderer.includes("before") && source.insertionModePickerRenderer.includes("after") && source.insertionModePickerRenderer.includes("inside"), "Insertion mode picker does not expose all modes.");
expect(source.insertionModePickerRenderer.includes("supportedInPreview = mode === \"before\""), "Unsupported insertion modes must remain disabled in Phase 6B.");
expect(source.panelScss.includes("crystal-html-element-library-panel__preview-snippet"), "Patch preview snippet styles are missing.");
expect(!source.panelHtml.includes("<select"), "Insertion mode picker must not use a native select.");

for (const forbiddenToken of ["innerHTML", "insertAdjacentHTML", "contenteditable", "execCommand", "localStorage", "iframe.contentDocument", "iframe.contentWindow.document", ".contentDocument", ".contentWindow.document", "allow-same-origin"]) {
  expect(!dryRunSource.includes(forbiddenToken), `Forbidden runtime token found: ${forbiddenToken}`);
}
for (const forbiddenWriteToken of ["writeFile", "appendFile", "fs.write", "fs.append", "fs.rename", "fs.rm", "ipcMain.handle(\"write", "ipcRenderer.invoke(\"write"]) {
  expect(!dryRunSource.includes(forbiddenWriteToken), `Forbidden write token found: ${forbiddenWriteToken}`);
}
expect(!dryRunSource.includes("nodeIntegration: true"), "Node integration must not be enabled.");
expect(!dryRunSource.includes("contextIsolation: false"), "contextIsolation must not be disabled.");
expect(!packageData.dependencies, "No runtime dependencies should be added for this phase.");
expectSameKeys(packageData.devDependencies ?? {}, ["@types/node", "electron", "esbuild", "sass", "typescript"], "devDependencies changed unexpectedly.");

if (failures.length > 0) {
  console.error("Source Patch Preview foundation validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Source Patch Preview foundation validation passed.");

async function readText(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    failures.push(`Missing or unreadable file: ${filePath}`);
    return "";
  }
}

function parsePackageJson(sourceText) {
  try {
    return JSON.parse(sourceText);
  } catch {
    failures.push("package.json is not valid JSON.");
    return {};
  }
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function expectIsBarrel(sourceText, label) {
  expect(sourceText.includes("export *"), `${label} must be a barrel export.`);
}

function expectSameKeys(record, expectedKeys, message) {
  const actual = Object.keys(record).sort();
  const expected = [...expectedKeys].sort();
  expect(actual.length === expected.length && actual.every((key, index) => key === expected[index]), message);
}
