import fs from "node:fs";
import path from "node:path";
import {
  applyCatalogScripts,
  getGeneratedValidationScripts,
  validateValidationCatalog,
  validationCatalog
} from "./validation-suite.mjs";
import { validateWorkflowSecurity } from "./workflow-security.mjs";
import { readProjectBaseline } from "../project-metadata/project-baseline.mjs";
import { synchronizeProjectMetadata } from "../project-metadata/project-metadata-sync.mjs";
import { readProjectMetadataConsumers, validateProjectMetadataConsumers } from "../project-metadata/project-metadata-consumers.mjs";
import { readDocumentationContract } from "../project-metadata/configuration-schemas.mjs";
import { validateGeneratedMarkers } from "../project-metadata/generated-blocks.mjs";

const REQUIRED_TOOLING_TESTS = [
  "tests/tooling/tooling-hardening.test.mjs",
  "tests/tooling/validation-catalog.test.mjs",
  "tests/tooling/generated-markers.test.mjs",
  "tests/tooling/project-metadata-transaction.test.mjs",
  "tests/tooling/strict-cli.test.mjs",
  "tests/tooling/process-runner-hardening.test.mjs",
  "tests/tooling/configuration-schemas.test.mjs",
  "tests/tooling/markdown-links.test.mjs",
  "tests/tooling/change-policy-base.test.mjs",
  "tests/tooling/validation-workflow-security.test.mjs"
];

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
    filesChecked.add(relativePath);
    const absolutePath = path.join(cwd, relativePath);
    if (!fs.existsSync(absolutePath)) {
      errors.push(`${relativePath} must exist.`);
      return "";
    }
    return fs.readFileSync(absolutePath, "utf8");
  };
  const readJson = (relativePath, fallback = null) => {
    const text = readText(relativePath);
    if (!text) return fallback;
    try { return JSON.parse(text); } catch (error) { errors.push(`${relativePath} must parse as JSON: ${error.message}`); return fallback; }
  };

  const packageJson = readJson("package.json", { scripts: {} });
  const catalogErrors = validateValidationCatalog(validationCatalog, { projectRoot: cwd });
  check(catalogErrors.length === 0, catalogErrors.join("; "));
  const scriptResult = applyCatalogScripts(packageJson.scripts ?? {}, validationCatalog);
  check(scriptResult.errors.length === 0, scriptResult.errors.join("; "));
  for (const [name, command] of Object.entries(getGeneratedValidationScripts(validationCatalog))) {
    check(packageJson.scripts?.[name] === command, `package.json generated script ${name} must equal ${JSON.stringify(command)}.`);
  }
  for (const scriptName of [
    "sync:project-metadata", "validate:project-metadata", "validate:project-metadata:json",
    "validate:change-policy", "validate:markdown-integrity", "test:tooling-hardening",
    "validate:local:quick", "validate:local:quick:json", "validate:local:quick:verbose",
    "validate:local:quick:fail-fast", "validate:validation-system"
  ]) check(typeof packageJson.scripts?.[scriptName] === "string", `package.json must include script: ${scriptName}`);

  for (const item of validationCatalog) {
    if (item.executionMode !== "direct-node") continue;
    filesChecked.add(item.directScriptPath);
    check(fs.existsSync(path.join(cwd, item.directScriptPath)), `Direct validation script must exist: ${item.directScriptPath}`);
  }
  for (const relativePath of REQUIRED_TOOLING_TESTS) {
    filesChecked.add(relativePath);
    check(fs.existsSync(path.join(cwd, relativePath)), `${relativePath} must exist as a behavioral regression fixture.`);
  }

  try { readDocumentationContract(cwd); check(true, "documentation contract parses"); } catch (error) { check(false, error.message); }
  let baseline = null;
  try { baseline = readProjectBaseline({ projectRoot: cwd }); check(true, "project baseline parses"); } catch (error) { check(false, error.message); }
  let consumers = null;
  try { consumers = readProjectMetadataConsumers(cwd); check(true, "metadata consumers parse"); } catch (error) { check(false, error.message); }
  if (baseline && consumers) {
    const consumerErrors = validateProjectMetadataConsumers({ projectRoot: cwd, baseline, config: consumers });
    check(consumerErrors.length === 0, consumerErrors.join("; "));
  }

  const behaviorMatrix = readJson("docs/metadata/validation-behavior-contracts.json", {});
  check(behaviorMatrix.schemaVersion === 1, "validation behavior contract matrix must use schemaVersion 1.");
  check(Array.isArray(behaviorMatrix.behavioralContracts) && behaviorMatrix.behavioralContracts.length >= 15, "validation behavior matrix must register migrated behavioral contracts.");
  for (const contract of behaviorMatrix.behavioralContracts ?? []) {
    check(typeof contract.contract === "string" && contract.contract.length > 0, "Behavioral contract must define contract text.");
    check(contract.replacementType === "node:test behavioral fixture", `Behavioral contract ${contract.contract} must use node:test fixtures.`);
    check(typeof contract.fixture === "string" && fs.existsSync(path.join(cwd, contract.fixture)), `Behavioral fixture must exist: ${contract.fixture}`);
  }
  check(Array.isArray(behaviorMatrix.structuralContracts) && behaviorMatrix.structuralContracts.length > 0, "validation behavior matrix must document remaining structural checks.");

  const markdownFiles = ["README.md", ...collectFiles(path.join(cwd, "docs"), ".md").map((file) => path.relative(cwd, file).replace(/\\/g, "/"))];
  for (const relativePath of markdownFiles) {
    const text = readText(relativePath);
    const markerErrors = validateGeneratedMarkers(text, relativePath);
    check(markerErrors.length === 0, markerErrors.join("; "));
  }

  const workflowText = readText(".github/workflows/validation.yml");
  const workflowErrors = validateWorkflowSecurity(workflowText);
  check(workflowErrors.length === 0, workflowErrors.join("; "));

  const scriptFiles = collectFiles(path.join(cwd, "scripts"), ".mjs");
  for (const absolutePath of scriptFiles) {
    const relativePath = path.relative(cwd, absolutePath).replace(/\\/g, "/");
    const text = fs.readFileSync(absolutePath, "utf8");
    filesChecked.add(relativePath);
    const processErrors = validateToolingProcessSource(relativePath, text);
    check(processErrors.length === 0, processErrors.join("; "));
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
  return text.replace(/<!-- crystal-generated:([a-z0-9-]+):start -->[\s\S]*?<!-- crystal-generated:\1:end -->/g, "");
}

export function validateToolingProcessSource(relativePath, text) {
  const errors = [];
  const childProcessModule = ["node", "child_process"].join(":");
  if (/shell\s*:\s*true/.test(text)) errors.push(`${relativePath} must not enable child-process shell execution.`);
  if (text.includes(childProcessModule) && relativePath !== "scripts/tooling/process-runner.mjs") errors.push(`${relativePath} duplicates child-process execution outside process-runner.mjs.`);
  return errors;
}
