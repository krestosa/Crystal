import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflowPath = path.join(repositoryRoot, ".github", "workflows", "validation.yml");

function splitSteps(sourceText) {
  return sourceText.split(/(?=^      - name:)/m);
}

function validateWorkflowSecurity(sourceText) {
  const errors = [];
  const steps = splitSteps(sourceText);
  const checkoutSteps = steps.filter((step) => /uses:\s*actions\/checkout@v4/.test(step));

  if (checkoutSteps.length === 0) {
    errors.push("Validation workflow must include actions/checkout@v4.");
  }

  for (const step of checkoutSteps) {
    if (!/^\s*persist-credentials:\s*false\s*$/m.test(step)) {
      errors.push("Validation workflow checkout must set persist-credentials: false.");
    }
  }

  for (const step of steps.filter((entry) => /uses:\s*actions\/upload-artifact@v4/.test(entry))) {
    const uploadsWorkspaceRoot = /^[ \t]*path:[ \t]*\.[ \t]*(?:#.*)?$/m.test(step);
    const includesHiddenFiles = /^[ \t]*include-hidden-files:[ \t]*true[ \t]*(?:#.*)?$/m.test(step);
    if (uploadsWorkspaceRoot && includesHiddenFiles) {
      errors.push("Validation workflow must not upload the workspace root with hidden files enabled.");
    }
  }

  return errors;
}

test("Validation workflow prevents credential-bearing workspace artifacts", () => {
  const workflowText = fs.readFileSync(workflowPath, "utf8");
  assert.deepEqual(validateWorkflowSecurity(workflowText), []);
  assert.match(workflowText, /persist-credentials:\s*false/);
  assert.doesNotMatch(workflowText, /name:\s*Upload checked-out source snapshot/);
});

test("Validation workflow security contract rejects the unsafe checkout and artifact combination", () => {
  const unsafeWorkflow = `name: Validation

jobs:
  validation:
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Upload workspace
        uses: actions/upload-artifact@v4
        with:
          path: .
          include-hidden-files: true
`;

  const errors = validateWorkflowSecurity(unsafeWorkflow);
  assert.match(errors.join("\n"), /persist-credentials: false/);
  assert.match(errors.join("\n"), /must not upload the workspace root with hidden files enabled/);
});
