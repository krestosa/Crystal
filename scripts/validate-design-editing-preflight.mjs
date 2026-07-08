import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const errors = [];

const requiredFiles = [
  "packages/core/design-editing/design-editing.constants.ts",
  "packages/core/design-editing/design-editing.types.ts",
  "packages/core/design-editing/design-editing.readiness.ts",
  "packages/core/design-editing/design-editing.validators.ts",
  "packages/core/design-editing/index.ts",
  "packages/core/dirty-state/dirty-state.constants.ts",
  "packages/core/dirty-state/dirty-state.types.ts",
  "packages/core/dirty-state/dirty-state.preview.ts",
  "packages/core/dirty-state/dirty-state.validators.ts",
  "packages/core/dirty-state/index.ts",
  "packages/core/source-conflict/source-conflict.constants.ts",
  "packages/core/source-conflict/source-conflict.types.ts",
  "packages/core/source-conflict/source-conflict.preview.ts",
  "packages/core/source-conflict/source-conflict.validators.ts",
  "packages/core/source-conflict/index.ts",
  "packages/core/write-runtime/write-runtime-capability.constants.ts",
  "packages/core/write-runtime/write-runtime-capability.types.ts",
  "packages/core/write-runtime/write-runtime-capability.preview.ts",
  "packages/core/write-runtime/write-runtime-capability.validators.ts",
  "packages/core/write-runtime/index.ts"
];

const newModuleRoots = [
  "packages/core/design-editing",
  "packages/core/dirty-state",
  "packages/core/source-conflict",
  "packages/core/write-runtime"
];

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
  { label: "localStorage", pattern: /\blocalStorage\b/ }
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

requireIncludes("packages/core/dirty-state/dirty-state.types.ts", [
  "DirtyStatePreview",
  "dirtyStateId",
  "dirty-preview",
  "affectedFiles",
  "pendingTransactionIds",
  "sourcePatchPreviewIds",
  "hasUnsavedChangesPreview",
  "persistenceAvailable: false",
  "blockedReason"
]);
requireIncludes("packages/core/dirty-state/dirty-state.preview.ts", ["createDirtyStatePreview", "persistenceAvailable: false"]);
requireIncludes("packages/core/dirty-state/dirty-state.validators.ts", ["validateDirtyStatePreview", "persistenceAvailable !== false"]);

requireIncludes("packages/core/source-conflict/source-conflict.types.ts", [
  "SourceConflictPreview",
  "not-checked",
  "clean-preview",
  "conflict-risk",
  "expectedSourceVersion",
  "observedSourceVersion",
  "requiresFreshSource",
  "canApplyWithoutRecheck: false"
]);
requireIncludes("packages/core/source-conflict/source-conflict.preview.ts", ["createSourceConflictPreview", "canApplyWithoutRecheck: false"]);
requireIncludes("packages/core/source-conflict/source-conflict.validators.ts", ["validateSourceConflictPreview", "canApplyWithoutRecheck !== false"]);

requireIncludes("packages/core/write-runtime/write-runtime-capability.types.ts", [
  "WriteRuntimeCapabilityPreview",
  "canWriteFiles: false",
  "canApplyPatches: false",
  "hasWriteIpc: false",
  "canPersistTransactions: false",
  "canExecuteUndoRedo: false",
  "missingCapabilities"
]);
requireIncludes("packages/core/write-runtime/write-runtime-capability.constants.ts", [
  "main-write-service",
  "patch-apply-service",
  "write-ipc",
  "durable-transaction-store",
  "dirty-state-store",
  "conflict-detector",
  "refresh-executor"
]);
requireIncludes("packages/core/write-runtime/write-runtime-capability.preview.ts", [
  "createWriteRuntimeCapabilityPreview",
  "canWriteFiles: false",
  "canApplyPatches: false",
  "hasWriteIpc: false",
  "canPersistTransactions: false",
  "canExecuteUndoRedo: false"
]);

requireIncludes("packages/core/design-editing/design-editing.types.ts", [
  "DesignEditingReadinessPreview",
  "CommandTransactionPlanPreview",
  "DirtyStatePreview",
  "SourceConflictPreview",
  "WriteRuntimeCapabilityPreview",
  "applyAvailable: false",
  "futureRequirements"
]);
requireIncludes("packages/core/design-editing/design-editing.readiness.ts", [
  "createDesignEditingReadinessPreview",
  "createDirtyStatePreview",
  "createSourceConflictPreview",
  "createWriteRuntimeCapabilityPreview",
  "applyAvailable: false"
]);
requireIncludes("packages/core/design-editing/design-editing.validators.ts", ["validateDesignEditingReadinessPreview", "applyAvailable !== false"]);

for (const root of newModuleRoots) {
  for (const file of walk(root).filter((entry) => entry.endsWith(".ts"))) {
    const content = read(file);
    for (const { label, pattern } of forbiddenModulePatterns) {
      if (pattern.test(content)) errors.push(`${file} contains forbidden ${label}.`);
    }
  }
}

for (const root of ["apps/desktop/electron/main", "apps/desktop/electron/preload", "apps/desktop/electron/renderer", "packages/core"]) {
  for (const file of walk(root).filter((entry) => /\.(ts|tsx|js|mjs|cjs)$/.test(entry))) {
    const content = read(file);
    if (/from\s+["']node:fs["']|require\(["']node:fs["']\)/.test(content) && newModuleRoots.some((moduleRoot) => file.startsWith(moduleRoot))) {
      errors.push(`${file} imports node:fs in a Phase 6D module.`);
    }
    if (new RegExp(`\\b${["apply", "Patch"].join("")}\\b`).test(content) && !file.includes("command-preview-bus.constants.ts")) {
      errors.push(`${file} contains forbidden real patch application symbol for Phase 6D.`);
    }
    if (/ipc(Main|Renderer)\.(handle|on|invoke|send)\([^\n]*["'][^"']*(write|save|apply)[^"']*["']/i.test(content)) {
      errors.push(`${file} contains forbidden write IPC pattern for Phase 6D.`);
    }
  }
}

for (const file of walk("apps/desktop/electron/renderer").filter((entry) => /\.(ts|html)$/.test(entry))) {
  const content = read(file);
  if (/design-editing|dirty-state|source-conflict|write-runtime/.test(content)) {
    errors.push(`${file} should not wire Phase 6D preflight models into renderer UI.`);
  }
}

const packageJson = read("package.json");
if (!packageJson.includes('"validate:design-editing-preflight"')) errors.push("package.json must expose validate:design-editing-preflight.");
if (!packageJson.includes("npm run validate:design-editing-preflight")) errors.push("validate:local:quick:core must include validate:design-editing-preflight.");
if (packageJson.includes('"dependencies"')) errors.push("package.json must not add runtime dependencies in Phase 6D.");

for (const doc of [
  "docs/roadmap-implementation.md",
  "docs/architecture/flows/future-write-flow.md",
  "docs/architecture/commands/future-command-execution.md",
  "docs/architecture/validation-system.md",
  "docs/glossary.md"
]) {
  const content = read(doc);
  for (const phrase of [
    "Phase 6D",
    "No source files are written",
    "No patch apply is available",
    "No write IPC exists",
    "Apply remains unavailable",
    "No undo/redo execution runs",
    "Dirty-state is not persisted",
    "No refresh execution runs",
    "No Preview DOM mutation occurs"
  ]) {
    if (!content.includes(phrase)) errors.push(`${doc} must document Phase 6D boundary: ${phrase}`);
  }
}

if (read("docs/full-product-roadmap.md").includes("Phase 6D preflight validator touched this file")) {
  errors.push("docs/full-product-roadmap.md must not be modified for Phase 6D.");
}

if (errors.length > 0) {
  console.error("Design editing preflight validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Design editing preflight validation passed (${requiredFiles.length} modules checked).`);
