import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import {
  createValidationResult,
  isFailingValidationResult,
  VALIDATION_FAIL_STATUS,
  VALIDATION_FAILURE_COMMAND_EXECUTION,
  VALIDATION_FAILURE_MISSING_DIRECT_SCRIPT,
  VALIDATION_FAILURE_MISSING_NPM_SCRIPT,
  VALIDATION_FAILURE_NONE,
  VALIDATION_FAILURE_SKIPPED,
  VALIDATION_FAILURE_VALIDATOR,
  VALIDATION_PASS_STATUS,
  VALIDATION_SKIPPED_STATUS
} from "./validation-result.mjs";
import { extractIssueLines, formatCommand } from "./validation-format.mjs";
import { formatValidationCommand, ValidationReporter } from "./validation-reporter.mjs";

export function parseValidationRunnerFlags(argv = process.argv.slice(2)) {
  return {
    verbose: argv.includes("--verbose"),
    failFast: argv.includes("--fail-fast"),
    allowSkips: argv.includes("--allow-skips"),
    noProgress: argv.includes("--no-progress"),
    plain: argv.includes("--plain"),
    ascii: argv.includes("--ascii"),
    unicode: argv.includes("--unicode"),
    raw: argv.includes("--raw"),
    jsonSummary: argv.includes("--json-summary"),
    compact: argv.includes("--compact"),
    topSlowest: parseTopSlowest(argv)
  };
}

export function runValidationSuite(checks, options = {}) {
  const reporter = new ValidationReporter({ ...options, totalChecks: checks.length });
  const results = [];
  const cwd = options.cwd ?? process.cwd();
  const packageJson = readPackageJson(cwd);
  const suiteStart = performance.now();
  const suiteName = options.suiteName ?? "local-quick";

  reporter.startSuite(options.title ?? "Crystal validation", checks, { ...options, suiteName });

  for (let index = 0; index < checks.length; index += 1) {
    const check = checks[index];
    reporter.startStep(check, index, checks.length);
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
          executedCommand: formatExecutedCommand(skippedCheck),
          executionMode: "skipped",
          exitCode: null,
          stdout: "",
          stderr: "",
          errors: [],
          hints: ["Skipped because --fail-fast stopped the suite after an earlier failure."],
          failureType: VALIDATION_FAILURE_SKIPPED
        });
        results.push(skippedResult);
        reporter.completeStep(skippedResult, skippedIndex, checks.length);
      }
      break;
    }
  }

  const suiteDurationMs = performance.now() - suiteStart;
  reporter.finalSummary(results, options, { durationMs: suiteDurationMs, suiteName });

  const hasFail = results.some((result) => result.status === VALIDATION_FAIL_STATUS);
  const hasSkipped = results.some((result) => result.status === VALIDATION_SKIPPED_STATUS);
  if (hasFail || (hasSkipped && !options.allowSkips)) process.exitCode = 1;
  else process.exitCode = 0;

  return results;
}

function runValidationCheck(check, packageJson, options) {
  const commandText = formatValidationCommand(check);
  const executedCommandText = formatExecutedCommand(check);
  const start = performance.now();

  if (check.npmScript && !packageJson.scripts?.[check.npmScript]) {
    return createValidationResult({
      id: check.id,
      label: check.label,
      category: check.category,
      status: check.required === false ? VALIDATION_SKIPPED_STATUS : VALIDATION_FAIL_STATUS,
      durationMs: performance.now() - start,
      command: commandText,
      executedCommand: executedCommandText,
      executionMode: check.executionMode ?? inferExecutionMode(check),
      exitCode: null,
      stdout: "",
      stderr: `Missing npm script: ${check.npmScript}`,
      errors: [`Missing npm script: ${check.npmScript}`],
      hints: ["Add the script to package.json or mark this check optional explicitly."],
      failureType: check.required === false ? VALIDATION_FAILURE_SKIPPED : VALIDATION_FAILURE_MISSING_NPM_SCRIPT
    });
  }

  if (check.directScriptPath && !fs.existsSync(path.join(options.cwd ?? process.cwd(), check.directScriptPath))) {
    return createValidationResult({
      id: check.id,
      label: check.label,
      category: check.category,
      status: VALIDATION_FAIL_STATUS,
      durationMs: performance.now() - start,
      command: commandText,
      executedCommand: executedCommandText,
      executionMode: check.executionMode ?? inferExecutionMode(check),
      exitCode: null,
      stdout: "",
      stderr: `Missing direct Node script: ${check.directScriptPath}`,
      errors: [`Missing direct Node script: ${check.directScriptPath}`],
      hints: ["Restore the direct script file or change the suite entry to use npm fallback explicitly."],
      failureType: VALIDATION_FAILURE_MISSING_DIRECT_SCRIPT
    });
  }

  const invocation = resolveCheckInvocation(check);
  const execution = spawnSync(invocation.command, invocation.args, {
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
      executedCommand: formatCommand(invocation.command, invocation.args),
      executionMode: check.executionMode ?? inferExecutionMode(check),
      exitCode: null,
      stdout: execution.stdout ?? "",
      stderr: `${execution.stderr ?? ""}\n${execution.error.message}`.trim(),
      errors: [execution.error.message],
      hints: ["Confirm Node can spawn the configured validation command from this shell."],
      failureType: VALIDATION_FAILURE_COMMAND_EXECUTION
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
    executedCommand: formatCommand(invocation.command, invocation.args),
    executionMode: check.executionMode ?? inferExecutionMode(check),
    exitCode,
    stdout: execution.stdout ?? "",
    stderr: execution.stderr ?? "",
    errors: exitCode === 0 ? [] : errors.length > 0 ? errors : [`${commandText} exited with code ${exitCode}`],
    hints: [],
    failureType: exitCode === 0 ? VALIDATION_FAILURE_NONE : VALIDATION_FAILURE_VALIDATOR
  });
}

function resolveCheckInvocation(check) {
  if (check.command && Array.isArray(check.args)) {
    return {
      command: check.command,
      args: check.args
    };
  }

  if (check.commandMode === "npm" || check.npmScript) return resolveNpmInvocation(check.npmScript);

  return {
    command: check.command,
    args: check.args ?? []
  };
}

function resolveNpmInvocation(scriptName) {
  const npmExecPath = process.env.npm_execpath;

  if (npmExecPath) {
    return {
      command: process.execPath,
      args: [npmExecPath, "run", scriptName]
    };
  }

  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "npm", "run", scriptName]
    };
  }

  return {
    command: "npm",
    args: ["run", scriptName]
  };
}

function formatExecutedCommand(check) {
  if (check.command && Array.isArray(check.args)) return formatCommand(check.command, check.args);
  if (check.commandMode === "npm" || check.npmScript) {
    const invocation = resolveNpmInvocation(check.npmScript);
    return formatCommand(invocation.command, invocation.args);
  }
  return formatCommand(check.command, check.args ?? []);
}

function inferExecutionMode(check) {
  if (check.executionMode) return check.executionMode;
  if (check.commandMode === "npm") return "npm";
  if (check.command === process.execPath) return "direct-node";
  return "custom";
}

function parseTopSlowest(argv) {
  const flag = argv.find((item) => item.startsWith("--top-slowest="));
  if (!flag) return 5;
  const value = Number.parseInt(flag.slice("--top-slowest=".length), 10);
  if (!Number.isFinite(value) || value < 0) return 5;
  return value;
}

function readPackageJson(cwd = process.cwd()) {
  const packagePath = path.join(cwd, "package.json");
  if (!fs.existsSync(packagePath)) return { scripts: {} };
  try {
    return JSON.parse(fs.readFileSync(packagePath, "utf8"));
  } catch {
    return { scripts: {} };
  }
}
