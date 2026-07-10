import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function runExecutable(executablePath, args = [], options = {}) {
  assertArgumentArray(args);
  const result = spawnSync(executablePath, args, {
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? process.env,
    encoding: options.encoding ?? "utf8",
    input: options.input,
    stdio: options.stdio ?? (options.inherit ? "inherit" : ["ignore", "pipe", "pipe"]),
    shell: false,
    windowsHide: options.windowsHide ?? true,
    timeout: options.timeout
  });

  const normalized = {
    command: executablePath,
    args: [...args],
    status: result.status,
    signal: result.signal,
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    stderr: typeof result.stderr === "string" ? result.stderr : "",
    error: result.error ?? null
  };

  if (result.error?.code === "ENOENT") {
    normalized.error = new Error(`Command not found: ${executablePath}`);
    normalized.error.code = "COMMAND_NOT_FOUND";
    normalized.error.cause = result.error;
  }

  if (options.throwOnError && (normalized.error || normalized.status !== 0)) {
    throw createProcessError(normalized);
  }

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
    const result = {
      command: process.execPath,
      args: [],
      status: null,
      signal: null,
      stdout: "",
      stderr: "",
      error: Object.assign(new Error("Unable to locate npm-cli.js. Run through npm or install npm with the active Node runtime."), { code: "NPM_CLI_NOT_FOUND" })
    };
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

function assertArgumentArray(args) {
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string")) {
    throw new TypeError("Process arguments must be an array of strings.");
  }
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
  error.code = result.error?.code ?? "PROCESS_FAILED";
  error.result = result;
  return error;
}
