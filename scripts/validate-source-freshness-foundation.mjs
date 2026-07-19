import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = process.cwd();
const failures = [];
let checksExecuted = 0;
let symlinkEvidence = "real symlink escape";
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "crystal-source-freshness-"));

try {
  const runtime = await buildRuntimeModules(tempRoot);
  await runBehavioralChecks(runtime);
  await runBoundaryChecks();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("Source freshness foundation validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Source freshness foundation validation passed (${checksExecuted} behavioral and boundary checks; ${symlinkEvidence}).`);

async function buildRuntimeModules(outputRoot) {
  const coreOutput = path.join(outputRoot, "source-conflict.mjs");
  const adapterOutput = path.join(outputRoot, "source-revision-adapter.mjs");
  await build({
    entryPoints: [path.join(repoRoot, "packages/core/source-conflict/index.ts")],
    outfile: coreOutput,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node24",
    logLevel: "silent"
  });
  await build({
    entryPoints: [path.join(repoRoot, "packages/adapters/file-system/source-revision.adapter.ts")],
    outfile: adapterOutput,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node24",
    logLevel: "silent"
  });
  return {
    core: await import(pathToFileURL(coreOutput).href),
    adapter: await import(pathToFileURL(adapterOutput).href)
  };
}

async function runBehavioralChecks({ core, adapter }) {
  const projectRoot = path.join(tempRoot, "project");
  const outsideRoot = path.join(tempRoot, "outside");
  await mkdir(projectRoot, { recursive: true });
  await mkdir(outsideRoot, { recursive: true });

  const sourcePath = path.join(projectRoot, "source.txt");
  const read = (relativePath = "source.txt", maxBytes = 1024) => adapter.readSourceRevision({ projectRoot, relativePath, maxBytes });

  await writeFile(sourcePath, Buffer.from("same bytes", "utf8"));
  const sameA = await read();
  const sameB = await read();
  await check("same bytes produce the same token", () => {
    assert.equal(sameA.status, "ready");
    assert.equal(sameB.status, "ready");
    assert.equal(sameA.sourceVersion, sameB.sourceVersion);
  });

  await writeFile(sourcePath, Buffer.from("same byteS", "utf8"));
  const oneByteChanged = await read();
  await check("one byte changes the token", () => {
    assert.equal(oneByteChanged.status, "ready");
    assert.notEqual(oneByteChanged.sourceVersion, sameA.sourceVersion);
  });

  await writeFile(sourcePath, Buffer.from("ABCD", "utf8"));
  const sameSizeA = await read();
  await writeFile(sourcePath, Buffer.from("WXYZ", "utf8"));
  const sameSizeB = await read();
  await check("different same-size bytes conflict", () => {
    assert.equal(sameSizeA.status, "ready");
    assert.equal(sameSizeB.status, "ready");
    assert.equal(sameSizeA.byteLength, sameSizeB.byteLength);
    assert.equal(core.compareSourceVersions(sameSizeA.sourceVersion, sameSizeB.sourceVersion).status, "mismatch");
  });

  const fixedTime = new Date("2026-01-02T03:04:05.000Z");
  await writeFile(sourcePath, Buffer.from("1111", "utf8"));
  await utimes(sourcePath, fixedTime, fixedTime);
  const sameMtimeA = await read();
  await writeFile(sourcePath, Buffer.from("2222", "utf8"));
  await utimes(sourcePath, fixedTime, fixedTime);
  const sameMtimeB = await read();
  await check("same mtime and size do not mask byte changes", () => {
    assert.equal(sameMtimeA.status, "ready");
    assert.equal(sameMtimeB.status, "ready");
    assert.notEqual(sameMtimeA.sourceVersion, sameMtimeB.sourceVersion);
  });

  await writeFile(sourcePath, Buffer.alloc(0));
  const empty = await read();
  await check("empty files have a valid revision", () => {
    assert.equal(empty.status, "ready");
    assert.equal(empty.byteLength, 0);
    assert.equal(core.validateSourceVersion(empty.sourceVersion), true);
  });

  const unicodeText = "á🧊漢字";
  await writeFile(sourcePath, unicodeText, "utf8");
  const unicode = await read();
  await check("Unicode length is measured in UTF-8 bytes", () => {
    assert.equal(unicode.status, "ready");
    assert.equal(unicode.byteLength, Buffer.byteLength(unicodeText, "utf8"));
    assert.equal(core.parseSourceVersion(unicode.sourceVersion).value.byteLength, Buffer.byteLength(unicodeText, "utf8"));
  });

  await writeFile(sourcePath, "line one\nline two\n", "utf8");
  const lf = await read();
  await writeFile(sourcePath, "line one\r\nline two\r\n", "utf8");
  const crlf = await read();
  await check("LF and CRLF have distinct revisions", () => {
    assert.equal(lf.status, "ready");
    assert.equal(crlf.status, "ready");
    assert.notEqual(lf.sourceVersion, crlf.sourceVersion);
  });

  const deterministicRuns = [];
  await writeFile(sourcePath, Buffer.from([0, 1, 2, 3, 255]));
  for (let index = 0; index < 5; index += 1) deterministicRuns.push(await read());
  await check("repeated execution is deterministic", () => {
    const tokens = deterministicRuns.map((result) => result.status === "ready" ? result.sourceVersion : result.status);
    assert.equal(new Set(tokens).size, 1);
  });

  const absolute = await read(path.resolve(projectRoot, "source.txt"));
  await check("absolute paths are blocked", () => assert.equal(absolute.status, "invalid-path"));

  const windowsAbsolute = await read("C:\\project\\source.txt");
  await check("Windows absolute paths are blocked cross-platform", () => assert.equal(windowsAbsolute.status, "invalid-path"));

  const traversal = await read("nested/../source.txt");
  await check("dot-segment traversal is blocked", () => assert.equal(traversal.status, "invalid-path"));

  await writeFile(path.join(projectRoot, "..legitimate.txt"), "allowed", "utf8");
  const leadingDots = await read("..legitimate.txt");
  await check("leading dots that are not dot segments remain valid", () => assert.equal(leadingDots.status, "ready"));

  const missing = await read("missing.txt");
  await check("missing files are typed", () => assert.equal(missing.status, "missing"));

  const directoryPath = path.join(projectRoot, "folder");
  await mkdir(directoryPath);
  const notFile = await read("folder");
  await check("directories are not files", () => assert.equal(notFile.status, "not-file"));

  await writeFile(sourcePath, Buffer.alloc(9, 1));
  const tooLarge = await read("source.txt", 8);
  await check("files above maxBytes are blocked", () => {
    assert.equal(tooLarge.status, "too-large");
    assert.equal(tooLarge.maxBytes, 8);
  });

  await runSymlinkEscapeCheck(adapter, projectRoot, outsideRoot);

  await writeFile(sourcePath, Buffer.from("canonical", "utf8"));
  const observed = await read();
  assert.equal(observed.status, "ready");

  const malformedExpected = core.createSourceConflictPreviewFromRevisionCheck({
    conflictPreviewId: "invalid-token",
    affectedFiles: ["source.txt"],
    expectedSourceVersion: "sha256:9:not-a-digest",
    revisionReadResult: observed
  });
  await check("malformed expected tokens block preview", () => assert.equal(malformedExpected.status, "blocked"));

  const clean = core.createSourceConflictPreviewFromRevisionCheck({
    conflictPreviewId: "clean",
    affectedFiles: ["source.txt"],
    expectedSourceVersion: observed.sourceVersion,
    revisionReadResult: observed
  });
  await check("equal canonical revisions produce clean-preview", () => assert.equal(clean.status, "clean-preview"));

  const otherToken = core.formatSourceVersion(9, "0".repeat(64));
  const conflict = core.createSourceConflictPreviewFromRevisionCheck({
    conflictPreviewId: "conflict",
    affectedFiles: ["source.txt"],
    expectedSourceVersion: otherToken,
    revisionReadResult: observed
  });
  await check("different canonical revisions produce conflict-risk", () => assert.equal(conflict.status, "conflict-risk"));

  const unchecked = core.createSourceConflictPreviewFromRevisionCheck({
    conflictPreviewId: "unchecked",
    affectedFiles: ["source.txt"],
    revisionReadResult: observed
  });
  await check("missing expected evidence remains not-checked", () => assert.equal(unchecked.status, "not-checked"));

  const blockedRead = core.createSourceConflictPreviewFromRevisionCheck({
    conflictPreviewId: "blocked-read",
    affectedFiles: ["missing.txt"],
    expectedSourceVersion: observed.sourceVersion,
    revisionReadResult: missing
  });
  await check("typed read failures block preview without absolute path leakage", () => {
    assert.equal(blockedRead.status, "blocked");
    assert.equal(JSON.stringify(blockedRead).includes(projectRoot), false);
  });

  await check("canApplyWithoutRecheck is always false", () => {
    for (const preview of [malformedExpected, clean, conflict, unchecked, blockedRead]) {
      assert.equal(preview.canApplyWithoutRecheck, false);
    }
  });

  await check("token parser rejects non-canonical forms", () => {
    assert.equal(core.validateSourceVersion(`sha256:01:${"a".repeat(64)}`), false);
    assert.equal(core.validateSourceVersion(`sha256:1:${"A".repeat(64)}`), false);
    assert.equal(core.compareSourceVersions("bad", observed.sourceVersion).status, "invalid-expected");
    assert.equal(core.compareSourceVersions(observed.sourceVersion, "bad").status, "invalid-observed");
  });
}

async function runSymlinkEscapeCheck(adapter, projectRoot, outsideRoot) {
  const outsideFile = path.join(outsideRoot, "outside.txt");
  const linkPath = path.join(projectRoot, "outside-link.txt");
  await writeFile(outsideFile, "outside", "utf8");
  try {
    await symlink(outsideFile, linkPath, "file");
    const result = await adapter.readSourceRevision({ projectRoot, relativePath: "outside-link.txt", maxBytes: 1024 });
    await check("symlink escape is blocked", () => assert.equal(result.status, "outside-root"));
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (!["EPERM", "EACCES", "UNKNOWN"].includes(code)) throw error;
    symlinkEvidence = `containment helper fallback after ${String(code)}`;
    await check("canonical containment helper blocks simulated symlink escape", () => {
      assert.equal(adapter.isCanonicalPathInsideRoot(projectRoot, outsideFile), false);
    });
  }
}

async function runBoundaryChecks() {
  const coreRoot = path.join(repoRoot, "packages/core/source-conflict");
  const adapterPath = path.join(repoRoot, "packages/adapters/file-system/source-revision.adapter.ts");
  const coreFiles = await walkFiles(coreRoot, (file) => file.endsWith(".ts"));
  const adapterContent = await readFile(adapterPath, "utf8");

  await check("portable source-conflict core has no Node imports", async () => {
    for (const file of coreFiles) {
      const content = await readFile(file, "utf8");
      assert.equal(/from\s+["']node:|require\(["']node:/.test(content), false, path.relative(repoRoot, file));
    }
  });

  await check("adapter uses only approved Node modules", () => {
    const imports = [...adapterContent.matchAll(/from\s+["'](node:[^"']+)["']/g)].map((match) => match[1]);
    assert.deepEqual([...new Set(imports)].sort(), ["node:crypto", "node:fs/promises", "node:path"]);
  });

  await check("production foundation exposes no filesystem writes", async () => {
    const productionFiles = [...coreFiles, adapterPath];
    for (const file of productionFiles) {
      const content = await readFile(file, "utf8");
      assert.equal(/\b(?:writeFile|appendFile|truncate|rename|unlink|rm|mkdir)\s*\(/.test(content), false, path.relative(repoRoot, file));
    }
  });

  await check("no write, save, or apply IPC exists", async () => {
    const appsRoot = path.join(repoRoot, "apps/desktop/electron");
    const files = await walkFiles(appsRoot, (file) => /\.(?:ts|js|mjs|cjs)$/.test(file));
    const writeIpc = /ipc(?:Main|Renderer)\.(?:handle|on|invoke|send)\([^\n]*["'][^"']*(?:write|save|apply)[^"']*["']/i;
    for (const file of files) {
      const content = await readFile(file, "utf8");
      assert.equal(writeIpc.test(content), false, path.relative(repoRoot, file));
    }
  });

  await check("no patch application service exists in source-patch", async () => {
    const sourcePatchRoot = path.join(repoRoot, "packages/core/source-patch");
    const files = await walkFiles(sourcePatchRoot, (file) => file.endsWith(".ts"));
    const patchApplication = /\b(?:applyPatch|applySourcePatch|executePatch)\s*\(/;
    for (const file of files) {
      const content = await readFile(file, "utf8");
      assert.equal(patchApplication.test(content), false, path.relative(repoRoot, file));
    }
  });

  const packageJson = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
  await check("focused validator is registered without dependencies", () => {
    assert.equal(packageJson.scripts?.["validate:source-freshness-foundation"], "node scripts/validate-source-freshness-foundation.mjs");
    assert.equal(Object.prototype.hasOwnProperty.call(packageJson, "dependencies"), false);
  });

  const suite = await readFile(path.join(repoRoot, "scripts/validation/validation-suite.mjs"), "utf8");
  await check("focused validator is required in canonical quick and full suites", () => {
    assert.match(suite, /entry\("source-freshness-foundation",\s*"Source Freshness Foundation",\s*"core"/);
  });
}

async function check(label, operation) {
  checksExecuted += 1;
  try {
    await operation();
  } catch (error) {
    failures.push(`${label}: ${formatError(error)}`);
  }
}

async function walkFiles(root, predicate) {
  const result = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return result;
    throw error;
  }
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...await walkFiles(entryPath, predicate));
    else if (predicate(entryPath)) result.push(entryPath);
  }
  return result;
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
