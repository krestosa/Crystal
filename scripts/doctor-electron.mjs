import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const isWindows = process.platform === "win32";
const shell = isWindows;

const envKeys = [
  "ELECTRON_SKIP_BINARY_DOWNLOAD",
  "ELECTRON_MIRROR",
  "ELECTRON_CUSTOM_DIR",
  "npm_config_ignore_scripts"
];

const failures = [];
const warnings = [];

function printHeader(title) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: projectRoot, encoding: "utf8", shell });
  return {
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    error: result.error
  };
}

function markFailure(message) {
  failures.push(message);
  console.error(`FAIL ${message}`);
}

function markPass(message) {
  console.log(`PASS ${message}`);
}

function markWarning(message) {
  warnings.push(message);
  console.warn(`WARN ${message}`);
}

function hasTruthyEnvValue(value) {
  if (!value) return false;
  return ["1", "true", "yes"].includes(value.toLowerCase());
}

printHeader("Runtime");
const nodeVersion = process.versions.node;
const nodeMajor = Number(nodeVersion.split(".")[0]);
console.log(`Node: ${nodeVersion}`);
if (nodeMajor !== 22) {
  markFailure("Crystal local development currently expects Node 22.x. Node 24 is not the project baseline yet.");
} else {
  markPass("Node major version is 22.x.");
}

const npmResult = run("npm", ["--version"]);
if (npmResult.status === 0) {
  console.log(`npm: ${npmResult.stdout}`);
  const npmMajor = Number(npmResult.stdout.split(".")[0]);
  if (npmMajor < 10 || npmMajor >= 12) {
    markFailure("Expected npm >=10 <12 for the current local development environment.");
  } else if (npmMajor !== 10) {
    markWarning("Node 22 normally ships with npm 10.x. npm 11.x is accepted by this check, but npm 10.x is the documented baseline.");
  } else {
    markPass("npm major version is 10.x.");
  }
} else {
  markFailure(`Unable to read npm version. ${npmResult.stderr || npmResult.error?.message || "No diagnostic output."}`);
}

printHeader("Electron install files");
const electronRoot = path.join(projectRoot, "node_modules", "electron");
const electronPathTxt = path.join(electronRoot, "path.txt");
const electronWindowsExe = path.join(electronRoot, "dist", "electron.exe");

if (existsSync(electronPathTxt)) {
  const binaryPath = readFileSync(electronPathTxt, "utf8").trim();
  markPass(`node_modules/electron/path.txt exists (${binaryPath || "empty file"}).`);
} else {
  markFailure("node_modules/electron/path.txt is missing. Electron postinstall did not finish correctly.");
}

if (isWindows) {
  if (existsSync(electronWindowsExe)) {
    markPass("node_modules/electron/dist/electron.exe exists.");
  } else {
    markFailure("node_modules/electron/dist/electron.exe is missing on Windows.");
  }
} else {
  console.log("Skipping Windows electron.exe check on non-Windows platform.");
}

printHeader("Electron executable");
const electronVersionResult = run("npx", ["electron", "--version"]);
if (electronVersionResult.status === 0) {
  markPass(`npx electron --version returned ${electronVersionResult.stdout}.`);
} else {
  markFailure(`npx electron --version failed. ${electronVersionResult.stderr || electronVersionResult.stdout || electronVersionResult.error?.message || "No diagnostic output."}`);
}

printHeader("Environment variables");
for (const key of envKeys) {
  const value = process.env[key];
  console.log(`${key}: ${value ?? "(unset)"}`);
}

if (hasTruthyEnvValue(process.env.ELECTRON_SKIP_BINARY_DOWNLOAD)) {
  markFailure("ELECTRON_SKIP_BINARY_DOWNLOAD is enabled; Electron will not download its runtime binary.");
}

if (hasTruthyEnvValue(process.env.npm_config_ignore_scripts)) {
  markFailure("npm_config_ignore_scripts is enabled; Electron postinstall scripts will be skipped.");
}

printHeader("Result");
if (warnings.length > 0) {
  console.log(`${warnings.length} warning(s).`);
}

if (failures.length > 0) {
  console.error(`${failures.length} failure(s).`);
  process.exit(1);
}

console.log("Electron development environment passed diagnostics.");
