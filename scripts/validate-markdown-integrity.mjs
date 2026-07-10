import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateGeneratedMarkers } from "./project-metadata/generated-blocks.mjs";
import { parseStrictCliArguments, renderCliHelp } from "./tooling/strict-cli.mjs";
import { readDocumentationContract } from "./project-metadata/configuration-schemas.mjs";

const isMain = path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function collectMarkdownFiles(projectRoot = process.cwd()) {
  const files = [];
  const readme = path.join(projectRoot, "README.md");
  if (fs.existsSync(readme)) files.push("README.md");
  const docsRoot = path.join(projectRoot, "docs");
  if (fs.existsSync(docsRoot)) walk(docsRoot, projectRoot, files);
  return files.sort();
}

export function validateMarkdownText(content, filePath = "document.md") {
  const errors = [];
  if (content.charCodeAt(0) === 0xfeff) errors.push(`${filePath} contains an unexpected UTF-8 BOM.`);

  for (const match of content.matchAll(CONTROL_CHARACTER_PATTERN)) {
    const codePoint = match[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
    const line = content.slice(0, match.index).split(/\r\n|\r|\n/).length;
    errors.push(`${filePath}:${line} contains forbidden control character U+${codePoint}.`);
  }

  errors.push(...validateFences(content, filePath));
  errors.push(...validateGeneratedMarkers(content, filePath));
  return errors;
}

export function validateMarkdownRepository(options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const contract = readDocumentationContract(projectRoot);
  const errors = [];
  const files = collectMarkdownFiles(projectRoot);
  for (const relativePath of files) {
    const content = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
    errors.push(...validateMarkdownText(content, relativePath));
  }

  for (const document of contract.documents) {
    const absolutePath = path.join(projectRoot, document.path);
    if (!fs.existsSync(absolutePath)) {
      if (document.required) errors.push(`Missing required documentation file: ${document.path}`);
      continue;
    }
    if (document.validateLinks) errors.push(...validateInternalLinks(projectRoot, document.path, fs.readFileSync(absolutePath, "utf8")));
  }

  return { status: errors.length === 0 ? "PASS" : "FAIL", filesChecked: files.length, errors };
}

export function validateInternalLinks(projectRoot, relativePath, content) {
  const errors = [];
  const definitions = collectReferenceDefinitions(content);
  const links = collectMarkdownLinks(content, definitions);
  for (const link of links) {
    if (link.missingReference) {
      errors.push(`${relativePath}:${link.line} uses undefined reference link [${link.missingReference}].`);
      continue;
    }
    const rawTarget = link.target.trim().replace(/^<|>$/g, "");
    if (!rawTarget || /^(https?:|mailto:|tel:)/i.test(rawTarget)) continue;
    const parsed = splitLinkTarget(rawTarget);
    let decodedPath;
    let decodedFragment;
    try {
      decodedPath = decodeURIComponent(parsed.path);
      decodedFragment = decodeURIComponent(parsed.fragment);
    } catch {
      errors.push(`${relativePath}:${link.line} contains an invalid URL-encoded internal link: ${rawTarget}`);
      continue;
    }
    const targetRelativePath = decodedPath || relativePath;
    const resolved = decodedPath
      ? path.resolve(path.dirname(path.join(projectRoot, relativePath)), decodedPath)
      : path.resolve(projectRoot, relativePath);
    if (!isInsideRoot(projectRoot, resolved)) {
      errors.push(`${relativePath}:${link.line} contains an out-of-repository link: ${rawTarget}`);
      continue;
    }
    const targetFile = resolveMarkdownTarget(resolved);
    if (!fs.existsSync(targetFile) || !fs.statSync(targetFile).isFile()) {
      errors.push(`${relativePath}:${link.line} contains a broken internal link: ${rawTarget}`);
      continue;
    }
    if (decodedFragment) {
      const anchors = collectMarkdownAnchors(fs.readFileSync(targetFile, "utf8"));
      if (!anchors.has(decodedFragment.toLowerCase())) {
        const normalizedTarget = normalizeRepositoryPath(path.relative(projectRoot, targetFile));
        errors.push(`${relativePath}:${link.line} contains a broken anchor ${JSON.stringify(decodedFragment)} in ${normalizedTarget || targetRelativePath}.`);
      }
    }
  }
  return errors;
}

export function collectMarkdownLinks(content, providedDefinitions = null) {
  const definitions = providedDefinitions ?? collectReferenceDefinitions(content);
  const links = [];
  const lines = content.split(/\r\n|\r|\n/);
  let fence = null;
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const fenceMatch = rawLine.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!fence) fence = { character: fenceMatch[1][0], length: fenceMatch[1].length };
      else if (fenceMatch[1][0] === fence.character && fenceMatch[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    const line = rawLine.replace(/`[^`]*`/g, "");
    const occupied = [];
    for (const match of line.matchAll(/(?<!!)\[([^\]]+)\]\(([^)]+)\)/g)) {
      links.push({ target: normalizeInlineTarget(match[2]), line: index + 1, kind: "inline" });
      occupied.push([match.index, match.index + match[0].length]);
    }
    for (const match of line.matchAll(/<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
      links.push({ target: match[1], line: index + 1, kind: "html" });
      occupied.push([match.index, match.index + match[0].length]);
    }
    for (const match of line.matchAll(/(?<!!)\[([^\]]+)\]\[([^\]]*)\]/g)) {
      if (overlaps(match.index, match.index + match[0].length, occupied)) continue;
      const identifier = normalizeReferenceId(match[2] || match[1]);
      const definition = definitions.get(identifier);
      if (definition) links.push({ target: definition.target, line: index + 1, kind: "reference" });
      else links.push({ target: `__missing_reference__:${identifier}`, line: index + 1, kind: "missing-reference" });
      occupied.push([match.index, match.index + match[0].length]);
    }
    for (const match of line.matchAll(/(?<!!)\[([^\]]+)\]/g)) {
      if (overlaps(match.index, match.index + match[0].length, occupied)) continue;
      const identifier = normalizeReferenceId(match[1]);
      const definition = definitions.get(identifier);
      if (definition) links.push({ target: definition.target, line: index + 1, kind: "shortcut-reference" });
    }
  }
  return links.map((link) => link.target.startsWith("__missing_reference__:")
    ? { ...link, target: "", missingReference: link.target.slice("__missing_reference__:".length) }
    : link);
}

export function collectReferenceDefinitions(content) {
  const definitions = new Map();
  const lines = content.split(/\r\n|\r|\n/);
  let fence = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!fence) fence = { character: fenceMatch[1][0], length: fenceMatch[1].length };
      else if (fenceMatch[1][0] === fence.character && fenceMatch[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    const match = line.match(/^\s{0,3}\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+))(?:\s+.+)?$/);
    if (!match) continue;
    const identifier = normalizeReferenceId(match[1]);
    if (!definitions.has(identifier)) definitions.set(identifier, { target: match[2] ?? match[3], line: index + 1 });
  }
  return definitions;
}

export function collectMarkdownAnchors(content) {
  const anchors = new Set();
  const counts = new Map();
  const lines = content.split(/\r\n|\r|\n/);
  let fence = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!fence) fence = { character: fenceMatch[1][0], length: fenceMatch[1].length };
      else if (fenceMatch[1][0] === fence.character && fenceMatch[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    let heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/)?.[1];
    if (!heading && index + 1 < lines.length && /^\s*(=+|-+)\s*$/.test(lines[index + 1])) heading = line.trim();
    if (!heading) continue;
    const base = githubMarkdownSlug(heading);
    if (!base) continue;
    const count = counts.get(base) ?? 0;
    const slug = count === 0 ? base : `${base}-${count}`;
    counts.set(base, count + 1);
    anchors.add(slug);
  }
  return anchors;
}

export function githubMarkdownSlug(heading) {
  return heading
    .replace(/<[^>]*>/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, "-");
}

function splitLinkTarget(rawTarget) {
  const withoutTitle = normalizeInlineTarget(rawTarget);
  const hashIndex = withoutTitle.indexOf("#");
  const pathPart = hashIndex === -1 ? withoutTitle : withoutTitle.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : withoutTitle.slice(hashIndex + 1);
  return { path: pathPart.split("?")[0], fragment };
}

function normalizeInlineTarget(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("<")) {
    const close = trimmed.indexOf(">");
    if (close !== -1) return trimmed.slice(1, close);
  }
  return trimmed.match(/^(\S+)/)?.[1] ?? trimmed;
}

function normalizeReferenceId(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function resolveMarkdownTarget(resolved) {
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) return path.join(resolved, "README.md");
  return resolved;
}

function isInsideRoot(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function normalizeRepositoryPath(value) {
  return value.replace(/\\/g, "/");
}

function overlaps(start, end, ranges) {
  return ranges.some(([rangeStart, rangeEnd]) => start < rangeEnd && end > rangeStart);
}

function validateFences(content, filePath) {
  const errors = [];
  const lines = content.split(/\r\n|\r|\n/);
  let active = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (!match) continue;
    const marker = match[1];
    const trailing = match[2].trim();

    if (!active) {
      const language = trailing.split(/\s+/)[0] ?? "";
      if (language && !/^[A-Za-z0-9_+.-]+$/.test(language)) {
        errors.push(`${filePath}:${index + 1} has an invalid fenced-code language token: ${language}`);
      }
      active = { character: marker[0], length: marker.length, line: index + 1 };
      continue;
    }

    if (marker[0] === active.character && marker.length >= active.length && trailing === "") active = null;
  }
  if (active) errors.push(`${filePath}:${active.line} contains an unclosed ${active.character.repeat(active.length)} fenced code block.`);
  return errors;
}

function walk(directory, projectRoot, output) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolutePath, projectRoot, output);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) output.push(path.relative(projectRoot, absolutePath).replace(/\\/g, "/"));
  }
}

export function parseMarkdownIntegrityCli(args) {
  return parseStrictCliArguments(args, { booleanFlags: ["--json", "--help"] });
}

const markdownHelp = renderCliHelp({
  command: "node scripts/validate-markdown-integrity.mjs",
  description: "Validate Markdown syntax, generated markers, and internal navigation.",
  flags: [
    ["--json", "Emit JSON only."],
    ["--help", "Show help without validating."]
  ]
});

if (isMain) {
  const parsed = parseMarkdownIntegrityCli(process.argv.slice(2));
  const json = parsed.values.json === true;
  if (!parsed.ok) {
    const result = { status: "FAIL", filesChecked: 0, errors: parsed.errors };
    emitMarkdown(result, json);
    process.exitCode = 1;
  } else if (parsed.values.help) {
    if (json) process.stdout.write(`${JSON.stringify({ status: "PASS", mode: "help", help: markdownHelp })}\n`);
    else process.stdout.write(`${markdownHelp}\n`);
    process.exitCode = 0;
  } else {
    let result;
    try {
      result = validateMarkdownRepository();
    } catch (error) {
      result = { status: "FAIL", filesChecked: 0, errors: [error.message] };
    }
    emitMarkdown(result, json);
    process.exitCode = result.status === "PASS" ? 0 : 1;
  }
}

function emitMarkdown(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  console.log("Markdown integrity validation");
  console.log(`Files checked: ${result.filesChecked}`);
  for (const error of result.errors) console.error(`- ${error}`);
  console.log(`Result: ${result.status}`);
}
