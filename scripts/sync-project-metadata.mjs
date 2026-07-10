import { synchronizeProjectMetadata } from "./project-metadata/project-metadata-sync.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const check = args.includes("--check") || !write;
const json = args.includes("--json");

if (write && args.includes("--check")) {
  emit({ status: "FAIL", mode: "invalid", changedFiles: [], errors: ["Use either --write or --check, not both."], hints: [] }, json);
  process.exitCode = 1;
} else {
  const result = synchronizeProjectMetadata({ write: write && !check });
  emit(result, json);
  process.exitCode = result.status === "PASS" ? 0 : 1;
}

function emit(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  console.log(`Project metadata ${result.mode}`);
  if (result.changedFiles.length > 0) {
    console.log(`${result.mode === "write" ? "Updated" : "Drift"}:`);
    for (const file of result.changedFiles) console.log(`- ${file}`);
  }
  if (result.errors.length > 0) {
    console.error("Errors:");
    for (const error of result.errors) console.error(`- ${error}`);
  }
  if (result.hints.length > 0) {
    console.log("Resolution:");
    for (const hint of result.hints) console.log(`- ${hint}`);
  }
  console.log(`Result: ${result.status}`);
}
