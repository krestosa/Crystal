import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildComparisonRange, detectBranch, resolveBaseRef, runChangePolicy } from "../../scripts/validate-change-policy.mjs";
import { runExecutable } from "../../scripts/tooling/process-runner.mjs";

test("exact PR base SHA from environment is selected before symbolic refs", () => {
  const repo = gitFixture();
  try {
    const { baseSha } = repo;
    const result = runChangePolicy({
      projectRoot: repo.root,
      env: { CI: "true", GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "pull_request", CRYSTAL_CHANGE_POLICY_BRANCH: "tooling/phase-2", CRYSTAL_CHANGE_POLICY_BASE: baseSha },
      changes: []
    });
    assert.equal(result.status, "PASS");
    assert.equal(result.base, baseSha);
    assert.equal(result.baseSource, "CRYSTAL_CHANGE_POLICY_BASE");
    assert.equal(result.comparisonRange, `${baseSha}...HEAD`);
  } finally { cleanup(repo.root); }
});

test("push before SHA uses two-dot comparison", () => {
  const repo = gitFixture();
  try {
    const result = runChangePolicy({
      projectRoot: repo.root,
      env: { CI: "true", GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "push", CRYSTAL_CHANGE_POLICY_BRANCH: "tooling/phase-2", CRYSTAL_CHANGE_POLICY_BASE: repo.baseSha },
      changes: []
    });
    assert.equal(result.comparisonRange, `${repo.baseSha}..HEAD`);
  } finally { cleanup(repo.root); }
});

test("zero push before SHA falls back without inventing a base", () => {
  const repo = gitFixture();
  try {
    const info = resolveBaseRef({ projectRoot: repo.root, env: { CRYSTAL_CHANGE_POLICY_BASE: "0".repeat(40) } });
    assert.equal(info.detected, true);
    assert.notEqual(info.source, "CRYSTAL_CHANGE_POLICY_BASE");
  } finally { cleanup(repo.root); }
});

test("unavailable push before SHA falls back to origin/main after history rewrite", () => {
  const repo = gitFixture();
  try {
    const missingBefore = "a".repeat(40);
    const info = resolveBaseRef({
      projectRoot: repo.root,
      env: {
        GITHUB_EVENT_NAME: "push",
        CRYSTAL_CHANGE_POLICY_BASE: missingBefore
      }
    });
    assert.equal(info.detected, true);
    assert.equal(info.base, repo.baseSha);
    assert.equal(info.source, "origin/main");

    const result = runChangePolicy({
      projectRoot: repo.root,
      env: {
        CI: "true",
        GITHUB_ACTIONS: "true",
        GITHUB_EVENT_NAME: "push",
        CRYSTAL_CHANGE_POLICY_BRANCH: "tooling/phase-2",
        CRYSTAL_CHANGE_POLICY_BASE: missingBefore
      },
      changes: []
    });
    assert.equal(result.status, "PASS");
    assert.equal(result.base, repo.baseSha);
    assert.equal(result.baseSource, "origin/main");
    assert.equal(result.comparisonRange, `${repo.baseSha}..HEAD`);
  } finally { cleanup(repo.root); }
});

test("an unavailable explicit base remains fail-closed even for push", () => {
  const repo = gitFixture();
  try {
    const info = resolveBaseRef({
      projectRoot: repo.root,
      base: "a".repeat(40),
      env: { GITHUB_EVENT_NAME: "push" }
    });
    assert.equal(info.detected, false);
    assert.equal(info.source, "flag");
  } finally { cleanup(repo.root); }
});
test("explicit base flag wins over environment and stale origin/main", () => {
  const repo = gitFixture();
  try {
    const info = resolveBaseRef({ projectRoot: repo.root, base: repo.baseSha, env: { CRYSTAL_CHANGE_POLICY_BASE: repo.headSha } });
    assert.equal(info.source, "flag");
    assert.equal(info.base, repo.baseSha);
  } finally { cleanup(repo.root); }
});

test("detached HEAD still uses explicit GitHub head ref", () => {
  const branch = detectBranch({ env: { GITHUB_HEAD_REF: "tooling/detached" }, projectRoot: process.cwd() });
  assert.deepEqual(branch, { branch: "tooling/detached", source: "GITHUB_HEAD_REF", detected: true });
});

test("nonexistent exact base fails closed in CI", () => {
  const repo = gitFixture();
  try {
    const result = runChangePolicy({
      projectRoot: repo.root,
      env: { CI: "true", GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "pull_request", CRYSTAL_CHANGE_POLICY_BRANCH: "tooling/phase-2", CRYSTAL_CHANGE_POLICY_BASE: "a".repeat(40) }
    });
    assert.equal(result.status, "FAIL");
    assert.match(result.errors.join("\n"), /Base ref detection failed/);
  } finally { cleanup(repo.root); }
});

test("comparison range syntax is event-specific", () => {
  assert.equal(buildComparisonRange("abc", "push"), "abc..HEAD");
  assert.equal(buildComparisonRange("abc", "pull_request"), "abc...HEAD");
});

function gitFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crystal-change-base-"));
  fs.mkdirSync(path.join(root, "config"));
  fs.writeFileSync(path.join(root, "config/change-policy.json"), JSON.stringify({
    schemaVersion: 1,
    policies: [{ name: "tooling", branchPrefix: "tooling/", allow: ["scripts/**", "config/**"], denyExtensions: [] }]
  }, null, 2));
  git(root, "init", "-b", "main");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "Crystal Test");
  fs.writeFileSync(path.join(root, "config/base.txt"), "base\n");
  git(root, "add", ".");
  git(root, "commit", "-m", "base");
  const baseSha = git(root, "rev-parse", "HEAD").stdout.trim();
  git(root, "remote", "add", "origin", root);
  git(root, "update-ref", "refs/remotes/origin/main", baseSha);
  fs.mkdirSync(path.join(root, "scripts"));
  fs.writeFileSync(path.join(root, "scripts/change.mjs"), "export {};\n");
  git(root, "add", ".");
  git(root, "commit", "-m", "head");
  const headSha = git(root, "rev-parse", "HEAD").stdout.trim();
  return { root, baseSha, headSha };
}

function git(root, ...args) {
  const result = runExecutable("git", args, { cwd: root });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result;
}

function cleanup(root) { fs.rmSync(root, { recursive: true, force: true }); }
