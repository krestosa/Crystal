import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  classifySourceTreePath,
  normalizeRepositoryPath,
  sortSourceTreeViolations,
  validateSourceTreePaths
} from "../../scripts/validation/source-tree-boundary-policy.mjs";
import {
  listTrackedSourceTreeFiles,
  parseTrackedSourceTreeOutput
} from "../../scripts/validation/list-tracked-source-tree-files.mjs";
import { runSourceTreeBoundaryValidation } from "../../scripts/validate-source-tree-boundaries.mjs";
import { runExecutable } from "../../scripts/tooling/process-runner.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function silence() {
  return { write() {} };
}

function violationCodes(paths) {
  return validateSourceTreePaths(paths).violations.map((item) => item.code);
}

test("approved application and package owners pass", () => {
  const result = validateSourceTreePaths([
    "apps/desktop/package.json",
    "apps/desktop/electron/main/main.ts",
    "apps/desktop/electron/preload/preload.ts",
    "apps/desktop/electron/renderer/main.ts",
    "packages/core/state/app-state.ts",
    "packages/shared/constants/ipc.constants.ts",
    "packages/adapters/file-system/file-system.adapter.ts"
  ]);
  assert.equal(result.status, "PASS");
  assert.deepEqual(result.violations, []);
});

test("desktop metadata exception is exact", () => {
  assert.equal(classifySourceTreePath("apps/desktop/package.json"), null);
  assert.deepEqual(violationCodes(["apps/desktop/config.json"]), ["unknown-desktop-root"]);
  assert.deepEqual(violationCodes(["apps/desktop/package-lock.json"]), ["unknown-desktop-root"]);
});

test("unknown roots and container files fail with repository-facing codes", () => {
  const result = validateSourceTreePaths([
    "apps/README.md",
    "apps/web/main.ts",
    "apps/desktop/browser/main.ts",
    "apps/desktop/electron/bootstrap.ts",
    "apps/desktop/electron/worker/index.ts",
    "packages/package.json",
    "packages/engine/preview/preview-engine.ts",
    "packages/build-tools/ts-bundler/ts-bundler.ts",
    "packages/runtime/index.ts"
  ]);
  assert.deepEqual(result.violations.map(({ code, path }) => ({ code, path })), [
    { code: "unknown-desktop-root", path: "apps/desktop/browser/main.ts" },
    { code: "misplaced-product-source", path: "apps/desktop/electron/bootstrap.ts" },
    { code: "unknown-electron-runtime-root", path: "apps/desktop/electron/worker/index.ts" },
    { code: "misplaced-product-source", path: "apps/README.md" },
    { code: "unknown-app-root", path: "apps/web/main.ts" },
    { code: "unknown-package-root", path: "packages/build-tools/ts-bundler/ts-bundler.ts" },
    { code: "unknown-package-root", path: "packages/engine/preview/preview-engine.ts" },
    { code: "misplaced-product-source", path: "packages/package.json" },
    { code: "unknown-package-root", path: "packages/runtime/index.ts" }
  ]);
});

test("invalid repository paths fail without leaking NUL bytes", () => {
  const invalid = [
    "/packages/core/a.ts",
    "C:/packages/core/a.ts",
    "//server/share/apps/desktop/main.ts",
    "packages\\core\\a.ts",
    "packages/core/../engine/a.ts",
    "packages//core/a.ts",
    "packages/./core/a.ts",
    "packages/core/a.ts/",
    "packages/core/a\0b.ts",
    42,
    null
  ];
  const result = validateSourceTreePaths(invalid);
  assert.equal(result.violations.length, invalid.length);
  assert.ok(result.violations.every((item) => item.code === "invalid-repository-path"));
  assert.ok(result.violations.every((item) => !item.path.includes("\0")));
  assert.equal(normalizeRepositoryPath("packages/core/a.ts").ok, true);
});

test("duplicates are deduplicated before classification", () => {
  const input = Object.freeze([
    "packages/runtime/index.ts",
    "packages/runtime/index.ts",
    "packages/core/state.ts",
    "packages/core/state.ts"
  ]);
  const result = validateSourceTreePaths(input);
  assert.equal(result.duplicatePathCount, 2);
  assert.equal(result.uniquePathCount, 2);
  assert.deepEqual(result.violations.map((item) => item.path), ["packages/runtime/index.ts"]);
  assert.deepEqual(input, [
    "packages/runtime/index.ts",
    "packages/runtime/index.ts",
    "packages/core/state.ts",
    "packages/core/state.ts"
  ]);
});

test("violation ordering is deterministic and does not mutate input", () => {
  const violations = Object.freeze([
    Object.freeze({ code: "unknown-package-root", path: "packages/z/a.ts", reason: "z" }),
    Object.freeze({ code: "unknown-app-root", path: "apps/z/a.ts", reason: "a" }),
    Object.freeze({ code: "unknown-app-root", path: "apps/z/a.ts", reason: "b" })
  ]);
  const sorted = sortSourceTreeViolations(violations);
  assert.deepEqual(sorted.map((item) => `${item.path}:${item.reason}`), [
    "apps/z/a.ts:a",
    "apps/z/a.ts:b",
    "packages/z/a.ts:z"
  ]);
  assert.equal(violations[0].path, "packages/z/a.ts");
});

test("NUL tracked-file parsing accepts complete output and rejects truncation", () => {
  assert.deepEqual(parseTrackedSourceTreeOutput(""), { ok: true, files: [] });
  assert.deepEqual(
    parseTrackedSourceTreeOutput("apps/desktop/package.json\0packages/core/a.ts\0"),
    { ok: true, files: ["apps/desktop/package.json", "packages/core/a.ts"] }
  );
  assert.deepEqual(parseTrackedSourceTreeOutput("packages/core/a.ts"), {
    ok: false,
    files: [],
    reason: "Git returned truncated NUL-delimited tracked-file output."
  });
});

test("tracked-file enumeration uses the exact Git command without shell", () => {
  let invocation = null;
  const result = listTrackedSourceTreeFiles({
    projectRoot: repositoryRoot,
    runExecutable(command, args, options) {
      invocation = { command, args, options };
      return { status: 0, failureType: null, stdout: "packages/core/a.ts\0", stderr: "" };
    }
  });
  assert.equal(result.status, "PASS");
  assert.deepEqual(result.files, ["packages/core/a.ts"]);
  assert.equal(invocation.command, "git");
  assert.deepEqual(invocation.args, ["ls-files", "-z", "--", "apps", "packages"]);
  assert.equal(invocation.options.cwd, repositoryRoot);
});

test("Git failures remain enumeration failures without absolute-path leakage", () => {
  const secret = "C:\\private\\workspace\\Crystal";
  const result = listTrackedSourceTreeFiles({
    projectRoot: repositoryRoot,
    runExecutable() {
      return {
        status: 128,
        failureType: "PROCESS_EXIT_FAILURE",
        stdout: "",
        stderr: `fatal: ${secret}`
      };
    }
  });
  assert.equal(result.status, "FAIL");
  assert.equal(result.violation.code, "tracked-file-enumeration-failed");
  assert.doesNotMatch(result.violation.reason, /private|workspace|Crystal/);
});

test("tracked files fail while equivalent untracked files are ignored", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crystal-source-tree-"));
  try {
    assert.equal(runExecutable("git", ["init", "--quiet"], { cwd: root }).status, 0);
    fs.mkdirSync(path.join(root, "packages", "core"), { recursive: true });
    fs.writeFileSync(path.join(root, "packages", "core", "valid.ts"), "export {};\n");
    assert.equal(runExecutable("git", ["add", "packages/core/valid.ts"], { cwd: root }).status, 0);
    fs.mkdirSync(path.join(root, "packages", "runtime"), { recursive: true });
    fs.writeFileSync(path.join(root, "packages", "runtime", "ignored.ts"), "export {};\n");

    const beforeAdd = listTrackedSourceTreeFiles({ projectRoot: root });
    assert.deepEqual(beforeAdd.files, ["packages/core/valid.ts"]);
    assert.equal(validateSourceTreePaths(beforeAdd.files).status, "PASS");

    assert.equal(runExecutable("git", ["add", "packages/runtime/ignored.ts"], { cwd: root }).status, 0);
    const afterAdd = listTrackedSourceTreeFiles({ projectRoot: root });
    const evaluation = validateSourceTreePaths(afterAdd.files);
    assert.equal(evaluation.status, "FAIL");
    assert.equal(evaluation.violations[0].code, "unknown-package-root");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("CLI rejects arguments and renders through injected writers", () => {
  let stdout = "";
  let stderr = "";
  const result = runSourceTreeBoundaryValidation({
    args: ["--json"],
    stdout: { write(value) { stdout += value; } },
    stderr: { write(value) { stderr += value; } }
  });
  assert.equal(result.status, "FAIL");
  assert.equal(stdout, "");
  assert.match(stderr, /does not accept command-line arguments/);
});

test("the real selected-base source tree passes", () => {
  const result = runSourceTreeBoundaryValidation({
    projectRoot: repositoryRoot,
    args: [],
    stdout: silence(),
    stderr: silence()
  });
  assert.equal(result.status, "PASS", result.violations.map((item) => `${item.code} ${item.path}`).join("\n"));
});
