import { defaultProjectDomSnapshotLimits, type ProjectDomSnapshotLimits } from "./project-dom-snapshot-limits";
import { createProjectDomTextPreview, hasMeaningfulProjectDomText } from "./project-dom-snapshot-text";
import type { ProjectDomAttribute, ProjectDomNode, ProjectDomNodeType, ProjectDomSnapshot, ProjectDomSnapshotIssue } from "./project-dom-snapshot.types";

export interface BuildProjectDomSnapshotOptions {
  readonly rootRelativePath: string;
  readonly html: string;
  readonly generatedAt?: number;
  readonly limits?: Partial<ProjectDomSnapshotLimits>;
}

interface MutableDomNode {
  id: string;
  type: ProjectDomNodeType;
  tagName: string | null;
  textPreview: string | null;
  attributes: ProjectDomAttribute[];
  children: MutableDomNode[];
  depth: number;
  childCount: number;
  sourceLocation?: { offset: number; line: number; column: number };
  truncated: boolean;
}

const voidElementNames = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const rawTextElementNames = new Set(["script", "style"]);

export function buildProjectDomSnapshot(options: BuildProjectDomSnapshotOptions): ProjectDomSnapshot {
  const generatedAt = options.generatedAt ?? Date.now();
  const limits = { ...defaultProjectDomSnapshotLimits, ...options.limits };
  const issues: ProjectDomSnapshotIssue[] = [];
  let nodeCount = 0;
  let maxDepth = 0;
  let nodeLimitReported = false;
  let depthLimitReported = false;

  const documentNode = createNode("document", null, null, [], 0, 0);
  const stack: MutableDomNode[] = [documentNode];
  let cursor = 0;

  while (cursor < options.html.length) {
    const nextTagStart = options.html.indexOf("<", cursor);
    if (nextTagStart < 0) {
      appendText(options.html.slice(cursor), cursor);
      break;
    }

    appendText(options.html.slice(cursor, nextTagStart), cursor);

    if (options.html.startsWith("<!--", nextTagStart)) {
      const commentEnd = options.html.indexOf("-->", nextTagStart + 4);
      const end = commentEnd < 0 ? options.html.length : commentEnd + 3;
      appendComment(options.html.slice(nextTagStart + 4, commentEnd < 0 ? end : commentEnd), nextTagStart);
      if (commentEnd < 0) pushIssue("parse-warning", "HTML comment was not closed.", "Unclosed comment.", "warning");
      cursor = end;
      continue;
    }

    const tagEnd = options.html.indexOf(">", nextTagStart + 1);
    if (tagEnd < 0) {
      pushIssue("parse-warning", "HTML tag was not closed.", "Unclosed tag.", "warning");
      appendText(options.html.slice(nextTagStart), nextTagStart);
      break;
    }

    const rawTag = options.html.slice(nextTagStart + 1, tagEnd).trim();
    if (!rawTag) {
      cursor = tagEnd + 1;
      continue;
    }

    if (rawTag.startsWith("!doctype") || rawTag.startsWith("!DOCTYPE")) {
      appendDoctype(rawTag, nextTagStart);
      cursor = tagEnd + 1;
      continue;
    }

    if (rawTag.startsWith("/")) {
      closeElement(rawTag.slice(1).trim().toLowerCase());
      cursor = tagEnd + 1;
      continue;
    }

    if (rawTag.startsWith("!")) {
      pushIssue("parse-warning", "Unsupported markup declaration was skipped.", "Unsupported declaration.", "warning");
      cursor = tagEnd + 1;
      continue;
    }

    const parsedTag = parseOpeningTag(rawTag, limits);
    const element = appendElement(parsedTag.tagName, parsedTag.attributes, nextTagStart);
    cursor = tagEnd + 1;

    if (!element || parsedTag.selfClosing || voidElementNames.has(parsedTag.tagName)) continue;

    stack.push(element);

    if (rawTextElementNames.has(parsedTag.tagName)) {
      const closingTag = `</${parsedTag.tagName}>`;
      const lowerHtml = options.html.toLowerCase();
      const closingStart = lowerHtml.indexOf(closingTag, cursor);
      const rawTextEnd = closingStart < 0 ? options.html.length : closingStart;
      appendText(options.html.slice(cursor, rawTextEnd), cursor, true);
      stack.pop();
      if (closingStart < 0) {
        pushIssue("parse-warning", `${parsedTag.tagName} element was not closed.`, `Unclosed ${parsedTag.tagName} element.`, "warning");
        cursor = rawTextEnd;
      } else {
        cursor = closingStart + closingTag.length;
      }
    }
  }

  if (stack.length > 1) pushIssue("parse-warning", "Some HTML elements were not closed.", "Unclosed element nesting.", "warning");

  const rootNode = finalizeNode(documentNode);
  const isTruncated = hasTruncatedNode(rootNode) || issues.some((issue) => issue.code === "node-limit-exceeded" || issue.code === "depth-limit-exceeded");
  return {
    id: `dom-snapshot:${options.rootRelativePath}:${generatedAt}`,
    rootRelativePath: options.rootRelativePath,
    generatedAt,
    source: "html-source",
    status: issues.some((issue) => issue.severity === "error") ? "failed" : "ready",
    rootNode,
    nodeCount,
    maxDepth,
    isTruncated,
    issues
  };

  function appendText(text: string, offset: number, forcePreview = false): void {
    if (!forcePreview && !hasMeaningfulProjectDomText(text)) return;
    const preview = createProjectDomTextPreview(text, limits.maxTextPreviewLength);
    if (!preview.value) return;
    appendNode("text", null, preview.value, [], offset, preview.truncated);
  }

  function appendComment(text: string, offset: number): void {
    const preview = createProjectDomTextPreview(text, limits.maxTextPreviewLength);
    appendNode("comment", null, preview.value, [], offset, preview.truncated);
  }

  function appendDoctype(rawTag: string, offset: number): void {
    const preview = createProjectDomTextPreview(rawTag.replace(/^!doctype\s+/i, ""), limits.maxTextPreviewLength);
    appendNode("doctype", null, preview.value || "html", [], offset, preview.truncated);
  }

  function appendElement(tagName: string, attributes: ProjectDomAttribute[], offset: number): MutableDomNode | null {
    return appendNode("element", tagName, null, attributes, offset, false);
  }

  function appendNode(type: ProjectDomNodeType, tagName: string | null, textPreview: string | null, attributes: ProjectDomAttribute[], offset: number, truncated: boolean): MutableDomNode | null {
    const parent = stack[stack.length - 1] ?? documentNode;
    const depth = parent.depth + 1;
    if (depth > limits.maxDepth) {
      parent.truncated = true;
      if (!depthLimitReported) {
        pushIssue("depth-limit-exceeded", "DOM snapshot depth limit was reached.", `Maximum depth ${limits.maxDepth} reached.`, "warning");
        depthLimitReported = true;
      }
      return null;
    }

    if (nodeCount >= limits.maxNodes) {
      parent.truncated = true;
      if (!nodeLimitReported) {
        pushIssue("node-limit-exceeded", "DOM snapshot node limit was reached.", `Maximum node count ${limits.maxNodes} reached.`, "warning");
        nodeLimitReported = true;
      }
      return null;
    }

    const node = createNode(type, tagName, textPreview, attributes, depth, offset, truncated);
    maxDepth = Math.max(maxDepth, depth);
    parent.children.push(node);
    parent.childCount = parent.children.length;
    return node;
  }

  function createNode(type: ProjectDomNodeType, tagName: string | null, textPreview: string | null, attributes: ProjectDomAttribute[], depth: number, offset: number, truncated = false): MutableDomNode {
    nodeCount += 1;
    const location = getSourceLocation(options.html, offset);
    return { id: `dom-node:${nodeCount}`, type, tagName, textPreview, attributes, children: [], depth, childCount: 0, sourceLocation: location, truncated };
  }

  function closeElement(tagName: string): void {
    if (!tagName) return;
    for (let index = stack.length - 1; index > 0; index -= 1) {
      if (stack[index]?.tagName === tagName) {
        stack.length = index;
        return;
      }
    }
    pushIssue("parse-warning", `Closing tag </${tagName}> did not match an open element.`, `Unmatched closing tag: ${tagName}.`, "warning");
  }

  function pushIssue(code: ProjectDomSnapshotIssue["code"], message: string, reason: string, severity: ProjectDomSnapshotIssue["severity"]): void {
    issues.push({ code, severity, message, relativePath: options.rootRelativePath, reason, timestamp: generatedAt });
  }
}

function parseOpeningTag(rawTag: string, limits: ProjectDomSnapshotLimits): { readonly tagName: string; readonly attributes: ProjectDomAttribute[]; readonly selfClosing: boolean } {
  const selfClosing = rawTag.endsWith("/");
  const normalized = selfClosing ? rawTag.slice(0, -1).trim() : rawTag;
  const firstWhitespace = normalized.search(/\s/);
  const tagName = (firstWhitespace < 0 ? normalized : normalized.slice(0, firstWhitespace)).toLowerCase();
  const attributesSource = firstWhitespace < 0 ? "" : normalized.slice(firstWhitespace + 1);
  return { tagName, attributes: parseAttributes(attributesSource, limits), selfClosing };
}

function parseAttributes(source: string, limits: ProjectDomSnapshotLimits): ProjectDomAttribute[] {
  const attributes: ProjectDomAttribute[] = [];
  const attributePattern = /([^\s=\/"'<>`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(source)) && attributes.length < limits.maxAttributesPerNode) {
    const name = match[1] ?? "";
    const rawValue = match[2] ?? match[3] ?? match[4] ?? null;
    if (!name) continue;
    if (rawValue === null) {
      attributes.push({ name, value: null, truncated: false });
      continue;
    }
    const preview = createProjectDomTextPreview(rawValue, limits.maxAttributeValueLength);
    attributes.push({ name, value: preview.value, truncated: preview.truncated });
  }

  return attributes;
}

function finalizeNode(node: MutableDomNode): ProjectDomNode {
  const children = node.children.map((child) => finalizeNode(child));
  return { ...node, children, childCount: children.length };
}

function hasTruncatedNode(node: ProjectDomNode): boolean {
  if (node.truncated) return true;
  return node.children.some((child) => hasTruncatedNode(child));
}

function getSourceLocation(source: string, offset: number): { readonly offset: number; readonly line: number; readonly column: number } {
  const prefix = source.slice(0, offset);
  const lines = prefix.split(/\r?\n/);
  return { offset, line: lines.length, column: lines[lines.length - 1]?.length ?? 0 };
}
