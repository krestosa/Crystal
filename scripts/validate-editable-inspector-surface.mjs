import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const errors = [];

const requiredFiles = [
  "packages/core/inspector-editing/inspector-editing.view-model.ts",
  "apps/desktop/electron/renderer/views/inspector/editable-inspector/editable-inspector.constants.ts",
  "apps/desktop/electron/renderer/views/inspector/editable-inspector/editable-inspector.types.ts",
  "apps/desktop/electron/renderer/views/inspector/editable-inspector/editable-inspector.model.ts",
  "apps/desktop/electron/renderer/views/inspector/editable-inspector/editable-inspector.render.ts",
  "apps/desktop/electron/renderer/views/inspector/editable-inspector/editable-inspector.validation.ts",
  "apps/desktop/electron/renderer/views/inspector/editable-inspector/index.ts",
  "apps/desktop/electron/renderer/components/project-preview-panel/inspector/project-preview-inspector-renderer.ts",
  "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html",
  "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.ts",
  "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.types.ts",
  "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.scss"
];

const forbiddenPatterns = [
  { label: "contenteditable", pattern: /\bcontenteditable\b/i },
  { label: "execCommand", pattern: /\bexecCommand\b/ },
  { label: "insertAdjacentHTML", pattern: /\binsertAdjacentHTML\b/ },
  { label: "localStorage", pattern: /\blocalStorage\b/ },
  { label: "iframe.contentDocument", pattern: /iframe\.contentDocument/ },
  { label: "iframe.contentWindow.document", pattern: /iframe\.contentWindow\.document/ },
  { label: ".contentDocument", pattern: /\.contentDocument\b/ },
  { label: ".contentWindow.document", pattern: /\.contentWindow\.document\b/ },
  { label: "allow-same-origin", pattern: /allow-same-origin/ },
  { label: "node filesystem import", pattern: /from\s+["']node:fs["']|require\(["']node:fs["']\)/ },
  { label: "filesystem mutation", pattern: /\b(writeFile|appendFile|mkdir|unlink)\b/ },
  { label: "real patch application symbol", pattern: /\bapplyPatch\b/ }
];

const ipcWritePattern = /ipc(Main|Renderer)\.(handle|on|invoke|send)\([^\n]*["'][^"']*(write|save|apply)[^"']*["']/i;

function absolute(relativePath) {
  return path.join(repoRoot, relativePath);
}

function read(relativePath) {
  const filePath = absolute(relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(relativePath, phrases) {
  const content = read(relativePath);
  for (const phrase of phrases) {
    if (!content.includes(phrase)) errors.push(`${relativePath} must include: ${phrase}`);
  }
}

function walk(dir) {
  const root = absolute(dir);
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absoluteEntry = path.join(root, entry.name);
    const relativeEntry = path.relative(repoRoot, absoluteEntry).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (["node_modules", "dist", ".git"].includes(entry.name)) continue;
      files.push(...walk(relativeEntry));
    } else {
      files.push(relativeEntry);
    }
  }
  return files;
}

function unique(files) {
  return [...new Set(files)];
}

for (const file of requiredFiles) read(file);

requireIncludes("packages/core/inspector-editing/inspector-editing.view-model.ts", [
  "selectInspectorEditingReadOnlySurfaceViewModel",
  "InspectorEditableFieldPreview",
  "InspectorEditDraftPreview",
  "InspectorEditIntentPreview",
  "InspectorEditingReadinessPreview",
  "applyDisabled: true",
  "Apply unavailable — write runtime not enabled",
  "trusted Preview selection mapped to a DOM Snapshot node"
]);

requireIncludes("packages/core/inspector-editing/index.ts", [
  "export * from \"./inspector-editing.view-model\";"
]);

requireIncludes("apps/desktop/electron/renderer/views/inspector/editable-inspector/editable-inspector.types.ts", [
  "packages/core/inspector-editing",
  "InspectorEditableFieldPreview",
  "InspectorEditDraftPreview",
  "InspectorEditIntentPreview",
  "InspectorEditingReadinessPreview",
  "editableInspectorApplyUnavailableAffordance: HTMLElement",
  "controlReadOnly: true",
  "controlDisabled: true",
  "applyDisabled: true"
]);

requireIncludes("apps/desktop/electron/renderer/views/inspector/editable-inspector/editable-inspector.render.ts", [
  "renderEditableInspectorSurface",
  "input.readOnly = true",
  "input.disabled = true",
  "editableInspectorApplyUnavailableAffordance.setAttribute(\"aria-disabled\", \"true\")",
  "editableInspectorApplyUnavailableAffordance.setAttribute(\"data-disabled\", \"true\")",
  "replaceChildren"
]);

requireIncludes("apps/desktop/electron/renderer/components/project-preview-panel/inspector/project-preview-inspector-renderer.ts", [
  "selectInspectorEditingReadOnlySurfaceViewModel",
  "renderEditableInspectorSurface",
  "snapshotVersion: input.domSnapshot.currentDomSnapshot?.id"
]);

requireIncludes("apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html", [
  "Editable Inspector Preview",
  "data-editable-inspector-fields",
  "data-editable-inspector-intents",
  "data-editable-inspector-apply",
  "<p class=\"crystal-project-preview-panel__button crystal-project-preview-panel__editable-apply crystal-shell-compact-button\"",
  "aria-disabled=\"true\"",
  "data-disabled=\"true\"",
  "Apply unavailable — write runtime not enabled"
]);

requireIncludes("apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.types.ts", [
  "editableInspectorApplyUnavailableAffordance: HTMLElement"
]);

requireIncludes("apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.ts", [
  "editableInspectorApplyUnavailableAffordance: query(\"[data-editable-inspector-apply]\", HTMLElement)"
]);

requireIncludes("package.json", [
  "\"validate:editable-inspector-surface\"",
  "npm run validate:editable-inspector-surface",
  "npm run validate:inspector-editing-foundation"
]);

const previewPanelHtml = read("apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html");
const inspectorSection = previewPanelHtml.match(/<section[^>]*data-project-preview-inspector[\s\S]*?<\/section>/)?.[0] ?? "";
if (/<button\b/i.test(inspectorSection)) {
  errors.push("Preview Inspector section must not contain a button, including disabled Apply affordances.");
}
if (/<button\b[^>]*data-editable-inspector-apply/i.test(previewPanelHtml)) {
  errors.push("Editable Inspector Apply affordance must not be a button.");
}
if (!/<p\b[^>]*data-editable-inspector-apply/i.test(previewPanelHtml)) {
  errors.push("Editable Inspector Apply affordance must be rendered as a passive paragraph element.");
}

const editableInspectorSurfaceFiles = walk("apps/desktop/electron/renderer/views/inspector/editable-inspector").filter((file) => file.endsWith(".ts"));
const projectPreviewPanelSurfaceFiles = [
  "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html",
  "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.ts",
  "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.types.ts",
  "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.scss",
  "apps/desktop/electron/renderer/components/project-preview-panel/inspector/project-preview-inspector-renderer.ts"
];
const inspectorEditingCoreFiles = walk("packages/core/inspector-editing").filter((file) => file.endsWith(".ts"));
const guardedSourceFiles = unique([
  ...editableInspectorSurfaceFiles,
  ...projectPreviewPanelSurfaceFiles,
  ...inspectorEditingCoreFiles
]);

for (const file of guardedSourceFiles) {
  const content = read(file);
  for (const { label, pattern } of forbiddenPatterns) {
    if (pattern.test(content)) errors.push(`${file} contains forbidden ${label}.`);
  }
  if (/Apply/.test(content) && !/(disabled|unavailable|blocked|applyDisabled|applyAvailable:\s*false)/i.test(content)) {
    errors.push(`${file} mentions Apply without disabled/unavailable/blocked context.`);
  }
  if (/editableInspectorApplyUnavailableAffordance\.addEventListener|data-editable-inspector-apply[\s\S]{0,160}on(click|submit)/.test(content)) {
    errors.push(`${file} appears to attach an enabled Apply handler.`);
  }
}

for (const root of ["apps/desktop/electron/main", "apps/desktop/electron/preload", "apps/desktop/electron/renderer"]) {
  for (const file of walk(root).filter((entry) => /\.(ts|js|mjs|cjs)$/.test(entry))) {
    const content = read(file);
    if (ipcWritePattern.test(content)) errors.push(`${file} contains a forbidden write IPC channel.`);
  }
}

for (const doc of [
  "docs/roadmap-implementation.md",
  "docs/architecture/commands/future-command-execution.md",
  "docs/architecture/flows/future-write-flow.md",
  "docs/architecture/validation-system.md",
  "docs/glossary.md"
]) {
  const content = read(doc);
  for (const phrase of [
    "Phase 7B",
    "Editable Inspector read-only draft surface",
    "No source files are written",
    "No patch apply is available",
    "No write IPC exists",
    "Apply remains unavailable",
    "No contenteditable is used",
    "No undo/redo execution runs",
    "Dirty-state is not persisted",
    "No refresh execution runs",
    "No Preview DOM mutation occurs"
  ]) {
    if (!content.includes(phrase)) errors.push(`${doc} must document Phase 7B boundary: ${phrase}`);
  }
}

if (read("docs/full-product-roadmap.md").includes("Phase 7B editable inspector surface touched this file")) {
  errors.push("docs/full-product-roadmap.md must not be modified for Phase 7B.");
}

if (errors.length > 0) {
  console.error("Editable Inspector surface validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Editable Inspector surface validation passed (${requiredFiles.length} files checked).`);
