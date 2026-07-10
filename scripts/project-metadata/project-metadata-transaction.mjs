import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const PROJECT_METADATA_LOCK_RELATIVE_PATH = ".tmp/project-metadata-sync.lock";
export const PROJECT_METADATA_JOURNAL_RELATIVE_PATH = ".tmp/project-metadata-sync-transaction.json";

export function acquireProjectMetadataLock(projectRoot, options = {}) {
  const root = path.resolve(projectRoot);
  const lockPath = path.join(root, PROJECT_METADATA_LOCK_RELATIVE_PATH);
  const lockDirectory = path.dirname(lockPath);
  fs.mkdirSync(lockDirectory, { recursive: true });
  const processExists = options.processExists ?? isProcessActive;
  const token = options.token ?? crypto.randomUUID();
  const lockInfo = {
    pid: options.pid ?? process.pid,
    startedAt: options.startedAt ?? new Date().toISOString(),
    command: options.command ?? process.argv.join(" "),
    hostname: options.hostname ?? os.hostname(),
    token
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let fd;
    try {
      fd = fs.openSync(lockPath, "wx", 0o600);
      fs.writeFileSync(fd, `${JSON.stringify(lockInfo, null, 2)}\n`, "utf8");
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fd = undefined;
      return {
        lockPath,
        info: lockInfo,
        release: () => releaseProjectMetadataLock(lockPath, token)
      };
    } catch (error) {
      if (fd !== undefined) {
        try { fs.closeSync(fd); } catch {}
      }
      if (error?.code !== "EEXIST") throw error;
      const existing = readExistingLock(lockPath);
      if (!existing.valid) {
        throw new Error(`Project metadata synchronization lock exists and cannot be verified safely: ${lockPath}. ${existing.error}`);
      }
      if (processExists(existing.info.pid)) {
        throw new Error(`Project metadata synchronization is already active (pid ${existing.info.pid}, started ${existing.info.startedAt ?? "unknown"}, command ${JSON.stringify(existing.info.command ?? "unknown")}).`);
      }
      if (attempt > 0) throw new Error(`Unable to acquire project metadata synchronization lock after recovering a stale lock: ${lockPath}.`);
      recoverInterruptedProjectMetadataTransaction(root);
      fs.unlinkSync(lockPath);
    }
  }
  throw new Error(`Unable to acquire project metadata synchronization lock: ${lockPath}.`);
}

export function writeProjectMetadataTransaction(projectRoot, files, options = {}) {
  const root = path.resolve(projectRoot);
  const entries = normalizeEntries(root, files);
  if (entries.length === 0) return { filesWritten: [], transactionId: null };
  const transactionId = options.transactionId ?? crypto.randomUUID();
  const journalPath = path.join(root, PROJECT_METADATA_JOURNAL_RELATIVE_PATH);
  const states = entries.map((entry, index) => ({
    ...entry,
    index,
    temporaryPath: path.join(path.dirname(entry.absolutePath), `.${path.basename(entry.absolutePath)}.crystal-tmp-${transactionId}-${index}`),
    backupPath: path.join(path.dirname(entry.absolutePath), `.${path.basename(entry.absolutePath)}.crystal-backup-${transactionId}-${index}`),
    existed: fs.existsSync(entry.absolutePath),
    staged: false,
    originalMoved: false,
    replaced: false
  }));
  const rollbackErrors = [];

  try {
    for (const state of states) {
      fs.mkdirSync(path.dirname(state.absolutePath), { recursive: true });
      writeAndSyncFile(state.temporaryPath, state.content);
      const stagedContent = fs.readFileSync(state.temporaryPath, "utf8");
      if (stagedContent !== state.content) throw new Error(`Staged content verification failed for ${state.relativePath}.`);
      state.staged = true;
    }

    writeJournal(journalPath, transactionId, states);

    for (const state of states) {
      if (options.testHooks?.failBeforeReplaceIndex === state.index) {
        throw new Error(`Injected transaction failure before replacement index ${state.index}.`);
      }
      if (state.existed) {
        fs.renameSync(state.absolutePath, state.backupPath);
        state.originalMoved = true;
      }
      fs.renameSync(state.temporaryPath, state.absolutePath);
      state.staged = false;
      state.replaced = true;
    }

    // Once the journal is gone, the new files are committed. Backups are then disposable.
    removeIfExists(journalPath);
    for (const state of states) removeIfExists(state.backupPath);
    return { filesWritten: states.map((state) => state.relativePath), transactionId };
  } catch (error) {
    for (const state of [...states].reverse()) {
      try {
        if (state.replaced && fs.existsSync(state.absolutePath)) removeIfExists(state.absolutePath);
        if (state.originalMoved && fs.existsSync(state.backupPath)) {
          fs.renameSync(state.backupPath, state.absolutePath);
          state.originalMoved = false;
        } else if (!state.existed && state.replaced) {
          removeIfExists(state.absolutePath);
        }
        state.replaced = false;
      } catch (rollbackError) {
        rollbackErrors.push(`${state.relativePath}: ${rollbackError.message}`);
      }
    }
    const detail = rollbackErrors.length > 0 ? ` Rollback errors: ${rollbackErrors.join("; ")}` : "";
    const transactionError = new Error(`Project metadata transaction failed: ${error.message}.${detail}`);
    transactionError.cause = error;
    transactionError.rollbackErrors = rollbackErrors;
    throw transactionError;
  } finally {
    removeIfExists(journalPath);
    for (const state of states) {
      removeIfExists(state.temporaryPath);
      removeIfExists(state.backupPath);
    }
  }
}

export function runProjectMetadataWriteTransaction(projectRoot, files, options = {}) {
  const lock = acquireProjectMetadataLock(projectRoot, options.lockOptions);
  try {
    return writeProjectMetadataTransaction(projectRoot, files, options);
  } finally {
    lock.release();
  }
}

export function recoverInterruptedProjectMetadataTransaction(projectRoot) {
  const root = path.resolve(projectRoot);
  const journalPath = path.join(root, PROJECT_METADATA_JOURNAL_RELATIVE_PATH);
  if (!fs.existsSync(journalPath)) return { recovered: false, files: [] };
  let journal;
  try {
    journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  } catch (error) {
    throw new Error(`Interrupted project metadata transaction journal cannot be parsed safely: ${error.message}`);
  }
  if (!Array.isArray(journal?.files)) throw new Error("Interrupted project metadata transaction journal has an invalid files list.");
  const recovered = [];
  for (const item of [...journal.files].reverse()) {
    const absolutePath = resolveJournalPath(root, item.relativePath, "target");
    const backupPath = resolveJournalPath(root, item.backupRelativePath, "backup");
    const temporaryPath = resolveJournalPath(root, item.temporaryRelativePath, "temporary");
    if (fs.existsSync(backupPath)) {
      removeIfExists(absolutePath);
      fs.renameSync(backupPath, absolutePath);
      recovered.push(item.relativePath);
    } else if (item.existed === false && fs.existsSync(absolutePath) && !fs.existsSync(temporaryPath)) {
      removeIfExists(absolutePath);
      recovered.push(item.relativePath);
    }
    removeIfExists(temporaryPath);
    removeIfExists(backupPath);
  }
  removeIfExists(journalPath);
  return { recovered: true, files: recovered.sort() };
}

export function findProjectMetadataTransactionResidues(projectRoot) {
  const root = path.resolve(projectRoot);
  const residues = [];
  walk(root, (absolutePath, name) => {
    if (name === path.basename(PROJECT_METADATA_LOCK_RELATIVE_PATH)
      || name === path.basename(PROJECT_METADATA_JOURNAL_RELATIVE_PATH)
      || name.includes(".crystal-tmp-")
      || name.includes(".crystal-backup-")) {
      residues.push(path.relative(root, absolutePath).replace(/\\/g, "/"));
    }
  }, new Set([".git", "node_modules", "dist"]));
  return residues.sort();
}

function writeJournal(journalPath, transactionId, states) {
  fs.mkdirSync(path.dirname(journalPath), { recursive: true });
  const journal = {
    schemaVersion: 1,
    transactionId,
    createdAt: new Date().toISOString(),
    files: states.map((state) => ({
      relativePath: state.relativePath,
      temporaryRelativePath: normalizeRelative(path.relative(path.dirname(journalPath), state.temporaryPath)),
      backupRelativePath: normalizeRelative(path.relative(path.dirname(journalPath), state.backupPath)),
      existed: state.existed
    }))
  };
  writeAndSyncFile(journalPath, `${JSON.stringify(journal, null, 2)}\n`);
}

function resolveJournalPath(root, storedPath, label) {
  if (typeof storedPath !== "string" || storedPath === "") throw new Error(`Interrupted transaction ${label} path is invalid.`);
  const journalDirectory = path.join(root, path.dirname(PROJECT_METADATA_JOURNAL_RELATIVE_PATH));
  const absolute = path.resolve(journalDirectory, storedPath);
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Interrupted transaction ${label} path escapes the project root.`);
  return absolute;
}

function normalizeEntries(root, files) {
  const rawEntries = files instanceof Map ? [...files.entries()] : Object.entries(files ?? {});
  return rawEntries.map(([relativePath, content]) => {
    if (typeof relativePath !== "string" || relativePath === "" || path.isAbsolute(relativePath) || relativePath.includes("\\") || relativePath.split("/").includes("..")) {
      throw new Error(`Transaction target must be a normalized repository-relative path: ${relativePath}`);
    }
    if (typeof content !== "string") throw new TypeError(`Transaction content for ${relativePath} must be a string.`);
    const absolutePath = path.resolve(root, relativePath);
    const relativeCheck = path.relative(root, absolutePath);
    if (relativeCheck.startsWith("..") || path.isAbsolute(relativeCheck)) throw new Error(`Transaction target escapes the project root: ${relativePath}`);
    return { relativePath, absolutePath, content };
  });
}

function writeAndSyncFile(filePath, content) {
  const fd = fs.openSync(filePath, "wx", 0o600);
  try {
    fs.writeFileSync(fd, content, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function readExistingLock(lockPath) {
  try {
    const info = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    if (!Number.isInteger(info?.pid) || info.pid <= 0) return { valid: false, error: "Lock metadata has no valid pid." };
    if (typeof info.token !== "string" || info.token === "") return { valid: false, error: "Lock metadata has no ownership token." };
    return { valid: true, info };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

function isProcessActive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    return true;
  }
}

function releaseProjectMetadataLock(lockPath, token) {
  if (!fs.existsSync(lockPath)) return;
  const existing = readExistingLock(lockPath);
  if (!existing.valid || existing.info.token !== token) {
    throw new Error(`Project metadata synchronization lock ownership changed before release: ${lockPath}.`);
  }
  fs.unlinkSync(lockPath);
  const directory = path.dirname(lockPath);
  try { fs.rmdirSync(directory); } catch (error) { if (error?.code !== "ENOTEMPTY" && error?.code !== "ENOENT") throw error; }
}

function removeIfExists(filePath) {
  try { fs.unlinkSync(filePath); } catch (error) { if (error?.code !== "ENOENT") throw error; }
}

function normalizeRelative(value) {
  return value.replace(/\\/g, "/");
}

function walk(root, visit, ignoredDirectories) {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) walk(absolutePath, visit, ignoredDirectories);
    else visit(absolutePath, entry.name);
  }
}
