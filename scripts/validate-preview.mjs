import { access, readFile } from "node:fs/promises";
import path from "node:path";

const fixtureRoot = path.resolve("fixtures/sample-html-project");
const failures = [];

await expectFile("preview.html");
await expectFile("styles/preview.css");
await expectFile("scripts/preview.js");
await expectFile("assets/preview-icon.svg");
await expectContains("preview.html", "./styles/preview.css");
await expectContains("preview.html", "./scripts/preview.js");
await expectContains("preview.html", "./assets/preview-icon.svg");

const previewPath = resolvePreviewPath(fixtureRoot, "preview.html");
const cssPath = resolvePreviewPath(fixtureRoot, "styles/preview.css");
const traversalPath = resolvePreviewPath(fixtureRoot, "../package.json");
const nestedTraversalPath = resolvePreviewPath(fixtureRoot, "styles/../../package.json");
const absolutePath = resolvePreviewPath(fixtureRoot, path.resolve("package.json"));

if (!previewPath.ok || previewPath.relativePath !== "preview.html") failures.push("Preview target did not resolve as a project-relative path.");
if (!cssPath.ok || cssPath.relativePath !== "styles/preview.css") failures.push("Preview CSS asset did not resolve as a project-relative path.");
if (traversalPath.ok || traversalPath.issue?.code !== "path-traversal") failures.push("Parent traversal path was not blocked.");
if (nestedTraversalPath.ok || nestedTraversalPath.issue?.code !== "path-traversal") failures.push("Nested traversal path was not blocked.");
if (absolutePath.ok || absolutePath.issue?.code !== "invalid-preview-path") failures.push("Absolute preview path was not blocked.");

const previewUrl = createPreviewUrl("preview.html", 123);
const parsedPreviewUrl = parsePreviewUrl(previewUrl);
const parsedAssetUrl = parsePreviewUrl(createPreviewUrl("assets/preview icon.svg", 124));
if (previewUrl !== "crystal-preview://current/preview.html?reload=123") failures.push("Preview URL format changed unexpectedly.");
if (!parsedPreviewUrl.ok || parsedPreviewUrl.relativePath !== "preview.html") failures.push("Preview URL did not parse back to a relative path.");
if (!parsedAssetUrl.ok || parsedAssetUrl.relativePath !== "assets/preview icon.svg") failures.push("Encoded preview URL did not decode correctly.");
if (parsePreviewUrl("file:///etc/passwd").ok) failures.push("Non-preview URL was accepted.");

if (getMimeType("index.html") !== "text/html; charset=utf-8") failures.push("HTML MIME type is incorrect.");
if (getMimeType("styles/preview.css") !== "text/css; charset=utf-8") failures.push("CSS MIME type is incorrect.");
if (getMimeType("scripts/preview.js") !== "application/javascript; charset=utf-8") failures.push("JavaScript MIME type is incorrect.");
if (getMimeType("assets/preview-icon.svg") !== "image/svg+xml") failures.push("SVG MIME type is incorrect.");
if (getMimeType("fonts/sample.woff2") !== "font/woff2") failures.push("WOFF2 MIME type is incorrect.");

const graph = createPreviewGraph();
const defaultTarget = selectTarget(graph, null);
const preferredTarget = selectTarget(graph, "preview.html");
const missingTarget = selectTarget(graph, "missing.html");
if (!defaultTarget.ok || defaultTarget.target?.relativePath !== "index.html") failures.push("Default preview target did not use the entrypoint page.");
if (!preferredTarget.ok || preferredTarget.target?.relativePath !== "preview.html") failures.push("Preferred preview target was not selected from the Project Graph.");
if (missingTarget.ok || missingTarget.issue?.code !== "target-not-in-graph") failures.push("Preview target outside Project Graph was accepted.");

const readyState = { status: "ready", target: preferredTarget.target };
const cssEvent = { type: "changed", relativePath: "styles/preview.css", previousRelativePath: null, kind: "css", affectsProjectGraph: true, timestamp: 1 };
const jsEvent = { type: "changed", relativePath: "scripts/preview.js", previousRelativePath: null, kind: "javascript", affectsProjectGraph: true, timestamp: 2 };
const ignoredEvent = { type: "changed", relativePath: "scratch.tmp", previousRelativePath: null, kind: "unknown", affectsProjectGraph: false, timestamp: 3 };
const unrelatedEvent = { type: "changed", relativePath: "docs/readme.txt", previousRelativePath: null, kind: "unknown", affectsProjectGraph: true, timestamp: 4 };

if (!shouldReloadPreview(readyState, [cssEvent], graph)) failures.push("CSS dependency change did not request preview reload.");
if (!shouldReloadPreview(readyState, [jsEvent], graph)) failures.push("JavaScript dependency change did not request preview reload.");
if (shouldReloadPreview(readyState, [ignoredEvent], graph)) failures.push("Ignored event requested preview reload.");
if (shouldReloadPreview(readyState, [unrelatedEvent], graph)) failures.push("Unrelated unknown event requested preview reload.");

const reloadKeyA = createReloadKey([cssEvent, jsEvent], 100);
const reloadKeyB = createReloadKey([jsEvent, cssEvent], 100);
if (reloadKeyA !== reloadKeyB) failures.push("Reload key is not stable across event ordering.");

if (failures.length > 0) {
  console.error("Preview validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Preview validation passed: target resolution, traversal blocking, MIME mapping, Project Graph target selection, URL handling, and watcher reload planning.");

async function expectFile(relativePath) {
  try { await access(path.join(fixtureRoot, relativePath)); }
  catch { failures.push(`Missing fixture file: ${relativePath}`); }
}

async function expectContains(relativePath, fragment) {
  const source = await readFile(path.join(fixtureRoot, relativePath), "utf8");
  if (!source.includes(fragment)) failures.push(`${relativePath} does not contain ${fragment}.`);
}

function resolvePreviewPath(rootPath, requestedRelativePath) {
  const normalized = normalizePreviewRelativePath(requestedRelativePath);
  if (!normalized.ok) return { ok: false, relativePath: null, absolutePath: null, issue: normalized.issue };
  const absolutePath = path.resolve(rootPath, normalized.relativePath);
  const relativeFromRoot = normalizePath(path.relative(rootPath, absolutePath));
  if (!relativeFromRoot || relativeFromRoot === ".." || relativeFromRoot.startsWith("../") || path.isAbsolute(relativeFromRoot)) return { ok: false, relativePath: normalized.relativePath, absolutePath, issue: { code: "outside-project-root" } };
  return { ok: true, relativePath: relativeFromRoot, absolutePath, issue: null };
}

function normalizePreviewRelativePath(requestedRelativePath) {
  if (typeof requestedRelativePath !== "string" || requestedRelativePath.trim().length === 0 || requestedRelativePath.includes("\0")) return { ok: false, relativePath: null, issue: { code: "invalid-preview-path" } };
  const normalizedSeparators = requestedRelativePath.replace(/\\/g, "/");
  if (normalizedSeparators.startsWith("/") || normalizedSeparators.startsWith("//") || /^[a-zA-Z]:[\\/]/.test(normalizedSeparators)) return { ok: false, relativePath: null, issue: { code: "invalid-preview-path" } };
  const normalizedPath = path.posix.normalize(normalizedSeparators);
  if (normalizedPath === "." || normalizedPath === ".." || normalizedPath.startsWith("../")) return { ok: false, relativePath: null, issue: { code: "path-traversal" } };
  return { ok: true, relativePath: normalizedPath, issue: null };
}

function normalizePath(value) {
  return value.replace(/\\/g, "/");
}

function createPreviewUrl(relativePath, reloadToken) {
  return `crystal-preview://current/${relativePath.split("/").map((segment) => encodeURIComponent(segment)).join("/")}?reload=${reloadToken}`;
}

function parsePreviewUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl); }
  catch { return { ok: false }; }
  if (url.protocol !== "crystal-preview:" || url.hostname !== "current") return { ok: false };
  const pathname = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  try { return { ok: true, relativePath: decodeURIComponent(pathname) }; }
  catch { return { ok: false }; }
}

function getMimeType(filePath) {
  return new Map([
    [".html", "text/html; charset=utf-8"],
    [".htm", "text/html; charset=utf-8"],
    [".css", "text/css; charset=utf-8"],
    [".js", "application/javascript; charset=utf-8"],
    [".mjs", "application/javascript; charset=utf-8"],
    [".cjs", "application/javascript; charset=utf-8"],
    [".svg", "image/svg+xml"],
    [".png", "image/png"],
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".webp", "image/webp"],
    [".woff", "font/woff"],
    [".woff2", "font/woff2"]
  ]).get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream";
}

function createPreviewGraph() {
  return {
    rootPath: fixtureRoot,
    pages: [
      { relativePath: "index.html", displayName: "index.html", isEntrypoint: true, dependencies: [] },
      { relativePath: "preview.html", displayName: "preview.html", isEntrypoint: false, dependencies: [
        { resolvedAbsolutePath: path.join(fixtureRoot, "styles/preview.css"), isExternal: false, status: "resolved" },
        { resolvedAbsolutePath: path.join(fixtureRoot, "scripts/preview.js"), isExternal: false, status: "resolved" },
        { resolvedAbsolutePath: path.join(fixtureRoot, "assets/preview-icon.svg"), isExternal: false, status: "resolved" }
      ] }
    ]
  };
}

function selectTarget(graph, preferredRelativePath) {
  const page = preferredRelativePath ? graph.pages.find((item) => item.relativePath === preferredRelativePath) : graph.pages.find((item) => item.isEntrypoint) ?? graph.pages[0];
  if (!page) return { ok: false, target: null, issue: { code: "target-not-in-graph" } };
  const resolved = resolvePreviewPath(graph.rootPath, page.relativePath);
  if (!resolved.ok) return { ok: false, target: null, issue: resolved.issue };
  return { ok: true, issue: null, target: { relativePath: resolved.relativePath, directDependencyRelativePaths: page.dependencies.map((dependency) => normalizePath(path.relative(graph.rootPath, dependency.resolvedAbsolutePath))) } };
}

function shouldReloadPreview(state, events, graph) {
  if (!state.target || state.status !== "ready") return false;
  const related = new Set([state.target.relativePath, ...state.target.directDependencyRelativePaths]);
  const relevantEvents = events.filter((event) => event.affectsProjectGraph);
  if (relevantEvents.length === 0) return false;
  if (relevantEvents.some((event) => related.has(event.relativePath) || related.has(event.previousRelativePath))) return true;
  return !graph.pages.some((page) => page.relativePath === state.target.relativePath);
}

function createReloadKey(events, refreshedAt) {
  return `${refreshedAt}:${events.map((event) => `${event.type}:${event.relativePath}:${event.timestamp}`).sort().join("|")}`;
}
