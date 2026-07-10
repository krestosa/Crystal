import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateProjectBaseline } from "../../scripts/project-metadata/project-baseline.mjs";
import { synchronizeProjectMetadata, renderValidationCatalog } from "../../scripts/project-metadata/project-metadata-sync.mjs";
import { replaceGeneratedBlock, validateGeneratedMarkers } from "../../scripts/project-metadata/generated-blocks.mjs";
import { evaluateChangePolicy, detectBranch, parseNameStatus, runChangePolicy } from "../../scripts/validate-change-policy.mjs";
import { validateMarkdownText } from "../../scripts/validate-markdown-integrity.mjs";
import { runExecutable } from "../../scripts/tooling/process-runner.mjs";
import { parseValidationRunnerFlags } from "../../scripts/validation/validation-runner.mjs";
import { resolveColorEnabled, resolveRenderMode } from "../../scripts/validation/validation-render-mode.mjs";
import { colorize, padEndVisible, renderDurationBarChart, stripAnsi, truncateVisible, visibleLength } from "../../scripts/validation/validation-terminal-components.mjs";
import { summarizePerformance } from "../../scripts/validation/validation-performance.mjs";
import { getGeneratedValidationScripts, validationCatalog } from "../../scripts/validation/validation-suite.mjs";
import { stripGeneratedBlocks, validateToolingProcessSource } from "../../scripts/validation/validation-meta.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crystal-tooling-"));
  fs.mkdirSync(path.join(root, "config"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs", "architecture"), { recursive: true });
  fs.writeFileSync(path.join(root, "config", "project-baseline.json"), JSON.stringify({
    schemaVersion: 1,
    node: { baseline: "24.18.0", engine: ">=24.18.0 <25" },
    npm: { engine: ">=10.0.0" },
    electron: { version: "43.1.0", packageRange: "^43.1.0", embeddedNode: "24.18.0", chromium: "150.0.7871.47" }
  }, null, 2) + "\n");
  fs.writeFileSync(path.join(root, "config", "project-metadata-consumers.json"), JSON.stringify({
    schemaVersion: 1,
    consumers: [
      { field: "node.baseline", kind: "generated-file", path: ".nvmrc" },
      { field: "node.engine", kind: "generated-json", path: "package.json", targetPath: ["engines", "node"] },
      { field: "node.engine", kind: "generated-json", path: "package-lock.json", targetPath: ["packages", "", "engines", "node"] },
      { field: "node.baseline", kind: "generated-document", path: "README.md", block: "toolchain" },
      { field: "node.baseline", kind: "generated-document", path: "docs/development.md", block: "toolchain" }
    ]
  }, null, 2) + "\n");
  fs.writeFileSync(path.join(root, ".nvmrc"), "24.18.0\n");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "crystal",
    version: "0.0.0",
    private: true,
    workspaces: ["apps/*", "packages/*"],
    scripts: { ...getGeneratedValidationScripts(validationCatalog), typecheck: "tsc --noEmit" },
    devDependencies: { "@types/node": "^24.13.3", electron: "^43.1.0", "custom-tool": "^1.0.0" },
    engines: { node: ">=24.18.0 <25", npm: ">=10.0.0" }
  }, null, 2) + "\n");
  fs.writeFileSync(path.join(root, "package-lock.json"), JSON.stringify({
    name: "crystal",
    version: "0.0.0",
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {
        name: "crystal",
        version: "0.0.0",
        workspaces: ["apps/*", "packages/*"],
        devDependencies: { "@types/node": "^24.13.3", electron: "^43.1.0", "custom-tool": "^1.0.0" },
        engines: { node: ">=24.18.0 <25", npm: ">=10.0.0" }
      },
      "node_modules/@types/node": { version: "24.13.3", integrity: "types-integrity" },
      "node_modules/electron": { version: "43.1.0", integrity: "electron-integrity" },
      "node_modules/custom-tool": { version: "1.0.0", integrity: "custom-integrity" },
      "node_modules/transitive": { version: "1.2.3", integrity: "keep-me" }
    }
  }, null, 2) + "\n");
  fs.writeFileSync(path.join(root, "README.md"), "# Fixture\n\n<!-- crystal-generated:toolchain:start -->\nstale\n<!-- crystal-generated:toolchain:end -->\n");
  fs.writeFileSync(path.join(root, "docs", "development.md"), "# Development\n\n<!-- crystal-generated:toolchain:start -->\nstale\n<!-- crystal-generated:toolchain:end -->\n");
  fs.writeFileSync(path.join(root, "docs", "architecture", "validation-system.md"), "# Validation\n\n<!-- crystal-generated:validation-catalog:start -->\nstale\n<!-- crystal-generated:validation-catalog:end -->\n");
  return root;
}


function runValidationHarness({ checks, packageScripts = {}, files = {}, options = {} }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crystal-runner-"));
  try {
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ type: "module", scripts: packageScripts }, null, 2) + "\n");
    for (const [relativePath, content] of Object.entries(files)) {
      const absolutePath = path.join(root, relativePath);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, content);
    }
    const runnerUrl = pathToFileURL(path.join(repositoryRoot, "scripts", "validation", "validation-runner.mjs")).href;
    const harness = [
      `import { runValidationSuite } from ${JSON.stringify(runnerUrl)};`,
      `const checks = ${JSON.stringify(checks)};`,
      `runValidationSuite(checks, ${JSON.stringify({ jsonSummary: true, noProgress: true, suiteName: "fixture", ...options, cwd: root })});`
    ].join("\n");
    return runExecutable(process.execPath, ["--input-type=module", "-e", harness], { cwd: root });
  } finally {
    cleanup(root);
  }
}

function readFixtureJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

test("consistent baseline passes and write is idempotent", () => {
  const root = createFixture();
  try {
    const first = synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
    assert.equal(first.status, "PASS");
    assert.ok(first.changedFiles.includes("README.md"));
    const second = synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
    assert.deepEqual(second.changedFiles, []);
    assert.equal(synchronizeProjectMetadata({ projectRoot: root, write: false, checkGit: false }).status, "PASS");
  } finally {
    cleanup(root);
  }
});

test("stale .nvmrc fails check and write repairs it", () => {
  const root = createFixture();
  try {
    synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
    fs.writeFileSync(path.join(root, ".nvmrc"), "22.0.0\n");
    const check = synchronizeProjectMetadata({ projectRoot: root, write: false, checkGit: false });
    assert.equal(check.status, "FAIL");
    assert.ok(check.changedFiles.includes(".nvmrc"));
    synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
    assert.equal(fs.readFileSync(path.join(root, ".nvmrc"), "utf8"), "24.18.0\n");
  } finally {
    cleanup(root);
  }
});

test("lockfile root drift is repaired without changing transitive nodes", () => {
  const root = createFixture();
  try {
    synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
    const lockPath = path.join(root, "package-lock.json");
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    lock.packages[""].engines.node = ">=22.0.0";
    const transitive = structuredClone(lock.packages["node_modules/transitive"]);
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
    assert.equal(synchronizeProjectMetadata({ projectRoot: root, write: false, checkGit: false }).status, "FAIL");
    assert.equal(synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false }).status, "PASS");
    const repaired = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    assert.equal(repaired.packages[""].engines.node, ">=24.18.0 <25");
    assert.deepEqual(repaired.packages["node_modules/transitive"], transitive);
  } finally {
    cleanup(root);
  }
});

test("incompatible direct dependency change does not fabricate lock graph", () => {
  const root = createFixture();
  try {
    const baselinePath = path.join(root, "config", "project-baseline.json");
    const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    baseline.electron.version = "44.0.0";
    baseline.electron.packageRange = "^44.0.0";
    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + "\n");
    const before = fs.readFileSync(path.join(root, "package-lock.json"), "utf8");
    const result = synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
    assert.equal(result.status, "FAIL");
    assert.match(result.hints.join("\n"), /npm install/);
    assert.equal(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"), before);
  } finally {
    cleanup(root);
  }
});



test("direct dependency range drift requires npm resolution when the lock graph is incompatible", () => {
  const root = createFixture();
  try {
    const packagePath = path.join(root, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    packageJson.devDependencies["custom-tool"] = "^2.0.0";
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + "\n");
    const before = fs.readFileSync(path.join(root, "package-lock.json"), "utf8");
    const result = synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
    assert.equal(result.status, "FAIL");
    assert.match(result.errors.join("\n"), /custom-tool/);
    assert.match(result.hints.join("\n"), /package-lock-only/);
    assert.equal(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"), before);
  } finally {
    cleanup(root);
  }
});

test("stale generated documentation block is detected and repaired", () => {
  const root = createFixture();
  try {
    const result = synchronizeProjectMetadata({ projectRoot: root, write: false, checkGit: false });
    assert.equal(result.status, "FAIL");
    assert.ok(result.changedFiles.includes("README.md"));
    synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
    assert.match(fs.readFileSync(path.join(root, "README.md"), "utf8"), /Node\.js local baseline/);
  } finally {
    cleanup(root);
  }
});

test("adding a validator to the canonical catalog changes generated documentation", () => {
  const extra = { ...validationCatalog[0], id: "fixture-validator", label: "Fixture Validator", npmScript: "validate:fixture" };
  const rendered = renderValidationCatalog([...validationCatalog, extra]);
  assert.match(rendered, /fixture-validator/);
  assert.match(rendered, /validate:fixture/);
});

test("Markdown integrity rejects control characters and broken fences", () => {
  assert.match(validateMarkdownText("# A\n\n`\b`\n", "control.md").join("\n"), /U\+0008/);
  assert.match(validateMarkdownText("# A\n\n```bash\necho hi\n", "fence.md").join("\n"), /unclosed/);
});

test("generated markers reject orphan and duplicate blocks", () => {
  assert.match(validateGeneratedMarkers("<!-- crystal-generated:x:start -->\n", "orphan.md").join("\n"), /orphan/);
  const duplicate = "<!-- crystal-generated:x:start -->\na\n<!-- crystal-generated:x:end -->\n<!-- crystal-generated:x:start -->\nb\n<!-- crystal-generated:x:end -->\n";
  assert.match(validateGeneratedMarkers(duplicate, "duplicate.md").join("\n"), /exactly one/);
  assert.throws(() => replaceGeneratedBlock("<!-- crystal-generated:x:start -->", "x", "body"));
});

test("change policy distinguishes docs and tooling branches", () => {
  const config = {
    policies: [
      { name: "documentation-only", branchPrefix: "docs/", allow: ["docs/**", "README.md"], denyExtensions: [".png", ".jpg", ".jpeg", ".svg"] },
      { name: "tooling", branchPrefix: "tooling/", allow: ["package-lock.json", "scripts/**"], denyExtensions: [] }
    ]
  };
  assert.equal(evaluateChangePolicy("docs/readme", [{ status: "M", statusToken: "M", path: "package-lock.json", oldPath: null }], config).errors.length, 1);
  assert.equal(evaluateChangePolicy("tooling/harden", [{ status: "M", statusToken: "M", path: "package-lock.json", oldPath: null }], config).errors.length, 0);
  assert.equal(evaluateChangePolicy("docs/readme", [{ status: "D", statusToken: "D", path: "packages/core/runtime.ts", oldPath: null }], config).errors.length, 1);
});

test("name-status parser keeps deletions and rename paths", () => {
  const changes = parseNameStatus("D\0packages/core/a.ts\0R100\0old.md\0docs/new.md\0");
  assert.deepEqual(changes, [
    { status: "D", statusToken: "D", oldPath: null, path: "packages/core/a.ts" },
    { status: "R", statusToken: "R100", oldPath: "old.md", path: "docs/new.md" }
  ]);
});

test("detached HEAD uses GITHUB_HEAD_REF and CI fails closed without branch", () => {
  assert.deepEqual(detectBranch({ env: { GITHUB_HEAD_REF: "docs/from-pr" }, projectRoot: os.tmpdir() }), { branch: "docs/from-pr", source: "GITHUB_HEAD_REF", detected: true });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crystal-policy-"));
  try {
    fs.mkdirSync(path.join(root, "config"));
    fs.writeFileSync(path.join(root, "config", "change-policy.json"), JSON.stringify({ schemaVersion: 1, policies: [] }));
    const result = runChangePolicy({ projectRoot: root, env: { CI: "true" }, strict: true });
    assert.equal(result.status, "FAIL");
  } finally {
    cleanup(root);
  }
});

test("process runner preserves spaces and shell metacharacters as arguments", () => {
  const values = ["with spaces", "&", "|", "^", '"', "'", "(parentheses)"];
  const result = runExecutable(process.execPath, ["-e", "console.log(JSON.stringify(process.argv.slice(1)))", ...values]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), values);
});

test("JSON project metadata output is pure and parseable", () => {
  const root = createFixture();
  try {
    synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
    const result = runExecutable(process.execPath, [path.join(repositoryRoot, "scripts", "sync-project-metadata.mjs"), "--check", "--json"], { cwd: root });
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /\u001B\[/);
    assert.equal(JSON.parse(result.stdout).status, "PASS");
  } finally {
    cleanup(root);
  }
});

test("simulated Node and Electron baseline update regenerates all derived metadata", () => {
  const root = createFixture();
  try {
    const baselinePath = path.join(root, "config", "project-baseline.json");
    const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    baseline.node.baseline = "24.19.0";
    baseline.node.engine = ">=24.19.0 <25";
    baseline.electron.version = "43.2.0";
    baseline.electron.packageRange = "^43.2.0";
    baseline.electron.embeddedNode = "24.19.0";
    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + "\n");
    const lockPath = path.join(root, "package-lock.json");
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    lock.packages["node_modules/electron"].version = "43.2.0";
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");

    const result = synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
    assert.equal(result.status, "PASS", result.errors.join("\n"));
    assert.equal(fs.readFileSync(path.join(root, ".nvmrc"), "utf8"), "24.19.0\n");
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const updatedLock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    assert.equal(packageJson.engines.node, ">=24.19.0 <25");
    assert.equal(packageJson.devDependencies.electron, "^43.2.0");
    assert.equal(updatedLock.packages[""].engines.node, ">=24.19.0 <25");
    assert.match(fs.readFileSync(path.join(root, "README.md"), "utf8"), /24\.19\.0/);
    assert.match(fs.readFileSync(path.join(root, "docs", "development.md"), "utf8"), /43\.2\.0/);
  } finally {
    cleanup(root);
  }
});

test("baseline schema rejects unknown versions and mismatched majors", () => {
  const invalid = {
    schemaVersion: 2,
    node: { baseline: "24.18.0", engine: ">=25.0.0 <26" },
    npm: { engine: ">=10.0.0" },
    electron: { version: "x", packageRange: "^43.1.0", embeddedNode: "22.0.0", chromium: "150.0.0" }
  };
  const errors = validateProjectBaseline(invalid).join("\n");
  assert.match(errors, /schemaVersion/);
  assert.match(errors, /must satisfy node\.engine/);
  assert.match(errors, /parseable semantic version/);
  assert.match(errors, /embeddedNode/);
});


test("meta validation rejects shell execution outside the process runner", () => {
  const source = 'import { spawnSync } from "node:child_process";\nspawnSync("tool", [], { shell: true });\n';
  const errors = validateToolingProcessSource("scripts/unsafe-launcher.mjs", source).join("\n");
  assert.match(errors, /shell execution/);
  assert.match(errors, /outside process-runner/);
});

test("hard-coded baseline scanning ignores generated blocks only", () => {
  const text = [
    "before 24.18.0",
    "<!-- crystal-generated:toolchain:start -->",
    "generated 24.18.0",
    "<!-- crystal-generated:toolchain:end -->",
    "after"
  ].join("\n");
  const stripped = stripGeneratedBlocks(text);
  assert.match(stripped, /before 24\.18\.0/);
  assert.doesNotMatch(stripped, /generated 24\.18\.0/);
});

test("removing a direct dependency requires npm and preserves the lock graph", () => {
  const root = createFixture();
  try {
    const packagePath = path.join(root, "package.json");
    const packageJson = readFixtureJson(root, "package.json");
    delete packageJson.devDependencies["custom-tool"];
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + "\n");
    const lockPath = path.join(root, "package-lock.json");
    const before = fs.readFileSync(lockPath, "utf8");
    const result = synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
    assert.equal(result.status, "FAIL");
    assert.match(result.errors.join("\n"), /orphaned direct dependency graph/);
    assert.match(result.hints.join("\n"), /npm install(?: --package-lock-only)?/);
    assert.equal(fs.readFileSync(lockPath, "utf8"), before);
  } finally {
    cleanup(root);
  }
});

test("an extra direct dependency in lockfile root requires npm", () => {
  const root = createFixture();
  try {
    const lockPath = path.join(root, "package-lock.json");
    const lock = readFixtureJson(root, "package-lock.json");
    lock.packages[""].devDependencies["extra-tool"] = "^1.0.0";
    lock.packages["node_modules/extra-tool"] = { version: "1.0.0", integrity: "extra-integrity" };
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
    const before = fs.readFileSync(lockPath, "utf8");
    const result = synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
    assert.equal(result.status, "FAIL");
    assert.match(result.errors.join("\n"), /extra-tool.*orphaned direct dependency graph/);
    assert.equal(fs.readFileSync(lockPath, "utf8"), before);
  } finally {
    cleanup(root);
  }
});

test("adding an unmanaged direct dependency does not fabricate lock metadata", () => {
  const root = createFixture();
  try {
    const packagePath = path.join(root, "package.json");
    const packageJson = readFixtureJson(root, "package.json");
    packageJson.devDependencies["new-tool"] = "^1.0.0";
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + "\n");
    const before = fs.readFileSync(path.join(root, "package-lock.json"), "utf8");
    const result = synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
    assert.equal(result.status, "FAIL");
    assert.match(result.errors.join("\n"), /new-tool.*missing from package-lock\.json root metadata/);
    assert.equal(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"), before);
  } finally {
    cleanup(root);
  }
});

test("unsupported unmanaged dependency ranges fail with an explicit npm instruction", async (t) => {
  const ranges = [
    "~1.0.0",
    "^1.0.0 || ^2.0.0",
    "workspace:*",
    "npm:alias-package@^1.0.0",
    "file:../custom-tool",
    "git+https://github.com/example/custom-tool.git"
  ];
  for (const range of ranges) {
    await t.test(range, () => {
      const root = createFixture();
      try {
        const packagePath = path.join(root, "package.json");
        const packageJson = readFixtureJson(root, "package.json");
        packageJson.devDependencies["custom-tool"] = range;
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + "\n");
        const before = fs.readFileSync(path.join(root, "package-lock.json"), "utf8");
        const result = synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
        assert.equal(result.status, "FAIL");
        assert.match(result.errors.join("\n"), /unsupported dependency range/);
        assert.match(`${result.errors.join("\n")}\n${result.hints.join("\n")}`, /run npm|npm install/);
        assert.equal(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"), before);
      } finally {
        cleanup(root);
      }
    });
  }
});

test("replaceGeneratedBlock preserves prefix and suffix byte for byte", () => {
  const prefix = "# Human heading\r\n\r\nBefore: café & symbols ^|()\r\n";
  const start = "<!-- crystal-generated:fixture:start -->";
  const end = "<!-- crystal-generated:fixture:end -->";
  const suffix = "\r\nAfter remains byte-identical.\r\n";
  const source = `${prefix}${start}\r\nstale\r\n${end}${suffix}`;
  const replaced = replaceGeneratedBlock(source, "fixture", "fresh\nbody", { filePath: "fixture.md" });
  assert.deepEqual(Buffer.from(replaced.slice(0, replaced.indexOf(start))), Buffer.from(prefix));
  assert.deepEqual(Buffer.from(replaced.slice(replaced.indexOf(end) + end.length)), Buffer.from(suffix));
});

test("generated markers reject nested blocks", () => {
  const nested = [
    "<!-- crystal-generated:outer:start -->",
    "<!-- crystal-generated:inner:start -->",
    "<!-- crystal-generated:inner:end -->",
    "<!-- crystal-generated:outer:end -->"
  ].join("\n");
  assert.match(validateGeneratedMarkers(nested, "nested.md").join("\n"), /nested generated block/);
});

test("NUL name-status parsing preserves paths with spaces", () => {
  const changes = parseNameStatus("M\0docs/path with spaces.md\0");
  assert.deepEqual(changes, [{ status: "M", statusToken: "M", oldPath: null, path: "docs/path with spaces.md" }]);
});

test("process runner preserves a standalone spaced argument", () => {
  const result = runExecutable(process.execPath, ["-e", "console.log(JSON.stringify(process.argv.slice(1)))", "alpha beta gamma"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), ["alpha beta gamma"]);
});

test("process runner preserves shell metacharacters and punctuation", () => {
  const values = ["&", "|", "^", '"quoted"', "'single'", "(parentheses)"];
  const result = runExecutable(process.execPath, ["-e", "console.log(JSON.stringify(process.argv.slice(1)))", ...values]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), values);
});

test("validation runner emits pure JSON and fail-fast records visible skips", () => {
  const result = runValidationHarness({
    packageScripts: { pass: "node pass.mjs", fail: "node fail.mjs", later: "node pass.mjs" },
    files: { "pass.mjs": "process.exit(0);\n", "fail.mjs": "process.exit(7);\n" },
    checks: [
      { id: "pass", label: "Pass", category: "validation", npmScript: "pass", required: true, executionMode: "direct-node", directScriptPath: "pass.mjs", command: process.execPath, args: ["pass.mjs"], displayCommand: "npm run pass" },
      { id: "fail", label: "Fail", category: "validation", npmScript: "fail", required: true, executionMode: "direct-node", directScriptPath: "fail.mjs", command: process.execPath, args: ["fail.mjs"], displayCommand: "npm run fail" },
      { id: "later", label: "Later", category: "validation", npmScript: "later", required: true, executionMode: "direct-node", directScriptPath: "pass.mjs", command: process.execPath, args: ["pass.mjs"], displayCommand: "npm run later" }
    ],
    options: { failFast: true }
  });
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stdout, /\u001B\[/);
  const json = JSON.parse(result.stdout);
  assert.equal(json.status, "FAIL");
  assert.equal(json.failed, 1);
  assert.equal(json.skipped, 1);
  assert.equal(json.results[1].failureType, "validator-failure");
  assert.equal(json.results[2].failureType, "skipped");
});

test("validation runner preserves all failure taxonomy values", () => {
  const pass = runValidationHarness({
    packageScripts: { pass: "node pass.mjs" },
    files: { "pass.mjs": "process.exit(0);\n" },
    checks: [{ id: "pass", label: "Pass", category: "validation", npmScript: "pass", required: true, executionMode: "direct-node", directScriptPath: "pass.mjs", command: process.execPath, args: ["pass.mjs"], displayCommand: "npm run pass" }]
  });
  assert.equal(JSON.parse(pass.stdout).results[0].failureType, "none");

  const missingNpm = runValidationHarness({
    checks: [{ id: "missing-npm", label: "Missing npm", category: "validation", npmScript: "missing", required: true, executionMode: "direct-node", directScriptPath: "missing.mjs", command: process.execPath, args: ["missing.mjs"], displayCommand: "npm run missing" }]
  });
  assert.equal(JSON.parse(missingNpm.stdout).results[0].failureType, "missing-npm-script");

  const missingDirect = runValidationHarness({
    packageScripts: { missing: "node missing.mjs" },
    checks: [{ id: "missing-direct", label: "Missing direct", category: "validation", npmScript: "missing", required: true, executionMode: "direct-node", directScriptPath: "missing.mjs", command: process.execPath, args: ["missing.mjs"], displayCommand: "npm run missing" }]
  });
  assert.equal(JSON.parse(missingDirect.stdout).results[0].failureType, "missing-direct-script");

  const commandExecution = runValidationHarness({
    packageScripts: { broken: "broken" },
    checks: [{ id: "broken", label: "Broken", category: "validation", npmScript: "broken", required: true, executionMode: "custom", directScriptPath: null, command: path.join(os.tmpdir(), "definitely-missing-crystal-command"), args: [], displayCommand: "broken" }]
  });
  assert.equal(JSON.parse(commandExecution.stdout).results[0].failureType, "command-execution");

  const skipped = runValidationHarness({
    checks: [{ id: "optional", label: "Optional", category: "validation", npmScript: "optional", required: false, executionMode: "direct-node", directScriptPath: "optional.mjs", command: process.execPath, args: ["optional.mjs"], displayCommand: "npm run optional" }],
    options: { allowSkips: true }
  });
  assert.equal(skipped.status, 0);
  assert.equal(JSON.parse(skipped.stdout).results[0].failureType, "skipped");
});

test("raw reporter output contains no ANSI escape sequences", () => {
  const reporterUrl = pathToFileURL(path.join(repositoryRoot, "scripts", "validation", "validation-reporter.mjs")).href;
  const snippet = `import { ValidationReporter } from ${JSON.stringify(reporterUrl)};\nconst r=new ValidationReporter({raw:true,noProgress:true});\nconst x={id:'x',label:'X',category:'validation',status:'PASS',durationMs:1,command:'x',executedCommand:'x',executionMode:'direct-node',exitCode:0,stdout:'',stderr:'',errors:[],hints:[],failureType:'none'};\nr.startSuite('Fixture',[x],{suiteName:'fixture'});r.completeStep(x,0,1);r.finalSummary([x],{}, {durationMs:1,suiteName:'fixture'});`;
  const result = runExecutable(process.execPath, ["--input-type=module", "-e", snippet], { env: { ...process.env, NO_COLOR: "1" } });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /\u001B\[/);
  assert.match(result.stdout, /^VALIDATION_START/m);
  assert.match(result.stdout, /^VALIDATION_RESULT/m);
});

test("shared assertions fail a validator that executes zero checks", () => {
  const assertionsUrl = pathToFileURL(path.join(repositoryRoot, "scripts", "validation", "validation-assertions.mjs")).href;
  const snippet = `import { createValidationContext, finishValidation } from ${JSON.stringify(assertionsUrl)}; finishValidation(createValidationContext('Zero fixture'));`;
  const result = runExecutable(process.execPath, ["--input-type=module", "-e", snippet]);
  assert.equal(result.status, 1);
  assert.match(`${result.stdout}\n${result.stderr}`, /Validator executed zero checks/);
});

test("runner flags preserve output, fail-fast, and color contracts", () => {
  const flags = parseValidationRunnerFlags(["--raw", "--plain", "--unicode", "--ascii", "--json-summary", "--verbose", "--compact", "--fail-fast", "--color", "--no-color"]);
  assert.equal(flags.raw, true);
  assert.equal(flags.plain, true);
  assert.equal(flags.unicode, true);
  assert.equal(flags.ascii, true);
  assert.equal(flags.jsonSummary, true);
  assert.equal(flags.verbose, true);
  assert.equal(flags.compact, true);
  assert.equal(flags.failFast, true);
  assert.equal(flags.color, true);
  assert.equal(flags.noColor, true);
  assert.equal(resolveRenderMode(flags, { isTTY: true, supportsUnicode: true }), "json-summary");
  assert.equal(resolveColorEnabled("raw", { color: true }, { canUseColor: true }), false);
  assert.equal(resolveColorEnabled("json-summary", { color: true }, { canUseColor: true }), false);
  assert.equal(resolveColorEnabled("unicode", { color: true }, { canUseColor: false }), true);
  assert.equal(resolveColorEnabled("unicode", { color: true, noColor: true }, { canUseColor: true }), false);
});

test("ANSI helpers preserve visible width and no-color output", () => {
  const colored = colorize("PASS", "green", { color: true });
  assert.equal(stripAnsi(colored), "PASS");
  assert.equal(visibleLength(colored), 4);
  assert.equal(visibleLength(padEndVisible(colored, 8)), 8);
  assert.equal(truncateVisible(colored + "-long", 5), "PASS…");
  assert.equal(colorize("PASS", "green", { color: false }), "PASS");
});

test("performance output ranks and labels the slowest check", () => {
  const results = [
    { id: "slow", label: "Slow", status: "PASS", durationMs: 20, executionMode: "direct-node", executedCommand: "node slow" },
    { id: "fast", label: "Fast", status: "PASS", durationMs: 2, executionMode: "direct-node", executedCommand: "node fast" }
  ];
  const summary = summarizePerformance(results, { durationMs: 22, topSlowest: 2 });
  assert.equal(summary.slowestCheck.id, "slow");
  const chart = renderDurationBarChart("Slowest checks", summary.slowestChecks, { plain: true });
  assert.match(chart, /01/);
  assert.match(chart, /slowest/);
  assert.match(chart, /-/);
});

test("critical validators retain shared assertions and finishValidation", () => {
  for (const relativePath of [
    "scripts/validate-guided-docs.mjs",
    "scripts/validate-css-sass-inspector-surface.mjs",
    "scripts/validate-authored-style-matching.mjs"
  ]) {
    const text = fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
    assert.match(text, /finishValidation/);
    assert.match(text, /recordCheck|assertFileIncludes/);
  }
});
