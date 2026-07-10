import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateWorkflowSecurity } from "../../scripts/validation/workflow-security.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflowPath = path.join(repositoryRoot, ".github", "workflows", "validation.yml");

function workflow(steps, extra = "") {
  return `name: Validation
on:
  pull_request:
permissions:
  contents: read
jobs:
  validation:
    runs-on: windows-latest
    steps:
${steps}${extra}`;
}

function checkout(ref = "v4", persist = true) {
  return `      - name: Checkout
        uses: actions/checkout@${ref}${/^[0-9a-f]{40}$/.test(ref) ? " # v4" : ""}
        with:
          persist-credentials: ${persist ? "false" : "true"}
`;
}

function upload(pathValue) {
  return `      - name: Upload
        uses: actions/upload-artifact@v4
        with:
          path: ${pathValue}
`;
}

test("permanent Validation workflow satisfies pinned credential and artifact policy", () => {
  const source = fs.readFileSync(workflowPath, "utf8");
  assert.deepEqual(validateWorkflowSecurity(source), []);
});

test("checkout tag and SHA are both recognized before pinning enforcement", () => {
  assert.deepEqual(validateWorkflowSecurity(workflow(checkout("v4")), { requirePinnedActions: false }), []);
  assert.deepEqual(validateWorkflowSecurity(workflow(checkout("a".repeat(40))), { requirePinnedActions: false }), []);
});

test("missing persist credentials is rejected", () => {
  assert.match(validateWorkflowSecurity(workflow(checkout("v4", false)), { requirePinnedActions: false }).join("\n"), /persist-credentials: false/);
});

for (const unsafePath of [".", "./", '"${{ github.workspace }}"', '"**/*"', ".git/**", ".env", ".npmrc", '"${{ runner.temp }}"']) {
  test(`unsafe artifact path ${unsafePath} is rejected`, () => {
    const errors = validateWorkflowSecurity(workflow(checkout("v4") + upload(unsafePath)), { requirePinnedActions: false });
    assert.match(errors.join("\n"), /artifact path is unsafe/);
  });
}

test("multiline unsafe artifact paths are rejected", () => {
  const step = `      - name: Upload
        uses: actions/upload-artifact@v4
        with:
          path: |
            reports/output.json
            .git/**
`;
  assert.match(validateWorkflowSecurity(workflow(checkout("v4") + step), { requirePinnedActions: false }).join("\n"), /unsafe/);
});

test("safe scoped artifact path is accepted when pinning is not evaluated", () => {
  assert.deepEqual(validateWorkflowSecurity(workflow(checkout("v4") + upload("reports/summary.json")), { requirePinnedActions: false }), []);
});

test("pull_request_target and write permissions are rejected", () => {
  const source = workflow(checkout("v4")).replace("pull_request:", "pull_request_target:").replace("contents: read", "contents: write");
  const errors = validateWorkflowSecurity(source, { requirePinnedActions: false }).join("\n");
  assert.match(errors, /pull_request_target/);
  assert.match(errors, /write permissions/);
});

test("unpinned and unexpected actions are rejected", () => {
  const source = workflow(checkout("v4") + `      - uses: unexpected/runner@v1
`);
  const errors = validateWorkflowSecurity(source).join("\n");
  assert.match(errors, /full commit SHA/);
  assert.match(errors, /non-allowlisted/);
});

test("pinned action requires a version comment", () => {
  const source = workflow(`      - uses: actions/checkout@${"a".repeat(40)}
        with:
          persist-credentials: false
`);
  assert.match(validateWorkflowSecurity(source).join("\n"), /version comment/);
});

test("permanent workflow validates metadata and build idempotence without transaction residue", () => {
  const source = fs.readFileSync(workflowPath, "utf8");
  assert.equal((source.match(/npm run sync:project-metadata/g) ?? []).length, 2);
  assert.equal((source.match(/npm run build/g) ?? []).length, 2);
  assert.ok((source.match(/git diff --exit-code/g) ?? []).length >= 4);
  assert.match(source, /project-metadata-sync\.lock/);
  assert.match(source, /project-metadata-sync-transaction/);
  assert.doesNotMatch(source, /actions\/upload-artifact@/);
});

test("permanent workflow passes exact change-policy event inputs", () => {
  const source = fs.readFileSync(workflowPath, "utf8");
  assert.match(source, /CRYSTAL_CHANGE_POLICY_BRANCH:\s*\$\{\{ github\.head_ref \|\| github\.ref_name \}\}/);
  assert.match(source, /CRYSTAL_CHANGE_POLICY_BASE:\s*\$\{\{ github\.event\.pull_request\.base\.sha \|\| github\.event\.before \}\}/);
  assert.match(source, /CRYSTAL_CHANGE_POLICY_EVENT:\s*\$\{\{ github\.event_name \}\}/);
});
