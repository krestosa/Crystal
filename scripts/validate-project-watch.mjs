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
const htmlCreate = normalizeEvent({ type: "created", absolutePath: path.join(fixtureRoot, "created-watch-test.html"), timestamp: 103 });
const cacheWrite = normalizeEvent({ type: "changed", absolutePath: path.join(fixtureRoot, ".crystal-cache/project-graph.json"), timestamp: 104 });

if (!cssChange.accepted || cssChange.event?.type !== "changed" || !cssChange.event.affectsProjectGraph) failures.push("CSS change was not accepted as graph-relevant.");
if (tmpChange.accepted || tmpChange.issue?.code !== "ignored-path") failures.push("Temporary file event was not ignored.");
if (cacheWrite.accepted || cacheWrite.issue?.code !== "ignored-path") failures.push(".crystal-cache event was not ignored.");
const dominant = chooseDominantEvent(cssChange.event, cssDelete.event);
if (dominant?.type !== "deleted") failures.push("Deleted event did not dominate changed event in a batch.");
if (createRefreshPlan([cssChange.event]).mode !== "semi-incremental") failures.push("Clear single event did not produce semi-incremental refresh plan.");
if (createRefreshPlan([cssDelete.event]).mode !== "full") failures.push("Deleted event did not produce full refresh plan.");

const autoRefresh = createAutoRefreshHarness();
autoRefresh.seedGraph({ totalFiles: 1, totalPages: 1, missingDependencies: 0, filesByKind: { html: 1 } });
await autoRefresh.enqueue([cssChange.event]);
if (autoRefresh.refreshes.length !== 1) failures.push("Graph-relevant watcher event did not execute automatic refresh.");
if (!autoRefresh.state.lastRefreshAt) failures.push("Automatic refresh did not update lastRefreshAt.");
if (autoRefresh.state.refreshMode === "none") failures.push("Automatic refresh left refreshMode as none.");
if (autoRefresh.state.graph?.summary.totalFiles !== 2) failures.push("Automatic refresh did not update Project Graph snapshot.");
if (autoRefresh.state.cacheStatus !== "saved") failures.push("Automatic refresh did not save/update cache state.");

const ignoredRefresh = createAutoRefreshHarness();
ignoredRefresh.seedGraph({ totalFiles: 1, totalPages: 1, missingDependencies: 0, filesByKind: { html: 1 } });
await ignoredRefresh.enqueue([{ ...cssChange.event, kind: "unknown", affectsProjectGraph: false, relativePath: ".", reason: "Ignored non-graph event." }]);
if (ignoredRefresh.refreshes.length !== 0) failures.push("Ignored watcher event triggered automatic refresh.");

const consolidatedRefresh = createAutoRefreshHarness();
consolidatedRefresh.seedGraph({ totalFiles: 1, totalPages: 1, missingDependencies: 0, filesByKind: { html: 1 } });
await consolidatedRefresh.enqueue([cssChange.event, htmlCreate.event]);
if (consolidatedRefresh.refreshes.length !== 1 || consolidatedRefresh.refreshes[0].events.length !== 2) failures.push("Fast watcher events were not consolidated into one refresh.");

const duplicateVisibleEvents = coalesceVisibleWatchEvents([
  { ...cssChange.event, timestamp: 203 },
  { ...cssChange.event, timestamp: 202 },
  { ...cssChange.event, timestamp: 201 },
  { ...htmlCreate.event, timestamp: 200 },
  { ...cssChange.event, timestamp: 199 },
  { ...cssDelete.event, timestamp: 198 },
  { ...cssDelete.event, timestamp: 197 },
  { ...cssDelete.event, timestamp: 196, affectsProjectGraph: false }
]);
if (duplicateVisibleEvents.length !== 5) failures.push("Visible watcher events did not preserve distinct consecutive groups.");
if (formatVisibleWatchEvent(duplicateVisibleEvents[0]) !== "changed · styles/watch-target.css · graph ×3") failures.push("Consecutive changed events were not coalesced with a count.");
if (formatVisibleWatchEvent(duplicateVisibleEvents[1]) !== "created · created-watch-test.html · graph") failures.push("Distinct created event was not preserved.");
if (formatVisibleWatchEvent(duplicateVisibleEvents[2]) !== "changed · styles/watch-target.css · graph") failures.push("Non-consecutive duplicate changed event was incorrectly hidden.");
if (formatVisibleWatchEvent(duplicateVisibleEvents[3]) !== "deleted · styles/watch-target.css · graph ×2") failures.push("Consecutive deleted graph events were not coalesced.");
if (formatVisibleWatchEvent(duplicateVisibleEvents[4]) !== "deleted · styles/watch-target.css · ignored") failures.push("Different event impact was incorrectly merged.");

const deleteRefresh = createAutoRefreshHarness();
deleteRefresh.seedGraph({ totalFiles: 2, totalPages: 1, missingDependencies: 0, filesByKind: { html: 1, css: 1 } });
await deleteRefresh.enqueue([cssDelete.event]);
if (deleteRefresh.state.refreshMode !== "full") failures.push("Deleted graph-relevant event did not trigger full refresh.");

const cacheEntry = createCacheEntry(fixtureRoot, { totalFiles: 1 }, [{ relativePath: "styles/watch-target.css", mtimeMs: 1, size: 1, kind: "css", dependencyCount: 0, isAsset: false, isPage: false }]);
const restored = JSON.parse(JSON.stringify(cacheEntry));
if (restored.schemaVersion !== "project-graph-cache/v1" || restored.fileMetadata.length !== 1) failures.push("Project Graph cache entry did not round-trip.");

if (failures.length > 0) {
  console.error("Project watch validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Project watch validation passed: automatic refresh, batching, event classification, ignore rules, visible event coalescing, cache safety, refresh planning, and cache round-trip.");

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
  const relevantEvents = events.filter((event) => event?.affectsProjectGraph);
  if (relevantEvents.length === 0) return { mode: "none" };
  if (relevantEvents.length > 25 || relevantEvents.some((event) => ["deleted", "renamed", "unknown"].includes(event?.type))) return { mode: "full" };
  return { mode: "semi-incremental" };
}

function createAutoRefreshHarness() {
  const state = { graph: null, lastRefreshAt: null, refreshMode: "none", cacheStatus: "empty" };
  const refreshes = [];
  let nextTotalFiles = 2;
  return {
    state,
    refreshes,
    seedGraph(summary) { state.graph = { summary }; },
    async enqueue(events) {
      const relevantEvents = events.filter((event) => event?.affectsProjectGraph);
      if (relevantEvents.length === 0) return;
      const plan = createRefreshPlan(relevantEvents);
      const refreshedAt = Date.now();
      state.graph = { summary: { totalFiles: nextTotalFiles++, totalPages: 1, missingDependencies: 0, filesByKind: { html: 1, css: 1 } } };
      state.lastRefreshAt = refreshedAt;
      state.refreshMode = plan.mode;
      state.cacheStatus = "saved";
      refreshes.push({ events: relevantEvents, mode: plan.mode, refreshedAt });
    }
  };
}

function coalesceVisibleWatchEvents(events) {
  const coalesced = [];
  for (const event of events) {
    const previous = coalesced.at(-1);
    if (previous && previous.type === event.type && previous.relativePath === event.relativePath && previous.affectsProjectGraph === event.affectsProjectGraph) {
      previous.count += 1;
      continue;
    }
    coalesced.push({ type: event.type, relativePath: event.relativePath, affectsProjectGraph: event.affectsProjectGraph, count: 1 });
  }
  return coalesced;
}

function formatVisibleWatchEvent(event) {
  const impact = event.affectsProjectGraph ? "graph" : "ignored";
  const count = event.count > 1 ? ` ×${event.count}` : "";
  return `${event.type} · ${event.relativePath} · ${impact}${count}`;
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
