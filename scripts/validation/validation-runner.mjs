import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { createValidationResult, isFailingValidationResult, VALIDATION_FAIL_STATUS, VALIDATION_PASS_STATUS, VALIDATION_SKIPPED_STATUS } from "./validation-result.mjs";
import { extractIssueLines } from "./validation-format.mjs";
import { formatValidationCommand, ValidationReporter } from "./validation-reporter.mjs";

export function parseValidationRunnerFlags(argv = process.argv.slice(2)) {
  return {
    verbose: argv.includes("--verbose"),
    failFast: argv.includes("--fail-fast"),
    allowSkips: argv.includes("--allow-skips"),
    noProgress: argv.includes("--no-progress")
  };
}

export function runValidationSuite(checks, options = {}) {
  const reporter = new ValidationReporter(options);
  const results = [];
  const packageJson = readPackageJson();

  reporter.startSuite(options.title ?? "Crystal validation");

  for (let index = 0; index < checks.length; index += 1) {
    const check = checks[index];
    const result = runValidationCheck(check, packageJson, options);
    results.push(result);
    reporter.completeStep(result, index, checks.length);

    if (options.failFast && isFailingValidationResult(result, options)) {
      for (let skippedIndex = index + 1; skippedIndex < checks.length; skippedIndex += 1) {
        const skippedCheck = checks[skippedIndex];
        const skippedResult = createValidationResult({
          id: skippedCheck.id,
          label: skippedCheck.label,
          category: skippedCheck.category,
          status: VALIDATION_SKIPPED_STATUS,
          durationMs: 0,
          command: formatValidationCommand(skippedCheck),
          exitCode: null,
          stdout: "",
          stderr: "",
          errors: [],
          hints: ["Skipped because --fail-fast stopped the suite after an earlier failure."]
        });
        results.push(skippedResult);
        reporter.completeStep(skippedResult, skippedIndex, checks.length);
      }
      break;
    }
  }

  reporter.finalSummary(results, options);

  const hasFail = results.some((result) => result.status === VALIDATION_FAIL_STATUS);
  const hasSkipped = results.some((result) => result.status === VALIDATION_SKIPPED_STATUS);
  if (hasFail || (hasSkipped && !options.allowSkips)) process.exitCode = 1;
  else process.exitCode = 0;

  return results;
}

function runValidationCheck(check, packageJson, options) {
  const commandText = formatValidationCommand(check);
  const start = performance.now();

  if (check.npmScript && !packageJson.scripts?.[check.npmScript]) {
    return createValidationResult({
      id: check.id,
      label: check.label,
      category: check.category,
      status: check.required === false ? VALIDATION_SKIPPED_STATUS : VALIDATION_FAIL_STATUS,
      durationMs: performance.now() - start,
      command: commandText,
      exitCode: null,
      stdout: "",
      stderr: `Missing npm script: ${check.npmScript}`,
      errors: [`Missing npm script: ${check.npmScript}`],
      hints: ["Add the script to package.json or mark this check optional explicitly."]
    });
  }

  const execution = spawnSync(check.command, check.args ?? [], {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    shell: false,
    windowsHide: true
  });
  const durationMs = performance.now() - start;

  if (execution.error) {
    return createValidationResult({
      id: check.id,
      label: check.label,
      category: check.category,
      status: VALIDATION_FAIL_STATUS,
      durationMs,
      command: commandText,
      exitCode: null,
      stdout: execution.stdout ?? "",
      stderr: `${execution.stderr ?? ""}\n${execution.error.message}`.trim(),
      errors: [execution.error.message],
      hints: ["Confirm the command exists and can be executed in this checkout."]
    });
  }

  const exitCode = execution.status;
  const combinedOutput = `${execution.stdout ?? ""}\n${execution.stderr ?? ""}`;
  const errors = exitCode === 0 ? [] : extractIssueLines(combinedOutput);

  return createValidationResult({
    id: check.id,
    label: check.label,
    category: check.category,
    status: exitCode === 0 ? VALIDATION_PASS_STATUS : VALIDATION_FAIL_STATUS,
    durationMs,
    command: commandText,
    exitCode,
    stdout: execution.stdout ?? "",
    stderr: execution.stderr ?? "",
    errors: errors.length > 0 ? errors : [`${commandText} exited with code ${exitCode}`],
    hints: []
  });
}

function readPackageJson() {
  const packagePath = "package.json";
  if (!fs.existsSync(packagePath)) return { scripts: {} };
  try {
    return JSON.parse(fs.readFileSync(packagePath, "utf8"));
  } catch {
    return { scripts: {} };
  }
}
