import { localQuickValidationChecks } from "./validation/validation-suite.mjs";
import { parseValidationRunnerFlags, runValidationSuite } from "./validation/validation-runner.mjs";

const flags = parseValidationRunnerFlags();

runValidationSuite(localQuickValidationChecks, {
  title: "Crystal local quick validation",
  suiteName: "local-quick",
  ...flags
});
