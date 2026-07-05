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
  snapshotPath: string;
  siblingIndex: number;
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

interface ParsedOpeningTag {
  readonly ok: boolean;
  readonly tagName: string;
  readonly attributes: ProjectDomAttribute[];
  readonly selfClosing: boolean;
  readonly attributesTruncated: boolean;
  readonly malformedAttributes: boolean;
}

interface ParsedAttributes {
  readonly attributes: ProjectDomAttribute[];
  readonly truncated: boolean;
  readonly malformed: boolean;
}

interface RawTextClose {
  readonly start: number;
  readonly end: number;
  readonly malformed: boolean;
}

const voidElementNames = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const rawTextElementNames = new Set(["script", "style"]);
const validTagNamePattern = /^[a-zA-Z][a-zA-Z0-9:-]*$/;

export function buildProjectDomSnapshot(options: BuildProjectDomSnapshotOptions): ProjectDomSnapshot {
  const generatedAt = options.generatedAt ?? Date.now();
  const limits = { ...defaultProjectDomSnapshotLimits, ...options.limits };
  const issues: ProjectDomSnapshotIssue[] = [];
  const reportedIssueKeys = new Set<string>();
  let nodeCount = 0;
  let maxDepth = 0;

  const documentNode = createNode("document", null, null, [], 0, 0, "0", 0, false);
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
      cursor = consumeComment(nextTagStart);
      continue;
    }

    const tagEnd = findTagEnd(options.html, nextTagStart);
    if (tagEnd < 0) {
      pushIssue("malformed-tag", "HTML tag was not closed.", "Unclosed tag delimiter.", "warning");
      appendText(options.html.slice(nextTagStart), nextTagStart);
      break;
    }

    const rawTag = options.html.slice(nextTagStart + 1, tagEnd).trim();
    if (!rawTag) {
      pushIssue("malformed-tag", "Empty HTML tag was skipped.", "Empty tag.", "warning");
      cursor = tagEnd + 1;
      continue;
    }

    if (/^!doctype\b/i.test(rawTag)) {
      appendDoctype(rawTag, nextTagStart);
      cursor = tagEnd + 1;
      continue;
    }

    if (rawTag.startsWith("/")) {
      const tagName = parseClosingTagName(rawTag);
      if (tagName) closeElement(tagName);
      else pushIssue("malformed-tag", "Closing tag could not be parsed.", "Malformed closing tag.", "warning");
      cursor = tagEnd + 1;
      continue;
    }

    if (rawTag.startsWith("!") || rawTag.startsWith("?")) {
      pushIssue("unsupported-html-pattern", "Unsupported markup declaration was skipped.", "Unsupported declaration.", "warning");
      cursor = tagEnd + 1;
      continue;
    }

    const parsedTag = parseOpeningTag(rawTag, limits);
    if (!parsedTag.ok) {
      pushIssue("malformed-tag", "Opening tag could not be parsed.", "Malformed opening tag.", "warning");
      cursor = tagEnd + 1;
      continue;
    }

    if (parsedTag.malformedAttributes) pushIssue("malformed-tag", `Attributes for <${parsedTag.tagName}> were recovered with warnings.`, `Malformed attributes on ${parsedTag.tagName}.`, "warning");
    if (parsedTag.attributesTruncated) pushIssue("attributes-truncated", "DOM snapshot attribute limit or value length was reached.", "Attributes were truncated.", "warning");

    const element = appendElement(parsedTag.tagName, parsedTag.attributes, nextTagStart, parsedTag.attributesTruncated);
    cursor = tagEnd + 1;

    if (!element || parsedTag.selfClosing || voidElementNames.has(parsedTag.tagName)) continue;

    stack.push(element);

    if (rawTextElementNames.has(parsedTag.tagName)) {
      const closing = findRawTextClose(options.html, parsedTag.tagName, cursor);
      const rawTextEnd = closing?.start ?? options.html.length;
      appendText(options.html.slice(cursor, rawTextEnd), cursor, true);
      stack.pop();
      if (!closing) {
        pushIssue("unclosed-tag", `${parsedTag.tagName} element was not closed.`, `Unclosed ${parsedTag.tagName} element.`, "warning");
        cursor = rawTextEnd;
      } else {
        if (closing.malformed) pushIssue("malformed-tag", `${parsedTag.tagName} closing tag was malformed.`, `Malformed ${parsedTag.tagName} closing tag.`, "warning");
        cursor = closing.end;
      }
    }
  }

  if (stack.length > 1) {
    const remaining = stack.slice(1).map((node) => node.tagName ?? node.type).join(", ");
    pushIssue("unclosed-tag", "Some HTML elements were not closed.", `Unclosed element nesting: ${remaining}.`, "warning");
  }

  const rootNode = finalizeNode(documentNode);
  const isTruncated = hasTruncatedNode(rootNode) || issues.some((issue) => issue.code === "max-nodes-reached" || issue.code === "max-depth-reached" || issue.code === "node-limit-exceeded" || issue.code === "depth-limit-exceeded");
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

  function consumeComment(start: number): number {
    const commentEnd = options.html.indexOf("-->", start + 4);
    const end = commentEnd < 0 ? options.html.length : commentEnd + 3;
    appendComment(options.html.slice(start + 4, commentEnd < 0 ? end : commentEnd), start);
    if (commentEnd < 0) pushIssue("unclosed-tag", "HTML comment was not closed.", "Unclosed comment.", "warning");
    return end;
  }

  function appendText(text: string, offset: number, forcePreview = false): void {
    if (!forcePreview && !hasMeaningfulProjectDomText(text)) return;
    const preview = createProjectDomTextPreview(text, limits.maxTextPreviewLength);
    if (!preview.value) return;
    if (preview.truncated) pushIssue("text-truncated", "DOM snapshot text preview length limit was reached.", "Text preview was truncated.", "warning");
    appendNode("text", null, preview.value, [], offset, preview.truncated);
  }

  function appendComment(text: string, offset: number): void {
    const preview = createProjectDomTextPreview(text, limits.maxTextPreviewLength);
    if (preview.truncated) pushIssue("text-truncated", "DOM snapshot comment preview length limit was reached.", "Comment preview was truncated.", "warning");
    appendNode("comment", null, preview.value, [], offset, preview.truncated);
  }

  function appendDoctype(rawTag: string, offset: number): void {
    const preview = createProjectDomTextPreview(rawTag.replace(/^!doctype\s+/i, ""), limits.maxTextPreviewLength);
    if (preview.truncated) pushIssue("text-truncated", "DOM snapshot doctype preview length limit was reached.", "Doctype preview was truncated.", "warning");
    appendNode("doctype", null, preview.value || "html", [], offset, preview.truncated);
  }

  function appendElement(tagName: string, attributes: ProjectDomAttribute[], offset: number, truncated: boolean): MutableDomNode | null {
    return appendNode("element", tagName, null, attributes, offset, truncated);
  }

  function appendNode(type: ProjectDomNodeType, tagName: string | null, textPreview: string | null, attributes: ProjectDomAttribute[], offset: number, truncated: boolean): MutableDomNode | null {
    const parent = stack[stack.length - 1] ?? documentNode;
    const depth = parent.depth + 1;
    if (depth > limits.maxDepth) {
      parent.truncated = true;
      pushIssue("max-depth-reached", "DOM snapshot depth limit was reached.", `Maximum depth ${limits.maxDepth} reached.`, "warning");
      return null;
    }

    if (nodeCount >= limits.maxNodes) {
      parent.truncated = true;
      pushIssue("max-nodes-reached", "DOM snapshot node limit was reached.", `Maximum node count ${limits.maxNodes} reached.`, "warning");
      return null;
    }

    const siblingIndex = parent.children.length;
    const snapshotPath = `${parent.snapshotPath}/${siblingIndex}`;
    const node = createNode(type, tagName, textPreview, attributes, depth, offset, snapshotPath, siblingIndex, truncated);
    maxDepth = Math.max(maxDepth, depth);
    parent.children.push(node);
    parent.childCount = parent.children.length;
    return node;
  }

  function createNode(type: ProjectDomNodeType, tagName: string | null, textPreview: string | null, attributes: ProjectDomAttribute[], depth: number, offset: number, snapshotPath: string, siblingIndex: number, truncated = false): MutableDomNode {
    nodeCount += 1;
    const location = getSourceLocation(options.html, offset);
    return { id: `dom-node:${snapshotPath}`, snapshotPath, siblingIndex, type, tagName, textPreview, attributes, children: [], depth, childCount: 0, sourceLocation: location, truncated };
  }

  function closeElement(tagName: string): void {
    if (!tagName) return;
    for (let index = stack.length - 1; index > 0; index -= 1) {
      if (stack[index]?.tagName === tagName) {
        if (index < stack.length - 1) pushIssue("unclosed-tag", `Recovered nested HTML before closing </${tagName}>.`, `Auto-closed ${stack.length - index - 1} nested element(s) before ${tagName}.`, "warning");
        stack.length = index;
        return;
      }
    }
    pushIssue("malformed-tag", `Closing tag </${tagName}> did not match an open element.`, `Unmatched closing tag: ${tagName}.`, "warning");
  }

  function pushIssue(code: ProjectDomSnapshotIssue["code"], message: string, reason: string, severity: ProjectDomSnapshotIssue["severity"]): void {
    const key = `${code}:${reason}`;
    if (reportedIssueKeys.has(key)) return;
    reportedIssueKeys.add(key);
    issues.push({ code, severity, message, relativePath: options.rootRelativePath, reason, timestamp: generatedAt });
  }
}

function parseOpeningTag(rawTag: string, limits: ProjectDomSnapshotLimits): ParsedOpeningTag {
  const selfClosing = /\/\s*$/.test(rawTag);
  const normalized = selfClosing ? rawTag.replace(/\/\s*$/, "").trim() : rawTag.trim();
  const tagMatch = /^([^\s\/"'<>`=]+)/.exec(normalized);
  const tagName = (tagMatch?.[1] ?? "").toLowerCase();
  if (!tagName || !validTagNamePattern.test(tagName)) return { ok: false, tagName: "", attributes: [], selfClosing, attributesTruncated: false, malformedAttributes: false };

  const attributesSource = normalized.slice(tagMatch?.[0].length ?? 0);
  const parsedAttributes = parseAttributes(attributesSource, limits);
  return { ok: true, tagName, attributes: parsedAttributes.attributes, selfClosing, attributesTruncated: parsedAttributes.truncated, malformedAttributes: parsedAttributes.malformed };
}

function parseClosingTagName(rawTag: string): string | null {
  const match = /^\/\s*([a-zA-Z][a-zA-Z0-9:-]*)\s*$/.exec(rawTag);
  return match?.[1]?.toLowerCase() ?? null;
}

function parseAttributes(source: string, limits: ProjectDomSnapshotLimits): ParsedAttributes {
  const attributes: ProjectDomAttribute[] = [];
  let index = 0;
  let truncated = false;
  let malformed = false;

  while (index < source.length) {
    index = skipWhitespace(source, index);
    if (index >= source.length) break;

    if (attributes.length >= limits.maxAttributesPerNode) {
      truncated = true;
      break;
    }

    if (source[index] === "/") {
      index += 1;
      continue;
    }

    if (!isAttributeNameStart(source[index] ?? "")) {
      malformed = true;
      index += 1;
      continue;
    }

    const nameStart = index;
    while (index < source.length && isAttributeNameCharacter(source[index] ?? "")) index += 1;
    const name = source.slice(nameStart, index);
    index = skipWhitespace(source, index);

    let rawValue: string | null = null;
    if (source[index] === "=") {
      index += 1;
      index = skipWhitespace(source, index);
      const parsedValue = parseAttributeValue(source, index);
      rawValue = parsedValue.value;
      index = parsedValue.nextIndex;
      malformed = malformed || parsedValue.malformed;
    }

    if (rawValue === null) {
      attributes.push({ name, value: null, truncated: false });
      continue;
    }

    const preview = createProjectDomTextPreview(rawValue, limits.maxAttributeValueLength);
    if (preview.truncated) truncated = true;
    attributes.push({ name, value: preview.value, truncated: preview.truncated });
  }

  return { attributes, truncated, malformed };
}

function parseAttributeValue(source: string, start: number): { readonly value: string; readonly nextIndex: number; readonly malformed: boolean } {
  if (start >= source.length) return { value: "", nextIndex: start, malformed: true };

  const quote = source[start];
  if (quote === '"' || quote === "'") {
    const valueStart = start + 1;
    const quoteEnd = source.indexOf(quote, valueStart);
    if (quoteEnd < 0) return { value: source.slice(valueStart), nextIndex: source.length, malformed: true };
    return { value: source.slice(valueStart, quoteEnd), nextIndex: quoteEnd + 1, malformed: false };
  }

  const valueStart = start;
  let index = start;
  let malformed = false;
  while (index < source.length && !/\s/.test(source[index] ?? "")) {
    const char = source[index] ?? "";
    if (char === '"' || char === "'" || char === "<" || char === ">" || char === "`" || char === "=") malformed = true;
    index += 1;
  }

  return { value: source.slice(valueStart, index), nextIndex: index, malformed };
}

function findTagEnd(source: string, tagStart: number): number {
  let quote: '"' | "'" | null = null;
  for (let index = tagStart + 1; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === ">") return index;
  }
  return -1;
}

function findRawTextClose(source: string, tagName: string, start: number): RawTextClose | null {
  const lowerSource = source.toLowerCase();
  let searchStart = start;
  while (searchStart < source.length) {
    const closingStart = lowerSource.indexOf(`</${tagName}`, searchStart);
    if (closingStart < 0) return null;
    const afterName = closingStart + tagName.length + 2;
    const afterNameChar = lowerSource[afterName];
    if (afterNameChar && !/[\s>/]/.test(afterNameChar)) {
      searchStart = afterName;
      continue;
    }

    const closingEnd = findTagEnd(source, closingStart);
    if (closingEnd < 0) return { start: closingStart, end: source.length, malformed: true };
    return { start: closingStart, end: closingEnd + 1, malformed: false };
  }

  return null;
}

function skipWhitespace(source: string, start: number): number {
  let index = start;
  while (index < source.length && /\s/.test(source[index] ?? "")) index += 1;
  return index;
}

function isAttributeNameStart(char: string): boolean {
  return Boolean(char) && !/[\s=\/"'<>`]/.test(char);
}

function isAttributeNameCharacter(char: string): boolean {
  return Boolean(char) && !/[\s=\/"'<>`]/.test(char);
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
