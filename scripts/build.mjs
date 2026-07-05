import { spawnSync } from "node:child_process";

const steps = [
  ["build:html"],
  ["build:scss"],
  ["build:ts"]
];

for (const [script] of steps) {
  const result = spawnSync("npm", ["run", script], { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
