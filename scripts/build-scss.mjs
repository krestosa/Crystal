import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as sass from "sass";

const source = path.resolve("apps/desktop/electron/renderer/main.scss");
const output = path.resolve("dist/renderer/main.css");

const result = sass.compile(source, {
  style: "expanded",
  sourceMap: false
});

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, result.css, "utf8");
console.log(`SCSS compiled: ${path.relative(process.cwd(), output)}`);
