import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { replaceGeneratedBlock, validateGeneratedMarkers } from "../../scripts/project-metadata/generated-blocks.mjs";
import { synchronizeProjectMetadata } from "../../scripts/project-metadata/project-metadata-sync.mjs";
import { getGeneratedValidationScripts, validationCatalog } from "../../scripts/validation/validation-suite.mjs";

function createProject(readmeText) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crystal-marker-fixture-"));
  fs.mkdirSync(path.join(root, "config"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs", "architecture"), { recursive: true });
  fs.writeFileSync(path.join(root, "config", "project-baseline.json"), `${JSON.stringify({
    schemaVersion: 1,
    node: { baseline: "24.18.0", engine: ">=24.18.0 <25" },
    npm: { engine: ">=10.0.0" },
    electron: { version: "43.1.0", packageRange: "^43.1.0", embeddedNode: "24.18.0", chromium: "150.0.7871.47" }
  }, null, 2)}\n`);
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
  const scripts = { ...getGeneratedValidationScripts(validationCatalog), typecheck: "tsc --noEmit" };
  const packageJson = {
    name: "crystal",
    version: "0.0.0",
    private: true,
    scripts,
    devDependencies: { "@types/node": "^24.13.3", electron: "^43.1.0" },
    engines: { node: ">=24.18.0 <25", npm: ">=10.0.0" }
  };
  fs.writeFileSync(path.join(root, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
  fs.writeFileSync(path.join(root, "package-lock.json"), `${JSON.stringify({
    name: "crystal",
    version: "0.0.0",
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {
        name: "crystal",
        version: "0.0.0",
        devDependencies: { "@types/node": "^24.13.3", electron: "^43.1.0" },
        engines: { node: ">=24.18.0 <25", npm: ">=10.0.0" },
        scripts
      },
      "node_modules/@types/node": { version: "24.13.3" },
      "node_modules/electron": { version: "43.1.0" }
    }
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(root, "README.md"), readmeText);
  fs.writeFileSync(path.join(root, "docs", "development.md"), "before\n<!-- crystal-generated:toolchain:start -->\nstale\n<!-- crystal-generated:toolchain:end -->\nafter\n");
  fs.writeFileSync(path.join(root, "docs", "architecture", "validation-system.md"), "before\n<!-- crystal-generated:validation-catalog:start -->\nstale\n<!-- crystal-generated:validation-catalog:end -->\nafter\n");
  return root;
}

function verifyWriteFailsWithoutMutation(source) {
  const root = createProject(source);
  try {
    const target = path.join(root, "README.md");
    const before = fs.readFileSync(target);
    const checked = synchronizeProjectMetadata({ projectRoot: root, write: false, checkGit: false });
    assert.equal(checked.status, "FAIL");
    assert.match(checked.errors.join("\n"), /README\.md/);
    assert.deepEqual(fs.readFileSync(target), before);

    const written = synchronizeProjectMetadata({ projectRoot: root, write: true, checkGit: false });
    assert.equal(written.status, "FAIL");
    assert.deepEqual(fs.readFileSync(target), before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("both generated markers missing fail check and write without appending", () => {
  verifyWriteFailsWithoutMutation("# Fixture\n\nManual content only.\n");
});

test("missing generated end marker fails without mutation", () => {
  verifyWriteFailsWithoutMutation("before\n<!-- crystal-generated:toolchain:start -->\nstale\nafter\n");
});

test("missing generated start marker fails without mutation", () => {
  verifyWriteFailsWithoutMutation("before\nstale\n<!-- crystal-generated:toolchain:end -->\nafter\n");
});

test("valid generated block replaces only block bytes", () => {
  const prefix = Buffer.from("prefix\r\n", "utf8");
  const suffix = Buffer.from("\r\nsuffix\r\n", "utf8");
  const source = Buffer.concat([
    prefix,
    Buffer.from("<!-- crystal-generated:fixture:start -->\r\nstale\r\n<!-- crystal-generated:fixture:end -->", "utf8"),
    suffix
  ]).toString("utf8");
  const replaced = replaceGeneratedBlock(source, "fixture", "fresh\nbody", { filePath: "fixture.md", appendIfMissing: false });
  const replacementStart = replaced.indexOf("<!-- crystal-generated:fixture:start -->");
  const replacementEnd = replaced.indexOf("<!-- crystal-generated:fixture:end -->") + "<!-- crystal-generated:fixture:end -->".length;
  assert.deepEqual(Buffer.from(replaced.slice(0, replacementStart)), prefix);
  assert.deepEqual(Buffer.from(replaced.slice(replacementEnd)), suffix);
  assert.match(replaced, /fresh\r\nbody/);
});

test("duplicate and nested generated markers fail", () => {
  const duplicate = "<!-- crystal-generated:x:start -->\na\n<!-- crystal-generated:x:end -->\n<!-- crystal-generated:x:start -->\nb\n<!-- crystal-generated:x:end -->\n";
  assert.match(validateGeneratedMarkers(duplicate, "duplicate.md").join("\n"), /exactly one/);
  const nested = "<!-- crystal-generated:x:start -->\n<!-- crystal-generated:y:start -->\n<!-- crystal-generated:y:end -->\n<!-- crystal-generated:x:end -->\n";
  assert.match(validateGeneratedMarkers(nested, "nested.md").join("\n"), /nested/);
});
