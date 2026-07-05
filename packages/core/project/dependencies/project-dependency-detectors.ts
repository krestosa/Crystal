import path from "node:path";
import type { ProjectFile, RawProjectDependency } from "../graph/project-graph.types";
import { projectFileKinds } from "../files/project-file-kind.constants";

const tagPattern = /<([a-zA-Z][a-zA-Z0-9:-]*)([^>]*)>/g;
const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g;
const cssImportPattern = /@import\s+(?:url\()?['"]?([^'"\)\s;]+)['"]?\)?/g;
const cssUrlPattern = /url\(\s*['"]?([^'"\)]+)['"]?\s*\)/g;
const importFromPattern = /import\s+(?:[^'"()]*?\s+from\s+)?['"]([^'"]+)['"]/g;
const dynamicImportPattern = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
const requirePattern = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
const fontExtensions = new Set([".woff", ".woff2", ".ttf", ".otf", ".eot"]);

export function detectRawProjectDependencies(file: ProjectFile, content: string): RawProjectDependency[] {
  if (file.kind === projectFileKinds.html) return detectHtmlDependencies(file, content);
  if (file.kind === projectFileKinds.css || file.kind === projectFileKinds.sass) return detectCssDependencies(file, content);
  if (file.kind === projectFileKinds.javascript || file.kind === projectFileKinds.typescript) return detectScriptDependencies(file, content);
  return [];
}

function detectHtmlDependencies(file: ProjectFile, content: string): RawProjectDependency[] {
  const dependencies: RawProjectDependency[] = [];
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagPattern.exec(content))) {
    const tagName = tagMatch[1]?.toLowerCase() ?? "";
    const attributes = parseAttributes(tagMatch[2] ?? "");
    const line = getLineNumber(content, tagMatch.index);
    if (tagName === "link" && attributes.get("rel")?.toLowerCase().includes("stylesheet")) push(dependencies, file, "stylesheet", attributes.get("href"), "html", line);
    if (tagName === "script") push(dependencies, file, "script", attributes.get("src"), "html", line);
    if (tagName === "img") push(dependencies, file, "image", attributes.get("src"), "html", line);
    if (tagName === "source") push(dependencies, file, "source", attributes.get("src"), "html", line);
    if (tagName === "video") push(dependencies, file, "video", attributes.get("src"), "html", line);
    if (tagName === "audio") push(dependencies, file, "audio", attributes.get("src"), "html", line);
    if (tagName === "iframe") push(dependencies, file, "iframe", attributes.get("src"), "html", line);
    if (tagName === "image" || tagName === "use") push(dependencies, file, "svg", attributes.get("href") ?? attributes.get("xlink:href"), "html", line);
    for (const srcsetItem of parseSrcset(attributes.get("srcset") ?? "")) push(dependencies, file, "image", srcsetItem, "html", line);
  }
  return dependencies;
}

function detectCssDependencies(file: ProjectFile, content: string): RawProjectDependency[] {
  const dependencies: RawProjectDependency[] = [];
  collectMatches(cssImportPattern, content, file, dependencies, "css-import", "css");
  collectMatches(cssUrlPattern, content, file, dependencies, "css-url", "css");
  return dependencies.map((dependency) => {
    const extension = path.extname(dependency.rawSpecifier.split(/[?#]/)[0] ?? "").toLowerCase();
    return fontExtensions.has(extension) ? { ...dependency, type: "font" } : dependency;
  });
}

function detectScriptDependencies(file: ProjectFile, content: string): RawProjectDependency[] {
  const dependencies: RawProjectDependency[] = [];
  collectMatches(importFromPattern, content, file, dependencies, "js-import", "script");
  collectMatches(dynamicImportPattern, content, file, dependencies, "js-dynamic-import", "script");
  collectMatches(requirePattern, content, file, dependencies, "commonjs-require", "script");
  return dependencies;
}

function collectMatches(pattern: RegExp, content: string, file: ProjectFile, dependencies: RawProjectDependency[], type: RawProjectDependency["type"], source: RawProjectDependency["source"]): void {
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content))) push(dependencies, file, type, match[1], source, getLineNumber(content, match.index));
}

function push(dependencies: RawProjectDependency[], file: ProjectFile, type: RawProjectDependency["type"], rawSpecifier: string | undefined, source: RawProjectDependency["source"], line: number): void {
  if (!rawSpecifier?.trim()) return;
  dependencies.push({ type, fromPath: file.relativePath, fromAbsolutePath: file.absolutePath, rawSpecifier, source, line });
}

function parseAttributes(source: string): Map<string, string> {
  const attributes = new Map<string, string>();
  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = attrPattern.exec(source))) {
    const name = attrMatch[1]?.toLowerCase();
    const value = (attrMatch[2] ?? "").replace(/^['"]|['"]$/g, "");
    if (name) attributes.set(name, value);
  }
  return attributes;
}

function parseSrcset(value: string): string[] {
  return value.split(",").map((item) => item.trim().split(/\s+/)[0]).filter((item): item is string => Boolean(item));
}

function getLineNumber(content: string, offset: number): number {
  return content.slice(0, offset).split("\n").length;
}
