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
import { formatCommand, formatDuration, formatPercent, formatStatus, formatStepIndex, indentBlock, padRight } from "./validation-format.mjs";
import { detectTerminalCapabilities, getTerminalWidth } from "./validation-terminal-capabilities.mjs";
import { resolveRenderMode, shouldUseLiveProgress, VALIDATION_RENDER_ASCII, VALIDATION_RENDER_JSON_SUMMARY, VALIDATION_RENDER_PLAIN, VALIDATION_RENDER_RAW } from "./validation-render-mode.mjs";
import { summarizePerformance } from "./validation-performance.mjs";
import {
  renderBox,
  renderDurationBarChart,
  renderKeyValueRows,
  renderProgressBar,
  renderStatus,
  renderTable,
  renderTree,
  truncateText
} from "./validation-terminal-components.mjs";

const LABEL_WIDTH = 38;
const SUMMARY_LABEL_WIDTH = 38;
const OUTPUT_TRUNCATE_LIMIT = 12000;
const SUMMARY_CATEGORY_NAMES = new Map([
  ["docs", "Docs"],
  ["build", "Build"],
  ["typecheck", "Typecheck"],
  ["core", "Core"],
  ["preview", "Preview"],
  ["ui", "UI"],
  ["watch", "Watch"],
  ["doctor", "Doctor"],
  ["validation", "Validation"]
]);

export class ValidationReporter {
  constructor(options = {}) {
    this.verbose = Boolean(options.verbose);
    this.noProgress = Boolean(options.noProgress);
    this.compact = Boolean(options.compact);
    this.capabilities = detectTerminalCapabilities();
    this.renderMode = resolveRenderMode(options, this.capabilities);
    this.plain = this.renderMode === VALIDATION_RENDER_ASCII || this.renderMode === VALIDATION_RENDER_PLAIN || this.renderMode === VALIDATION_RENDER_RAW || this.renderMode === VALIDATION_RENDER_JSON_SUMMARY;
    this.raw = this.renderMode === VALIDATION_RENDER_RAW;
    this.jsonSummary = this.renderMode === VALIDATION_RENDER_JSON_SUMMARY;
    this.liveProgress = shouldUseLiveProgress(this.renderMode, options, this.capabilities);
    this.liveLineActive = false;
    this.width = getTerminalWidth(this.capabilities);
    this.topSlowest = options.topSlowest ?? 5;
  }

  startSuite(title, checks = [], options = {}) {
    if (this.jsonSummary) return;
    if (this.raw) {
      this.printRawEvent("VALIDATION_START", {
        suite: options.suiteName ?? "local-quick",
        checks: checks.length,
        mode: options.failFast ? "strict-fail-fast" : "strict"
      });
      return;
    }

    this.printTitle(title);
    this.printSuiteMetadata(checks, options);
    console.log("");
  }

  startStep(check, index, total) {
    if (!this.liveProgress || this.raw || this.jsonSummary) return;
    const step = formatStepIndex(index, total);
    const label = truncateText(check.label, LABEL_WIDTH);
    const percent = formatPercent(index + 1, total);
    const progress = renderProgressBar(index + 1, total, { plain: this.plain, width: 24 });
    const line = this.plain
      ? `${renderStatus("RUNNING", { plain: true })} ${step} ${padRight(label, LABEL_WIDTH)} ${formatStatus("RUNNING")} ${progress} ${percent}`
      : `${renderStatus("RUNNING", { plain: false })} ${step} ${padRight(label, LABEL_WIDTH)} ${progress} ${percent} RUNNING`;
    this.writeLiveLine(line);
  }

  completeStep(result, index, total) {
    this.clearLiveLine();

    if (this.jsonSummary) return;

    if (this.raw) {
      this.printRawStep(result);
      return;
    }

    console.log(this.formatResultLine(result, index, total));

    if (result.status === VALIDATION_FAIL_STATUS) {
      this.printFailure(result);
    } else if (result.status === VALIDATION_SKIPPED_STATUS) {
      if (this.verbose) this.printSkipped(result);
    } else if (this.verbose) {
      this.printCapturedOutput(result, "Captured output");
    } else if (!this.compact) {
      const relevantLines = result.errors?.length > 0 ? result.errors : [];
      if (relevantLines.length > 0) {
        console.log("Relevant output:");
        for (const line of relevantLines) console.log(`  ${line}`);
      }
    }
  }

  formatResultLine(result, index, total) {
    const icon = renderStatus(result.status, { plain: this.plain });
    const step = formatStepIndex(index, total);
    const label = padRight(truncateText(result.label, LABEL_WIDTH), LABEL_WIDTH);
    return `${padRight(icon, 2)} ${step} ${label} ${formatStatus(result.status)} ${formatDuration(result.durationMs)}`;
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
    console.log(renderBox(title, [], { plain: false, width: Math.min(this.width, 64) }));
  }

  printSuiteMetadata(checks, options) {
    const rows = [
      ["Suite", options.suiteName ?? "local quick"],
      ["Checks", checks.length],
      ["Mode", options.failFast ? "strict, fail-fast" : "strict"],
      ["Fail fast", options.failFast ? "on" : "off"],
      ["Skips allowed", options.allowSkips ? "yes" : "no"],
      ["Render", this.renderMode],
      ["Progress", this.liveProgress ? "live" : "off"],
      ["Execution", "direct-node where available, npm fallback for typecheck"]
    ];
    console.log(renderKeyValueRows(rows, { plain: this.plain }));
  }

  printFailure(result) {
    console.log("");
    const detailRows = [
      ["Validator", result.label],
      ["Type", result.failureType ?? VALIDATION_FAILURE_VALIDATOR],
      ["Command", result.command],
      ["Executed", result.executedCommand ?? result.command],
      ["Exit code", result.exitCode ?? "null"]
    ];

    if (this.plain) {
      this.printSection("Failure details");
      console.log(renderKeyValueRows(detailRows, { plain: true }));
    } else {
      console.log(renderBox("Failure details", detailRows.map(([key, value]) => `${padRight(key, 10)} ${value}`), { plain: false, width: Math.min(this.width, 80) }));
    }

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
      console.log(indentBlock(this.prepareOutput(stdout)));
    }
    if (stderr) {
      console.log("stderr:");
      console.log(indentBlock(this.prepareOutput(stderr)));
    }
  }

  prepareOutput(output) {
    if (this.verbose || output.length <= OUTPUT_TRUNCATE_LIMIT) return output;
    return `${output.slice(0, OUTPUT_TRUNCATE_LIMIT)}\nOutput truncated. Re-run with --verbose for full output.`;
  }

  finalSummary(results, options = {}, metrics = {}) {
    this.clearLiveLine();
    const passed = results.filter((result) => result.status === VALIDATION_PASS_STATUS).length;
    const failed = results.filter((result) => result.status === VALIDATION_FAIL_STATUS).length;
    const skipped = results.filter((result) => result.status === VALIDATION_SKIPPED_STATUS).length;
    const overallStatus = failed > 0 || (skipped > 0 && !options.allowSkips) ? VALIDATION_FAIL_STATUS : VALIDATION_PASS_STATUS;
    const performance = summarizePerformance(results, { durationMs: metrics.durationMs, topSlowest: this.topSlowest });

    if (this.jsonSummary) {
      console.log(JSON.stringify(this.createJsonSummary(results, overallStatus, passed, failed, skipped, performance, metrics.suiteName), null, 2));
      return;
    }

    if (this.raw) {
      this.printRawEvent("VALIDATION_RESULT", {
        status: overallStatus,
        passed,
        failed,
        skipped,
        duration_ms: Math.round(performance.durationMs)
      });
      return;
    }

    console.log("");
    this.printSummaryBox({ passed, failed, skipped, total: results.length, durationMs: performance.durationMs });
    console.log("");
    this.printGroupedSummary(results);
    console.log("");
    this.printTreeSummary(results);
    console.log("");
    this.printPerformance(performance);
    console.log("");
    console.log("Result:");
    console.log(`${overallStatus} — ${passed} passed, ${failed} failed, ${skipped} skipped.`);
  }

  createJsonSummary(results, status, passed, failed, skipped, performance, suiteName = "local-quick") {
    return {
      suite: suiteName,
      status,
      passed,
      failed,
      skipped,
      durationMs: Math.round(performance.durationMs),
      performance: {
        slowestCheck: performance.slowestCheck
          ? { id: performance.slowestCheck.id, label: performance.slowestCheck.label, durationMs: Math.round(performance.slowestCheck.durationMs) }
          : null,
        executionModes: performance.executionModes,
        processLaunches: performance.processLaunches
      },
      results: results.map((result) => ({
        id: result.id,
        label: result.label,
        category: result.category,
        status: result.status,
        durationMs: Math.round(result.durationMs),
        command: result.command,
        executed: result.executedCommand,
        executionMode: result.executionMode,
        failureType: result.failureType,
        exitCode: result.exitCode
      }))
    };
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

    console.log(renderBox("Validation status", rows.map(([label, value]) => `${padRight(label, 8)} ${value}`), { plain: false, width: Math.min(this.width, 58) }));
  }

  printGroupedSummary(results) {
    const rows = [];
    for (const result of results) {
      rows.push([result.label, result.status, formatDuration(result.durationMs)]);
    }
    console.log(renderTable([
      { label: "Validator", maxWidth: SUMMARY_LABEL_WIDTH },
      { label: "Status", maxWidth: 8 },
      { label: "Duration", maxWidth: 10 }
    ], rows, { plain: this.plain }));
  }

  printTreeSummary(results) {
    const categories = [];
    for (const result of results) {
      if (!categories.includes(result.category)) categories.push(result.category);
    }

    const nodes = [{
      label: "Validation suite",
      children: categories.map((category) => ({
        label: SUMMARY_CATEGORY_NAMES.get(category) ?? category,
        children: results
          .filter((result) => result.category === category)
          .map((result) => ({ label: `${padRight(truncateText(result.label, 32), 32)} ${result.status} ${formatDuration(result.durationMs)}` }))
      }))
    }];
    console.log(renderTree(nodes, { plain: this.plain }));
  }

  printPerformance(performance) {
    this.printSection("Performance");
    console.log(`- Slowest check: ${performance.slowestCheck ? `${performance.slowestCheck.label} ${formatDuration(performance.slowestCheck.durationMs)}` : "n/a"}`);
    console.log(`- Total duration: ${formatDuration(performance.durationMs)}`);
    console.log(`- Process launches: ${performance.processLaunches}`);
    console.log("- Execution modes:");
    for (const [mode, count] of Object.entries(performance.executionModes)) console.log(`  ${padRight(mode, 12)} ${count}`);
    if (performance.duplicateWarnings.length > 0) {
      console.log("- Duplicate execution warnings:");
      for (const warning of performance.duplicateWarnings) console.log(`  - ${warning}`);
    }
    console.log("");
    console.log(renderDurationBarChart("Slowest checks", performance.slowestChecks, { plain: this.plain }));
  }

  printRawStep(result) {
    const values = {
      id: result.id,
      label: result.label,
      status: result.status,
      duration_ms: Math.round(result.durationMs),
      command: result.command,
      executed: result.executedCommand,
      execution_mode: result.executionMode,
      failureType: result.failureType
    };
    if (result.status === VALIDATION_FAIL_STATUS) {
      values.exitCode = result.exitCode ?? "null";
    }
    if (this.verbose) {
      if (result.stdout) values.stdout = result.stdout;
      if (result.stderr) values.stderr = result.stderr;
    }
    this.printRawEvent("VALIDATION_STEP", values);
  }

  printRawEvent(name, values) {
    const parts = [name];
    for (const [key, value] of Object.entries(values)) {
      parts.push(`${key}=${formatRawValue(value)}`);
    }
    console.log(parts.join(" "));
  }
}

function formatRawValue(value) {
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(String(value));
}

export function formatValidationCommand(check) {
  if (check.displayCommand) return check.displayCommand;
  return check.npmScript ? `npm run ${check.npmScript}` : formatCommand(check.command, check.args ?? []);
}
