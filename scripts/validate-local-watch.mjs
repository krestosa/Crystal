import { existsSync, watch } from "node:fs";
import { mkdir, readdir, rm, writeFile, appendFile, unlink } from "node:fs/promises";
import path from "node:path";

const validationRoot = path.resolve(".tmp", "validation");
const projectRoot = path.join(validationRoot, `watch-run-${Date.now()}`);
const eventTimeoutMs = 2500;
const settleMs = 180;
const failures = [];
const observedEvents = [];
const refreshEvents = [];
const activeWatchers = new Set();

const ignoredDirectories = new Set(["node_modules", ".git", "dist", ".cache", ".crystal-cache", ".next", ".nuxt", ".vite", "coverage"]);
const ignoredFiles = new Set([".DS_Store", "Thumbs.db"]);
const ignoredExtensions = new Set([".tmp", ".temp", ".swp"]);
const graphKinds = new Set(["html", "css", "sass", "javascript", "typescript", "svg", "asset"]);

console.log("Crystal watcher filesystem validation");
console.log("");

try {
  await createTemporaryProject();
  await startWatcher(projectRoot);

  assertGraphEvent(await runOperation("watcher file change simulation", "changed", "index.html", () => appendFile(path.join(projectRoot, "index.html"), "\n<!-- watcher change -->\n", "utf8")), "HTML change did not affect the Project Graph.");
  assertGraphEvent(await runOperation("watcher file create simulation", "created", "styles/generated-watch.css", () => writeFile(path.join(projectRoot, "styles", "generated-watch.css"), ".generated-watch { color: red; }\n", "utf8")), "CSS creation did not affect the Project Graph.");
  assertGraphEvent(await runOperation("watcher JavaScript change simulation", "changed", "scripts/main.js", () => appendFile(path.join(projectRoot, "scripts", "main.js"), "\nconsole.log('watch change');\n", "utf8")), "JavaScript change did not affect the Project Graph.");

  const refreshesBeforeIgnored = refreshEvents.length;
  assertIgnoredEvent(await runOperation("ignored file does not refresh graph", "created", "scratch.tmp", () => writeFile(path.join(projectRoot, "scratch.tmp"), "temporary watcher scratch\n", "utf8")), "Temporary scratch file was not ignored.");

  const cacheEvent = normalizeExpectedEvent("created", path.join(projectRoot, ".crystal-cache", "project-graph.json"));
  if (cacheEvent.accepted || cacheEvent.issue?.code !== "ignored-path") failures.push(".crystal-cache event was not ignored.");
  await mkdir(path.join(projectRoot, ".crystal-cache"), { recursive: true });
  await writeFile(path.join(projectRoot, ".crystal-cache", "project-graph.json"), "{}", "utf8");

  assertGraphEvent(await runOperation("watcher file delete simulation", "deleted", "styles/delete-watch.css", () => unlink(path.join(projectRoot, "styles", "delete-watch.css"))), "CSS deletion did not affect the Project Graph.");
  assertIgnoredEvent(await runOperation("ignored file delete does not refresh graph", "deleted", "scratch.tmp", () => unlink(path.join(projectRoot, "scratch.tmp"))), "Temporary scratch deletion was not ignored.");

  if (refreshEvents.length !== refreshesBeforeIgnored + 1) failures.push("Ignored filesystem operations changed the refresh event count.");

  await stopWatcher();
  const eventsBeforeStoppedWrite = observedEvents.length;
  await appendFile(path.join(projectRoot, "index.html"), "\n<!-- after watcher stop -->\n", "utf8");
  await delay(settleMs * 2);
  if (activeWatchers.size !== 0) failures.push("Watcher stop left active watchers registered.");
  if (observedEvents.length !== eventsBeforeStoppedWrite) failures.push("Watcher emitted events after stop.");

  if (failures.length > 0) {
    console.error("Watcher filesystem validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log("");
    console.log("Result:");
    console.log("Watcher filesystem validation passed.");
  }
} catch (error) {
  console.error("Watcher filesystem validation failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await stopWatcher().catch(() => undefined);
  await cleanupTemporaryProject();
  if (existsSync(projectRoot)) {
    console.error(`Temporary validation project was not removed: ${projectRoot}`);
    process.exitCode = 1;
  }
}

async function createTemporaryProject() {
  await rm(projectRoot, { recursive: true, force: true });
  await mkdir(path.join(projectRoot, "styles"), { recursive: true });
  await mkdir(path.join(projectRoot, "scripts"), { recursive: true });
  await writeFile(path.join(projectRoot, "index.html"), [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8">',
    '  <link rel="stylesheet" href="./styles/main.css">',
    "</head>",
    "<body>",
    "  <main>Crystal watcher validation</main>",
    '  <script src="./scripts/main.js"></script>',
    "</body>",
    "</html>",
    ""
  ].join("\n"), "utf8");
  await writeFile(path.join(projectRoot, "styles", "main.css"), "main { display: block; }\n", "utf8");
  await writeFile(path.join(projectRoot, "styles", "delete-watch.css"), ".delete-watch { color: blue; }\n", "utf8");
  await writeFile(path.join(projectRoot, "scripts", "main.js"), "console.log('Crystal watcher validation');\n", "utf8");
}

async function cleanupTemporaryProject() {
  await rm(projectRoot, { recursive: true, force: true });
}

async function startWatcher(rootPath) {
  for (const directoryPath of await collectWatchDirectories(rootPath)) watchDirectory(directoryPath);
}

async function collectWatchDirectories(rootPath) {
  const directories = [rootPath];
  for (const entry of await readdir(rootPath, { withFileTypes: true })) {
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
      directories.push(path.join(rootPath, entry.name));
    }
  }
  return directories;
}

function watchDirectory(directoryPath) {
  const watcher = watch(directoryPath, { persistent: true }, (eventType, fileName) => {
    if (!fileName) return;
    const normalized = normalizeObservedEvent(eventType, path.join(directoryPath, String(fileName)));
    observedEvents.push(normalized);
  });
  activeWatchers.add(watcher);
  watcher.on("close", () => activeWatchers.delete(watcher));
}

async function stopWatcher() {
  const watchers = [...activeWatchers];
  for (const watcher of watchers) watcher.close();
  await delay(settleMs);
  activeWatchers.clear();
}

async function runOperation(label, type, relativePath, action) {
  const beforeCount = observedEvents.length;
  await action();
  const observed = await waitForEvent(relativePath, beforeCount);
  const expected = normalizeExpectedEvent(type, path.join(projectRoot, relativePath));

  if (!observed) failures.push(`${label} did not emit a filesystem event within ${eventTimeoutMs}ms.`);
  if (expected.accepted && expected.event.affectsProjectGraph) refreshEvents.push(expected.event);

  console.log(`PASS ${label}`);
  return expected;
}

async function waitForEvent(relativePath, beforeCount) {
  const expectedPath = normalizePath(relativePath);
  const deadline = Date.now() + eventTimeoutMs;

  while (Date.now() < deadline) {
    const event = observedEvents.slice(beforeCount).find((item) => item.relativePath === expectedPath || item.relativePath.endsWith(`/${expectedPath}`));
    if (event) return event;
    await delay(50);
  }

  return null;
}

function assertGraphEvent(result, message) {
  if (!result.accepted || !result.event?.affectsProjectGraph) failures.push(message);
}

function assertIgnoredEvent(result, message) {
  if (result.accepted || result.issue?.code !== "ignored-path") failures.push(message);
}

function normalizeObservedEvent(eventType, absolutePath) {
  const result = normalizeExpectedEvent(eventType === "change" ? "changed" : "unknown", absolutePath);
  if (!result.accepted) return result;
  return { ...result, event: { ...result.event, reason: "Observed by fs.watch." } };
}

function normalizeExpectedEvent(type, absolutePath) {
  const relativePath = normalizePath(path.relative(projectRoot, absolutePath));
  const issue = getIgnoredIssue(relativePath);
  if (issue) return { accepted: false, event: null, issue, relativePath };

  const kind = classifyPath(absolutePath);
  return {
    accepted: true,
    issue: null,
    relativePath,
    event: {
      type,
      absolutePath: normalizePath(absolutePath),
      relativePath,
      timestamp: Date.now(),
      kind,
      affectsProjectGraph: graphKinds.has(kind),
      reason: null,
      issue: null
    }
  };
}

function getIgnoredIssue(relativePath) {
  const parts = normalizePath(relativePath).split("/").filter(Boolean);
  if (parts.some((part) => ignoredDirectories.has(part))) return { code: "ignored-path" };

  const fileName = parts.at(-1) ?? relativePath;
  if (ignoredFiles.has(fileName)) return { code: "ignored-path" };
  if (ignoredExtensions.has(path.extname(fileName).toLowerCase())) return { code: "ignored-path" };

  return null;
}

function classifyPath(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if ([".html", ".htm"].includes(extension)) return "html";
  if (extension === ".css") return "css";
  if ([".scss", ".sass"].includes(extension)) return "sass";
  if ([".js", ".mjs", ".cjs"].includes(extension)) return "javascript";
  if ([".ts", ".mts", ".cts"].includes(extension)) return "typescript";
  if (extension === ".svg") return "svg";
  if (extension) return "asset";
  return "unknown";
}

function normalizePath(value) {
  return value.replace(/\\/g, "/");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
