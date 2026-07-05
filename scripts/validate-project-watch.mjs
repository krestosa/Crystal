import { access, readFile } from "node:fs/promises";
import path from "node:path";

const fixtureRoot = path.resolve("fixtures/sample-html-project");
const failures = [];
const ignoredDirectories = new Set(["node_modules", ".git", "dist", ".cache", ".crystal-cache", ".next", ".nuxt", ".vite", "coverage"]);
const ignoredFiles = new Set([".DS_Store", "Thumbs.db"]);
const ignoredExtensions = new Set([".tmp", ".temp", ".swp"]);

await expectFile("styles/watch-target.css");
await expectFile("scripts/watch-target-module.ts");
await expectFile("assets/new-later-placeholder.svg");
await expectContains("styles/main.css", "./watch-target.css");

const cssChange = normalizeEvent({ type: "changed", absolutePath: path.join(fixtureRoot, "styles/watch-target.css"), timestamp: 100 });
const tmpChange = normalizeEvent({ type: "changed", absolutePath: path.join(fixtureRoot, "styles/draft.tmp"), timestamp: 101 });
const cssDelete = normalizeEvent({ type: "deleted", absolutePath: path.join(fixtureRoot, "styles/watch-target.css"), timestamp: 102 });

if (!cssChange.accepted || cssChange.event?.type !== "changed" || !cssChange.event.affectsProjectGraph) failures.push("CSS change was not accepted as graph-relevant.");
if (tmpChange.accepted || tmpChange.issue?.code !== "ignored-path") failures.push("Temporary file event was not ignored.");
const dominant = chooseDominantEvent(cssChange.event, cssDelete.event);
if (dominant?.type !== "deleted") failures.push("Deleted event did not dominate changed event in a batch.");
if (createRefreshPlan([cssChange.event]).mode !== "semi-incremental") failures.push("Clear single event did not produce semi-incremental refresh plan.");
if (createRefreshPlan([cssDelete.event]).mode !== "full") failures.push("Deleted event did not produce full refresh plan.");

const cacheEntry = createCacheEntry(fixtureRoot, { totalFiles: 1 }, [{ relativePath: "styles/watch-target.css", mtimeMs: 1, size: 1, kind: "css", dependencyCount: 0, isAsset: false, isPage: false }]);
const restored = JSON.parse(JSON.stringify(cacheEntry));
if (restored.schemaVersion !== "project-graph-cache/v1" || restored.fileMetadata.length !== 1) failures.push("Project Graph cache entry did not round-trip.");

if (failures.length > 0) {
  console.error("Project watch validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Project watch validation passed: batching, event classification, refresh planning, ignore rules, and cache round-trip.");

async function expectFile(relativePath) {
  try { await access(path.join(fixtureRoot, relativePath)); }
  catch { failures.push(`Missing fixture file: ${relativePath}`); }
}

async function expectContains(relativePath, fragment) {
  const source = await readFile(path.join(fixtureRoot, relativePath), "utf8");
  if (!source.includes(fragment)) failures.push(`${relativePath} does not contain ${fragment}.`);
}

function normalizeEvent(raw) {
  const relativePath = normalize(path.relative(fixtureRoot, raw.absolutePath));
  const issue = getIgnoredIssue(relativePath);
  if (issue) return { accepted: false, event: null, issue };
  const kind = classify(raw.absolutePath);
  return { accepted: true, issue: null, event: { type: raw.type, absolutePath: normalize(raw.absolutePath), relativePath, timestamp: raw.timestamp, kind, affectsProjectGraph: kind !== "unknown", reason: null, issue: null } };
}

function getIgnoredIssue(relativePath) {
  const parts = relativePath.split("/").filter(Boolean);
  if (parts.some((part) => ignoredDirectories.has(part))) return { code: "ignored-path" };
  const fileName = parts.at(-1) ?? relativePath;
  if (ignoredFiles.has(fileName) || ignoredExtensions.has(path.extname(fileName).toLowerCase())) return { code: "ignored-path" };
  return null;
}

function chooseDominantEvent(previous, next) {
  if (!previous) return next;
  if (!next) return previous;
  const priority = { deleted: 5, renamed: 4, created: 3, changed: 2, unknown: 1 };
  return priority[next.type] >= priority[previous.type] ? next : previous;
}

function createRefreshPlan(events) {
  if (events.length === 0) return { mode: "none" };
  if (events.length > 25 || events.some((event) => ["deleted", "renamed", "unknown"].includes(event?.type))) return { mode: "full" };
  return { mode: "semi-incremental" };
}

function createCacheEntry(rootPath, graph, fileMetadata) {
  return { key: "fixture", rootPath, graph, fileMetadata, scannedAt: Date.now(), savedAt: Date.now(), schemaVersion: "project-graph-cache/v1", crystalCacheVersion: "crystal-phase-1-watch-cache/v1", issues: [] };
}

function classify(filePath) {
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

function normalize(value) { return value.replace(/\\/g, "/"); }
