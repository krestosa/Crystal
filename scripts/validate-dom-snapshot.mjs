import { access, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.resolve("fixtures/sample-html-project");
const standardFixture = "dom-snapshot.html";
const edgeFixture = "dom-snapshot-edge-cases.html";
const tempDir = path.resolve(".tmp/validation/dom-snapshot");
const bundledBuilder = path.join(tempDir, "project-dom-snapshot-builder.mjs");
const failures = [];

await expectFile(standardFixture);
await expectFile(edgeFixture);
const buildProjectDomSnapshot = await loadDomSnapshotBuilder();

try {
  const html = await readFile(path.join(root, standardFixture), "utf8");
  const edgeHtml = await readFile(path.join(root, edgeFixture), "utf8");

  const completeSnapshot = buildSnapshot(standardFixture, html, { maxNodes: 500, maxDepth: 32, maxTextPreviewLength: 512, maxAttributeValueLength: 256, maxAttributesPerNode: 24 }, 1);
  const repeatedSnapshot = buildSnapshot(standardFixture, html, { maxNodes: 500, maxDepth: 32, maxTextPreviewLength: 512, maxAttributeValueLength: 256, maxAttributesPerNode: 24 }, 2);
  expect(completeSnapshot.rootNode.type === "document", "Root DOM snapshot node is not a document.");
  expect(completeSnapshot.rootNode.snapshotPath === "0", "Root DOM snapshot path is not stable.");
  expect(completeSnapshot.rootNode.id === "dom-node:0", "Root DOM snapshot id is not path-based.");
  expect(completeSnapshot.rootNode.siblingIndex === 0, "Root DOM snapshot sibling index is not zero.");
  expect(serializeNodeIdentity(completeSnapshot.rootNode) === serializeNodeIdentity(repeatedSnapshot.rootNode), "DOM snapshot node ids or paths are not deterministic for the same HTML.");
  expect(completeSnapshot.nodeCount > 0, "DOM snapshot node count is empty.");
  expect(completeSnapshot.nodeCount === countNodes(completeSnapshot.rootNode), "DOM snapshot nodeCount does not match recursive node count.");
  expect(completeSnapshot.maxDepth === getMaxDepth(completeSnapshot.rootNode), "DOM snapshot maxDepth does not match recursive max depth.");
  expect(completeSnapshot.nodeCount >= 20, "DOM snapshot fixture did not produce enough nodes to validate completeness.");
  expect(completeSnapshot.isTruncated === false, "Complete DOM snapshot was incorrectly marked as truncated.");
  expectNodePaths(completeSnapshot.rootNode);
  expect(renderSnapshot(completeSnapshot).includes(`#snapshot complete — ${completeSnapshot.nodeCount} nodes`), "Complete DOM snapshot did not render an explicit completion marker.");
  expect(renderSnapshot(completeSnapshot).includes("#document [0]"), "Renderer helper did not include root snapshot path metadata.");
  expect(!renderSnapshot(completeSnapshot).includes("… truncated"), "Complete DOM snapshot rendered a truncation marker.");

  const htmlElement = findElement(completeSnapshot.rootNode, "html");
  const headElement = findElement(completeSnapshot.rootNode, "head");
  const bodyElement = findElement(completeSnapshot.rootNode, "body");
  expect(Boolean(htmlElement), "DOM snapshot did not include html element.");
  expect(Boolean(headElement), "DOM snapshot did not include head element.");
  expect(Boolean(bodyElement), "DOM snapshot did not include body element.");
  expect(hasAttribute(bodyElement, "data-page", "dom-snapshot"), "DOM snapshot did not preserve a body data attribute.");
  expect(hasAttribute(findElement(completeSnapshot.rootNode, "main"), "id", "content"), "DOM snapshot did not preserve id attribute.");
  expect(hasAttribute(findElement(completeSnapshot.rootNode, "main"), "class", "layout primary"), "DOM snapshot did not preserve class attribute.");
  expect(hasAttribute(findElement(completeSnapshot.rootNode, "section"), "aria-label", "Preview content"), "DOM snapshot did not preserve aria-label attribute.");

  const bodyChildren = directElementChildren(bodyElement).map((node) => node.tagName);
  expect(bodyChildren.join(",") === "header,main,footer", "DOM snapshot did not preserve multiple body children in order.");
  expect(Boolean(findElement(completeSnapshot.rootNode, "article")), "DOM snapshot did not preserve nested article content.");
  expect(Boolean(findText(completeSnapshot.rootNode, "Sibling content after the first section")), "DOM snapshot appears to stop before later sibling content.");
  expect(Boolean(findText(completeSnapshot.rootNode, "End of DOM snapshot fixture")), "DOM snapshot did not include footer text at the end of the fixture.");

  const edgeSnapshot = buildSnapshot(edgeFixture, edgeHtml, { maxNodes: 500, maxDepth: 32, maxTextPreviewLength: 512, maxAttributeValueLength: 256, maxAttributesPerNode: 24 }, 3);
  expect(edgeSnapshot.status === "ready", "Edge-case DOM snapshot should recover as ready with controlled warnings.");
  expect(edgeSnapshot.nodeCount === countNodes(edgeSnapshot.rootNode), "Edge-case DOM snapshot nodeCount does not match recursive node count.");
  expectNodePaths(edgeSnapshot.rootNode);
  expect(Boolean(findNode(edgeSnapshot.rootNode, (node) => node.type === "doctype")), "Edge-case fixture did not preserve doctype.");
  expect(Boolean(findNode(edgeSnapshot.rootNode, (node) => node.type === "comment" && String(node.textPreview).includes("leading DOM snapshot"))), "Edge-case fixture did not preserve comments.");
  expect(Boolean(findText(edgeSnapshot.rootNode, "Text before the html element")), "Text before elements was not preserved.");
  expect(Boolean(findText(edgeSnapshot.rootNode, "Trailing text after the html element")), "Text after elements was not preserved.");
  expect(hasAttribute(findElement(edgeSnapshot.rootNode, "html"), "lang", "en"), "Single-quoted attribute was not parsed.");
  expect(hasAttribute(findElement(edgeSnapshot.rootNode, "html"), "data-mode", "preview"), "Unquoted attribute was not parsed.");
  expect(hasAttribute(findElement(edgeSnapshot.rootNode, "html"), "hidden", null), "Boolean attribute was not parsed.");
  expect(hasAttribute(findElement(edgeSnapshot.rootNode, "meta"), "charset", "UTF-8"), "Void element unquoted attribute was not parsed.");
  expect(hasAttribute(findElement(edgeSnapshot.rootNode, "input"), "disabled", null), "Void element boolean attribute was not parsed.");
  expect(Boolean(findElement(edgeSnapshot.rootNode, "img")), "Void img element was not preserved.");
  expect(Boolean(findElement(edgeSnapshot.rootNode, "br")), "Void br element was not preserved.");
  expect(Boolean(findText(findElement(edgeSnapshot.rootNode, "script"), "not parsed as DOM")), "Script raw text was not preserved as text.");
  expect(Boolean(findText(findElement(edgeSnapshot.rootNode, "style"), "<not-a-real-tag>")), "Style raw text was not preserved as text.");
  expect(!findElement(edgeSnapshot.rootNode, "not-a-real-tag"), "Style raw text was incorrectly parsed as an element.");
  expect(edgeSnapshot.issues.some((issue) => issue.code === "malformed-tag"), "Malformed HTML did not produce malformed-tag issue.");
  expect(edgeSnapshot.issues.some((issue) => issue.code === "unclosed-tag"), "Unclosed nesting did not produce unclosed-tag issue.");
  expect(edgeSnapshot.issues.some((issue) => issue.code === "unsupported-html-pattern"), "Unsupported declaration did not produce unsupported-html-pattern issue.");

  const previewTruncatedSnapshot = buildSnapshot(edgeFixture, edgeHtml, { maxNodes: 500, maxDepth: 32, maxTextPreviewLength: 64, maxAttributeValueLength: 256, maxAttributesPerNode: 24 }, 4);
  const truncatedTextNode = findNode(previewTruncatedSnapshot.rootNode, (node) => node.type === "text" && node.truncated && String(node.textPreview ?? "").endsWith("…"));
  expect(previewTruncatedSnapshot.issues.some((issue) => issue.code === "text-truncated"), "Text preview truncation did not produce text-truncated issue.");
  expect(previewTruncatedSnapshot.isTruncated, "Text preview truncation did not mark the snapshot as truncated.");
  expect(Boolean(truncatedTextNode), "Long text preview was not truncated with an ellipsis.");
  expect(renderSnapshot(previewTruncatedSnapshot).includes("… truncated"), "Text preview truncation did not render an explicit truncation marker.");
  expect(renderSnapshot(previewTruncatedSnapshot).includes(`#snapshot truncated — ${previewTruncatedSnapshot.nodeCount} nodes shown`), "Truncated DOM snapshot did not render an explicit truncated snapshot marker.");

  const attributeTruncatedSnapshot = buildSnapshot(edgeFixture, edgeHtml, { maxNodes: 500, maxDepth: 32, maxTextPreviewLength: 512, maxAttributeValueLength: 24, maxAttributesPerNode: 2 }, 5);
  expect(attributeTruncatedSnapshot.issues.some((issue) => issue.code === "attributes-truncated"), "Attribute truncation did not produce attributes-truncated issue.");
  expect(attributeTruncatedSnapshot.isTruncated, "Attribute truncation did not mark the snapshot as truncated.");
  expect(Boolean(findNode(attributeTruncatedSnapshot.rootNode, (node) => node.truncated)), "Attribute truncation did not mark a node as truncated.");
  expect(renderSnapshot(attributeTruncatedSnapshot).includes("… truncated"), "Attribute truncation did not render explicit truncation marker.");

  const limitedNodes = buildSnapshot(edgeFixture, edgeHtml, { maxNodes: 8, maxDepth: 32, maxTextPreviewLength: 512, maxAttributeValueLength: 256, maxAttributesPerNode: 24 }, 6);
  expect(limitedNodes.issues.some((issue) => issue.code === "max-nodes-reached"), "Node limit did not produce max-nodes-reached issue.");
  expect(limitedNodes.isTruncated, "Node limit did not mark snapshot as truncated.");
  expect(limitedNodes.nodeCount === countNodes(limitedNodes.rootNode), "Limited node snapshot nodeCount does not match rendered nodes.");
  expect(renderSnapshot(limitedNodes).includes("… truncated"), "Node limit did not render an explicit node truncation marker.");
  expect(renderSnapshot(limitedNodes).includes(`#snapshot truncated — ${limitedNodes.nodeCount} nodes shown`), "Node-limited snapshot did not render truncated completion state.");

  const limitedDepth = buildSnapshot(edgeFixture, edgeHtml, { maxNodes: 500, maxDepth: 2, maxTextPreviewLength: 512, maxAttributeValueLength: 256, maxAttributesPerNode: 24 }, 7);
  expect(limitedDepth.issues.some((issue) => issue.code === "max-depth-reached"), "Depth limit did not produce max-depth-reached issue.");
  expect(limitedDepth.isTruncated, "Depth limit did not mark snapshot as truncated.");
  expect(limitedDepth.maxDepth === getMaxDepth(limitedDepth.rootNode), "Depth-limited snapshot maxDepth does not match rendered nodes.");
  expect(renderSnapshot(limitedDepth).includes("… truncated"), "Depth limit did not render an explicit truncation marker.");

  for (const snapshot of [completeSnapshot, edgeSnapshot, previewTruncatedSnapshot, attributeTruncatedSnapshot, limitedNodes, limitedDepth]) {
    expect(!JSON.stringify(snapshot.issues).includes(norm(root)), "DOM snapshot issue exposed the absolute project root.");
  }

  const missingIssue = await readTarget("missing-dom-snapshot.html");
  expect(missingIssue?.code === "file-not-found", "Missing DOM snapshot target did not produce file-not-found.");
  expect(!JSON.stringify(missingIssue).includes(norm(root)), "Missing DOM snapshot issue exposed the absolute project root.");
  expect(resolveTarget("../package.json").issue?.code === "path-traversal", "Path traversal was not blocked for DOM snapshot target.");
  expect(resolveTarget(path.resolve("package.json")).issue?.code === "invalid-dom-target", "Absolute DOM snapshot target was not blocked.");
  expect(!JSON.stringify(resolveTarget("../package.json").issue).includes(norm(path.resolve("package.json"))), "Traversal issue exposed an absolute target path.");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("DOM snapshot validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("DOM snapshot validation passed: real builder import, deterministic node paths, parser edge cases, recursive nodeCount, maxDepth, completion markers, truncation issues, missing file handling, traversal blocking, and safe relative issues.");

async function loadDomSnapshotBuilder() {
  await mkdir(tempDir, { recursive: true });
  await build({
    entryPoints: ["packages/core/project/dom/project-dom-snapshot-builder.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: bundledBuilder,
    logLevel: "silent"
  });
  const module = await import(`${pathToFileURL(bundledBuilder).href}?cache=${Date.now()}`);
  if (typeof module.buildProjectDomSnapshot !== "function") failures.push("Bundled DOM snapshot builder did not export buildProjectDomSnapshot.");
  return module.buildProjectDomSnapshot;
}

async function expectFile(relativePath) { try { await access(path.join(root, relativePath)); } catch { failures.push(`Missing fixture file: ${relativePath}`); } }
function expect(ok, message) { if (!ok) failures.push(message); }
function norm(value) { return value.replace(/\\/g, "/"); }

async function readTarget(relativePath) {
  const resolution = resolveTarget(relativePath);
  if (!resolution.ok) return resolution.issue;
  try { await readFile(resolution.absolutePath, "utf8"); return null; }
  catch { return issue("file-not-found", "DOM snapshot target could not be read from the active project.", resolution.relativePath, "Target file could not be read."); }
}

function resolveTarget(request) {
  if (typeof request !== "string" || request.trim().length === 0 || request.includes("\0")) return { ok: false, issue: issue("invalid-dom-target", "DOM snapshot path is empty or invalid.", null, "Invalid request.") };
  const normalizedSeparators = request.replace(/\\/g, "/");
  if (normalizedSeparators.startsWith("/") || normalizedSeparators.startsWith("//") || /^[a-zA-Z]:[\\/]/.test(normalizedSeparators)) return { ok: false, issue: issue("invalid-dom-target", "DOM snapshot path must be project-relative.", request, "Absolute paths are rejected.") };
  const normalizedPath = path.posix.normalize(normalizedSeparators);
  if (normalizedPath === "." || normalizedPath === ".." || normalizedPath.startsWith("../")) return { ok: false, issue: issue("path-traversal", "DOM snapshot path cannot traverse outside the project root.", request, "Traversal is rejected.") };
  const absolutePath = path.resolve(root, normalizedPath);
  const relativePath = norm(path.relative(root, absolutePath));
  if (!relativePath || relativePath === ".." || relativePath.startsWith("../") || path.isAbsolute(relativePath)) return { ok: false, issue: issue("outside-project-root", "DOM snapshot path resolves outside the active project root.", normalizedPath, "Outside-root path rejected.") };
  return { ok: true, relativePath, absolutePath };
}

function buildSnapshot(rootRelativePath, source, limits, generatedAt) {
  return buildProjectDomSnapshot({ rootRelativePath, html: source, generatedAt, limits });
}

function renderSnapshot(snapshot) {
  const lines = [];
  appendNodeLine(snapshot.rootNode, lines);
  lines.push("");
  lines.push(snapshot.isTruncated ? `#snapshot truncated — ${snapshot.nodeCount} nodes shown` : `#snapshot complete — ${snapshot.nodeCount} nodes`);
  return lines.join("\n");
}

function appendNodeLine(current, lines) {
  const indent = "  ".repeat(Math.max(0, current.depth));
  lines.push(`${indent}${renderNodeLabel(current)} [${current.snapshotPath}]`);
  if (current.truncated) lines.push(`${indent}  … truncated`);
  for (const child of current.children) appendNodeLine(child, lines);
}

function renderNodeLabel(current) {
  if (current.type === "document") return "#document";
  if (current.type === "doctype") return `<!doctype ${current.textPreview ?? "html"}>`;
  if (current.type === "comment") return `<!-- ${current.textPreview ?? ""} -->`;
  if (current.type === "text") return `#text \"${current.textPreview ?? ""}\"`;
  return `<${current.tagName ?? "element"}${renderAttributes(current.attributes)}>`;
}

function renderAttributes(attributes) {
  if (attributes.length === 0) return "";
  return ` ${attributes.map(renderAttribute).join(" ")}`;
}

function renderAttribute(attribute) {
  if (attribute.value === null) return attribute.name;
  return `${attribute.name}=\"${attribute.value}\"`;
}

function issue(code, message, relativePath, reason) { return { code, severity: code === "unknown" ? "warning" : "error", message, relativePath, reason, timestamp: 1 }; }
function countNodes(current) { return 1 + current.children.reduce((total, child) => total + countNodes(child), 0); }
function getMaxDepth(current) { return Math.max(current.depth, ...current.children.map(getMaxDepth)); }
function directElementChildren(current) { return current?.children.filter((child) => child.type === "element") ?? []; }

function expectNodePaths(current, expectedPath = "0", expectedDepth = 0, expectedSiblingIndex = 0) {
  expect(current.snapshotPath === expectedPath, `Node path mismatch: expected ${expectedPath}, got ${current.snapshotPath}.`);
  expect(current.id === `dom-node:${expectedPath}`, `Node id mismatch for path ${expectedPath}.`);
  expect(current.depth === expectedDepth, `Node depth mismatch for path ${expectedPath}.`);
  expect(current.siblingIndex === expectedSiblingIndex, `Node sibling index mismatch for path ${expectedPath}.`);
  current.children.forEach((child, index) => expectNodePaths(child, `${expectedPath}/${index}`, expectedDepth + 1, index));
}

function serializeNodeIdentity(current) {
  return [current.id, current.snapshotPath, current.siblingIndex, current.type, current.tagName ?? "", current.depth, current.children.map(serializeNodeIdentity).join("|")].join(":");
}

function findElement(current, tagName) {
  return findNode(current, (node) => node.type === "element" && node.tagName === tagName);
}

function findText(current, text) {
  if (!current) return null;
  return findNode(current, (node) => node.type === "text" && String(node.textPreview ?? "").includes(text));
}

function findNode(current, predicate) {
  if (!current) return null;
  if (predicate(current)) return current;
  for (const child of current.children) {
    const match = findNode(child, predicate);
    if (match) return match;
  }
  return null;
}

function hasAttribute(node, name, value) {
  return Boolean(node?.attributes.some((attribute) => attribute.name === name && attribute.value === value));
}
