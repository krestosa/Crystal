import fs from "node:fs";
import path from "node:path";

export function createValidationContext(label, options = {}) {
  return {
    label,
    repoRoot: options.repoRoot ?? process.cwd(),
    errors: [],
    warnings: [],
    filesChecked: new Set(),
    checksExecuted: 0
  };
}

export function recordCheck(context, label = "check") {
  context.checksExecuted += 1;
  return label;
}

export function toAbsolutePath(context, filePath) {
  return path.join(context.repoRoot, filePath);
}

export function assertFileExists(context, filePath) {
  recordCheck(context, `file exists: ${filePath}`);
  const absolutePath = toAbsolutePath(context, filePath);
  if (!fs.existsSync(absolutePath)) {
    context.errors.push({ kind: "missing file", file: filePath, condition: "required file must exist", message: `Missing required file: ${filePath}` });
    return false;
  }
  context.filesChecked.add(filePath);
  return true;
}

export function readRequiredFile(context, filePath) {
  if (!assertFileExists(context, filePath)) return "";
  return fs.readFileSync(toAbsolutePath(context, filePath), "utf8");
}

export function assertFileIncludes(context, filePath, content, token, label = "required token") {
  recordCheck(context, `${filePath} includes ${label}`);
  if (!content.includes(token)) {
    context.errors.push({ kind: "missing token", file: filePath, condition: label, token, message: `${filePath} must include:\n  ${token}` });
  }
}

export function assertFileExcludes(context, filePath, content, token, label = "forbidden token") {
  recordCheck(context, `${filePath} excludes ${label}`);
  if (content.includes(token)) {
    context.errors.push({ kind: "forbidden token", file: filePath, condition: label, token, message: `${filePath} contains forbidden token:\n  ${token}` });
  }
}

export function assertPatternAbsent(context, filePath, content, pattern, label) {
  recordCheck(context, `${filePath} excludes ${label}`);
  if (pattern.test(content)) {
    context.errors.push({ kind: "forbidden token", file: filePath, condition: label, token: String(pattern), message: `${filePath} contains forbidden ${label}: ${String(pattern)}` });
  }
}

export function assertPackageScript(context, packageJson, scriptName) {
  recordCheck(context, `package script exists: ${scriptName}`);
  if (!packageJson.scripts || typeof packageJson.scripts[scriptName] !== "string") {
    context.errors.push({ kind: "package script missing", file: "package.json", condition: "npm script must exist", token: scriptName, message: `Missing npm script: ${scriptName}` });
  }
}

export function assertNoForbiddenTokens(context, files, forbiddenTokens) {
  for (const file of files) {
    const content = readRequiredFile(context, file);
    for (const token of forbiddenTokens) {
      const label = typeof token === "string" ? token : token.label;
      const pattern = typeof token === "string" ? null : token.pattern;
      if (pattern) assertPatternAbsent(context, file, content, pattern, label);
      else assertFileExcludes(context, file, content, token, label);
    }
  }
}

export function parsePackageJson(context, content) {
  recordCheck(context, "package.json parses as JSON");
  try {
    return JSON.parse(content);
  } catch {
    context.errors.push({ kind: "package json invalid", file: "package.json", condition: "package.json must parse", message: "package.json is not valid JSON." });
    return {};
  }
}

export function pushValidationError(context, error) {
  context.errors.push(typeof error === "string" ? { kind: "validation error", message: error } : error);
}

export function pushValidationWarning(context, warning) {
  context.warnings.push(warning);
}

export function finishValidation(context, options = {}) {
  if (context.checksExecuted === 0) {
    context.errors.push({ kind: "zero checks", condition: "validator must execute at least one check", message: "Validator executed zero checks." });
  }

  const filesChecked = context.filesChecked.size;
  if (context.errors.length > 0) {
    console.error(`FAIL ${context.label}`);
    console.error(`Files checked: ${filesChecked}`);
    console.error(`Checks executed: ${context.checksExecuted}`);
    if (context.warnings.length > 0) {
      console.error("Warnings:");
      for (const warning of context.warnings) console.error(`- ${warning}`);
    }
    console.error("Errors:");
    for (const error of context.errors) console.error(`- ${formatValidationError(error)}`);
    console.error("");
    console.error("How to inspect:");
    for (const hint of options.inspectHints ?? defaultInspectHints()) console.error(`- ${hint}`);
    console.error("");
    console.error("Likely resolution:");
    for (const hint of options.resolutionHints ?? defaultResolutionHints()) console.error(`- ${hint}`);
    console.error("");
    console.error("Do not:");
    for (const item of options.doNotHints ?? defaultDoNotHints()) console.error(`- ${item}`);
    console.error("");
    console.error("Result: FAIL");
    process.exit(1);
  }

  console.log(context.label);
  console.log(`Files checked: ${filesChecked}`);
  console.log(`Checks executed: ${context.checksExecuted}`);
  if (context.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of context.warnings) console.log(`- ${warning}`);
  }
  console.log("Result: PASS");
}

function formatValidationError(error) {
  if (typeof error === "string") return error;
  const parts = [];
  if (error.message) parts.push(error.message);
  if (error.kind) parts.push(`kind: ${error.kind}`);
  if (error.file) parts.push(`file: ${error.file}`);
  if (error.condition) parts.push(`condition: ${error.condition}`);
  if (error.token) parts.push(`token: ${error.token}`);
  return parts.join(" | ");
}

function defaultInspectHints() {
  return ["Open the reported file.", "Search for the exact reported token or condition.", "Re-run the same npm validation command."];
}

function defaultResolutionHints() {
  return ["Restore the required contract, token, wiring, or documentation boundary.", "Keep the validator strict and deterministic."];
}

function defaultDoNotHints() {
  return ["Do not relax this validator.", "Do not move required runtime tokens only to docs.", "Do not claim that validation applied a fix."];
}
