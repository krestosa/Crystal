import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { synchronizeProjectMetadata } from "../../scripts/project-metadata/project-metadata-sync.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const copyPaths = ["config/project-baseline.json", "config/project-metadata-consumers.json", "README.md", "docs/development.md", "docs/architecture/validation-system.md", "scripts/doctor-electron.mjs"];

test("unknown JSON metadata and transitive lock nodes survive canonical serialization", () => {
  const root = fixture("\n");
  try {
    const packageJson = read(root, "package.json");
    packageJson.customMetadata = { keep: true };
    writeJson(root, "package.json", packageJson, "\n");
    const lock = read(root, "package-lock.json");
    lock.customTopLevelField = "keep";
    lock.packages[""].customRootField = "keep";
    lock.packages["node_modules/example"] = {
      version: "1.0.0",
      resolved: "https://registry.example/example.tgz",
      integrity: "sha512-keep",
      optional: true,
      os: ["win32"],
      cpu: ["x64"],
      customNodeField: "keep"
    };
    writeJson(root, "package-lock.json", lock, "\n");
    const beforeNode = structuredClone(lock.packages["node_modules/example"]);
    const result = synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
    assert.equal(result.status, "PASS", result.errors.join("\n"));
    assert.deepEqual(read(root, "package.json").customMetadata, { keep: true });
    const after = read(root, "package-lock.json");
    assert.equal(after.customTopLevelField, "keep");
    assert.equal(after.packages[""].customRootField, "keep");
    assert.deepEqual(after.packages["node_modules/example"], beforeNode);
    const first = fs.readFileSync(path.join(root, "package-lock.json"), "utf8");
    synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
    assert.equal(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"), first);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

for (const eol of ["\n", "\r\n"]) {
  test(`JSON canonicalization preserves ${eol === "\n" ? "LF" : "CRLF"} and trailing newline`, () => {
    const root = fixture(eol);
    try {
      const result = synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
      assert.equal(result.status, "PASS", result.errors.join("\n"));
      for (const file of ["package.json", "package-lock.json"]) {
        const content = fs.readFileSync(path.join(root, file), "utf8");
        assert.equal(content.endsWith(eol), true);
        if (eol === "\r\n") assert.match(content, /\r\n/);
        else assert.doesNotMatch(content, /\r\n/);
      }
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
}

function fixture(eol) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crystal-json-preserve-"));
  for (const relativePath of copyPaths) copy(relativePath, root, eol);
  const sourcePackage = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));
  const sourceLock = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package-lock.json"), "utf8"));
  writeJson(root, "package.json", sourcePackage, eol);
  writeJson(root, "package-lock.json", sourceLock, eol);
  return root;
}

function copy(relativePath, root, eol) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const content = fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8").replace(/\r\n|\r|\n/g, eol);
  fs.writeFileSync(target, content);
}

function read(root, relativePath) { return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8")); }
function writeJson(root, relativePath, value, eol) {
  const content = `${JSON.stringify(value, null, 2)}\n`.replace(/\n/g, eol);
  fs.writeFileSync(path.join(root, relativePath), content);
}
