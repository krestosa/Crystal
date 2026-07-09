import readline from "node:readline";
import {
  VALIDATION_FAIL_STATUS,
  VALIDATION_FAILURE_COMMAND_EXECUTION,
  VALIDATION_FAILURE_MISSING_DIRECT_SCRIPT,
  VALIDATION_FAILURE_MISSING_NPM_SCRIPT,
  VALIDATION_FAILURE_SKIPPED,
  VALIDATION_FAILURE_VALIDATOR,
  VALIDATION_PASS_STATUS,
  VALIDATION_SKIPPED_STATUS
} from "./validation-result.mjs";
import { extractIssueLines, formatCommand, formatDuration, formatPercent, formatProgressBar, formatStatus, formatStepIndex, indentBlock, padRight } from "./validation-format.mjs";

const LABEL_WIDTH = 38;
const SUMMARY_LABEL_WIDTH = 38;
const SUMMARY_CATEGORY_NAMES = new Map([
  ["docs", "Docs"],
  ["build", "Build"],
  ["core", "Core"],
  ["preview", "Preview"],
  ["ui", "UI"],
  ["watch", "Watch"],
  ["doctor", "Doctor"]
]);

export class ValidationReporter {
  constructor(options = {}) {
    this.verbose = Boolean(options.verbose);
    this.noProgress = Boolean(options.noProgress);
    this.compact = Boolean(options.compact);
    this.plain = Boolean(options.plain) || process.stdout.isTTY !== true;
    this.liveProgress = !this.noProgress && process.stdout.isTTY === true;
    this.liveLineActive = false;
  }

  startSuite(title, checks = [], options = {}) {
    this.printTitle(title);
    this.printSuiteMetadata(checks, options);
    console.log("");
  }

  startStep(check, index, total) {
    if (!this.liveProgress) return;
    const step = formatStepIndex(index, total);
    const label = padRight(check.label, LABEL_WIDTH);
    const percent = formatPercent(index + 1, total);
    const progress = formatProgressBar(index + 1, total, { plain: this.plain, width: 24 });
    const line = this.plain
      ? `> ${step} ${label} ${formatStatus("RUNNING")} [${progress}] ${percent}`
      : `⏳ ${step} ${label} ${progress} ${percent} RUNNING`;
    this.writeLiveLine(line);
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
    } else if (!this.compact) {
      const relevantLines = extractIssueLines(`${result.stdout}\n${result.stderr}`);
      if (relevantLines.length > 0) {
        console.log("Relevant output:");
        for (const line of relevantLines) console.log(`  ${line}`);
      }
    }
  }

  formatResultLine(result, index, total) {
    const statusIcon = this.statusIcon(result.status);
    const step = formatStepIndex(index, total);
    const label = padRight(result.label, LABEL_WIDTH);
    return `${statusIcon} ${step} ${label} ${formatStatus(result.status)} ${formatDuration(result.durationMs)}`;
  }

  statusIcon(status) {
    if (this.plain) {
      if (status === VALIDATION_PASS_STATUS) return "OK";
      if (status === VALIDATION_FAIL_STATUS) return "X ";
      return "- ";
    }

    if (status === VALIDATION_PASS_STATUS) return "✓";
    if (status === VALIDATION_FAIL_STATUS) return "✕";
    return "–";
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

  printTitle(title) {
    if (this.plain) {
      console.log(title);
      return;
    }

    const width = Math.max(48, title.length + 4);
    console.log(`╭${"─".repeat(width)}╮`);
    console.log(`│ ${padRight(title, width - 2)} │`);
    console.log(`╰${"─".repeat(width)}╯`);
  }

  printSuiteMetadata(checks, options) {
    const mode = options.failFast ? "strict, fail-fast" : "strict";
    const progress = this.liveProgress ? "live" : "off";
    const lines = [
      `Suite: local quick`,
      `Checks: ${checks.length}`,
      `Mode: ${mode}`,
      `Fail fast: ${options.failFast ? "on" : "off"}`,
      `Skips allowed: ${options.allowSkips ? "yes" : "no"}`,
      `Progress: ${progress}`,
      `Execution: direct-node where available, npm fallback for typecheck`
    ];

    for (const line of lines) console.log(line);
  }

  printFailure(result) {
    console.log("");
    this.printSection("Failure details");
    console.log(`Validator: ${result.label}`);
    console.log(`Type: ${result.failureType ?? VALIDATION_FAILURE_VALIDATOR}`);
    console.log(`Command: ${result.command}`);
    console.log(`Executed: ${result.executedCommand ?? result.command}`);
    console.log(`Exit code: ${result.exitCode ?? "null"}`);

    if (result.errors.length > 0) {
      console.log("");
      this.printSection("Errors");
      for (const error of result.errors) console.log(`- ${error}`);
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

    if (result.failureType === VALIDATION_FAILURE_MISSING_DIRECT_SCRIPT) {
      this.printMissingDirectScriptGuidance(result);
      return;
    }

    this.printValidatorFailureGuidance(result);
  }

  printSection(title) {
    console.log(title);
    console.log(this.plain ? "-".repeat(title.length) : "─".repeat(title.length));
  }

  printCommandExecutionGuidance(result) {
    console.log("");
    this.printSection("How to inspect");
    console.log(`- Re-run ${result.command} directly.`);
    console.log(`- Check Node can spawn ${result.executedCommand ?? "the configured command"} from this shell.`);
    console.log("- Run: node -e \"console.log(process.platform, process.execPath, process.env.npm_execpath)\"");
    console.log("");
    this.printSection("Likely resolution");
    console.log("- Fix the validation runner command invocation for this platform.");
    console.log("- Do not change the validator contract unless the command actually runs and reports a contract failure.");
  }

  printMissingNpmScriptGuidance(result) {
    console.log("");
    this.printSection("How to inspect");
    console.log("- Open package.json.");
    console.log(`- Search for the script used by ${result.command}.`);
    console.log("- Re-run validate:local:quick after restoring package script wiring.");
    console.log("");
    this.printSection("Likely resolution");
    console.log("- Restore the missing npm script or mark the check optional explicitly in the suite if it is intentionally optional.");
    console.log("- Do not mark a required check as PASS when package.json does not expose it.");
  }

  printMissingDirectScriptGuidance(result) {
    console.log("");
    this.printSection("How to inspect");
    console.log("- Open scripts/validation/validation-suite.mjs.");
    console.log(`- Check the direct command recorded as ${result.executedCommand ?? result.command}.`);
    console.log(`- Re-run ${result.command} after restoring the referenced Node script.`);
    console.log("");
    this.printSection("Likely resolution");
    console.log("- Restore the missing direct Node script file or route that check through npm fallback intentionally.");
    console.log("- Do not relax the public npm script contract.");
  }

  printValidatorFailureGuidance(result) {
    console.log("");
    this.printSection("How to inspect");
    console.log(`- Re-run ${result.command}`);
    console.log("- Read the reported file and search for the exact token or condition.");
    console.log("- Compare against the phase boundary documented in docs/architecture/validation-system.md.");
    console.log("");
    this.printSection("Likely resolution");
    console.log("- Restore the missing contract, token, file, package script, or docs boundary reported above.");
    console.log("- Keep the validator strict; do not convert this failure into a warning.");
  }

  printSkipped(result) {
    console.log("");
    this.printSection("Skipped");
    console.log(`Validator: ${result.label}`);
    console.log(`Command: ${result.command}`);
    console.log(`Executed: ${result.executedCommand ?? result.command}`);
    console.log(`Type: ${result.failureType ?? VALIDATION_FAILURE_SKIPPED}`);
    for (const hint of result.hints) console.log(`- ${hint}`);
  }

  printCapturedOutput(result, title) {
    const stdout = result.stdout.trim();
    const stderr = result.stderr.trim();
    if (this.verbose && result.executedCommand && result.executedCommand !== result.command) {
      console.log(`Executed: ${result.executedCommand}`);
    }
    if (!stdout && !stderr) return;
    console.log("");
    this.printSection(title);
    if (stdout) {
      console.log("stdout:");
      console.log(indentBlock(stdout));
    }
    if (stderr) {
      console.log("stderr:");
      console.log(indentBlock(stderr));
    }
  }

  finalSummary(results, options = {}, metrics = {}) {
    this.clearLiveLine();
    const passed = results.filter((result) => result.status === VALIDATION_PASS_STATUS).length;
    const failed = results.filter((result) => result.status === VALIDATION_FAIL_STATUS).length;
    const skipped = results.filter((result) => result.status === VALIDATION_SKIPPED_STATUS).length;
    const overallStatus = failed > 0 || (skipped > 0 && !options.allowSkips) ? VALIDATION_FAIL_STATUS : VALIDATION_PASS_STATUS;
    const totalDurationMs = metrics.durationMs ?? results.reduce((sum, result) => sum + result.durationMs, 0);
    const slowest = [...results].sort((a, b) => b.durationMs - a.durationMs)[0];

    console.log("");
    this.printSummaryBox({ passed, failed, skipped, total: results.length, durationMs: totalDurationMs });
    console.log("");
    this.printGroupedSummary(results);
    console.log("");
    this.printSection("Performance");
    console.log(`- Slowest check: ${slowest ? `${slowest.label} ${formatDuration(slowest.durationMs)}` : "n/a"}`);
    console.log(`- Total duration: ${formatDuration(totalDurationMs)}`);
    console.log("- Execution mode: direct-node where available, npm fallback for typecheck");
    console.log("");
    console.log("Result:");
    console.log(`${overallStatus} — ${passed} passed, ${failed} failed, ${skipped} skipped.`);
  }

  printSummaryBox({ passed, failed, skipped, total, durationMs }) {
    const rows = [
      ["PASS", passed],
      ["FAIL", failed],
      ["SKIPPED", skipped],
      ["Total", total],
      ["Duration", formatDuration(durationMs)]
    ];

    if (this.plain) {
      console.log("Summary:");
      for (const [label, value] of rows) console.log(`${padRight(label, 8)} ${value}`);
      return;
    }

    const width = 48;
    console.log(`╭─ Summary ${"─".repeat(width - 11)}╮`);
    for (const [label, value] of rows) {
      const content = `${padRight(label, 8)} ${value}`;
      console.log(`│ ${padRight(content, width - 2)} │`);
    }
    console.log(`╰${"─".repeat(width)}╯`);
  }

  printGroupedSummary(results) {
    console.log(`${padRight("Validator", SUMMARY_LABEL_WIDTH)} Status   Duration`);
    console.log(this.plain ? "-".repeat(62) : "─".repeat(62));

    const categories = [];
    for (const result of results) {
      if (!categories.includes(result.category)) categories.push(result.category);
    }

    for (const category of categories) {
      console.log(SUMMARY_CATEGORY_NAMES.get(category) ?? category);
      for (const result of results.filter((item) => item.category === category)) {
        console.log(`  ${padRight(result.label, SUMMARY_LABEL_WIDTH - 2)} ${formatStatus(result.status)} ${formatDuration(result.durationMs)}`);
      }
      console.log("");
    }
  }
}

export function formatValidationCommand(check) {
  if (check.displayCommand) return check.displayCommand;
  return check.npmScript ? `npm run ${check.npmScript}` : formatCommand(check.command, check.args ?? []);
}
