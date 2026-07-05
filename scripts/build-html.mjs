import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const source = path.resolve("apps/desktop/electron/renderer/main.html");
const output = path.resolve("dist/renderer/index.html");
const includePattern = /<crystal-include\s+src=["']([^"']+)["']\s*><\/crystal-include>/g;

async function assembleHtml(filePath, stack = []) {
  const normalizedPath = path.resolve(filePath);

  if (stack.includes(normalizedPath)) {
    const chain = [...stack, normalizedPath].map((entry) => path.relative(process.cwd(), entry)).join(" -> ");
    throw new Error(`Circular crystal-include detected: ${chain}`);
  }

  let html;
  try {
    html = await readFile(normalizedPath, "utf8");
  } catch {
    throw new Error(`Missing HTML file: ${path.relative(process.cwd(), normalizedPath)}`);
  }

  const nextStack = [...stack, normalizedPath];
  const matches = [...html.matchAll(includePattern)];
  let assembled = html;

  for (const match of matches) {
    const [tag, includeSource] = match;
    const includePath = path.resolve(path.dirname(normalizedPath), includeSource);
    const includeHtml = await assembleHtml(includePath, nextStack);
    assembled = assembled.replace(tag, includeHtml);
  }

  return assembled;
}

const html = await assembleHtml(source);

if (includePattern.test(html)) {
  throw new Error("HTML assembly failed: unresolved crystal-include tag remains in output.");
}

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, html, "utf8");
console.log(`HTML assembled: ${path.relative(process.cwd(), output)}`);
