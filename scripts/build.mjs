import { synchronizeProjectMetadata } from "./project-metadata/project-metadata-sync.mjs";
import { runNodeScript } from "./tooling/process-runner.mjs";

const syncResult = synchronizeProjectMetadata({ write: true });
if (syncResult.status !== "PASS") {
  console.error("Generated project metadata synchronization failed:");
  for (const error of syncResult.errors) console.error(`- ${error}`);
  for (const hint of syncResult.hints) console.error(`- ${hint}`);
  process.exit(1);
}
if (syncResult.changedFiles.length > 0) {
  console.log(`Synchronized generated project metadata: ${syncResult.changedFiles.join(", ")}`);
}

for (const scriptPath of ["scripts/build-html.mjs", "scripts/build-scss.mjs", "scripts/build-ts.mjs"]) {
  const result = runNodeScript(scriptPath, [], { inherit: true });
  if (result.error || result.status !== 0) process.exit(result.status ?? 1);
}
