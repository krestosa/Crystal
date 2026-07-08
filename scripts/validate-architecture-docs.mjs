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

const principalDocs = [
  "docs/architecture/README.md",
  "docs/architecture/system-overview.md",
  "docs/architecture/runtime-boundaries.md",
  "docs/architecture/security-model.md",
  "docs/architecture/module-boundaries.md",
  "docs/architecture/validation-system.md",
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
  "docs/architecture/commands/future-command-execution.md"
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
let markdownTableCount = 0;
let calloutCount = 0;
let subgraphCount = 0;
let sequenceDiagramCount = 0;
let stateDiagramCount = 0;

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

function countMatches(content, pattern) {
  return (content.match(pattern) ?? []).length;
}

for (const docPath of expectedDocs) {
  const content = readDoc(docPath);
  if (!content) continue;

  if (docPath !== "docs/README.md" && !content.includes("[Docs index](")) {
    errors.push(`${docPath} must link back to the docs index.`);
  }

  mermaidDiagramCount += countMatches(content, /```mermaid/g);
  markdownTableCount += countMatches(content, /^\| .* \|$/gm);
  calloutCount += countMatches(content, /^> \*\*[^*]+:\*\*/gm);
  subgraphCount += countMatches(content, /\bsubgraph\b/g);
  sequenceDiagramCount += countMatches(content, /\bsequenceDiagram\b/g);
  stateDiagramCount += countMatches(content, /\bstateDiagram-v2\b/g);

  if (docPath.startsWith("docs/architecture/") && docPath.endsWith(".md")) {
    for (const section of requiredArchitectureSections) {
      if (!content.includes(section)) errors.push(`${docPath} is missing required section: ${section}`);
    }
  }

  for (const claim of forbiddenPositiveWriteClaims) {
    if (content.includes(claim)) errors.push(`${docPath} contains forbidden positive write claim: ${claim}`);
  }
}

for (const docPath of principalDocs) {
  const content = readDoc(docPath);
  for (const phrase of [
    "## At a glance",
    "## What this does not do",
    "## Key files and responsibilities",
    "## Common misunderstanding"
  ]) {
    if (!content.includes(phrase)) errors.push(`${docPath} must include: ${phrase}`);
  }

  if (countMatches(content, /^\| .* \|$/gm) < 8) {
    errors.push(`${docPath} should include multiple Markdown tables for scanability.`);
  }
}

if (mermaidDiagramCount < 18) errors.push(`Expected at least 18 Mermaid diagrams, found ${mermaidDiagramCount}.`);
if (markdownTableCount < 80) errors.push(`Expected at least 80 Markdown table rows globally, found ${markdownTableCount}.`);
if (calloutCount < 18) errors.push(`Expected at least 18 Markdown callouts, found ${calloutCount}.`);
if (subgraphCount < 12) errors.push(`Expected at least 12 Mermaid subgraphs globally, found ${subgraphCount}.`);
if (sequenceDiagramCount < 3) errors.push(`Expected at least 3 sequence diagrams, found ${sequenceDiagramCount}.`);
if (stateDiagramCount < 2) errors.push(`Expected at least 2 state diagrams, found ${stateDiagramCount}.`);

const diagramDocs = expectedDocs.filter((entry) => entry.startsWith("docs/architecture/diagrams/"));
const diagramSubgraphCount = diagramDocs.reduce((count, docPath) => count + countMatches(readDoc(docPath), /\bsubgraph\b/g), 0);
if (diagramSubgraphCount < 6) errors.push(`Expected at least 6 subgraphs inside diagram docs, found ${diagramSubgraphCount}.`);

const rootIndex = readDoc("docs/README.md");
for (const docPath of expectedDocs.filter((entry) => entry !== "docs/README.md")) {
  const relativeFromDocsRoot = `./${docPath.replace(/^docs\//, "")}`;
  if (!rootIndex.includes(relativeFromDocsRoot)) errors.push(`docs/README.md does not link ${relativeFromDocsRoot}.`);
}

requireIncludes("docs/README.md", [
  "## Start here",
  "## Read by goal",
  "## Read by subsystem",
  "## Read by safety concern",
  "## Read by implementation phase",
  "./roadmap-implementation.md",
  "./full-product-roadmap.md"
]);

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
requireIncludes("docs/glossary.md", [
  "## Runtime and security",
  "## Preview and inspection",
  "## Commands and patch planning",
  "## Future write system",
  "## Validation"
]);

if (!expectedDocs.some((docPath) => readDoc(docPath).includes("Safety boundary"))) {
  errors.push("Expected at least one Safety boundary callout.");
}
if (!expectedDocs.some((docPath) => readDoc(docPath).includes("Common misunderstanding"))) {
  errors.push("Expected at least one Common misunderstanding callout.");
}
if (!expectedDocs.some((docPath) => readDoc(docPath).includes("What this does not do"))) {
  errors.push("Expected at least one What this does not do section.");
}

if (errors.length > 0) {
  console.error("Architecture documentation validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Architecture documentation validation passed (${expectedDocs.length} docs, ${mermaidDiagramCount} Mermaid diagrams, ${markdownTableCount} table rows, ${calloutCount} callouts).`
);
