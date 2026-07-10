import fs from "node:fs";
import path from "node:path";
import {
  assertFileIncludes,
  assertPackageScript,
  createValidationContext,
  finishValidation,
  parsePackageJson,
  pushValidationError,
  readRequiredFile,
  recordCheck
} from "./validation/validation-assertions.mjs";
import { validateGeneratedMarkers } from "./project-metadata/generated-blocks.mjs";
import { validateInternalLinks } from "./validate-markdown-integrity.mjs";

const context = createValidationContext("Guided documentation validation");
const repoRoot = process.cwd();
const readCache = new Map();
const contract = readContract();

for (const document of contract.documents) {
  const content = read(document.path, document.required);
  if (!content) continue;

  if (document.requiresReadNext) assertFileIncludes(context, document.path, content, "## Read next", "read-next block");
  if (document.requiresPosition) assertFileIncludes(context, document.path, content, "You are here:", "current reading position");
  if (document.requiresRationale) assertFileIncludes(context, document.path, content, "Why this matters:", "reading flow rationale");
  for (const phrase of document.requiredPhrases ?? []) assertFileIncludes(context, document.path, content, phrase, "documentation contract phrase");

  if (document.validateLinks) {
    recordCheck(context, `relative links valid: ${document.path}`);
    for (const error of validateInternalLinks(repoRoot, document.path, content)) pushValidationError(context, error);
  }
}

const docsEntry = read("docs/README.md", true);
const guidedReading = read("docs/guided-reading.md", true);
const combinedGuides = `${docsEntry}\n${guidedReading}`;

for (const node of contract.readingNodes ?? []) {
  recordCheck(context, `guided docs mention reading node: ${node}`);
  if (!combinedGuides.includes(node)) pushValidationError(context, `Guided documentation must mention reading node: ${node}`);
}

recordCheck(context, "guided docs include required Mermaid diagrams");
const mermaidCount = (combinedGuides.match(/```mermaid/g) ?? []).length;
if (mermaidCount < (contract.minimumGuidedMermaidDiagrams ?? 0)) {
  pushValidationError(context, `Guided docs must include at least ${contract.minimumGuidedMermaidDiagrams} Mermaid diagrams; found ${mermaidCount}.`);
}

for (const [filePath, blockId] of [
  ["README.md", "toolchain"],
  ["docs/development.md", "toolchain"],
  ["docs/architecture/validation-system.md", "validation-catalog"]
]) {
  const content = read(filePath, true);
  recordCheck(context, `generated marker structure: ${filePath}`);
  assertFileIncludes(context, filePath, content, `<!-- crystal-generated:${blockId}:start -->`, "generated block start");
  assertFileIncludes(context, filePath, content, `<!-- crystal-generated:${blockId}:end -->`, "generated block end");
  for (const error of validateGeneratedMarkers(content, filePath)) pushValidationError(context, error);
}

const packageJson = parsePackageJson(context, read("package.json", true));
assertPackageScript(context, packageJson, "validate:guided-docs");
assertPackageScript(context, packageJson, "validate:architecture-docs");
assertPackageScript(context, packageJson, "validate:markdown-integrity");
recordCheck(context, "validate:architecture-docs integrates guided docs");
if (!packageJson.scripts?.["validate:architecture-docs"]?.includes("validate:guided-docs")) {
  pushValidationError(context, "validate:architecture-docs must integrate validate:guided-docs.");
}

finishValidation(context, {
  inspectHints: [
    "Open docs/metadata/documentation-contract.json and the reported documentation file.",
    "Inspect Read next, current position, rationale, generated markers, and internal links.",
    "Run npm run validate:markdown-integrity for structural Markdown diagnostics."
  ],
  resolutionHints: [
    "Restore the declarative documentation contract or the referenced documentation structure.",
    "Run npm run sync:project-metadata when a generated block is stale."
  ],
  doNotHints: [
    "Do not add branch or changed-file policy to validate-guided-docs.",
    "Do not add literal tokens only to satisfy validation.",
    "Do not edit generated blocks manually."
  ]
});

function readContract() {
  const contractPath = path.join(repoRoot, "docs", "metadata", "documentation-contract.json");
  recordCheck(context, "documentation contract exists and parses");
  if (!fs.existsSync(contractPath)) {
    pushValidationError(context, "Missing docs/metadata/documentation-contract.json.");
    return { documents: [], readingNodes: [], minimumGuidedMermaidDiagrams: 0 };
  }
  try {
    const value = JSON.parse(fs.readFileSync(contractPath, "utf8"));
    if (value.schemaVersion !== 1 || !Array.isArray(value.documents)) throw new Error("schemaVersion 1 and documents[] are required.");
    return value;
  } catch (error) {
    pushValidationError(context, `Invalid documentation contract: ${error.message}`);
    return { documents: [], readingNodes: [], minimumGuidedMermaidDiagrams: 0 };
  }
}

function read(relativePath, required) {
  if (readCache.has(relativePath)) return readCache.get(relativePath);
  if (!required && !fs.existsSync(path.join(repoRoot, relativePath))) return "";
  const content = readRequiredFile(context, relativePath);
  readCache.set(relativePath, content);
  return content;
}
