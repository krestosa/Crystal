import fs from "node:fs";
import path from "node:path";
import { localQuickValidationChecks } from "./validation-suite.mjs";

export const KNOWN_VALIDATION_CATEGORIES = new Set([
  "docs",
  "build",
  "typecheck",
  "core",
  "preview",
  "ui",
  "watch",
  "doctor",
  "validation"
]);

export function runValidationSystemMetaChecks(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const errors = [];
  const filesChecked = new Set();
  let checksExecuted = 0;

  const check = (condition, message) => {
    checksExecuted += 1;
    if (!condition) errors.push(message);
  };

  const readFile = (filePath) => {
    const absolutePath = path.join(cwd, filePath);
    filesChecked.add(filePath);
    if (!fs.existsSync(absolutePath)) {
      errors.push(`${filePath} must exist.`);
      return "";
    }
    return fs.readFileSync(absolutePath, "utf8");
  };

  const packageText = readFile("package.json");
  const packageJson = packageText ? JSON.parse(packageText) : { scripts: {} };
  const suiteText = readFile("scripts/validation/validation-suite.mjs");
  const runnerText = readFile("scripts/validation/validation-runner.mjs");
  const reporterText = readFile("scripts/validation/validation-reporter.mjs");
  const resultText = readFile("scripts/validation/validation-result.mjs");
  const assertionsText = readFile("scripts/validation/validation-assertions.mjs");
  const validationSystemDocs = readFile("docs/architecture/validation-system.md");

  for (const filePath of [
    "scripts/validate-local-quick.mjs",
    "scripts/validate-validation-system.mjs",
    "scripts/validation/validation-terminal-components.mjs",
    "scripts/validation/validation-terminal-capabilities.mjs",
    "scripts/validation/validation-render-mode.mjs",
    "scripts/validation/validation-performance.mjs",
    "scripts/validation/validation-meta.mjs"
  ]) {
    readFile(filePath);
  }

  for (const scriptName of [
    "validate:local:quick",
    "validate:local:quick:verbose",
    "validate:local:quick:fail-fast",
    "validate:validation-system"
  ]) {
    check(Boolean(packageJson.scripts?.[scriptName]), `package.json must include script: ${scriptName}`);
  }

  const ids = new Set();
  const labels = new Set();
  for (const validationCheck of localQuickValidationChecks) {
    check(Boolean(validationCheck.id), "Every validation check must define id.");
    check(!ids.has(validationCheck.id), `Validation check id must be unique: ${validationCheck.id}`);
    ids.add(validationCheck.id);

    check(Boolean(validationCheck.label), `Validation check ${validationCheck.id} must define label.`);
    check(!labels.has(validationCheck.label), `Validation check label must be unique: ${validationCheck.label}`);
    labels.add(validationCheck.label);

    check(Boolean(validationCheck.category), `Validation check ${validationCheck.id} must define category.`);
    check(KNOWN_VALIDATION_CATEGORIES.has(validationCheck.category), `Validation check ${validationCheck.id} uses unknown category: ${validationCheck.category}`);
    check(Object.prototype.hasOwnProperty.call(validationCheck, "required"), `Validation check ${validationCheck.id} must define required.`);
    check(Boolean(validationCheck.npmScript), `Validation check ${validationCheck.id} must define npmScript.`);
    check(Boolean(packageJson.scripts?.[validationCheck.npmScript]), `npmScript must exist in package.json: ${validationCheck.npmScript}`);
    check(validationCheck.displayCommand === `npm run ${validationCheck.npmScript}`, `displayCommand must match npmScript for ${validationCheck.id}.`);

    if (validationCheck.directScriptPath) {
      const scriptPath = validationCheck.directScriptPath;
      filesChecked.add(scriptPath);
      check(fs.existsSync(path.join(cwd, scriptPath)), `direct node script must exist for ${validationCheck.id}: ${scriptPath}`);
    }

    check(validationCheck.command !== "npm.cmd", `Validation check ${validationCheck.id} must not execute npm.cmd directly.`);
    check(validationCheck.commandMode !== "npm" || validationCheck.id === "typecheck", `Validation check ${validationCheck.id} uses npm wrapper where direct-node may be expected.`);
  }

  check(!suiteText.includes('command: "npm.cmd"'), "validation-suite.mjs must not hard-code npm.cmd.");
  check(!runnerText.includes("shell: true"), "validation-runner.mjs must not use shell: true.");

  for (const token of [
    "none",
    "command-execution",
    "missing-npm-script",
    "missing-direct-script",
    "validator-failure",
    "skipped"
  ]) {
    check(resultText.includes(token) || runnerText.includes(token), `validation failure type must be implemented: ${token}`);
  }

  for (const token of ["raw", "plain", "unicode", "noProgress", "verbose", "compact", "jsonSummary"]) {
    check(runnerText.includes(token) || reporterText.includes(token), `runner/reporter must implement output mode or flag: ${token}`);
  }

  for (const token of ["PASS", "FAIL", "SKIPPED", "raw", "plain", "unicode"]) {
    check(validationSystemDocs.includes(token), `validation-system.md must document token: ${token}`);
  }

  check(assertionsText.includes("checksExecuted === 0"), "validation assertions must fail when checksExecuted === 0.");

  for (const criticalValidator of [
    "scripts/validate-guided-docs.mjs",
    "scripts/validate-css-sass-inspector-surface.mjs"
  ]) {
    const text = readFile(criticalValidator);
    check(text.includes("finishValidation"), `${criticalValidator} must call finishValidation.`);
    check(text.includes("recordCheck") || text.includes("assertFileIncludes"), `${criticalValidator} must use shared assertions that increment checksExecuted.`);
  }

  if (checksExecuted === 0) errors.push("validate-validation-system must execute at least one check.");

  return {
    filesChecked: filesChecked.size,
    checksExecuted,
    errors
  };
}
