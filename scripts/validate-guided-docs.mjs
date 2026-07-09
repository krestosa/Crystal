import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  assertFileIncludes,
  assertPackageScript,
  createValidationContext,
  finishValidation,
  parsePackageJson,
  pushValidationError,
  pushValidationWarning,
  readRequiredFile,
  recordCheck
} from "./validation/validation-assertions.mjs";

const context = createValidationContext("Guided documentation validation");
const repoRoot = process.cwd();
const readCache = new Map();

const requiredFiles = [
  "docs/README.md",
  "docs/guided-reading.md",
  "docs/glossary.md",
  "docs/architecture/README.md",
  "docs/architecture/preview/README.md",
  "docs/architecture/commands/README.md",
  "docs/architecture/validation-system.md",
  "docs/architecture/flows/future-write-flow.md",
  "docs/roadmap-implementation.md",
  "package.json"
];

const readNextDocs = requiredFiles.filter((file) => file !== "package.json" && file !== "docs/roadmap-implementation.md");

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

for (const file of requiredFiles) read(file);

requireIncludes("docs/README.md", guidedEntrypointPhrases);
requireIncludes("docs/guided-reading.md", guidedReadingPhrases);

for (const node of expectedReadingNodes) {
  recordCheck(context, `guided docs mention reading node: ${node}`);
  if (!read("docs/README.md").includes(node) && !read("docs/guided-reading.md").includes(node)) {
    pushValidationError(context, `Guided documentation must mention reading node: ${node}`);
  }
}

for (const file of readNextDocs) {
  const content = read(file);
  assertFileIncludes(context, file, content, "## Read next", "read-next block");
  assertFileIncludes(context, file, content, "You are here:", "current reading position");
  assertFileIncludes(context, file, content, "Why this matters:", "reading flow rationale");
}

const combinedGuides = `${read("docs/README.md")}\n${read("docs/guided-reading.md")}`;
recordCheck(context, "guided docs include at least three Mermaid diagrams");
if (countMatches(combinedGuides, /```mermaid/g) < 3) {
  pushValidationError(context, "Guided docs must include at least three Mermaid diagrams.");
}

for (const phrase of [
  "Phase 7B",
  "Editable Inspector read-only draft surface",
  "Phase 8A",
  "Style Engine read-only source inventory foundation",
  "CSS/Sass Inspector read-only visual surface"
]) {
  assertFileIncludes(context, "docs/roadmap-implementation.md", read("docs/roadmap-implementation.md"), phrase, "roadmap historical phrase");
}

const packageJson = parsePackageJson(context, read("package.json"));
assertPackageScript(context, packageJson, "validate:guided-docs");
assertPackageScript(context, packageJson, "validate:architecture-docs");
recordCheck(context, "validate:architecture-docs integrates guided docs");
if (!packageJson.scripts?.["validate:architecture-docs"]?.includes("validate:guided-docs")) {
  pushValidationError(context, "validate:architecture-docs must integrate validate:guided-docs.");
}

for (const file of readNextDocs) {
  checkRelativeLinks(file);
  checkNoImageReferences(file);
}

const branchInfo = getCurrentBranchInfo();
const docsOnlyEnabled = branchInfo.branch?.startsWith("docs/") ?? false;
const changedFilesInfo = getChangedFiles();

console.log(`Current branch: ${branchInfo.branch || "unknown"}`);
console.log(`Docs-only restriction: ${docsOnlyEnabled ? "enabled" : "disabled"}`);
console.log(`Changed files checked: ${changedFilesInfo.files ? changedFilesInfo.files.length : "not available"}`);
if (changedFilesInfo.ref) console.log(`Changed files ref: ${changedFilesInfo.ref}`);

recordCheck(context, "current branch detection is explicit");
if (!branchInfo.detected) {
  pushValidationWarning(context, "Current branch could not be detected from git or CI environment; docs-only restriction is disabled explicitly.");
}

recordCheck(context, "changed files comparison is explicit");
if (!changedFilesInfo.files) {
  if (docsOnlyEnabled) {
    pushValidationError(context, "Docs-only branch could not compare changed files against main or origin/main.");
  } else {
    pushValidationWarning(context, "Changed files could not be compared against main or origin/main; runtime branch docs-only blocking is disabled explicitly.");
  }
}

if (changedFilesInfo.files) {
  for (const file of changedFilesInfo.files) {
    recordCheck(context, `changed file policy: ${file}`);
    if (docsOnlyEnabled && file === "package-lock.json") {
      pushValidationError(context, "package-lock.json must not be modified by guided docs pass.");
    }
    if (/\.(png|jpe?g|svg)$/i.test(file)) pushValidationError(context, `PNG/JPG/SVG files must not be added or modified: ${file}`);
    if (
      docsOnlyEnabled &&
      (file.startsWith("apps/desktop/electron/main/") ||
        file.startsWith("apps/desktop/electron/preload/") ||
        file.startsWith("apps/desktop/electron/renderer/") ||
        file.startsWith("packages/core/"))
    ) {
      pushValidationError(context, `Runtime functional source must not be modified by guided docs pass: ${file}`);
    }
  }
}

finishValidation(context, {
  inspectHints: [
    "Open the reported documentation file.",
    "Search for the exact required heading, reading node, historical phrase, or link target.",
    "Run git branch --show-current and git diff --name-only origin/main...HEAD to inspect branch-aware docs-only enforcement.",
    "Re-run npm run validate:guided-docs."
  ],
  resolutionHints: [
    "Restore the guided reading path, Read next block, internal link, package script, or preserved roadmap phrase.",
    "For docs/* branches, keep changed files scoped to docs and allowed package validation wiring only."
  ],
  doNotHints: [
    "Do not invent the current branch when git or CI branch metadata is unavailable.",
    "Do not move historical phase phrases out of docs guarded by older validators.",
    "Do not relax docs-only checks for docs/* branches."
  ]
});

function absolute(relativePath) {
  return path.join(repoRoot, relativePath);
}

function read(relativePath) {
  if (readCache.has(relativePath)) return readCache.get(relativePath);
  const content = readRequiredFile(context, relativePath);
  readCache.set(relativePath, content);
  return content;
}

function countMatches(content, pattern) {
  return (content.match(pattern) ?? []).length;
}

function requireIncludes(relativePath, phrases) {
  const content = read(relativePath);
  for (const phrase of phrases) {
    assertFileIncludes(context, relativePath, content, phrase, "required guided docs phrase");
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
  recordCheck(context, `relative links valid: ${relativePath}`);
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
      pushValidationError(context, `${relativePath} contains an out-of-repo link: ${rawTarget}`);
      continue;
    }
    if (!fs.existsSync(resolvedPath)) pushValidationError(context, `${relativePath} contains a broken internal link: ${rawTarget}`);
  }
}

function checkNoImageReferences(relativePath) {
  recordCheck(context, `no PNG/JPG/SVG markdown images: ${relativePath}`);
  const content = read(relativePath);
  const imagePattern = /!\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = imagePattern.exec(content)) !== null) {
    const target = stripAnchorAndQuery(match[1].trim()).toLowerCase();
    if (/\.(png|jpe?g|svg)$/.test(target)) pushValidationError(context, `${relativePath} must not add PNG/JPG/SVG image references: ${match[1]}`);
  }
}

function getChangedFiles() {
  const candidates = [
    { ref: "origin/main...HEAD", command: "git diff --name-only --diff-filter=ACMR origin/main...HEAD" },
    { ref: "main...HEAD", command: "git diff --name-only --diff-filter=ACMR main...HEAD" }
  ];
  for (const candidate of candidates) {
    try {
      const output = execSync(candidate.command, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      return { files: output.split("\n").map((entry) => entry.trim()).filter(Boolean), ref: candidate.ref };
    } catch {
      // Try the next deterministic ref form.
    }
  }
  return { files: null, ref: null };
}

function getCurrentBranchInfo() {
  try {
    const branch = execSync("git branch --show-current", { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    if (branch) return { branch, detected: true, source: "git" };
  } catch {
    // Fall back to CI metadata below.
  }
  const envBranch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || "";
  if (envBranch) return { branch: envBranch, detected: true, source: "env" };
  return { branch: "", detected: false, source: "unknown" };
}
