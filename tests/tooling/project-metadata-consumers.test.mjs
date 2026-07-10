import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateProjectMetadataConsumers, validateProjectMetadataConsumersConfig } from "../../scripts/project-metadata/project-metadata-consumers.mjs";

const baseline = {
  node: { baseline: "24.19.0", engine: ">=24.19.0 <25" },
  npm: { engine: ">=10.0.0" },
  electron: { version: "43.2.0", packageRange: "^43.2.0", embeddedNode: "24.19.0", chromium: "150.0.0.0" }
};

test("consumer schema rejects duplicates and unknown fields", () => {
  const consumer = { field: "node.baseline", kind: "generated-file", path: ".nvmrc" };
  const errors = validateProjectMetadataConsumersConfig({ schemaVersion: 1, consumers: [consumer, { ...consumer, unknown: true }] }).join("\n");
  assert.match(errors, /duplicates an existing consumer/);
  assert.match(errors, /unknown field unknown/);
});

test("registered runtime consumer rejects stale independent hardcode after baseline update", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crystal-consumer-stale-"));
  try {
    write(root, "scripts/doctor.mjs", 'import { readProjectBaseline } from "./baseline.mjs";\nconst stale = "24.18.0";\n');
    const config = { schemaVersion: 1, consumers: [
      { field: "node.baseline", kind: "runtime-import", path: "scripts/doctor.mjs", module: "./baseline.mjs" }
    ] };
    const errors = validateProjectMetadataConsumers({ projectRoot: root, baseline, config }).join("\n");
    assert.match(errors, /independent version constant/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("generated document consumer requires marker and keeps versions inside the block", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crystal-consumer-doc-"));
  try {
    write(root, "README.md", `# Project\n<!-- crystal-generated:toolchain:start -->\n24.19.0\n<!-- crystal-generated:toolchain:end -->\n`);
    const config = { schemaVersion: 1, consumers: [
      { field: "node.baseline", kind: "generated-document", path: "README.md", block: "toolchain" }
    ] };
    const errors = validateProjectMetadataConsumers({ projectRoot: root, baseline, config });
    assert.ok(errors.every((error) => !error.includes("README.md generated block")));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("consumer rejects unknown baseline field and missing path", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crystal-consumer-missing-"));
  try {
    const config = { schemaVersion: 1, consumers: [
      { field: "node.unknown", kind: "generated-file", path: "missing.txt" }
    ] };
    const errors = validateProjectMetadataConsumers({ projectRoot: root, baseline, config }).join("\n");
    assert.match(errors, /unknown baseline field/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
