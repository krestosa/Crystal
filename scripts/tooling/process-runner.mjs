import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
export const DEFAULT_MAX_BUFFER_BYTES = 16 * 1024 * 1024;

export const PROCESS_FAILURE_TYPES = Object.freeze({
  COMMAND_NOT_FOUND: "COMMAND_NOT_FOUND",
  PROCESS_TIMEOUT: "PROCESS_TIMEOUT",
  PROCESS_OUTPUT_LIMIT: "PROCESS_OUTPUT_LIMIT",
  PROCESS_SIGNALLED: "PROCESS_SIGNALLED",
  PROCESS_EXIT_FAILURE: "PROCESS_EXIT_FAILURE",
  PROCESS_SPAWN_FAILURE: "PROCESS_SPAWN_FAILURE",
  NPM_CLI_NOT_FOUND: "NPM_CLI_NOT_FOUND"
});

export function runExecutable(executablePath, args = [], options = {}) {
  if (typeof executablePath !== "string" || executablePath.trim() === "") {
    throw new TypeError("Executable path must be a non-empty string.");
  }
  assertArgumentArray(args);
  const startedAt = process.hrtime.bigint();
  const timeout = normalizePositiveInteger(options.timeout, DEFAULT_TIMEOUT_MS, "timeout");
  const maxBuffer = normalizePositiveInteger(options.maxBuffer, DEFAULT_MAX_BUFFER_BYTES, "maxBuffer");
  const stdio = options.stdio ?? (options.inherit ? "inherit" : ["ignore", "pipe", "pipe"]);
  const result = spawnSync(executablePath, args, {
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? process.env,
    encoding: options.encoding ?? "utf8",
    input: options.input,
    stdio,
    shell: false,
    windowsHide: options.windowsHide ?? true,
    timeout,
    maxBuffer,
    killSignal: options.killSignal ?? "SIGTERM"
  });
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  const failure = classifyProcessFailure(result, executablePath);
  const normalized = {
    command: executablePath,
    args: [...args],
    status: result.status,
    signal: result.signal,
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    stderr: typeof result.stderr === "string" ? result.stderr : "",
    error: failure.error,
    failureType: failure.failureType,
    durationMs,
    timedOut: failure.failureType === PROCESS_FAILURE_TYPES.PROCESS_TIMEOUT,
    outputLimited: failure.failureType === PROCESS_FAILURE_TYPES.PROCESS_OUTPUT_LIMIT,
    timeout,
    maxBuffer
  };

  if (options.throwOnError && normalized.failureType) throw createProcessError(normalized);
  return normalized;
}

export function runNodeScript(scriptPath, args = [], options = {}) {
  assertArgumentArray(args);
  const cwd = options.cwd ?? process.cwd();
  const absoluteScriptPath = path.isAbsolute(scriptPath) ? scriptPath : path.resolve(cwd, scriptPath);
  return runExecutable(process.execPath, [absoluteScriptPath, ...args], { ...options, cwd });
}

export function runNpmScript(scriptName, args = [], options = {}) {
  if (typeof scriptName !== "string" || scriptName.trim() === "") {
    throw new TypeError("runNpmScript requires a non-empty npm script name.");
  }
  assertArgumentArray(args);
  return runNpmCommand(["run", scriptName, ...(args.length > 0 ? ["--", ...args] : [])], options);
}

export function runNpmCommand(args = [], options = {}) {
  assertArgumentArray(args);
  const npmCliPath = resolveNpmCliPath(options);
  if (!npmCliPath) {
    const result = createSyntheticFailure({
      command: process.execPath,
      args: [],
      failureType: PROCESS_FAILURE_TYPES.NPM_CLI_NOT_FOUND,
      message: "Unable to locate npm-cli.js. Run through npm or install npm with the active Node runtime.",
      timeout: normalizePositiveInteger(options.timeout, DEFAULT_TIMEOUT_MS, "timeout"),
      maxBuffer: normalizePositiveInteger(options.maxBuffer, DEFAULT_MAX_BUFFER_BYTES, "maxBuffer")
    });
    if (options.throwOnError) throw createProcessError(result);
    return result;
  }
  return runExecutable(process.execPath, [npmCliPath, ...args], options);
}

export function resolveNpmCliPath(options = {}) {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const candidates = [
    env.npm_execpath,
    env.NPM_CLI_JS,
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    path.resolve(path.dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
    path.resolve(cwd, "node_modules", "npm", "bin", "npm-cli.js")
  ].filter(Boolean);

  for (const candidate of candidates) {
    const absolutePath = path.resolve(candidate);
    if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) return absolutePath;
  }
  return null;
}

export function formatProcessCommand(command, args = []) {
  assertArgumentArray(args);
  return [command, ...args].map(quoteForDisplay).join(" ");
}

function classifyProcessFailure(result, executablePath) {
  const code = result.error?.code;
  if (code === "ENOENT") {
    return failure(PROCESS_FAILURE_TYPES.COMMAND_NOT_FOUND, `Command not found: ${executablePath}`, result.error);
  }
  if (code === "ETIMEDOUT") {
    return failure(PROCESS_FAILURE_TYPES.PROCESS_TIMEOUT, `Process timed out: ${executablePath}`, result.error);
  }
  if (code === "ENOBUFS") {
    return failure(PROCESS_FAILURE_TYPES.PROCESS_OUTPUT_LIMIT, `Process output exceeded the configured limit: ${executablePath}`, result.error);
  }
  if (result.error) {
    return failure(PROCESS_FAILURE_TYPES.PROCESS_SPAWN_FAILURE, `Process could not be spawned: ${executablePath}: ${result.error.message}`, result.error);
  }
  if (result.signal && result.status === null) {
    return failure(PROCESS_FAILURE_TYPES.PROCESS_SIGNALLED, `Process ended because of signal ${result.signal}: ${executablePath}`);
  }
  if (typeof result.status === "number" && result.status !== 0) {
    return failure(PROCESS_FAILURE_TYPES.PROCESS_EXIT_FAILURE, `Process exited with code ${result.status}: ${executablePath}`);
  }
  return { failureType: null, error: null };
}

function failure(failureType, message, cause = undefined) {
  const error = new Error(message);
  error.code = failureType;
  if (cause) error.cause = cause;
  return { failureType, error };
}

function createSyntheticFailure({ command, args, failureType, message, timeout, maxBuffer }) {
  const classified = failure(failureType, message);
  return {
    command,
    args,
    status: null,
    signal: null,
    stdout: "",
    stderr: "",
    error: classified.error,
    failureType,
    durationMs: 0,
    timedOut: failureType === PROCESS_FAILURE_TYPES.PROCESS_TIMEOUT,
    outputLimited: failureType === PROCESS_FAILURE_TYPES.PROCESS_OUTPUT_LIMIT,
    timeout,
    maxBuffer
  };
}

function assertArgumentArray(args) {
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string")) {
    throw new TypeError("Process arguments must be an array of strings.");
  }
}

function normalizePositiveInteger(value, fallback, name) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${name} must be a positive integer.`);
  return value;
}

function quoteForDisplay(value) {
  if (value === "") return '""';
  if (!/[\s&|^()"']/.test(value)) return value;
  return JSON.stringify(value);
}

function createProcessError(result) {
  const rendered = formatProcessCommand(result.command, result.args);
  const detail = result.error?.message || result.stderr.trim() || `exit code ${result.status}`;
  const error = new Error(`${rendered} failed: ${detail}`);
  error.code = result.failureType ?? PROCESS_FAILURE_TYPES.PROCESS_SPAWN_FAILURE;
  error.failureType = result.failureType;
  error.result = result;
  return error;
}
