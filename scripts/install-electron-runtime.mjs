import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runNodeScript } from "./tooling/process-runner.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultProjectRoot = path.resolve(path.dirname(scriptPath), "..");
export function inspectElectronRuntime(options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? defaultProjectRoot);
  const electronRoot = path.resolve(projectRoot, options.electronRoot ?? path.join("node_modules", "electron"));
  const pathFile = path.join(electronRoot, "path.txt");

  if (!isFile(pathFile)) {
    return runtimeState({ projectRoot, electronRoot, pathFile, reason: "path-missing" });
  }

  let binaryPath;
  try {
    binaryPath = fs.readFileSync(pathFile, "utf8").trim();
  } catch (error) {
    return runtimeState({ projectRoot, electronRoot, pathFile, reason: "path-unreadable", error });
  }

  if (!binaryPath) {
    return runtimeState({ projectRoot, electronRoot, pathFile, reason: "path-empty" });
  }

  const executablePath = path.isAbsolute(binaryPath)
    ? path.normalize(binaryPath)
    : path.resolve(electronRoot, "dist", binaryPath);

  if (!isFile(executablePath)) {
    return runtimeState({ projectRoot, electronRoot, pathFile, binaryPath, executablePath, reason: "executable-missing" });
  }

  return runtimeState({ projectRoot, electronRoot, pathFile, binaryPath, executablePath, ready: true, reason: "ready" });
}

export function installElectronRuntime(options = {}) {
  const env = options.env ?? process.env;
  const logger = options.logger ?? console;
  const runner = options.runNodeScript ?? runNodeScript;

  if (hasTruthyEnvValue(env.ELECTRON_SKIP_BINARY_DOWNLOAD)) {
    throw new Error("ELECTRON_SKIP_BINARY_DOWNLOAD is enabled. Crystal cannot install the locked Electron runtime while binary download is disabled.");
  }

  const before = inspectElectronRuntime(options);
  if (before.ready) {
    logger.log(`Electron runtime already ready: ${displayPath(before.projectRoot, before.executablePath)}`);
    return { status: "ready", installed: false, runtime: before };
  }

  const installScript = path.join(before.electronRoot, "install.js");
  if (!isFile(installScript)) {
    throw new Error(`Electron runtime is incomplete (${describeRuntimeState(before)}), and the locked installer is missing: ${installScript}`);
  }

  logger.log(`Electron runtime incomplete (${describeRuntimeState(before)}). Running locked installer: ${displayPath(before.projectRoot, installScript)}`);
  const result = runner(installScript, [], {
    cwd: before.electronRoot,
    env,
    inherit: options.inherit ?? true
  });

  if (result.status !== 0) {
    throw new Error(`Locked Electron installer failed: ${processDiagnostic(result)}`);
  }

  const after = inspectElectronRuntime(options);
  if (!after.ready) {
    throw new Error(`Locked Electron installer completed but Crystal Electron runtime installation is still incomplete (${describeRuntimeState(after)}). Expected a non-empty ${after.pathFile} and the executable referenced by it.`);
  }

  logger.log(`Electron runtime installed: ${displayPath(after.projectRoot, after.executablePath)}`);
  return { status: "installed", installed: true, runtime: after };
}

export function hasTruthyEnvValue(value) {
  return typeof value === "string" && value.length > 0;
}

export function isMainModule(metaUrl, argvEntry = process.argv[1]) {
  if (!argvEntry) return false;
  return pathToFileURL(path.resolve(argvEntry)).href === metaUrl;
}

if (isMainModule(import.meta.url)) {
  try {
    installElectronRuntime();
  } catch (error) {
    console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

function runtimeState(values) {
  return {
    projectRoot: values.projectRoot,
    electronRoot: values.electronRoot,
    pathFile: values.pathFile,
    binaryPath: values.binaryPath ?? "",
    executablePath: values.executablePath ?? "",
    ready: values.ready ?? false,
    reason: values.reason,
    error: values.error
  };
}

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function describeRuntimeState(state) {
  switch (state.reason) {
    case "path-missing": return "path.txt is missing";
    case "path-unreadable": return `path.txt cannot be read${state.error?.message ? `: ${state.error.message}` : ""}`;
    case "path-empty": return "path.txt is empty";
    case "executable-missing": return `the referenced executable is missing: ${state.executablePath}`;
    default: return state.reason;
  }
}

function displayPath(projectRoot, targetPath) {
  const relative = path.relative(projectRoot, targetPath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative) ? relative : targetPath;
}

function processDiagnostic(result) {
  return result.stderr?.trim()
    || result.stdout?.trim()
    || result.error?.message
    || result.failureType
    || `exit code ${result.status}`;
}
