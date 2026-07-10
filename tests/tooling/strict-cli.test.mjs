import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runExecutable } from "../../scripts/tooling/process-runner.mjs";
import { parseProjectMetadataCli } from "../../scripts/sync-project-metadata.mjs";
import { parseChangePolicyCli } from "../../scripts/validate-change-policy.mjs";
import { parseMarkdownIntegrityCli } from "../../scripts/validate-markdown-integrity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("project metadata CLI rejects typo and unknown flags", () => {
  assert.equal(parseProjectMetadataCli(["--wirte"]).ok, false);
  assert.equal(parseProjectMetadataCli(["--unknown"]).ok, false);
});

test("project metadata CLI rejects write/check conflict and duplicates", () => {
  assert.equal(parseProjectMetadataCli(["--write", "--check"]).ok, false);
  assert.equal(parseProjectMetadataCli(["--write", "--write"]).ok, false);
});

test("project metadata CLI defaults to check and help is non-mutating", () => {
  assert.deepEqual(parseProjectMetadataCli([]).values, {});
  assert.equal(parseProjectMetadataCli(["--help"]).ok, true);
});

test("invalid project metadata JSON flag output is pure JSON", () => {
  const result = runExecutable(process.execPath, ["scripts/sync-project-metadata.mjs", "--json", "--unknown"], { cwd: root });
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "FAIL");
  assert.match(payload.errors[0], /Unknown argument/);
  assert.equal(result.stderr, "");
});

test("help with JSON has defined machine output", () => {
  const result = runExecutable(process.execPath, ["scripts/sync-project-metadata.mjs", "--help", "--json"], { cwd: root });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).mode, "help");
});

test("change policy CLI accepts only exact declared forms", () => {
  assert.equal(parseChangePolicyCli(["--branch=tooling/x", "--base=abc", "--json"]).ok, true);
  assert.equal(parseChangePolicyCli(["--branch", "tooling/x"]).ok, false);
  assert.equal(parseChangePolicyCli(["--base="]).ok, false);
});

test("Markdown integrity CLI rejects unknown flags", () => {
  assert.equal(parseMarkdownIntegrityCli(["--unknown"]).ok, false);
  assert.equal(parseMarkdownIntegrityCli(["--json"]).ok, true);
});
