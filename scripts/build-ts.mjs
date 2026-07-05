import { build } from "esbuild";

const targets = {
  main: {
    entryPoints: ["apps/desktop/electron/main/main.ts"],
    outfile: "dist/main/main.js",
    platform: "node",
    format: "cjs",
    external: ["electron"]
  },
  preload: {
    entryPoints: ["apps/desktop/electron/preload/preload.ts"],
    outfile: "dist/preload/preload.js",
    platform: "node",
    format: "cjs",
    external: ["electron"]
  },
  renderer: {
    entryPoints: ["apps/desktop/electron/renderer/main.ts"],
    outfile: "dist/renderer/main.js",
    platform: "browser",
    format: "esm",
    external: []
  }
};

const requestedTarget = process.argv[2];
const selectedTargets = requestedTarget ? [requestedTarget] : Object.keys(targets);

for (const targetName of selectedTargets) {
  const target = targets[targetName];

  if (!target) {
    throw new Error(`Unknown TypeScript build target: ${targetName}`);
  }

  await build({
    ...target,
    bundle: true,
    sourcemap: false,
    target: "es2022",
    logLevel: "info",
    treeShaking: true
  });

  console.log(`TypeScript bundled: ${target.outfile}`);
}
