import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  PROJECT_METADATA_LOCK_RELATIVE_PATH,
  acquireProjectMetadataLock,
  findProjectMetadataTransactionResidues,
  runProjectMetadataWriteTransaction,
  writeProjectMetadataTransaction
} from "../../scripts/project-metadata/project-metadata-transaction.mjs";

test("active project metadata lock rejects a concurrent sync and remains owned", () => {
  const root = fixture();
  const lock = acquireProjectMetadataLock(root, { token: "owner-token", processExists: () => true });
  try {
    assert.throws(
      () => acquireProjectMetadataLock(root, { token: "contender", processExists: () => true }),
      /already active/
    );
    assert.equal(fs.existsSync(path.join(root, PROJECT_METADATA_LOCK_RELATIVE_PATH)), true);
  } finally {
    lock.release();
    cleanup(root);
  }
});

test("failure before first replacement leaves every target unchanged", () => {
  const root = fixture();
  const before = snapshot(root);
  assert.throws(
    () => runProjectMetadataWriteTransaction(root, changes(), { testHooks: { failBeforeReplaceIndex: 0 } }),
    /transaction failed/
  );
  assert.deepEqual(snapshot(root), before);
  assert.deepEqual(findProjectMetadataTransactionResidues(root), []);
  cleanup(root);
});

test("failure during replacement rolls back all previous files", () => {
  const root = fixture();
  const before = snapshot(root);
  assert.throws(
    () => runProjectMetadataWriteTransaction(root, changes(), { testHooks: { failBeforeReplaceIndex: 2 } }),
    /replacement index 2/
  );
  assert.deepEqual(snapshot(root), before);
  assert.deepEqual(findProjectMetadataTransactionResidues(root), []);
  cleanup(root);
});

test("successful transaction leaves no temporary, backup, journal, or lock residue", () => {
  const root = fixture();
  const result = runProjectMetadataWriteTransaction(root, changes());
  assert.deepEqual(result.filesWritten, ["a.txt", "nested/b.txt", "created.txt"]);
  assert.equal(fs.readFileSync(path.join(root, "a.txt"), "utf8"), "new-a\n");
  assert.equal(fs.readFileSync(path.join(root, "nested/b.txt"), "utf8"), "new-b\n");
  assert.equal(fs.readFileSync(path.join(root, "created.txt"), "utf8"), "created\n");
  assert.deepEqual(findProjectMetadataTransactionResidues(root), []);
  cleanup(root);
});

test("failed transaction leaves no temporary, backup, journal, or lock residue", () => {
  const root = fixture();
  assert.throws(
    () => runProjectMetadataWriteTransaction(root, changes(), { testHooks: { failBeforeReplaceIndex: 1 } }),
    /transaction failed/
  );
  assert.deepEqual(findProjectMetadataTransactionResidues(root), []);
  cleanup(root);
});

test("lock is released after the transactional callback throws", () => {
  const root = fixture();
  assert.throws(
    () => runProjectMetadataWriteTransaction(root, changes(), { testHooks: { failBeforeReplaceIndex: 0 } }),
    /transaction failed/
  );
  const lock = acquireProjectMetadataLock(root, { token: "after-failure", processExists: () => true });
  lock.release();
  cleanup(root);
});

test("lock release never deletes a lock whose ownership token changed", () => {
  const root = fixture();
  const lock = acquireProjectMetadataLock(root, { token: "first-owner", processExists: () => true });
  const lockPath = path.join(root, PROJECT_METADATA_LOCK_RELATIVE_PATH);
  fs.writeFileSync(lockPath, `${JSON.stringify({ pid: process.pid, token: "other-owner" })}\n`);
  assert.throws(() => lock.release(), /ownership changed/);
  assert.equal(fs.existsSync(lockPath), true);
  fs.rmSync(lockPath, { force: true });
  cleanup(root);
});

test("repeated transaction with identical content is deterministic", () => {
  const root = fixture();
  runProjectMetadataWriteTransaction(root, changes());
  const first = snapshot(root);
  writeProjectMetadataTransaction(root, changes());
  assert.deepEqual(snapshot(root), first);
  assert.deepEqual(findProjectMetadataTransactionResidues(root), []);
  cleanup(root);
});

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crystal-metadata-transaction-"));
  fs.mkdirSync(path.join(root, "nested"), { recursive: true });
  fs.writeFileSync(path.join(root, "a.txt"), "old-a\n");
  fs.writeFileSync(path.join(root, "nested/b.txt"), "old-b\n");
  return root;
}

function changes() {
  return new Map([
    ["a.txt", "new-a\n"],
    ["nested/b.txt", "new-b\n"],
    ["created.txt", "created\n"]
  ]);
}

function snapshot(root) {
  const result = {};
  for (const relativePath of ["a.txt", "nested/b.txt", "created.txt"]) {
    const absolutePath = path.join(root, relativePath);
    result[relativePath] = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null;
  }
  return result;
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}
