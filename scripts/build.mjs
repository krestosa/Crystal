import { spawnSync } from "node:child_process";

const steps = [
  ["build:html"],
  ["build:scss"],
  ["build:ts"]
];

function resolveExecutable(command) {
  if (process.platform !== "win32") {
    return command;
  }

  if (command === "npm" || command === "npx") {
    return `${command}.cmd`;
  }

  return command;
}

for (const [script] of steps) {
  const result = spawnSync(resolveExecutable("npm"), ["run", script], {
    stdio: "inherit",
    shell: false,
    windowsHide: true
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
