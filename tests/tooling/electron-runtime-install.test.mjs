import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inspectElectronRuntime, installElectronRuntime } from "../../scripts/install-electron-runtime.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function fixture(options = {}) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "crystal-electron-runtime-"));
  const electronRoot = path.join(projectRoot, "node_modules", "electron");
  const distRoot = path.join(electronRoot, "dist");
  fs.mkdirSync(distRoot, { recursive: true });

  if (options.pathText !== undefined) fs.writeFileSync(path.join(electronRoot, "path.txt"), options.pathText);
  if (options.executable) fs.writeFileSync(path.join(distRoot, options.executable), "fixture");
  if (options.installer !== false) {
    fs.writeFileSync(path.join(electronRoot, "install.js"), installerFixtureSource(), "utf8");
  }

  return {
    projectRoot,
    electronRoot,
    cleanup() { fs.rmSync(projectRoot, { recursive: true, force: true }); }
  };
}

function installerFixtureSource() {
  return `const fs = require("node:fs");
const path = require("node:path");
const countFile = path.join(__dirname, "install-count.txt");
const count = fs.existsSync(countFile) ? Number(fs.readFileSync(countFile, "utf8")) : 0;
fs.writeFileSync(countFile, String(count + 1));
const executable = process.platform === "win32" ? "electron.exe" : "electron";
fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "path.txt"), executable + "\\n");
fs.writeFileSync(path.join(__dirname, "dist", executable), "fixture");
`;
}

function installCount(electronRoot) {
  const countFile = path.join(electronRoot, "install-count.txt");
  return fs.existsSync(countFile) ? Number(fs.readFileSync(countFile, "utf8")) : 0;
}

const quietLogger = { log() {}, error() {} };

for (const testCase of [
  { name: "runtime absent", options: {} },
  { name: "empty path.txt", options: { pathText: "\n" } },
  { name: "referenced executable missing", options: { pathText: "missing-electron\n" } }
]) {
  test(`repairs ${testCase.name} with the locked local installer`, () => {
    const current = fixture(testCase.options);
    try {
      const result = installElectronRuntime({ projectRoot: current.projectRoot, logger: quietLogger, inherit: false });
      assert.equal(result.status, "installed");
      assert.equal(result.installed, true);
      assert.equal(inspectElectronRuntime({ projectRoot: current.projectRoot }).ready, true);
      assert.equal(installCount(current.electronRoot), 1);
    } finally {
      current.cleanup();
    }
  });
}

test("is idempotent after the runtime becomes ready", () => {
  const current = fixture();
  try {
    const first = installElectronRuntime({ projectRoot: current.projectRoot, logger: quietLogger, inherit: false });
    const second = installElectronRuntime({ projectRoot: current.projectRoot, logger: quietLogger, inherit: false });
    assert.equal(first.status, "installed");
    assert.equal(second.status, "ready");
    assert.equal(second.installed, false);
    assert.equal(installCount(current.electronRoot), 1);
  } finally {
    current.cleanup();
  }
});

test("fails explicitly when the locked install.js is missing", () => {
  const current = fixture({ installer: false });
  try {
    assert.throws(
      () => installElectronRuntime({ projectRoot: current.projectRoot, logger: quietLogger, inherit: false }),
      /locked installer is missing: .*install\.js/i
    );
  } finally {
    current.cleanup();
  }
});

test("fails explicitly when ELECTRON_SKIP_BINARY_DOWNLOAD is enabled", () => {
  const current = fixture();
  try {
    assert.throws(
      () => installElectronRuntime({
        projectRoot: current.projectRoot,
        env: { ...process.env, ELECTRON_SKIP_BINARY_DOWNLOAD: "1" },
        logger: quietLogger,
        inherit: false
      }),
      /ELECTRON_SKIP_BINARY_DOWNLOAD is enabled/
    );
    assert.equal(installCount(current.electronRoot), 0);
  } finally {
    current.cleanup();
  }
});

test("root lifecycle and workflow wire the repository installer", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));
  const workflow = fs.readFileSync(path.join(repositoryRoot, ".github", "workflows", "validation.yml"), "utf8");

  assert.equal(packageJson.scripts?.["install:electron-runtime"], "node scripts/install-electron-runtime.mjs");
  assert.equal(packageJson.scripts?.postinstall, "node scripts/install-electron-runtime.mjs");
  assert.match(workflow, /run:\s*npm ci --foreground-scripts/);
  assert.doesNotMatch(workflow, /npx\s+--no-install\s+install-electron/);
});

test("doctor remains diagnostic-only", () => {
  const source = fs.readFileSync(path.join(repositoryRoot, "scripts", "doctor-electron.mjs"), "utf8");
  assert.doesNotMatch(source, /installElectronRuntime|install-electron-runtime\.mjs|electron[\\/]install\.js/);
});
