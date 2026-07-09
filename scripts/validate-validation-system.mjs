import { runValidationSystemMetaChecks } from "./validation/validation-meta.mjs";

const result = runValidationSystemMetaChecks();

console.log("Validation system meta validation");
console.log(`Files checked: ${result.filesChecked}`);
console.log(`Checks executed: ${result.checksExecuted}`);

if (result.errors.length > 0) {
  console.log("Result: FAIL");
  console.log("");
  console.log("Errors:");
  for (const error of result.errors) console.log(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Result: PASS");
  process.exitCode = 0;
}
