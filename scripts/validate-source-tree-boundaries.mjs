import path from "node:path";
import { fileURLToPath } from "node:url";
import { listTrackedSourceTreeFiles } from "./validation/list-tracked-source-tree-files.mjs";
import { sortSourceTreeViolations, validateSourceTreePaths } from "./validation/source-tree-boundary-policy.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultProjectRoot = path.resolve(path.dirname(scriptPath), "..");
const isMain = path.resolve(process.argv[1] ?? "") === scriptPath;

export function runSourceTreeBoundaryValidation(options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? defaultProjectRoot);
  const args = options.args ?? [];
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const listFiles = options.listTrackedSourceTreeFiles ?? listTrackedSourceTreeFiles;

  if (args.length > 0) {
    const result = {
      status: "FAIL",
      filesChecked: 0,
      duplicatePathCount: 0,
      violations: [{
        code: "unclassified-source-path",
        path: "<arguments>",
        reason: "validate-source-tree-boundaries does not accept command-line arguments."
      }]
    };
    renderResult(result, stdout, stderr);
    return result;
  }

  const enumeration = listFiles({ projectRoot });
  if (enumeration.status !== "PASS") {
    const result = {
      status: "FAIL",
      filesChecked: 0,
      duplicatePathCount: 0,
      violations: sortSourceTreeViolations([enumeration.violation])
    };
    renderResult(result, stdout, stderr);
    return result;
  }

  const evaluation = validateSourceTreePaths(enumeration.files);
  const result = {
    status: evaluation.status,
    filesChecked: evaluation.uniquePathCount,
    duplicatePathCount: evaluation.duplicatePathCount,
    violations: evaluation.violations
  };
  renderResult(result, stdout, stderr);
  return result;
}

export function renderSourceTreeBoundaryResult(result) {
  const lines = [
    "Source tree boundary validation",
    `Tracked files checked: ${result.filesChecked}`,
    `Duplicate paths ignored: ${result.duplicatePathCount}`
  ];
  if (result.violations.length > 0) {
    lines.push("Violations:");
    for (const item of result.violations) {
      lines.push(`- [${item.code}] ${item.path}: ${item.reason}`);
    }
  }
  lines.push(`Result: ${result.status}`);
  return `${lines.join("\n")}\n`;
}

function renderResult(result, stdout, stderr) {
  const writer = result.status === "PASS" ? stdout : stderr;
  writer.write(renderSourceTreeBoundaryResult(result));
}

if (isMain) {
  const result = runSourceTreeBoundaryValidation({ args: process.argv.slice(2) });
  process.exitCode = result.status === "PASS" ? 0 : 1;
}
