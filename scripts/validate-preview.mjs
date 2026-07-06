import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("fixtures/sample-html-project");
const prefix = "crystal-preview://current/";
const loadIdParam = "crystalPreviewLoadId";
const failures = [];

for (const file of ["preview.html", "preview-missing-assets.html", "styles/preview.css", "scripts/preview.js", "assets/preview-icon.svg"]) await expectFile(file);
await expectContains("preview.html", "./styles/preview.css");
await expectContains("preview.html", "./scripts/preview.js");
await expectContains("preview.html", "./assets/preview-icon.svg");
await expectContains("preview-missing-assets.html", "./styles/missing-preview.css");
await expectContains("preview-missing-assets.html", "./scripts/missing-preview.js");
await expectContains("preview-missing-assets.html", "./assets/missing-preview-image.svg");

expect(resolvePath("preview.html").relativePath === "preview.html", "Preview target did not resolve as project-relative.");
expect(resolvePath("styles/preview.css").relativePath === "styles/preview.css", "Preview CSS asset did not resolve as project-relative.");
expect(resolvePath("assets/missing-preview-image.svg").relativePath === "assets/missing-preview-image.svg", "Missing asset path did not remain project-relative.");
expect(resolvePath("../package.json").issue?.code === "path-traversal", "Parent traversal path was not blocked.");
expect(resolvePath("styles/../../package.json").issue?.code === "path-traversal", "Nested traversal path was not blocked.");
expect(resolvePath(path.resolve("package.json")).issue?.code === "invalid-preview-path", "Absolute preview path was not blocked.");

const outsideIssue = issue("outside-project-root", "Preview resource resolves outside the active project root.", "styles/outside.css", "protocol", "warning", "load-current");
expect(outsideIssue.type === "outside-root", "outside-root issue type was not reported.");
expect(isOutside(root, path.resolve("package.json")), "Outside-root guard did not detect an out-of-root target.");

const previewUrl = makeUrl("preview.html", 123, "load-current");
const traversalUrl = parseUrl("crystal-preview://current/../package.json?reload=1&crystalPreviewLoadId=load-current");
expect(previewUrl === "crystal-preview://current/preview.html?reload=123&crystalPreviewLoadId=load-current", "Preview URL format did not include load id.");
expect(parseUrl(previewUrl).relativePath === "preview.html", "Preview URL did not parse back to relative path.");
expect(parseUrl(previewUrl).loadId === "load-current", "Preview URL did not parse back to load id.");
expect(parseUrl(makeUrl("assets/preview icon.svg", 124, "load-current")).relativePath === "assets/preview icon.svg", "Encoded preview URL did not decode correctly.");
expect(traversalUrl.relativePath === "../package.json", "Preview URL traversal path was normalized before diagnostics.");
expect(traversalUrl.loadId === "load-current", "Preview URL traversal lost load id diagnostics.");
expect(resolvePath(traversalUrl.relativePath).issue?.code === "path-traversal", "Preview URL traversal was not reportable.");
expect(sanitizeUrl(makeUrl("assets/preview icon.svg", 125, "load-current")) === "crystal-preview://current/assets/preview%20icon.svg", "Preview URL query data was not stripped.");
expect(loadIdFromUrl(makeUrl("preview.html", 126, "bad value")) === null, "Invalid load id was accepted.");
expect(!parseUrl("file:///etc/passwd").ok, "Non-preview URL was accepted.");

for (const [file, mime] of [["index.html", "text/html; charset=utf-8"], ["styles/preview.css", "text/css; charset=utf-8"], ["scripts/preview.js", "application/javascript; charset=utf-8"], ["assets/preview-icon.svg", "image/svg+xml"], ["fonts/sample.woff2", "font/woff2"]]) {
  const result = mimeResult(file);
  expect(result.mimeType === mime && !result.isFallback, `${file} MIME type is incorrect.`);
}
const fallbackMime = mimeResult("assets/sample.bin");
expect(fallbackMime.mimeType === "application/octet-stream" && fallbackMime.isFallback, "Unknown MIME fallback was not reported.");
expect(issue("unsupported-mime", "fallback", "assets/sample.bin", "protocol", "warning", "load-current").severity === "warning", "Unsupported MIME was not warning severity.");

const graph = graphFixture();
const defaultTarget = selectTarget(graph, null);
const preferredTarget = selectTarget(graph, "preview.html");
expect(defaultTarget.target?.relativePath === "index.html", "Default preview target did not use the entrypoint page.");
expect(preferredTarget.target?.relativePath === "preview.html", "Preferred preview target was not selected.");
expect(selectTarget(graph, "missing.html").issue?.code === "target-not-in-graph", "Target outside graph was accepted.");

const missingIssue = await missingResourceIssue("assets/missing-preview-image.svg", "load-current");
expect(missingIssue?.code === "file-not-found", "Missing preview asset did not produce file-not-found.");
expect(missingIssue?.loadId === "load-current", "Missing preview asset did not retain load id.");
expect(!JSON.stringify(missingIssue).includes(norm(root)), "Missing asset issue exposed root path.");
expect(!JSON.stringify(outsideIssue).includes(norm(path.resolve("package.json"))), "Outside-root issue exposed absolute path.");

const currentPreviewState = { status: "ready", target: preferredTarget.target, activeLoadId: "load-current" };
expect(acceptIssueForState(currentPreviewState, issue("file-not-found", "current", "assets/preview-icon.svg", "protocol", "error", "load-current")), "Current load asset issue was rejected.");
expect(!acceptIssueForState(currentPreviewState, issue("file-not-found", "stale", "assets/preview-icon.svg", "protocol", "error", "load-old")), "Stale load asset issue was accepted.");
expect(!acceptIssueForState(currentPreviewState, issue("file-not-found", "missing id", "assets/preview-icon.svg", "protocol")), "Asset issue without load id was accepted.");
expect(acceptIssueForState(currentPreviewState, issue("file-not-found", "current document", "preview.html", "protocol")), "Current document issue without load id was rejected.");
expect(!acceptIssueForState(currentPreviewState, issue("file-not-found", "previous document", "preview-missing-assets.html", "protocol")), "Previous document issue without load id was accepted.");

const coalesced = [missingIssue, missingIssue, missingIssue].filter(Boolean).reduce((issues, next) => merge(issues, next), []);
expect(coalesced.length === 1 && coalesced[0].count === 3, "Repeated issues were not coalesced.");
expect(count(coalesced) === 3, "Coalesced issue count is incorrect.");
const limited = Array.from({ length: 60 }, (_, index) => issue("file-not-found", `Missing ${index}`, `assets/missing-${index}.svg`, "protocol", "error", "load-current")).reduce((issues, next) => merge(issues, next), []);
expect(limited.length === 50, "Preview issues were not limited to 50 entries.");

const ready = { status: "ready", target: preferredTarget.target };
const cssEvent = event("changed", "styles/preview.css", "css", true, 1);
const jsEvent = event("changed", "scripts/preview.js", "javascript", true, 2);
expect(shouldReload(ready, [cssEvent], graph), "CSS dependency did not request reload.");
expect(shouldReload(ready, [jsEvent], graph), "JS dependency did not request reload.");
expect(!shouldReload(ready, [event("changed", "scratch.tmp", "unknown", false, 3)], graph), "Ignored event requested reload.");
expect(!shouldReload(ready, [event("changed", "docs/readme.txt", "unknown", true, 4)], graph), "Unrelated event requested reload.");
expect(reloadKey([cssEvent, jsEvent], 100) === reloadKey([jsEvent, cssEvent], 100), "Reload key is not stable.");

if (failures.length > 0) {
  console.error("Preview validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Preview validation passed: target resolution, blocked request diagnostics, missing asset reporting, MIME fallback reporting, load id issue filtering, issue coalescing, URL handling, and watcher reload planning.");

function expect(ok, message) { if (!ok) failures.push(message); }
async function expectFile(relativePath) { try { await access(path.join(root, relativePath)); } catch { failures.push(`Missing fixture file: ${relativePath}`); } }
async function expectContains(relativePath, fragment) { if (!(await readFile(path.join(root, relativePath), "utf8")).includes(fragment)) failures.push(`${relativePath} does not contain ${fragment}.`); }
async function missingResourceIssue(relativePath, loadId = null) { try { await access(path.join(root, relativePath)); return null; } catch { return issue("file-not-found", "Preview resource was not found inside the active project root.", relativePath, "protocol", "error", loadId); } }
function resolvePath(request) { const normalized = normalizeRequest(request); if (!normalized.ok) return { ok: false, issue: normalized.issue }; const absolutePath = path.resolve(root, normalized.relativePath); const relativePath = norm(path.relative(root, absolutePath)); if (!relativePath || relativePath === ".." || relativePath.startsWith("../") || path.isAbsolute(relativePath)) return { ok: false, issue: issue("outside-project-root", "Preview path resolves outside the active project root.", normalized.relativePath, "target") }; return { ok: true, relativePath, absolutePath, issue: null }; }
function normalizeRequest(request) { if (typeof request !== "string" || request.trim().length === 0 || request.includes("\0")) return { ok: false, issue: issue("invalid-preview-path", "Preview path is empty or invalid.", null, "target") }; const separators = request.replace(/\\/g, "/"); if (separators.startsWith("/") || separators.startsWith("//") || /^[a-zA-Z]:[\\/]/.test(separators)) return { ok: false, issue: issue("invalid-preview-path", "Preview path must be project-relative, not absolute.", request, "target") }; const normalizedPath = path.posix.normalize(separators); if (normalizedPath === "." || normalizedPath === ".." || normalizedPath.startsWith("../")) return { ok: false, issue: issue("path-traversal", "Preview path cannot traverse outside the project root.", request, "target") }; return { ok: true, relativePath: normalizedPath }; }
function norm(value) { return value.replace(/\\/g, "/"); }
function makeUrl(relativePath, reloadToken, loadId) { return `${prefix}${relativePath.split("/").map((part) => encodeURIComponent(part)).join("/")}?reload=${reloadToken}&${loadIdParam}=${encodeURIComponent(loadId)}`; }
function parseUrl(rawUrl) { if (!rawUrl.startsWith(prefix)) return { ok: false }; const encodedPath = encodedPathFromUrl(rawUrl); if (!encodedPath) return { ok: false }; try { return { ok: true, relativePath: decodeURIComponent(encodedPath), loadId: loadIdFromUrl(rawUrl) }; } catch { return { ok: false }; } }
function sanitizeUrl(rawUrl) { if (!rawUrl.startsWith(prefix)) return null; const encodedPath = encodedPathFromUrl(rawUrl); return encodedPath ? `${prefix}${encodedPath}` : null; }
function encodedPathFromUrl(rawUrl) { const value = rawUrl.slice(prefix.length); const q = value.indexOf("?"); const h = value.indexOf("#"); const cut = q < 0 ? h : h < 0 ? q : Math.min(q, h); return cut >= 0 ? value.slice(0, cut) : value; }
function queryFromUrl(rawUrl) { const value = rawUrl.slice(prefix.length); const q = value.indexOf("?"); if (q < 0) return null; const h = value.indexOf("#"); return value.slice(q + 1, h >= 0 && h > q ? h : value.length); }
function loadIdFromUrl(rawUrl) { if (!rawUrl.startsWith(prefix)) return null; const query = queryFromUrl(rawUrl); if (!query) return null; const value = new URLSearchParams(query).get(loadIdParam); return value && /^[a-zA-Z0-9._:-]{1,120}$/.test(value) ? value : null; }
function mimeResult(filePath) { const extension = path.extname(filePath).toLowerCase(); const mimeType = new Map([[".html", "text/html; charset=utf-8"], [".htm", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"], [".js", "application/javascript; charset=utf-8"], [".mjs", "application/javascript; charset=utf-8"], [".cjs", "application/javascript; charset=utf-8"], [".svg", "image/svg+xml"], [".png", "image/png"], [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".webp", "image/webp"], [".gif", "image/gif"], [".woff", "font/woff"], [".woff2", "font/woff2"]]).get(extension); return { extension, mimeType: mimeType ?? "application/octet-stream", isFallback: !mimeType }; }
function issue(code, message, relativePath, source, severity = severityFor(code), loadId = null) { const timestamp = Date.now(); return { code, type: typeFor(code), severity, message, path: relativePath, relativePath, requestUrl: null, loadId, reason: message, source, timestamp, lastSeenAt: timestamp, count: 1 }; }
function merge(issues, incoming) { const key = issueKey(incoming); const index = issues.findIndex((item) => issueKey(item) === key); if (index < 0) return [incoming, ...issues].slice(0, 50); const merged = { ...issues[index], lastSeenAt: incoming.lastSeenAt, count: issues[index].count + 1 }; return [merged, ...issues.slice(0, index), ...issues.slice(index + 1)].slice(0, 50); }
function issueKey(item) { return [item.loadId ?? "no-load", item.type, item.relativePath ?? item.path ?? item.requestUrl ?? "preview", item.reason].join("|"); }
function count(issues) { return issues.reduce((total, item) => total + item.count, 0); }
function typeFor(code) { if (code === "file-not-found") return "file-not-found"; if (code === "outside-project-root") return "outside-root"; if (code === "path-traversal") return "path-traversal"; if (["invalid-preview-path", "target-not-in-graph", "no-preview-target", "no-project-graph"].includes(code)) return "invalid-target"; if (code === "unsupported-mime") return "unsupported-mime"; if (["protocol-error", "no-project-root", "reload-skipped"].includes(code)) return "protocol-error"; return "unknown"; }
function severityFor(code) { if (code === "unsupported-mime") return "warning"; if (code === "reload-skipped") return "info"; return "error"; }
function isOutside(rootPath, targetPath) { const relativePath = path.relative(rootPath, targetPath); return relativePath === "" || relativePath === ".." || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath); }
function graphFixture() { return { rootPath: root, pages: [{ relativePath: "index.html", displayName: "index.html", isEntrypoint: true, dependencies: [] }, { relativePath: "preview.html", displayName: "preview.html", isEntrypoint: false, dependencies: [{ normalizedSpecifier: "./styles/preview.css", resolvedPath: "styles/preview.css", resolvedAbsolutePath: path.join(root, "styles/preview.css"), isExternal: false, status: "resolved" }, { normalizedSpecifier: "./scripts/preview.js", resolvedPath: "scripts/preview.js", resolvedAbsolutePath: path.join(root, "scripts/preview.js"), isExternal: false, status: "resolved" }, { normalizedSpecifier: "./assets/preview-icon.svg", resolvedPath: "assets/preview-icon.svg", resolvedAbsolutePath: path.join(root, "assets/preview-icon.svg"), isExternal: false, status: "resolved" }] }] }; }
function selectTarget(graph, preferred) { const page = preferred ? graph.pages.find((item) => item.relativePath === preferred) : graph.pages.find((item) => item.isEntrypoint) ?? graph.pages[0]; if (!page) return { ok: false, target: null, issue: issue("target-not-in-graph", "Requested preview target is not a page in the active Project Graph.", preferred, "target") }; const resolved = resolvePath(page.relativePath); if (!resolved.ok) return { ok: false, target: null, issue: resolved.issue }; return { ok: true, issue: null, target: { relativePath: resolved.relativePath, dependencies: page.dependencies, directDependencyRelativePaths: page.dependencies.map((dependency) => norm(path.relative(graph.rootPath, dependency.resolvedAbsolutePath))) } }; }
function acceptIssueForState(state, previewIssue) { if (previewIssue.source !== "protocol") return true; if (!state.target) return false; const issuePath = normalizeIssuePath(previewIssue.relativePath ?? previewIssue.path); if (!issuePath) return false; const targetPath = normalizeIssuePath(state.target.relativePath); if (issuePath === targetPath) return !previewIssue.loadId || previewIssue.loadId === state.activeLoadId; if (!previewIssue.loadId || previewIssue.loadId !== state.activeLoadId) return false; if (state.target.directDependencyRelativePaths.some((relativePath) => normalizeIssuePath(relativePath) === issuePath)) return true; return state.target.dependencies.some((dependency) => normalizeIssuePath(dependency.resolvedPath) === issuePath || resolveDependency(state.target.relativePath, dependency.normalizedSpecifier) === issuePath); }
function normalizeIssuePath(value) { if (!value) return null; const normalized = path.posix.normalize(value.replace(/\\/g, "/").replace(/^\.\//, "")); if (!normalized || normalized === "." || normalized.startsWith("../") || normalized === ".." || path.posix.isAbsolute(normalized)) return null; return normalized; }
function resolveDependency(fromPath, specifier) { if (!specifier || specifier.startsWith("#") || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(specifier)) return null; const base = path.posix.dirname(normalizeIssuePath(fromPath) ?? ""); return normalizeIssuePath(specifier.startsWith("/") ? specifier.slice(1) : path.posix.join(base === "." ? "" : base, specifier)); }
function event(type, relativePath, kind, affectsProjectGraph, timestamp) { return { type, relativePath, previousRelativePath: null, kind, affectsProjectGraph, timestamp }; }
function shouldReload(state, events, graph) { if (!state.target || state.status !== "ready") return false; const related = new Set([state.target.relativePath, ...state.target.directDependencyRelativePaths]); const relevant = events.filter((item) => item.affectsProjectGraph); if (relevant.length === 0) return false; if (relevant.some((item) => related.has(item.relativePath) || related.has(item.previousRelativePath))) return true; return !graph.pages.some((page) => page.relativePath === state.target.relativePath); }
function reloadKey(events, refreshedAt) { return `${refreshedAt}:${events.map((item) => `${item.type}:${item.relativePath}:${item.timestamp}`).sort().join("|")}`; }
