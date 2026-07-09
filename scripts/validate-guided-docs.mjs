import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const repoRoot = process.cwd();
const errors = [];
const readCache = new Map();

const requiredFiles = [
  "docs/README.md",
  "docs/guided-reading.md",
  "docs/glossary.md",
  "docs/architecture/README.md",
  "docs/architecture/preview/README.md",
  "docs/architecture/commands/README.md",
  "docs/architecture/validation-system.md",
  "docs/architecture/flows/future-write-flow.md"
];

const readNextDocs = [...requiredFiles];

const guidedEntrypointPhrases = [
  "## What Crystal is",
  "## What Crystal is not yet",
  "## How to read the documentation",
  "## Read by goal",
  "## Read by subsystem",
  "## Read by safety concern",
  "## Read by implementation phase",
  "## Reader profiles",
  "Style Engine and CSS/Sass Inspector preparation",
  "## Read next"
];

const guidedReadingPhrases = [
  "## Main sequential path",
  "## Paths by objective",
  "## Before touching code",
  "## Before implementing a feature",
  "## Before touching Electron security",
  "## Before touching Preview or iframe behavior",
  "## Before touching editing or source patches",
  "## Before touching docs or validators",
  "## Preview pipeline path",
  "## Editing foundation path",
  "## Style Engine and CSS/Sass Inspector preparation",
  "## Read next"
];

const expectedReadingNodes = [
  "Get Started",
  "Core concepts",
  "Electron/security model",
  "Project Graph",
  "Preview Pipeline",
  "DOM Snapshot",
  "Selection & Inspector",
  "Editing Foundations",
  "Style Engine Preparation",
  "Validation System",
  "Roadmap"
];

function absolute(relativePath) {
  return path.join(repoRoot, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function read(relativePath) {
  if (readCache.has(relativePath)) return readCache.get(relativePath);

  if (!exists(relativePath)) {
    errors.push(`Missing required guided documentation file: ${relativePath}`);
    readCache.set(relativePath, "");
    return "";
  }

  const content = fs.readFileSync(absolute(relativePath), "utf8");
  readCache.set(relativePath, content);
  return content;
}

function countMatches(content, pattern) {
  return (content.match(pattern) ?? []).length;
}

function requireIncludes(relativePath, phrases) {
  const content = read(relativePath);
  for (const phrase of phrases) {
    if (!content.includes(phrase)) errors.push(`${relativePath} must include: ${phrase}`);
  }
}

function stripAnchorAndQuery(target) {
  return target.split("#")[0].split("?")[0];
}

function isExternalLink(target) {
  return /^(https?:|mailto:|tel:)/i.test(target);
}

function isIgnoredLink(target) {
  return target === "" || target.startsWith("#") || isExternalLink(target);
}

function isInsideRepo(resolvedPath) {
  return resolvedPath === repoRoot || resolvedPath.startsWith(`${repoRoot}${path.sep}`);
}

function checkRelativeLinks(relativePath) {
  const content = read(relativePath);
  const directory = path.dirname(absolute(relativePath));
  const linkPattern = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;
  let match;

  while ((match = linkPattern.exec(content)) !== null) {
    const rawTarget = match[1].trim();
    if (isIgnoredLink(rawTarget)) continue;

    const target = stripAnchorAndQuery(rawTarget);
    if (target === "") continue;

    const resolvedPath = path.resolve(directory, target);
    if (!isInsideRepo(resolvedPath)) {
      errors.push(`${relativePath} contains an out-of-repo link: ${rawTarget}`);
      continue;
    }

    if (!fs.existsSync(resolvedPath)) {
      errors.push(`${relativePath} contains a broken internal link: ${rawTarget}`);
    }
  }
}

function checkNoImageReferences(relativePath) {
  const content = read(relativePath);
  const imagePattern = /!\[[^\]]*\]\(([^)]+)\)/g;
  let match;

  while ((match = imagePattern.exec(content)) !== null) {
    const target = stripAnchorAndQuery(match[1].trim()).toLowerCase();
    if (/\.(png|jpe?g|svg)$/.test(target)) {
      errors.push(`${relativePath} must not add PNG/JPG/SVG image references: ${match[1]}`);
    }
  }
}

function getChangedFiles() {
  const candidates = [
    "git diff --name-only --diff-filter=ACMR main...HEAD",
    "git diff --name-only --diff-filter=ACMR origin/main...HEAD"
  ];

  for (const command of candidates) {
    try {
      const output = execSync(command, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      return output.split("\n").map((entry) => entry.trim()).filter(Boolean);
    } catch {
      // Try the next ref form. Some local checkouts have only main, some have only origin/main.
    }
  }

  return [];
}

for (const file of requiredFiles) read(file);

requireIncludes("docs/README.md", guidedEntrypointPhrases);
requireIncludes("docs/guided-reading.md", guidedReadingPhrases);

for (const node of expectedReadingNodes) {
  if (!read("docs/README.md").includes(node) && !read("docs/guided-reading.md").includes(node)) {
    errors.push(`Guided documentation must mention reading node: ${node}`);
  }
}

for (const file of readNextDocs) {
  const content = read(file);
  if (!content.includes("## Read next")) errors.push(`${file} must include a Read next block.`);
  if (!content.includes("You are here:")) errors.push(`${file} must identify the current reading position.`);
  if (!content.includes("Why this matters:")) errors.push(`${file} must explain why the page matters in the reading flow.`);
}

const combinedGuides = `${read("docs/README.md")}\n${read("docs/guided-reading.md")}`;
if (countMatches(combinedGuides, /```mermaid/g) < 3) {
  errors.push("Guided docs must include at least three Mermaid diagrams.");
}

for (const phrase of [
  "Phase 7B",
  "Editable Inspector read-only draft surface",
  "Phase 8A",
  "Style Engine read-only source inventory foundation",
  "CSS/Sass Inspector read-only visual surface"
]) {
  if (!read("docs/roadmap-implementation.md").includes(phrase)) {
    errors.push(`docs/roadmap-implementation.md must preserve roadmap phrase: ${phrase}`);
  }
}

const packageJson = read("package.json");
if (!packageJson.includes('"validate:guided-docs"')) {
  errors.push("package.json must define validate:guided-docs.");
}
if (!packageJson.includes("npm run validate:guided-docs")) {
  errors.push("validate:guided-docs must be integrated into an aggregate validation script.");
}

for (const file of requiredFiles) {
  checkRelativeLinks(file);
  checkNoImageReferences(file);
}

const changedFiles = getChangedFiles();
if (changedFiles.length > 0) {
  for (const file of changedFiles) {
    if (file === "package-lock.json") errors.push("package-lock.json must not be modified.");
    if (/\.(png|jpe?g|svg)$/i.test(file)) errors.push(`PNG/JPG/SVG files must not be added or modified: ${file}`);
    if (
      file.startsWith("apps/desktop/electron/main/") ||
      file.startsWith("apps/desktop/electron/preload/") ||
      file.startsWith("apps/desktop/electron/renderer/") ||
      file.startsWith("packages/core/")
    ) {
      errors.push(`Runtime functional source must not be modified by guided docs pass: ${file}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Guided documentation validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Guided documentation validation passed (${requiredFiles.length} docs, ${changedFiles.length || "unknown"} changed files checked).`);
