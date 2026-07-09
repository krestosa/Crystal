import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const errors = [];

const requiredFiles = [
  "packages/core/style-engine/index.ts",
  "packages/core/style-engine/style-engine.constants.ts",
  "packages/core/style-engine/style-engine.types.ts",
  "packages/core/style-engine/style-source-inventory.ts",
  "packages/core/style-engine/style-source-reference.ts",
  "packages/core/style-engine/style-rule-preview.ts",
  "packages/core/style-engine/style-selector-preview.ts",
  "packages/core/style-engine/style-declaration-preview.ts",
  "packages/core/style-engine/style-inspector-readiness.ts",
  "packages/core/style-engine/style-engine.validators.ts"
];

const newModuleRoot = "packages/core/style-engine";
const docsToValidate = [
  "docs/roadmap-implementation.md",
  "docs/architecture/commands/future-command-execution.md",
  "docs/architecture/flows/future-write-flow.md",
  "docs/architecture/validation-system.md",
  "docs/glossary.md"
];

const forbiddenModulePatterns = [
  { label: "browser computed style read", pattern: /\bgetComputedStyle\b/ },
  { label: "stylesheet object access", pattern: /\bCSSStyleSheet\b|\bdocument\.styleSheets\b|\bCSSRule\b|\bCSSStyleRule\b/ },
  { label: "iframe.contentDocument", pattern: /iframe\.contentDocument|\.contentDocument\b/ },
  { label: "iframe.contentWindow.document", pattern: /iframe\.contentWindow\.document|\.contentWindow\.document\b/ },
  { label: "node filesystem import", pattern: /from\s+["']node:fs["']|require\(["']node:fs["']\)/ },
  { label: "filesystem write", pattern: new RegExp(`\\b(?:${["write", "File"].join("")}|appendFile|mkdir|unlink)\\b`) },
  { label: "real patch application symbol", pattern: new RegExp(`\\b${["apply", "Patch"].join("")}\\b`) },
  { label: "write IPC channel", pattern: /ipc(Main|Renderer)\.(handle|on|invoke|send)\([^\n]*["'][^"']*(write|save|apply)[^"']*["']/i },
  { label: "contenteditable", pattern: /\bcontenteditable\b/i },
  { label: "insertAdjacentHTML", pattern: /\binsertAdjacentHTML\b/ },
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

const indexContent = read("packages/core/style-engine/index.ts").trim();
for (const line of indexContent.split(/\r?\n/)) {
  if (!/^export \* from "\.\/style-[a-z-]+(?:\.[a-z-]+)?";$/.test(line.trim())) {
    errors.push("packages/core/style-engine/index.ts must remain barrel export only.");
    break;
  }
}

requireIncludes("packages/core/style-engine/style-engine.types.ts", [
  "StyleSourceReferencePreview",
  "sourceKind",
  "linked-css",
  "linked-scss",
  "inline-style-block",
  "inline-style-attribute",
  "canWriteSource: false",
  "StyleSourceInventoryPreview",
  "canEdit: false",
  "canApply: false",
  "StyleSelectorPreview",
  "canEvaluateAgainstIframe: false",
  "StyleDeclarationPreview",
  "StyleRulePreview",
  "SelectedNodeStyleReadinessPreview",
  "canInspectComputedStyles: false",
  "canEditStyles: false"
]);

requireIncludes("packages/core/style-engine/style-source-reference.ts", [
  "createStyleSourceReferencePreview",
  "detectStyleSourceKindFromPath",
  "canWriteSource: false",
  "linked-css",
  "linked-scss"
]);

requireIncludes("packages/core/style-engine/style-source-inventory.ts", [
  "createStyleSourceInventoryPreview",
  "discoverStyleSourceReferencesFromHtml",
  "<link\\b[^>]*>",
  "stylesheet",
  "canEdit: false",
  "canApply: false"
]);

requireIncludes("packages/core/style-engine/style-selector-preview.ts", [
  "createStyleSelectorPreview",
  "inferSelectorKind",
  "not-evaluated",
  "canEvaluateAgainstIframe: false"
]);

requireIncludes("packages/core/style-engine/style-declaration-preview.ts", [
  "createStyleDeclarationPreview",
  "parseStyleDeclarationText",
  "canEdit: false",
  "canApply: false"
]);

requireIncludes("packages/core/style-engine/style-rule-preview.ts", [
  "createStyleRulePreview",
  "parseStyleRulePreviewsFromSourceText",
  "canEdit: false",
  "canApply: false"
]);

requireIncludes("packages/core/style-engine/style-inspector-readiness.ts", [
  "createSelectedNodeStyleReadinessPreview",
  "inventoryPreview",
  "inspectorEditingReadinessPreview",
  "canInspectComputedStyles: false",
  "canInspectAuthoredStyles",
  "canEditStyles: false",
  "canApply: false"
]);

requireIncludes("packages/core/style-engine/style-engine.validators.ts", [
  "validateStyleSourceReferencePreview",
  "validateStyleSourceInventoryPreview",
  "validateStyleSelectorPreview",
  "validateStyleDeclarationPreview",
  "validateStyleRulePreview",
  "validateSelectedNodeStyleReadinessPreview",
  "canWriteSource !== false",
  "canApply !== false",
  "canInspectComputedStyles !== false"
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
    if (!/style-engine|StyleSourceInventoryPreview|SelectedNodeStyleReadinessPreview/.test(content)) continue;
    for (const { label, pattern } of forbiddenModulePatterns) {
      if (pattern.test(content)) errors.push(`${file} contains forbidden ${label} while wiring Phase 8A Style Engine.`);
    }
  }
}

const packageJson = read("package.json");
if (!packageJson.includes('"validate:style-engine-foundation"')) {
  errors.push("package.json must expose validate:style-engine-foundation.");
}
if (!packageJson.includes("npm run validate:style-engine-foundation")) {
  errors.push("validate:local:quick:core must include validate:style-engine-foundation.");
}
if (packageJson.includes('"dependencies"')) errors.push("package.json must not add runtime dependencies in Phase 8A.");

for (const doc of docsToValidate) {
  const content = read(doc);
  for (const phrase of [
    "Phase 8A",
    "Style Engine read-only source inventory foundation",
    "No CSS/Sass Inspector visual surface is added",
    "No real cascade is calculated",
    "No computed styles are read",
    "No style editing is implemented",
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
    if (!content.includes(phrase)) errors.push(`${doc} must document Phase 8A boundary: ${phrase}`);
  }
}

if (read("docs/full-product-roadmap.md").includes("Phase 8A style engine validator touched this file")) {
  errors.push("docs/full-product-roadmap.md must not be modified for Phase 8A.");
}

if (errors.length > 0) {
  console.error("Style Engine foundation validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Style Engine foundation validation passed (${requiredFiles.length} modules checked).`);
