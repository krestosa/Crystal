import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const errors = [];

const requiredFiles = [
  "packages/core/history/history-transaction.constants.ts",
  "packages/core/history/history-transaction.types.ts",
  "packages/core/history/history-transaction.validators.ts",
  "packages/core/history/history-transaction.preview.ts",
  "packages/core/history/index.ts",
  "packages/core/refresh-boundary/refresh-boundary.constants.ts",
  "packages/core/refresh-boundary/refresh-boundary.types.ts",
  "packages/core/refresh-boundary/refresh-boundary.validators.ts",
  "packages/core/refresh-boundary/refresh-boundary.plan.ts",
  "packages/core/refresh-boundary/index.ts",
  "packages/core/commands/transaction-planning/command-transaction-plan.types.ts",
  "packages/core/commands/transaction-planning/command-transaction-plan.validators.ts",
  "packages/core/commands/transaction-planning/command-transaction-plan.preview.ts",
  "packages/core/commands/transaction-planning/index.ts"
];

const newModuleFiles = requiredFiles;
const forbiddenModulePatterns = [
  { label: "node filesystem import", pattern: /from\s+["']node:fs["']|require\(["']node:fs["']\)/ },
  { label: "filesystem write", pattern: /\bwriteFile\b|\bwriteFileSync\b/ },
  { label: "real patch application symbol", pattern: /\bapplyPatch\b/ },
  { label: "Apply enablement wording", pattern: /enable\s+Apply|Apply\s+enabled/i },
  { label: "iframe.contentDocument", pattern: /iframe\.contentDocument|\.contentDocument\b/ },
  { label: "iframe.contentWindow.document", pattern: /iframe\.contentWindow\.document|\.contentWindow\.document\b/ },
  { label: "insertAdjacentHTML", pattern: /\binsertAdjacentHTML\b/ },
  { label: "contenteditable", pattern: /\bcontenteditable\b/i },
  { label: "execCommand", pattern: /\bexecCommand\b/ },
  { label: "localStorage", pattern: /\blocalStorage\b/ }
];

const forbiddenSourcePatterns = [
  { label: "write IPC registration", pattern: /ipcMain\.(handle|on)\([^\n]*["'][^"']*(write|save|apply)[^"']*["']/i },
  { label: "write IPC invocation", pattern: /ipcRenderer\.(invoke|send)\([^\n]*["'][^"']*(write|save|apply)[^"']*["']/i },
  { label: "real patch application symbol", pattern: /\bapplyPatch\b/ },
  { label: "filesystem write", pattern: /\bwriteFile\b|\bwriteFileSync\b/ }
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

requireIncludes("packages/core/history/history-transaction.types.ts", [
  "HistoryTransactionPreview",
  "sourcePatchPreviewId",
  "affectedFiles",
  "reversible",
  "undoStrategy",
  "redoStrategy",
  "blockedReason"
]);

requireIncludes("packages/core/refresh-boundary/refresh-boundary.types.ts", [
  "RefreshBoundaryPlan",
  "project-graph",
  "dom-snapshot",
  "preview-render",
  "selection-state",
  "inspector-state",
  "visual-overlay",
  "diagnostics"
]);

requireIncludes("packages/core/commands/transaction-planning/command-transaction-plan.types.ts", [
  "CommandTransactionPlanPreview",
  "CommandPreviewResult",
  "HistoryTransactionPreview",
  "RefreshBoundaryPlan",
  "futureRequirements"
]);

requireIncludes("packages/core/history/history-transaction.validators.ts", ["validateHistoryTransactionPreview"]);
requireIncludes("packages/core/refresh-boundary/refresh-boundary.validators.ts", ["validateRefreshBoundaryPlan"]);
requireIncludes("packages/core/commands/transaction-planning/command-transaction-plan.validators.ts", ["validateCommandTransactionPlanPreview"]);

requireIncludes("packages/core/history/index.ts", [
  "./history-transaction.constants",
  "./history-transaction.preview",
  "./history-transaction.types",
  "./history-transaction.validators"
]);

requireIncludes("packages/core/refresh-boundary/index.ts", [
  "./refresh-boundary.constants",
  "./refresh-boundary.plan",
  "./refresh-boundary.types",
  "./refresh-boundary.validators"
]);

requireIncludes("packages/core/commands/transaction-planning/index.ts", [
  "./command-transaction-plan.preview",
  "./command-transaction-plan.types",
  "./command-transaction-plan.validators"
]);

requireIncludes("packages/core/history/history-transaction.constants.ts", [
  '"preview-only"',
  '"blocked"',
  '"unsupported"',
  '"reverse-patch"',
  '"restore-snapshot"',
  '"unavailable"'
]);

requireIncludes("packages/core/refresh-boundary/refresh-boundary.constants.ts", [
  '"planned"',
  '"blocked"',
  '"unsupported"'
]);

requireIncludes("packages/core/commands/transaction-planning/command-transaction-plan.preview.ts", [
  "SOURCE_PATCH_READY_STATUS",
  "COMMAND_PREVIEW_READY_STATUS",
  "createHistoryTransactionPreview",
  "createRefreshBoundaryPlan"
]);

for (const file of newModuleFiles) {
  const content = read(file);
  for (const { label, pattern } of forbiddenModulePatterns) {
    if (pattern.test(content)) errors.push(`${file} contains forbidden ${label}.`);
  }
}

for (const root of ["apps/desktop/electron/main", "apps/desktop/electron/preload", "apps/desktop/electron/renderer", "packages/core"]) {
  for (const file of walk(root).filter((entry) => /\.(ts|tsx|js|mjs|cjs)$/.test(entry))) {
    const content = read(file);
    for (const { label, pattern } of forbiddenSourcePatterns) {
      if (pattern.test(content) && !file.includes("command-preview-bus.constants.ts")) {
        errors.push(`${file} contains forbidden source pattern for Phase 6C: ${label}.`);
      }
    }
  }
}

for (const file of walk("apps/desktop/electron/renderer").filter((entry) => entry.endsWith(".ts"))) {
  const content = read(file);
  if (/from\s+["']node:fs["']|require\(["']node:fs["']\)/.test(content)) {
    errors.push(`${file} imports node:fs from renderer.`);
  }
  if (/history\/|refresh-boundary|transaction-planning/.test(content)) {
    errors.push(`${file} should not wire Phase 6C planning models into renderer UI in this foundation phase.`);
  }
}

const packageJson = read("package.json");
if (!packageJson.includes('"validate:history-foundation"')) errors.push("package.json must expose validate:history-foundation.");
if (!packageJson.includes("npm run validate:history-foundation")) errors.push("validate:local:quick:core must include validate:history-foundation.");

requireIncludes("docs/architecture/flows/future-write-flow.md", [
  "No file is modified",
  "No DOM node is inserted",
  "No patch is applied",
  "No write IPC exists",
  "Phase 6C models are planning-only",
  "must not write files"
]);

if (packageJson.includes('"dependencies"')) errors.push("package.json must not add runtime dependencies in Phase 6C.");

if (errors.length > 0) {
  console.error("History foundation validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`History foundation validation passed (${requiredFiles.length} modules checked).`);
