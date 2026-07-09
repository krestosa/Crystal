import readline from "node:readline";
import {
  VALIDATION_FAIL_STATUS,
  VALIDATION_FAILURE_COMMAND_EXECUTION,
  VALIDATION_FAILURE_MISSING_NPM_SCRIPT,
  VALIDATION_FAILURE_SKIPPED,
  VALIDATION_FAILURE_VALIDATOR,
  VALIDATION_PASS_STATUS,
  VALIDATION_SKIPPED_STATUS
} from "./validation-result.mjs";
import { extractIssueLines, formatCommand, formatDuration, formatProgressBar, formatStatus, formatStepIndex, indentBlock, padRight } from "./validation-format.mjs";

const LABEL_WIDTH = 42;
const SUMMARY_LABEL_WIDTH = 42;

export class ValidationReporter {
  constructor(options = {}) {
    this.verbose = Boolean(options.verbose);
    this.noProgress = Boolean(options.noProgress);
    this.liveProgress = !this.noProgress && process.stdout.isTTY === true;
    this.liveLineActive = false;
  }

  startSuite(title) {
    console.log(title);
    console.log("");
  }

  startStep(check, index, total) {
    if (!this.liveProgress) return;
    const step = formatStepIndex(index, total);
    const label = padRight(check.label, LABEL_WIDTH);
    const progress = formatProgressBar(index + 1, total, { ascii: false });
    this.writeLiveLine(`${step} ${label} ${formatStatus("RUNNING")} ${progress}`);
  }

  completeStep(result, index, total) {
    this.clearLiveLine();
    console.log(this.formatResultLine(result, index, total));

    if (result.status === VALIDATION_FAIL_STATUS) {
      this.printFailure(result);
    } else if (result.status === VALIDATION_SKIPPED_STATUS) {
      if (this.verbose) this.printSkipped(result);
    } else if (this.verbose) {
      this.printCapturedOutput(result, "Captured output");
    } else {
      const relevantLines = extractIssueLines(`${result.stdout}\n${result.stderr}`);
      if (relevantLines.length > 0) {
        console.log("Relevant output:");
        for (const line of relevantLines) console.log(`  ${line}`);
      }
    }
  }

  formatResultLine(result, index, total) {
    const step = formatStepIndex(index, total);
    const label = padRight(result.label, LABEL_WIDTH);
    return `${step} ${label} ${formatStatus(result.status)} ${formatDuration(result.durationMs)}`;
  }

  writeLiveLine(text) {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(text);
    this.liveLineActive = true;
  }

  clearLiveLine() {
    if (!this.liveLineActive) return;
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    this.liveLineActive = false;
  }

  printFailure(result) {
    console.log("");
    console.log("Failure:");
    console.log(`Validator: ${result.label}`);
    console.log(`Command: ${result.command}`);
    console.log(`Exit code: ${result.exitCode ?? "null"}`);
    console.log(`Failure type: ${result.failureType ?? VALIDATION_FAILURE_VALIDATOR}`);
    console.log("");

    if (result.errors.length > 0) {
      console.log("Errors:");
      for (const error of result.errors) console.log(`- ${error}`);
      console.log("");
    }

    this.printCapturedOutput(result, "Output");

    if (result.failureType === VALIDATION_FAILURE_COMMAND_EXECUTION) {
      this.printCommandExecutionGuidance(result);
      return;
    }

    if (result.failureType === VALIDATION_FAILURE_MISSING_NPM_SCRIPT) {
      this.printMissingNpmScriptGuidance(result);
      return;
    }

    this.printValidatorFailureGuidance(result);
  }

  printCommandExecutionGuidance(result) {
    console.log("How to inspect:");
    console.log(`- Re-run ${result.command} directly.`);
    console.log("- Check Node can spawn npm from this shell.");
    console.log("- Run: node -e \"console.log(process.platform, process.execPath, process.env.npm_execpath)\"");
    console.log("");
    console.log("Likely resolution:");
    console.log("- Fix the validation runner npm invocation for this platform.");
    console.log("- Do not change the validator contract unless the command actually runs and reports a contract failure.");
  }

  printMissingNpmScriptGuidance(result) {
    console.log("How to inspect:");
    console.log("- Open package.json.");
    console.log(`- Search for the script used by ${result.command}.`);
    console.log("- Re-run validate:local:quick after restoring package script wiring.");
    console.log("");
    console.log("Likely resolution:");
    console.log("- Restore the missing npm script or mark the check optional explicitly in the suite if it is intentionally optional.");
    console.log("- Do not mark a required check as PASS when package.json does not expose it.");
  }

  printValidatorFailureGuidance(result) {
    console.log("How to inspect:");
    console.log(`- Re-run ${result.command}`);
    console.log("- Read the reported file and search for the exact token or condition.");
    console.log("- Compare against the phase boundary documented in docs/architecture/validation-system.md.");
    console.log("");
    console.log("Likely resolution:");
    console.log("- Restore the missing contract, token, file, package script, or docs boundary reported above.");
    console.log("- Keep the validator strict; do not convert this failure into a warning.");
  }

  printSkipped(result) {
    console.log("");
    console.log("Skipped:");
    console.log(`Validator: ${result.label}`);
    console.log(`Command: ${result.command}`);
    console.log(`Failure type: ${result.failureType ?? VALIDATION_FAILURE_SKIPPED}`);
    for (const hint of result.hints) console.log(`- ${hint}`);
  }

  printCapturedOutput(result, title) {
    const stdout = result.stdout.trim();
    const stderr = result.stderr.trim();
    if (!stdout && !stderr) return;
    console.log(`${title}:`);
    if (stdout) {
      console.log("stdout:");
      console.log(indentBlock(stdout));
    }
    if (stderr) {
      console.log("stderr:");
      console.log(indentBlock(stderr));
    }
    console.log("");
  }

  finalSummary(results, options = {}) {
    this.clearLiveLine();
    const passed = results.filter((result) => result.status === VALIDATION_PASS_STATUS).length;
    const failed = results.filter((result) => result.status === VALIDATION_FAIL_STATUS).length;
    const skipped = results.filter((result) => result.status === VALIDATION_SKIPPED_STATUS).length;
    const overallStatus = failed > 0 || (skipped > 0 && !options.allowSkips) ? VALIDATION_FAIL_STATUS : VALIDATION_PASS_STATUS;

    console.log("");
    console.log("Summary:");
    console.log(`${padRight("Validator", SUMMARY_LABEL_WIDTH)} Status   Duration`);
    for (const result of results) {
      console.log(`${padRight(result.label, SUMMARY_LABEL_WIDTH)} ${formatStatus(result.status)} ${formatDuration(result.durationMs)}`);
    }
    console.log("");
    console.log("Result:");
    console.log(`${overallStatus} — ${passed} passed, ${failed} failed, ${skipped} skipped.`);
  }
}

export function formatValidationCommand(check) {
  return check.npmScript ? `npm run ${check.npmScript}` : formatCommand(check.command, check.args ?? []);
}
