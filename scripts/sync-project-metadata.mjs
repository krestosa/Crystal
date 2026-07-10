import path from "node:path";
import { fileURLToPath } from "node:url";
import { synchronizeProjectMetadata } from "./project-metadata/project-metadata-sync.mjs";
import { parseStrictCliArguments, renderCliHelp } from "./tooling/strict-cli.mjs";

const isMain = path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url);

const helpText = renderCliHelp({
  command: "node scripts/sync-project-metadata.mjs",
  description: "Check or write deterministic Crystal project metadata.",
  flags: [
    ["--check", "Check for drift (default)."],
    ["--write", "Write derived outputs transactionally."],
    ["--json", "Emit JSON only."],
    ["--help", "Show this help without synchronizing."]
  ]
});

export function parseProjectMetadataCli(args) {
  return parseStrictCliArguments(args, {
    booleanFlags: ["--write", "--check", "--json", "--help"],
    mutuallyExclusive: [["write", "check"]]
  });
}

export function runProjectMetadataCli(args = process.argv.slice(2)) {
  const parsed = parseProjectMetadataCli(args);
  const json = parsed.values.json === true;
  if (!parsed.ok) {
    return { exitCode: 1, json, result: invalidResult(parsed.errors), help: null };
  }
  if (parsed.values.help) {
    return {
      exitCode: 0,
      json,
      result: json ? { status: "PASS", mode: "help", help: helpText, changedFiles: [], errors: [], hints: [] } : null,
      help: helpText
    };
  }
  const write = parsed.values.write === true;
  const result = synchronizeProjectMetadata({ write });
  return { exitCode: result.status === "PASS" ? 0 : 1, json, result, help: null };
}

if (isMain) {
  const execution = runProjectMetadataCli();
  if (execution.help && !execution.json) process.stdout.write(`${execution.help}\n`);
  else emit(execution.result, execution.json);
  process.exitCode = execution.exitCode;
}

function invalidResult(errors) {
  return { status: "FAIL", mode: "invalid", changedFiles: [], errors, hints: [] };
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
