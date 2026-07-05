import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("fixtures/sample-html-project");
const fixture = "dom-snapshot.html";
const failures = [];

await expectFile(fixture);
const html = await readFile(path.join(root, fixture), "utf8");

const completeSnapshot = buildSnapshot(fixture, html, { maxNodes: 500, maxDepth: 32, maxTextPreviewLength: 512, maxAttributeValueLength: 256, maxAttributesPerNode: 24 });
expect(completeSnapshot.rootNode.type === "document", "Root DOM snapshot node is not a document.");
expect(completeSnapshot.nodeCount > 0, "DOM snapshot node count is empty.");
expect(completeSnapshot.nodeCount === countNodes(completeSnapshot.rootNode), "DOM snapshot nodeCount does not match recursive node count.");
expect(completeSnapshot.maxDepth === getMaxDepth(completeSnapshot.rootNode), "DOM snapshot maxDepth does not match recursive max depth.");
expect(completeSnapshot.nodeCount >= 20, "DOM snapshot fixture did not produce enough nodes to validate completeness.");
expect(completeSnapshot.isTruncated === false, "Complete DOM snapshot was incorrectly marked as truncated.");
expect(renderSnapshot(completeSnapshot).includes(`#snapshot complete — ${completeSnapshot.nodeCount} nodes`), "Complete DOM snapshot did not render an explicit completion marker.");
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

const previewTruncatedSnapshot = buildSnapshot(fixture, html, { maxNodes: 500, maxDepth: 32, maxTextPreviewLength: 64, maxAttributeValueLength: 80, maxAttributesPerNode: 24 });
expect(previewTruncatedSnapshot.isTruncated, "Text preview truncation did not mark the snapshot as truncated.");
expect(findText(previewTruncatedSnapshot.rootNode, "intentionally long")?.textPreview?.endsWith("…"), "Long text preview was not truncated with an ellipsis.");
expect(renderSnapshot(previewTruncatedSnapshot).includes("… truncated"), "Text preview truncation did not render an explicit truncation marker.");
expect(renderSnapshot(previewTruncatedSnapshot).includes(`#snapshot truncated — ${previewTruncatedSnapshot.nodeCount} nodes shown`), "Truncated DOM snapshot did not render an explicit truncated snapshot marker.");

const limitedNodes = buildSnapshot(fixture, html, { maxNodes: 8, maxDepth: 32, maxTextPreviewLength: 512, maxAttributeValueLength: 256, maxAttributesPerNode: 24 });
expect(limitedNodes.issues.some((issue) => issue.code === "node-limit-exceeded"), "Node limit did not produce a controlled issue.");
expect(limitedNodes.isTruncated, "Node limit did not mark snapshot as truncated.");
expect(limitedNodes.nodeCount === countNodes(limitedNodes.rootNode), "Limited node snapshot nodeCount does not match rendered nodes.");
expect(renderSnapshot(limitedNodes).includes("… truncated"), "Node limit did not render an explicit node truncation marker.");
expect(renderSnapshot(limitedNodes).includes(`#snapshot truncated — ${limitedNodes.nodeCount} nodes shown`), "Node-limited snapshot did not render truncated completion state.");

const limitedDepth = buildSnapshot(fixture, html, { maxNodes: 500, maxDepth: 2, maxTextPreviewLength: 512, maxAttributeValueLength: 256, maxAttributesPerNode: 24 });
expect(limitedDepth.issues.some((issue) => issue.code === "depth-limit-exceeded"), "Depth limit did not produce a controlled issue.");
expect(limitedDepth.isTruncated, "Depth limit did not mark snapshot as truncated.");
expect(limitedDepth.maxDepth === getMaxDepth(limitedDepth.rootNode), "Depth-limited snapshot maxDepth does not match rendered nodes.");
expect(renderSnapshot(limitedDepth).includes("… truncated"), "Depth limit did not render an explicit truncation marker.");

const missingIssue = await readTarget("missing-dom-snapshot.html");
expect(missingIssue?.code === "file-not-found", "Missing DOM snapshot target did not produce file-not-found.");
expect(!JSON.stringify(missingIssue).includes(norm(root)), "Missing DOM snapshot issue exposed the absolute project root.");
expect(resolveTarget("../package.json").issue?.code === "path-traversal", "Path traversal was not blocked for DOM snapshot target.");
expect(resolveTarget(path.resolve("package.json")).issue?.code === "invalid-dom-target", "Absolute DOM snapshot target was not blocked.");
expect(!JSON.stringify(resolveTarget("../package.json").issue).includes(norm(path.resolve("package.json"))), "Traversal issue exposed an absolute target path.");

if (failures.length > 0) {
  console.error("DOM snapshot validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("DOM snapshot validation passed: static HTML parsing, multiple body children, recursive nodeCount, maxDepth, completion markers, truncation markers, missing file handling, traversal blocking, and safe relative issues.");

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

function buildSnapshot(rootRelativePath, source, limits) {
  const issues = [];
  let nodeCount = 0;
  let maxDepth = 0;
  let nodeLimitReported = false;
  let depthLimitReported = false;
  const rootNode = node("document", null, null, [], 0, false);
  const stack = [rootNode];
  let cursor = 0;

  while (cursor < source.length) {
    const start = source.indexOf("<", cursor);
    if (start < 0) { appendText(source.slice(cursor)); break; }
    appendText(source.slice(cursor, start));
    const end = source.indexOf(">", start + 1);
    if (end < 0) break;
    const raw = source.slice(start + 1, end).trim();
    if (/^!doctype/i.test(raw)) append("doctype", null, raw.replace(/^!doctype\s+/i, ""), [], false);
    else if (raw.startsWith("/")) close(raw.slice(1).trim().toLowerCase());
    else if (raw.startsWith("!--")) append("comment", null, raw.slice(3).replace(/--$/, ""), [], false);
    else if (!raw.startsWith("!")) {
      const parsed = parseTag(raw, limits);
      const child = append("element", parsed.tagName, null, parsed.attributes, false);
      if (child && !parsed.selfClosing && !isVoid(parsed.tagName)) stack.push(child);
    }
    cursor = end + 1;
  }

  const isTruncated = hasTruncatedNode(rootNode) || issues.some((item) => item.code === "node-limit-exceeded" || item.code === "depth-limit-exceeded");
  return { rootRelativePath, rootNode, nodeCount, maxDepth, isTruncated, issues };

  function appendText(value) {
    const preview = textPreview(value, limits.maxTextPreviewLength);
    if (preview.value) append("text", null, preview.value, [], preview.truncated);
  }

  function append(type, tagName, textPreviewValue, attributes, truncated) {
    const parent = stack[stack.length - 1];
    const depth = parent.depth + 1;
    if (depth > limits.maxDepth) {
      parent.truncated = true;
      if (!depthLimitReported) { issues.push(issue("depth-limit-exceeded", "DOM snapshot depth limit was reached.", rootRelativePath, `Maximum depth ${limits.maxDepth} reached.`)); depthLimitReported = true; }
      return null;
    }
    if (nodeCount >= limits.maxNodes) {
      parent.truncated = true;
      if (!nodeLimitReported) { issues.push(issue("node-limit-exceeded", "DOM snapshot node limit was reached.", rootRelativePath, `Maximum node count ${limits.maxNodes} reached.`)); nodeLimitReported = true; }
      return null;
    }
    const child = node(type, tagName, textPreviewValue, attributes, depth, truncated);
    maxDepth = Math.max(maxDepth, depth);
    parent.children.push(child);
    parent.childCount = parent.children.length;
    return child;
  }

  function close(tagName) {
    for (let index = stack.length - 1; index > 0; index -= 1) if (stack[index].tagName === tagName) { stack.length = index; return; }
  }

  function node(type, tagName, textPreviewValue, attributes, depth, truncated) {
    nodeCount += 1;
    return { type, tagName, textPreview: textPreviewValue, attributes, children: [], depth, childCount: 0, truncated };
  }
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
  lines.push(`${indent}${renderNodeLabel(current)}`);
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
  return `${attribute.name}=\"${attribute.value}${attribute.truncated ? "…" : ""}\"`;
}

function parseTag(raw, limits) {
  const selfClosing = raw.endsWith("/");
  const normalized = selfClosing ? raw.slice(0, -1).trim() : raw;
  const firstWhitespace = normalized.search(/\s/);
  const tagName = (firstWhitespace < 0 ? normalized : normalized.slice(0, firstWhitespace)).toLowerCase();
  const source = firstWhitespace < 0 ? "" : normalized.slice(firstWhitespace + 1);
  return { tagName, attributes: parseAttributes(source, limits), selfClosing };
}

function parseAttributes(source, limits) {
  const attributes = [];
  const pattern = /([^\s=\/"'<>`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(source)) && attributes.length < limits.maxAttributesPerNode) {
    const rawValue = match[2] ?? match[3] ?? match[4] ?? null;
    if (rawValue === null) attributes.push({ name: match[1], value: null, truncated: false });
    else {
      const preview = textPreview(rawValue, limits.maxAttributeValueLength);
      attributes.push({ name: match[1], value: preview.value, truncated: preview.truncated });
    }
  }
  return attributes;
}

function textPreview(value, maxLength) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return { value: "", truncated: false };
  if (normalized.length <= maxLength) return { value: normalized, truncated: false };
  return { value: `${normalized.slice(0, Math.max(0, maxLength - 1))}…`, truncated: true };
}

function countNodes(current) { return 1 + current.children.reduce((total, child) => total + countNodes(child), 0); }
function getMaxDepth(current) { return current.children.reduce((maximum, child) => Math.max(maximum, getMaxDepth(child)), current.depth); }
function hasTruncatedNode(current) { return current.truncated || current.children.some((child) => hasTruncatedNode(child)); }
function issue(code, message, relativePath, reason) { return { code, severity: code === "node-limit-exceeded" || code === "depth-limit-exceeded" ? "warning" : "error", message, relativePath, reason, timestamp: Date.now() }; }
function isVoid(tagName) { return ["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"].includes(tagName); }
function findElement(current, tagName) { if (current.type === "element" && current.tagName === tagName) return current; for (const child of current.children) { const match = findElement(child, tagName); if (match) return match; } return null; }
function findText(current, fragment) { if (current.type === "text" && current.textPreview?.includes(fragment)) return current; for (const child of current.children) { const match = findText(child, fragment); if (match) return match; } return null; }
function hasAttribute(nodeValue, name, value) { return Boolean(nodeValue?.attributes.some((attribute) => attribute.name === name && attribute.value === value)); }
function directElementChildren(nodeValue) { return nodeValue?.children.filter((child) => child.type === "element") ?? []; }
