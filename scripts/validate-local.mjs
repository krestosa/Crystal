import { spawnSync } from "node:child_process";

const withDev = process.argv.slice(2).includes("--with-dev");

const validationSteps = [
  { label: "npm install", command: "npm", args: ["install"] },
  { label: "npm run build", command: "npm", args: ["run", "build"] },
  { label: "npm run typecheck", command: "npm", args: ["run", "typecheck"] },
  { label: "npm run validate:structure", command: "npm", args: ["run", "validate:structure"] },
  { label: "npm run validate:project-graph", command: "npm", args: ["run", "validate:project-graph"] },
  { label: "npm run validate:project-watch", command: "npm", args: ["run", "validate:project-watch"] },
  { label: "npm run validate:preview", command: "npm", args: ["run", "validate:preview"] },
  { label: "npm run validate:dom-snapshot", command: "npm", args: ["run", "validate:dom-snapshot"] },
  { label: "watcher filesystem validation", command: "npm", args: ["run", "validate:local:watch"] },
  { label: "npm run doctor:electron", command: "npm", args: ["run", "doctor:electron"] }
];

if (withDev) {
  validationSteps.push({ label: "npm run dev", command: "npm", args: ["run", "dev"] });
}

const results = [];
const startedAt = Date.now();

console.log("Crystal local validation");
console.log("");

if (withDev) {
  console.log("The --with-dev option is enabled.");
  console.log("Electron will open during npm run dev. Close the app manually to let validation finish.");
  console.log("");
}

for (const step of validationSteps) {
  const started = Date.now();
  const renderedCommand = renderCommand(step.command, step.args);

  console.log(`RUN  ${renderedCommand}`);

  const result = spawnSync(step.command, step.args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  const durationMs = Date.now() - started;
  const exitCode = result.status ?? 1;

  if (exitCode !== 0) {
    results.push({ ...step, status: "FAIL", durationMs, exitCode });
    console.log("");
    console.error(`FAIL ${step.label} (${formatDuration(durationMs)})`);
    printSummary(results, Date.now() - startedAt, false);
    process.exit(1);
  }

  results.push({ ...step, status: "PASS", durationMs, exitCode: 0 });
  console.log(`PASS ${step.label} (${formatDuration(durationMs)})`);
  console.log("");
}

printSummary(results, Date.now() - startedAt, true);
process.exit(0);

function renderCommand(command, args) {
  return [command, ...args].join(" ");
}

function formatDuration(durationMs) {
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function printSummary(results, totalDurationMs, passed) {
  console.log("Result:");
  for (const result of results) {
    const line = `${result.status} ${result.label} (${formatDuration(result.durationMs)})`;
    if (result.status === "PASS") console.log(line);
    else console.error(line);
  }

  console.log("");

  if (passed) {
    console.log(`All local validation checks passed. Total duration: ${formatDuration(totalDurationMs)}.`);
  } else {
    const failed = results.find((result) => result.status === "FAIL");
    console.error(`Local validation failed at: ${failed?.label ?? "unknown step"}. Total duration: ${formatDuration(totalDurationMs)}.`);
  }
}
