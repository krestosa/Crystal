import { spawnSync } from "node:child_process";

const steps = [
  ["build:html"],
  ["build:scss"],
  ["build:ts"]
];

function resolveInvocation(command, args) {
  if (process.platform !== "win32" || (command !== "npm" && command !== "npx")) {
    return { command, args };
  }

  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", [command, ...args].join(" ")]
  };
}

for (const [script] of steps) {
  const invocation = resolveInvocation("npm", ["run", script]);
  const result = spawnSync(invocation.command, invocation.args, {
    stdio: "inherit",
    shell: false,
    windowsHide: true
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
