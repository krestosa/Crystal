import { access } from "node:fs/promises";
import path from "node:path";

const requiredPaths = [
  "apps",
  "packages",
  "apps/desktop/electron/main/main.ts",
  "apps/desktop/electron/preload/preload.ts",
  "apps/desktop/electron/renderer/main.html",
  "apps/desktop/electron/renderer/main.scss",
  "apps/desktop/electron/renderer/main.ts",
  "packages/core/commands/command.types.ts",
  "packages/core/commands/command-bus.ts",
  "packages/core/events/event.types.ts",
  "packages/core/events/event-bus.ts",
  "packages/core/state/app-state.types.ts",
  "packages/core/state/app-state.ts",
  "packages/adapters/bundler/bundler.adapter.ts",
  "packages/adapters/sass-compiler/sass-compiler.adapter.ts",
  "packages/adapters/html-assembler/html-assembler.adapter.ts",
  "dist/main/main.cjs",
  "dist/preload/preload.cjs",
  "dist/renderer/index.html",
  "dist/renderer/main.css",
  "dist/renderer/main.js"
];

const missing = [];

for (const requiredPath of requiredPaths) {
  try {
    await access(path.resolve(requiredPath));
  } catch {
    missing.push(requiredPath);
  }
}

if (missing.length > 0) {
  console.error("Crystal structure validation failed. Missing paths:");
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log("Crystal structure validation passed.");
