import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const fixtureRoot = path.resolve("fixtures/sample-html-project");
const expectedMissing = new Set(["assets/photo@2x.jpg", "styles/missing.css", "assets/missing-image.png"]);
const files = [];
await walk(fixtureRoot);
const knownFiles = new Set(files.map((file) => file.relativePath));
const dependencies = [];
for (const file of files) {
  if (!["html", "css", "scss", "js", "ts"].includes(file.kind)) continue;
  dependencies.push(...detectDependencies(file, await readFile(file.absolutePath, "utf8")));
}
const missing = dependencies.filter((dependency) => dependency.local && !knownFiles.has(dependency.resolvedPath)).map((dependency) => dependency.resolvedPath);
const failures = [];
if (!files.some((file) => file.relativePath === "index.html" && file.kind === "html")) failures.push("index.html page was not classified as HTML.");
if (!dependencies.some((dependency) => dependency.type === "stylesheet" && dependency.raw === "./styles/main.css")) failures.push("HTML stylesheet dependency was not detected.");
if (!dependencies.some((dependency) => dependency.type === "css-url" && dependency.raw === "../assets/photo.jpg")) failures.push("CSS url(...) dependency was not detected.");
if (!dependencies.some((dependency) => dependency.type === "js-import" && dependency.raw === "./module.ts")) failures.push("JS static import was not detected.");
if (!dependencies.some((dependency) => dependency.type === "js-dynamic-import" && dependency.raw === "./module.ts")) failures.push("JS dynamic import was not detected.");
if (!dependencies.some((dependency) => dependency.type === "commonjs-require" && dependency.raw === "./legacy.js")) failures.push("CommonJS require was not detected.");
for (const item of expectedMissing) if (!missing.includes(item)) failures.push(`Expected missing route was not reported: ${item}`);
if (failures.length > 0) {
  console.error("Project Graph validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Project Graph validation passed: ${files.length} files, ${dependencies.length} dependencies, ${missing.length} missing routes.`);

async function walk(currentPath) {
  const entries = await readdir(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.resolve(currentPath, entry.name);
    if (entry.isDirectory()) { await walk(absolutePath); continue; }
    const stats = await stat(absolutePath);
    files.push({ absolutePath, relativePath: normalize(path.relative(fixtureRoot, absolutePath)), kind: classify(absolutePath), sizeBytes: stats.size });
  }
}
function detectDependencies(file, content) { if (file.kind === "html") return detectHtml(file, content); if (file.kind === "css" || file.kind === "scss") return detectCss(file, content); if (file.kind === "js" || file.kind === "ts") return detectScript(file, content); return []; }
function detectHtml(file, content) { const dependencies = []; const tagPattern = /<([a-zA-Z][a-zA-Z0-9:-]*)([^>]*)>/g; let match; while ((match = tagPattern.exec(content))) { const tagName = match[1].toLowerCase(); const attrs = parseAttributes(match[2] ?? ""); if (tagName === "link" && attrs.get("rel")?.includes("stylesheet")) push(dependencies, file, "stylesheet", attrs.get("href")); if (tagName === "script") push(dependencies, file, "script", attrs.get("src")); if (tagName === "img") push(dependencies, file, "image", attrs.get("src")); if (tagName === "source") push(dependencies, file, "source", attrs.get("src")); if (tagName === "video") push(dependencies, file, "video", attrs.get("src")); if (tagName === "iframe") push(dependencies, file, "iframe", attrs.get("src")); for (const srcsetItem of parseSrcset(attrs.get("srcset") ?? "")) push(dependencies, file, "image", srcsetItem); } return dependencies; }
function detectCss(file, content) { const dependencies = []; collect(/@import\s+(?:url\()?['"]?([^'"\)\s;]+)['"]?\)?/g, content, file, dependencies, "css-import"); collect(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)/g, content, file, dependencies, "css-url"); return dependencies; }
function detectScript(file, content) { const dependencies = []; collect(/import\s+(?:[^'"()]*?\s+from\s+)?['"]([^'"]+)['"]/g, content, file, dependencies, "js-import"); collect(/import\(\s*['"]([^'"]+)['"]\s*\)/g, content, file, dependencies, "js-dynamic-import"); collect(/require\(\s*['"]([^'"]+)['"]\s*\)/g, content, file, dependencies, "commonjs-require"); return dependencies; }
function collect(pattern, content, file, dependencies, type) { let match; while ((match = pattern.exec(content))) push(dependencies, file, type, match[1]); }
function push(dependencies, file, type, raw) { if (!raw || isExternal(raw) || raw.startsWith("#")) return; dependencies.push({ type, raw, local: true, resolvedPath: normalize(path.relative(fixtureRoot, path.resolve(path.dirname(file.absolutePath), strip(raw)))) }); }
function parseAttributes(source) { const attrs = new Map(); const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g; let match; while ((match = attrPattern.exec(source))) attrs.set(match[1].toLowerCase(), match[2].replace(/^['"]|['"]$/g, "")); return attrs; }
function parseSrcset(value) { return value.split(",").map((item) => item.trim().split(/\s+/)[0]).filter(Boolean); }
function classify(filePath) { const extension = path.extname(filePath).toLowerCase(); if ([".html", ".htm"].includes(extension)) return "html"; if (extension === ".css") return "css"; if ([".scss", ".sass"].includes(extension)) return "scss"; if ([".js", ".mjs", ".cjs"].includes(extension)) return "js"; if ([".ts", ".mts", ".cts"].includes(extension)) return "ts"; return "asset"; }
function strip(raw) { return raw.split("#")[0].split("?")[0]; }
function isExternal(raw) { return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) || raw.startsWith("//"); }
function normalize(value) { return value.replace(/\\/g, "/"); }
