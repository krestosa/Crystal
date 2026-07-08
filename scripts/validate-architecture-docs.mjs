import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const expectedDocs = [
  "docs/README.md",
  "docs/architecture/README.md",
  "docs/architecture/system-overview.md",
  "docs/architecture/runtime-boundaries.md",
  "docs/architecture/repository-map.md",
  "docs/architecture/security-model.md",
  "docs/architecture/event-and-state-flow.md",
  "docs/architecture/validation-system.md",
  "docs/architecture/module-boundaries.md",
  "docs/architecture/renderer-shell/README.md",
  "docs/architecture/renderer-shell/shell-ui-primitives.md",
  "docs/architecture/renderer-shell/design-view.md",
  "docs/architecture/renderer-shell/diagnostics.md",
  "docs/architecture/renderer-shell/status-bar.md",
  "docs/architecture/renderer-shell/sidebar-composition.md",
  "docs/architecture/preview/README.md",
  "docs/architecture/preview/project-preview.md",
  "docs/architecture/preview/dom-snapshot.md",
  "docs/architecture/preview/preview-selection.md",
  "docs/architecture/preview/visual-selection-overlay.md",
  "docs/architecture/preview/preview-inspector.md",
  "docs/architecture/preview/preview-safety.md",
  "docs/architecture/commands/README.md",
  "docs/architecture/commands/html-element-library.md",
  "docs/architecture/commands/source-patch-preview.md",
  "docs/architecture/commands/command-preview-bus.md",
  "docs/architecture/commands/html-insertion-preview-planner.md",
  "docs/architecture/commands/future-command-execution.md",
  "docs/architecture/flows/README.md",
  "docs/architecture/flows/project-open-flow.md",
  "docs/architecture/flows/preview-selection-flow.md",
  "docs/architecture/flows/dom-snapshot-flow.md",
  "docs/architecture/flows/element-library-preview-flow.md",
  "docs/architecture/flows/source-patch-preview-flow.md",
  "docs/architecture/flows/validation-flow.md",
  "docs/architecture/flows/future-write-flow.md",
  "docs/architecture/diagrams/README.md",
  "docs/architecture/diagrams/system-context.md",
  "docs/architecture/diagrams/runtime-boundaries.md",
  "docs/architecture/diagrams/preview-selection-sequence.md",
  "docs/architecture/diagrams/source-patch-preview-sequence.md",
  "docs/architecture/diagrams/command-preview-bus-sequence.md",
  "docs/architecture/diagrams/security-boundaries.md",
  "docs/architecture/diagrams/validation-gates.md",
  "docs/decisions/README.md",
  "docs/decisions/0001-electron-security-boundaries.md",
  "docs/decisions/0002-read-only-preview-first.md",
  "docs/decisions/0003-command-preview-before-write.md",
  "docs/decisions/0004-modular-shell-ui-primitives.md",
  "docs/glossary.md"
];

const requiredArchitectureSections = [
  "## Purpose",
  "## Current implementation",
  "## Key files",
  "## Data flow",
  "## Boundaries",
  "## Validation",
  "## Related docs",
  "## Future work"
];

const requiredSecurityPhrases = [
  "contextIsolation: true",
  "nodeIntegration: false",
  "sandbox: true",
  "webSecurity: true",
  "iframe.contentDocument",
  "iframe.contentWindow.document"
];

const forbiddenPositiveWriteClaims = [
  "real source writes are implemented",
  "source patch application is implemented",
  "write IPC is implemented",
  "write IPC channels are implemented",
  "undo/redo execution is implemented",
  "DOM mutation is implemented",
  "Element Library inserts HTML",
  "Command Preview Bus executes commands"
];

const errors = [];
let mermaidDiagramCount = 0;

function readDoc(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing expected architecture doc: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function requireIncludes(relativePath, phrases) {
  const content = readDoc(relativePath);
  for (const phrase of phrases) {
    if (!content.includes(phrase)) errors.push(`${relativePath} must include: ${phrase}`);
  }
}

for (const docPath of expectedDocs) {
  const content = readDoc(docPath);
  if (!content) continue;

  if (docPath !== "docs/README.md" && !content.includes("[Docs index](")) {
    errors.push(`${docPath} must link back to the docs index.`);
  }

  mermaidDiagramCount += (content.match(/```mermaid/g) ?? []).length;

  if (docPath.startsWith("docs/architecture/") && docPath.endsWith(".md")) {
    for (const section of requiredArchitectureSections) {
      if (!content.includes(section)) errors.push(`${docPath} is missing required section: ${section}`);
    }
  }

  for (const claim of forbiddenPositiveWriteClaims) {
    if (content.includes(claim)) errors.push(`${docPath} contains forbidden positive write claim: ${claim}`);
  }
}

if (mermaidDiagramCount < 11) errors.push(`Expected at least 11 Mermaid diagrams, found ${mermaidDiagramCount}.`);

const rootIndex = readDoc("docs/README.md");
for (const docPath of expectedDocs.filter((entry) => entry !== "docs/README.md")) {
  const relativeFromDocsRoot = `./${docPath.replace(/^docs\//, "")}`;
  if (!rootIndex.includes(relativeFromDocsRoot)) errors.push(`docs/README.md does not link ${relativeFromDocsRoot}.`);
}

requireIncludes("docs/architecture/security-model.md", requiredSecurityPhrases);
requireIncludes("docs/architecture/preview/preview-safety.md", [
  "allow-same-origin",
  "iframe.contentDocument",
  "iframe.contentWindow.document",
  "insertAdjacentHTML",
  "contenteditable",
  "execCommand"
]);
requireIncludes("docs/architecture/commands/command-preview-bus.md", [
  "not a replacement for `packages/core/commands/command-bus.ts`",
  "not an execution bus"
]);
requireIncludes("docs/architecture/commands/source-patch-preview.md", [
  "not a write operation",
  "must not write"
]);
requireIncludes("docs/architecture/flows/future-write-flow.md", [
  "No file is modified",
  "No DOM node is inserted",
  "No patch is applied",
  "No write IPC exists",
  "must not write files"
]);
requireIncludes("docs/README.md", ["./roadmap-implementation.md", "./full-product-roadmap.md"]);

if (errors.length > 0) {
  console.error("Architecture documentation validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Architecture documentation validation passed (${expectedDocs.length} docs, ${mermaidDiagramCount} Mermaid diagrams).`);
