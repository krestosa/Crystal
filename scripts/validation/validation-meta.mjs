import fs from "node:fs";
import path from "node:path";
import { validationCatalog } from "./validation-suite.mjs";
import { readProjectBaseline } from "../project-metadata/project-baseline.mjs";
import { synchronizeProjectMetadata } from "../project-metadata/project-metadata-sync.mjs";

export const KNOWN_VALIDATION_CATEGORIES = new Set([
  "docs",
  "build",
  "core",
  "preview",
  "ui",
  "watch",
  "doctor",
  "validation"
]);

export function runValidationSystemMetaChecks(options = {}) {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const errors = [];
  const filesChecked = new Set();
  let checksExecuted = 0;

  const check = (condition, message) => {
    checksExecuted += 1;
    if (!condition) errors.push(message);
  };

  const readText = (relativePath) => {
    const absolutePath = path.join(cwd, relativePath);
    filesChecked.add(relativePath);
    if (!fs.existsSync(absolutePath)) {
      errors.push(`${relativePath} must exist.`);
      return "";
    }
    return fs.readFileSync(absolutePath, "utf8");
  };

  const readJson = (relativePath, fallback) => {
    const text = readText(relativePath);
    if (!text) return fallback;
    try {
      return JSON.parse(text);
    } catch (error) {
      errors.push(`${relativePath} must parse as JSON: ${error.message}`);
      return fallback;
    }
  };

  const packageText = readText("package.json");
  const packageJson = packageText ? JSON.parse(packageText) : { scripts: {} };
  let baseline = null;
  try {
    baseline = readProjectBaseline({ projectRoot: cwd });
  } catch (error) {
    errors.push(error.message);
  }

  const ids = new Set();
  const labels = new Set();
  for (const item of validationCatalog) {
    check(typeof item.id === "string" && item.id.length > 0, "Every validation entry must define id.");
    check(!ids.has(item.id), `Validation id must be unique: ${item.id}`);
    ids.add(item.id);
    check(typeof item.label === "string" && item.label.length > 0, `Validation ${item.id} must define label.`);
    check(!labels.has(item.label), `Validation label must be unique: ${item.label}`);
    labels.add(item.label);
    check(KNOWN_VALIDATION_CATEGORIES.has(item.category), `Validation ${item.id} uses unknown category: ${item.category}`);
    check(typeof item.required === "boolean", `Validation ${item.id} must define required as boolean.`);
    check(typeof item.includeInLocalQuick === "boolean", `Validation ${item.id} must define includeInLocalQuick.`);
    check(typeof item.includeInFullValidation === "boolean", `Validation ${item.id} must define includeInFullValidation.`);
    check(typeof item.documentationGroup === "string" && item.documentationGroup.length > 0, `Validation ${item.id} must define documentationGroup.`);
    check(["direct-node", "npm"].includes(item.executionMode), `Validation ${item.id} has invalid executionMode: ${item.executionMode}`);
    check(typeof item.npmScript === "string" && item.npmScript.length > 0, `Validation ${item.id} must define npmScript.`);
    check(typeof packageJson.scripts?.[item.npmScript] === "string", `package.json must define ${item.npmScript}.`);

    if (item.executionMode === "direct-node") {
      check(typeof item.directScriptPath === "string" && item.directScriptPath.length > 0, `Validation ${item.id} must define directScriptPath.`);
      if (item.directScriptPath) {
        const absolutePath = path.join(cwd, item.directScriptPath);
        filesChecked.add(item.directScriptPath);
        check(fs.existsSync(absolutePath), `Direct validation script must exist: ${item.directScriptPath}`);
        check(packageJson.scripts?.[item.npmScript]?.includes(item.directScriptPath), `${item.npmScript} must execute ${item.directScriptPath}.`);
      }
    } else {
      check(item.directScriptPath === null, `npm validation ${item.id} must not define directScriptPath.`);
    }
  }

  for (const scriptName of [
    "sync:project-metadata",
    "validate:project-metadata",
    "validate:project-metadata:json",
    "validate:change-policy",
    "validate:markdown-integrity",
    "test:tooling-hardening",
    "validate:local:quick",
    "validate:local:quick:json",
    "validate:local:quick:verbose",
    "validate:local:quick:fail-fast",
    "validate:validation-system"
  ]) {
    check(typeof packageJson.scripts?.[scriptName] === "string", `package.json must include script: ${scriptName}`);
  }

  const runnerText = readText("scripts/validation/validation-runner.mjs");
  const reporterText = readText("scripts/validation/validation-reporter.mjs");
  const resultText = readText("scripts/validation/validation-result.mjs");
  const assertionsText = readText("scripts/validation/validation-assertions.mjs");
  const componentsText = readText("scripts/validation/validation-terminal-components.mjs");
  const capabilitiesText = readText("scripts/validation/validation-terminal-capabilities.mjs");
  const renderModeText = readText("scripts/validation/validation-render-mode.mjs");
  const performanceText = readText("scripts/validation/validation-performance.mjs");
  const validationSystemDocs = readText("docs/architecture/validation-system.md");

  for (const token of [
    "none",
    "command-execution",
    "missing-npm-script",
    "missing-direct-script",
    "validator-failure",
    "skipped"
  ]) {
    check(resultText.includes(token) || runnerText.includes(token), `Validation failure type must remain implemented: ${token}`);
  }

  for (const token of [
    "raw",
    "plain",
    "unicode",
    "ascii",
    "jsonSummary",
    "verbose",
    "compact",
    "failFast",
    "color",
    "noColor"
  ]) {
    check(runnerText.includes(token) || reporterText.includes(token) || renderModeText.includes(token), `Runner/reporter must implement mode or flag: ${token}`);
  }

  for (const token of ["--color", "--no-color", "NO_COLOR", "canUseColor"]) {
    check(runnerText.includes(token) || capabilitiesText.includes(token) || renderModeText.includes(token) || validationSystemDocs.includes(token), `Color support must include token: ${token}`);
  }

  for (const token of ["stripAnsi", "visibleLength", "padEndVisible", "truncateVisible", "colorize"]) {
    check(componentsText.includes(token), `Terminal components must implement ANSI-safe helper: ${token}`);
  }

  for (const token of ["renderDurationBarChart", "slowest", "rank", "░", "-"]) {
    check(componentsText.includes(token) || reporterText.includes(token) || performanceText.includes(token), `Performance reporting must include ranking/remainder token: ${token}`);
  }

  check(renderModeText.includes("VALIDATION_RENDER_RAW") && renderModeText.includes("VALIDATION_RENDER_JSON_SUMMARY"), "Render mode must isolate raw and json-summary output.");
  check(renderModeText.includes("return false") && renderModeText.includes("VALIDATION_RENDER_RAW") && renderModeText.includes("VALIDATION_RENDER_JSON_SUMMARY"), "Raw and JSON modes must disable ANSI color.");
  check(reporterText.includes("if (this.jsonSummary) return;"), "JSON summary mode must suppress human per-step output.");
  check(reporterText.includes("JSON.stringify"), "JSON summary mode must serialize with JSON.stringify.");
  check(assertionsText.includes("checksExecuted === 0"), "Shared validation assertions must fail when checksExecuted === 0.");

  for (const criticalValidator of [
    "scripts/validate-guided-docs.mjs",
    "scripts/validate-css-sass-inspector-surface.mjs",
    "scripts/validate-authored-style-matching.mjs"
  ]) {
    const text = readText(criticalValidator);
    check(text.includes("finishValidation"), `${criticalValidator} must call finishValidation.`);
    check(text.includes("recordCheck") || text.includes("assertFileIncludes"), `${criticalValidator} must use shared assertions that increment checksExecuted.`);
  }

  for (const token of [
    "PASS",
    "FAIL",
    "SKIPPED",
    "raw",
    "plain",
    "unicode",
    "json-summary",
    "NO_COLOR",
    "ANSI",
    "npm --silent",
    "node scripts/validate-local-quick.mjs --json-summary",
    "validate:local:quick:json"
  ]) {
    check(validationSystemDocs.includes(token), `validation-system.md must preserve reporter contract token: ${token}`);
  }

  const dependencyText = `${packageText}\n${componentsText}\n${reporterText}`;
  for (const dependencyName of ["chalk", "ora", "cli-progress", "kleur", "picocolors"]) {
    check(!dependencyText.includes(dependencyName), `Validation color rendering must not depend on ${dependencyName}.`);
  }

  const scriptFiles = collectFiles(path.join(cwd, "scripts"), ".mjs");
  for (const absolutePath of scriptFiles) {
    const relativePath = path.relative(cwd, absolutePath).replace(/\\/g, "/");
    const text = fs.readFileSync(absolutePath, "utf8");
    filesChecked.add(relativePath);
    const processErrors = validateToolingProcessSource(relativePath, text);
    check(processErrors.length === 0, processErrors.join("; "));
  }

  if (baseline) {
    const allowedVersionPaths = new Set([
      "config/project-baseline.json",
      ".nvmrc",
      "package.json",
      "package-lock.json",
      "README.md",
      "docs/development.md"
    ]);
    const versionTokens = [...new Set([baseline.node.baseline, baseline.electron.version, baseline.electron.embeddedNode, baseline.electron.chromium])];
    for (const absolutePath of collectFiles(cwd, null, [".git", "node_modules", "dist", ".tmp"])) {
      const relativePath = path.relative(cwd, absolutePath).replace(/\\/g, "/");
      if (allowedVersionPaths.has(relativePath) || relativePath.startsWith("tests/")) continue;
      if (!/\.(?:mjs|js|cjs|json|md|ts|scss|html)$/.test(relativePath)) continue;
      const text = stripGeneratedBlocks(fs.readFileSync(absolutePath, "utf8"));
      for (const token of versionTokens) check(!text.includes(token), `${relativePath} must derive baseline token ${token} instead of hard-coding it.`);
    }
  }

  const metadataCheck = synchronizeProjectMetadata({ projectRoot: cwd, write: false, checkGit: false });
  check(metadataCheck.status === "PASS", `Generated metadata must be synchronized: ${metadataCheck.errors.join("; ") || metadataCheck.changedFiles.join(", ")}`);

  if (checksExecuted === 0) errors.push("validate-validation-system must execute at least one check.");
  return { filesChecked: filesChecked.size, checksExecuted, errors };
}

function collectFiles(root, extension = null, ignoredDirectories = []) {
  const output = [];
  if (!fs.existsSync(root)) return output;
  const ignored = new Set(ignoredDirectories);
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory() && ignored.has(entry.name)) continue;
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...collectFiles(absolutePath, extension, ignoredDirectories));
    else if (entry.isFile() && (!extension || entry.name.endsWith(extension))) output.push(absolutePath);
  }
  return output;
}

export function stripGeneratedBlocks(text) {
  return text.replace(
    /<!-- crystal-generated:([a-z0-9-]+):start -->[\s\S]*?<!-- crystal-generated:\1:end -->/g,
    ""
  );
}

export function validateToolingProcessSource(relativePath, text) {
  const errors = [];
  const childProcessModule = ["node", "child_process"].join(":");
  if (/shell\s*:\s*true/.test(text)) errors.push(`${relativePath} must not enable child-process shell execution.`);
  if (text.includes(childProcessModule) && relativePath !== "scripts/tooling/process-runner.mjs") {
    errors.push(`${relativePath} duplicates child-process execution outside process-runner.mjs.`);
  }
  return errors;
}
