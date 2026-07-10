import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateProjectBaseline } from "../../scripts/project-metadata/project-baseline.mjs";
import { validateChangePolicyConfig, validateDocumentationContract } from "../../scripts/project-metadata/configuration-schemas.mjs";
import { createDirectNodeExecution, createValidationEntry, validateValidationCatalog } from "../../scripts/validation/validation-suite.mjs";

const baseline = () => ({
  schemaVersion: 1,
  node: { baseline: "24.18.0", engine: ">=24.18.0 <25" },
  npm: { engine: ">=10.0.0" },
  electron: { version: "43.1.0", packageRange: "^43.1.0", embeddedNode: "24.18.0", chromium: "150.0.7871.47" }
});

test("baseline schema rejects unknown keys and prerelease versions", () => {
  const unknown = baseline();
  unknown.extra = true;
  assert.match(validateProjectBaseline(unknown).join("\n"), /unknown field extra/);
  for (const [field, value] of [["node", "24.18.0-beta.1"], ["electron", "43.1.0-alpha.2"], ["embedded", "v24.18.0-rc.1"]]) {
    const item = baseline();
    if (field === "node") item.node.baseline = value;
    if (field === "electron") item.electron.version = value;
    if (field === "embedded") item.electron.embeddedNode = value;
    assert.match(validateProjectBaseline(item).join("\n"), /Prerelease baselines are not supported/);
  }
});

test("baseline schema rejects accidental surrounding whitespace", () => {
  const item = baseline();
  item.node.engine = " >=24.18.0 <25";
  assert.match(validateProjectBaseline(item).join("\n"), /surrounding whitespace/);
});

test("change policy schema rejects unknown fields and duplicate prefixes", () => {
  const config = {
    schemaVersion: 1,
    policies: [
      { name: "one", branchPrefix: "docs/", allow: ["docs/**"], denyExtensions: [], unknown: true },
      { name: "two", branchPrefix: "docs/", allow: ["README.md"], denyExtensions: [] }
    ]
  };
  const errors = validateChangePolicyConfig(config).join("\n");
  assert.match(errors, /unknown field unknown/);
  assert.match(errors, /duplicates docs\//);
});

test("change policy schema rejects invalid patterns and extensions", () => {
  const errors = validateChangePolicyConfig({
    schemaVersion: 1,
    policies: [{ name: "docs", branchPrefix: "docs/", allow: ["../docs/**", "C:\\docs\\**"], denyExtensions: ["PNG", ".SVG"] }]
  }).join("\n");
  assert.match(errors, /normalized repository-relative pattern/);
  assert.match(errors, /lowercase extension/);
});

test("overlapping change policies require distinct priorities", () => {
  const errors = validateChangePolicyConfig({
    schemaVersion: 1,
    policies: [
      { name: "tooling", branchPrefix: "tooling/", allow: ["scripts/**"], denyExtensions: [] },
      { name: "metadata", branchPrefix: "tooling/metadata/", allow: ["config/**"], denyExtensions: [] }
    ]
  });
  assert.ok(errors.some((error) => error.includes("overlap")));
});

test("documentation contract rejects invalid and duplicate document paths", () => {
  const contract = {
    schemaVersion: 1,
    minimumGuidedMermaidDiagrams: 0,
    readingNodes: ["Start"],
    documents: [document("../outside.md"), document("docs/a.md"), document("docs/a.md")]
  };
  const errors = validateDocumentationContract(contract).join("\n");
  assert.match(errors, /normalized path/);
  assert.match(errors, /duplicates docs\/a.md/);
});

test("documentation contract validates required files, booleans, phrases, and reading nodes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crystal-doc-schema-"));
  try {
    const contract = {
      schemaVersion: 1,
      minimumGuidedMermaidDiagrams: -1,
      readingNodes: ["Start", "Start"],
      documents: [{ ...document("docs/missing.md"), required: "yes", requiredPhrases: ["A", "A"] }]
    };
    const errors = validateDocumentationContract(contract, { projectRoot: root }).join("\n");
    assert.match(errors, /non-negative integer/);
    assert.match(errors, /readingNodes.*duplicates/);
    assert.match(errors, /required must be boolean/);
    assert.match(errors, /requiredPhrases.*duplicates/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("validation catalog schema rejects invalid ownership", () => {
  const item = { ...createValidationEntry("x", "X", "validation", "validate:x", createDirectNodeExecution("scripts/x.mjs"), "Tests"), scriptOwnership: "manual" };
  assert.match(validateValidationCatalog([item]).join("\n"), /unknown scriptOwnership/);
});

function document(filePath) {
  return {
    path: filePath,
    required: true,
    requiresReadNext: true,
    requiresPosition: true,
    requiresRationale: true,
    validateLinks: true,
    requiredPhrases: []
  };
}
