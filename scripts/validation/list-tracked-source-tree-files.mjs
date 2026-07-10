import path from "node:path";
import { runExecutable } from "../tooling/process-runner.mjs";

const GIT_ARGS = Object.freeze(["ls-files", "-z", "--", "apps", "packages"]);

export function listTrackedSourceTreeFiles(options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const run = options.runExecutable ?? runExecutable;
  const result = run("git", [...GIT_ARGS], {
    cwd: projectRoot,
    env: options.env ?? process.env
  });

  if (result.status !== 0 || result.failureType) {
    return enumerationFailure(result);
  }

  const parsed = parseTrackedSourceTreeOutput(result.stdout);
  if (!parsed.ok) {
    return {
      status: "FAIL",
      files: [],
      violation: {
        code: "tracked-file-enumeration-failed",
        path: "<git-index>",
        reason: parsed.reason
      }
    };
  }

  return { status: "PASS", files: parsed.files, violation: null };
}

export function parseTrackedSourceTreeOutput(output) {
  if (typeof output !== "string") {
    return { ok: false, files: [], reason: "Git tracked-file output must be text." };
  }
  if (output === "") return { ok: true, files: [] };
  if (!output.endsWith("\0")) {
    return { ok: false, files: [], reason: "Git returned truncated NUL-delimited tracked-file output." };
  }
  const files = output.slice(0, -1).split("\0");
  if (files.some((file) => file.length === 0)) {
    return { ok: false, files: [], reason: "Git returned malformed NUL-delimited tracked-file output." };
  }
  return { ok: true, files };
}

function enumerationFailure(result) {
  const detail = result.failureType
    ? `Git tracked-file enumeration failed with ${result.failureType}.`
    : `Git tracked-file enumeration exited with status ${result.status ?? "unknown"}.`;
  return {
    status: "FAIL",
    files: [],
    violation: {
      code: "tracked-file-enumeration-failed",
      path: "<git-index>",
      reason: detail
    }
  };
}
