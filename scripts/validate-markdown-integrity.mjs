import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateGeneratedMarkers } from "./project-metadata/generated-blocks.mjs";
import { parseStrictCliArguments, renderCliHelp } from "./tooling/strict-cli.mjs";

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
  const directory = path.dirname(path.join(projectRoot, relativePath));
  const pattern = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of content.matchAll(pattern)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (!rawTarget || rawTarget.startsWith("#") || /^(https?:|mailto:|tel:)/i.test(rawTarget)) continue;
    const target = decodeURIComponent(rawTarget.split("#")[0].split("?")[0]);
    if (!target) continue;
    const resolved = path.resolve(directory, target);
    if (!(resolved === projectRoot || resolved.startsWith(`${projectRoot}${path.sep}`))) {
      errors.push(`${relativePath} contains an out-of-repository link: ${rawTarget}`);
    } else if (!fs.existsSync(resolved)) {
      errors.push(`${relativePath} contains a broken internal link: ${rawTarget}`);
    }
  }
  return errors;
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

function readDocumentationContract(projectRoot) {
  const contractPath = path.join(projectRoot, "docs", "metadata", "documentation-contract.json");
  const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  if (contract.schemaVersion !== 1 || !Array.isArray(contract.documents)) {
    throw new Error("docs/metadata/documentation-contract.json must use schemaVersion 1 and define documents[].");
  }
  return contract;
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
