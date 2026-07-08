import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const errors = [];

const requiredFiles = [
  "packages/core/inspector-editing/inspector-editing.constants.ts",
  "packages/core/inspector-editing/inspector-editing.types.ts",
  "packages/core/inspector-editing/inspector-editing.fields.ts",
  "packages/core/inspector-editing/inspector-editing.draft.ts",
  "packages/core/inspector-editing/inspector-editing.intent.ts",
  "packages/core/inspector-editing/inspector-editing.validators.ts",
  "packages/core/inspector-editing/inspector-editing.readiness.ts",
  "packages/core/inspector-editing/index.ts"
];

const newModuleRoot = "packages/core/inspector-editing";

const forbiddenModulePatterns = [
  { label: "node filesystem import", pattern: /from\s+["']node:fs["']|require\(["']node:fs["']\)/ },
  { label: "filesystem write", pattern: new RegExp(`\\b(?:${["write", "File"].join("")}|appendFile|mkdir|unlink)\\b`) },
  { label: "real patch application symbol", pattern: new RegExp(`\\b${["apply", "Patch"].join("")}\\b`) },
  { label: "write IPC channel", pattern: /ipc(Main|Renderer)\.(handle|on|invoke|send)\([^\n]*["'][^"']*(write|save|apply)[^"']*["']/i },
  { label: "iframe.contentDocument", pattern: /iframe\.contentDocument|\.contentDocument\b/ },
  { label: "iframe.contentWindow.document", pattern: /iframe\.contentWindow\.document|\.contentWindow\.document\b/ },
  { label: "insertAdjacentHTML", pattern: /\binsertAdjacentHTML\b/ },
  { label: "contenteditable", pattern: /\bcontenteditable\b/i },
  { label: "execCommand", pattern: /\bexecCommand\b/ },
  { label: "localStorage", pattern: /\blocalStorage\b/ },
  { label: "direct DOM creation", pattern: /\bdocument\.createElement\b/ },
  { label: "direct DOM attribute mutation", pattern: /\bsetAttribute\b|\bremoveAttribute\b/ },
  { label: "direct DOM tree mutation", pattern: /\bappendChild\b|\bremoveChild\b|\breplaceChild\b|\bbefore\(|\bafter\(/ },
  { label: "direct DOM HTML mutation", pattern: /\binnerHTML\b|\bouterHTML\b/ }
];

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

for (const file of requiredFiles) read(file);

const indexContent = read("packages/core/inspector-editing/index.ts").trim();
for (const line of indexContent.split(/\r?\n/)) {
  if (!/^export \* from "\.\/inspector-editing\.[a-z-]+";$/.test(line.trim())) {
    errors.push("packages/core/inspector-editing/index.ts must remain barrel export only.");
    break;
  }
}

requireIncludes("packages/core/inspector-editing/inspector-editing.types.ts", [
  "InspectorEditableFieldPreview",
  "fieldKind",
  "text-content",
  "attribute",
  "tag-name",
  "class-list",
  "inline-style",
  "canApply: false",
  "InspectorEditDraftPreview",
  "applyAvailable: false",
  "InspectorEditIntentPreview",
  "requiresSourceLocation: true",
  "canCreateSourcePatchPreview",
  "InspectorEditingReadinessPreview",
  "DesignEditingReadinessPreview",
  "CommandTransactionPlanPreview"
]);

requireIncludes("packages/core/inspector-editing/inspector-editing.fields.ts", [
  "createInspectorEditableFieldPreview",
  "canApply: false",
  "text-content",
  "attribute",
  "tag-name",
  "class-list",
  "inline-style"
]);

requireIncludes("packages/core/inspector-editing/inspector-editing.draft.ts", [
  "createInspectorEditDraftPreview",
  "changedFieldIds",
  "affectedFiles",
  "applyAvailable: false",
  "sourcePatchPreviewId",
  "transactionPlanPreviewId",
  "readinessPreviewId"
]);

requireIncludes("packages/core/inspector-editing/inspector-editing.intent.ts", [
  "createInspectorEditIntentPreview",
  "update-text",
  "set-attribute",
  "remove-attribute",
  "requiresSourceLocation: true",
  "canCreateSourcePatchPreview",
  "canApply: false"
]);

requireIncludes("packages/core/inspector-editing/inspector-editing.readiness.ts", [
  "createInspectorEditingReadinessPreview",
  "designEditingReadinessPreview",
  "commandTransactionPlanPreview",
  "applyAvailable: false",
  "missingRequirements"
]);

requireIncludes("packages/core/inspector-editing/inspector-editing.validators.ts", [
  "validateInspectorEditableFieldPreview",
  "validateInspectorEditDraftPreview",
  "validateInspectorEditIntentPreview",
  "validateInspectorEditingReadinessPreview",
  "canApply !== false",
  "applyAvailable !== false"
]);

for (const file of walk(newModuleRoot).filter((entry) => entry.endsWith(".ts"))) {
  const content = read(file);
  for (const { label, pattern } of forbiddenModulePatterns) {
    if (pattern.test(content)) errors.push(`${file} contains forbidden ${label}.`);
  }
}

for (const root of ["apps/desktop/electron/main", "apps/desktop/electron/preload", "apps/desktop/electron/renderer"]) {
  for (const file of walk(root).filter((entry) => /\.(ts|tsx|js|mjs|cjs|html)$/.test(entry))) {
    const content = read(file);
    if (/inspector-editing|InspectorEditingReadinessPreview|InspectorEditDraftPreview|InspectorEditIntentPreview/.test(content)) {
      errors.push(`${file} should not wire Phase 7A Inspector editing models into runtime UI.`);
    }
    if (/applyAvailable\s*:\s*true|canApply\s*:\s*true/.test(content)) {
      errors.push(`${file} appears to enable Apply-capable preview state.`);
    }
    if (/ipc(Main|Renderer)\.(handle|on|invoke|send)\([^\n]*["'][^"']*(write|save|apply)[^"']*["']/i.test(content)) {
      errors.push(`${file} contains forbidden write IPC pattern for Phase 7A.`);
    }
    if (/iframe\.contentDocument|iframe\.contentWindow\.document|\.contentDocument\b|\.contentWindow\.document\b/.test(content)) {
      errors.push(`${file} contains forbidden iframe internals access for Phase 7A.`);
    }
  }
}

const packageJson = read("package.json");
if (!packageJson.includes('"validate:inspector-editing-foundation"')) {
  errors.push("package.json must expose validate:inspector-editing-foundation.");
}
if (!packageJson.includes("npm run validate:inspector-editing-foundation")) {
  errors.push("validate:local:quick:core must include validate:inspector-editing-foundation.");
}
if (packageJson.includes('"dependencies"')) errors.push("package.json must not add runtime dependencies in Phase 7A.");

for (const doc of [
  "docs/roadmap-implementation.md",
  "docs/architecture/flows/future-write-flow.md",
  "docs/architecture/commands/future-command-execution.md",
  "docs/architecture/validation-system.md",
  "docs/glossary.md"
]) {
  const content = read(doc);
  for (const phrase of [
    "Phase 7A",
    "Editable Inspector draft/intent foundation",
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
    if (!content.includes(phrase)) errors.push(`${doc} must document Phase 7A boundary: ${phrase}`);
  }
}

if (read("docs/full-product-roadmap.md").includes("Phase 7A inspector editing validator touched this file")) {
  errors.push("docs/full-product-roadmap.md must not be modified for Phase 7A.");
}

if (errors.length > 0) {
  console.error("Inspector editing foundation validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Inspector editing foundation validation passed (${requiredFiles.length} modules checked).`);
