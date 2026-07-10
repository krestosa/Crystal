import { fullValidationChecks } from "./validation/validation-suite.mjs";
import { parseValidationRunnerFlags, runValidationSuite } from "./validation/validation-runner.mjs";

const argv = process.argv.slice(2);
const withDev = argv.includes("--with-dev");
const flags = parseValidationRunnerFlags(argv);
const checks = [...fullValidationChecks];

const requiredFullValidationCommands = [
  "npm run validate:design-canvas",
  "npm run validate:visual-selection-overlay",
  "npm run validate:html-element-library",
  "npm run validate:source-patch-preview",
  "npm run validate:ui-flow"
];

const catalogCommands = new Set(fullValidationChecks.map((check) => `npm run ${check.npmScript}`));
for (const requiredCommand of requiredFullValidationCommands) {
  if (!catalogCommands.has(requiredCommand)) {
    throw new Error(`Full validation catalog is missing required command: ${requiredCommand}`);
  }
}

if (withDev) {
  checks.push({
    id: "dev-launch",
    label: "Development Electron launch",
    category: "doctor",
    npmScript: "dev",
    required: true,
    executionMode: "npm",
    directScriptPath: null,
    includeInLocalQuick: false,
    includeInFullValidation: false,
    documentationGroup: "Manual environment",
    displayCommand: "npm run dev",
    commandMode: "npm"
  });
}

runValidationSuite(checks, {
  title: "Crystal full local validation",
  suiteName: "local",
  failFast: true,
  ...flags
});
