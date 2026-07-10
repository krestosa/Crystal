import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readProjectBaseline, parseSemver, satisfiesVersionRange } from "./project-metadata/project-baseline.mjs";
import { runExecutable, runNpmCommand } from "./tooling/process-runner.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const failures = [];
const warnings = [];
const baseline = readProjectBaseline({ projectRoot });
const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const envKeys = ["ELECTRON_SKIP_BINARY_DOWNLOAD", "ELECTRON_MIRROR", "ELECTRON_CUSTOM_DIR", "npm_config_ignore_scripts"];

printHeader("Canonical baseline");
console.log(`Node baseline: ${baseline.node.baseline}`);
console.log(`Node engine: ${baseline.node.engine}`);
console.log(`npm engine: ${baseline.npm.engine}`);
console.log(`Electron: ${baseline.electron.version}`);
console.log(`Electron embedded Node: ${baseline.electron.embeddedNode}`);
console.log(`Electron Chromium: ${baseline.electron.chromium}`);

check(readText(".nvmrc").trim() === baseline.node.baseline, `.nvmrc matches ${baseline.node.baseline}.`, `.nvmrc must equal ${baseline.node.baseline}.`);
check(packageJson.engines?.node === baseline.node.engine, "package.json Node engine matches the baseline.", `package.json engines.node must equal ${baseline.node.engine}.`);
check(packageJson.engines?.npm === baseline.npm.engine, "package.json npm engine matches the baseline.", `package.json engines.npm must equal ${baseline.npm.engine}.`);
check(packageJson.devDependencies?.electron === baseline.electron.packageRange, "package.json Electron range matches the baseline.", `package.json electron range must equal ${baseline.electron.packageRange}.`);

printHeader("Runtime");
const nodeVersion = process.versions.node;
console.log(`Node: ${nodeVersion}`);
check(satisfiesVersionRange(nodeVersion, baseline.node.engine), `Node ${nodeVersion} satisfies ${baseline.node.engine}.`, `Node ${nodeVersion} does not satisfy ${baseline.node.engine}.`);

const npmResult = runNpmCommand(["--version"], { cwd: projectRoot });
if (npmResult.status === 0) {
  const npmVersion = npmResult.stdout.trim();
  console.log(`npm: ${npmVersion}`);
  check(satisfiesVersionRange(npmVersion, baseline.npm.engine), `npm ${npmVersion} satisfies ${baseline.npm.engine}.`, `npm ${npmVersion} does not satisfy ${baseline.npm.engine}.`);
} else {
  fail(`Unable to read npm version: ${diagnostic(npmResult)}`);
}

const nodeMajor = parseSemver(baseline.node.baseline)?.major;
const declaredTypes = packageJson.devDependencies?.["@types/node"] ?? "";
const declaredTypesMajor = parseSemver(declaredTypes.replace(/^[~^]/, ""))?.major;
check(declaredTypesMajor === nodeMajor, `@types/node declared major matches Node ${nodeMajor}.`, `@types/node declared range ${declaredTypes || "missing"} must use major ${nodeMajor}.`);

printHeader("Lockfile consistency");
const rootPackage = packageLock.packages?.[""];
if (!rootPackage) {
  fail('package-lock.json must contain packages[""].');
} else {
  for (const field of ["name", "version", "workspaces", "dependencies", "devDependencies", "optionalDependencies", "engines"]) {
    check(deepEqual(packageJson[field], rootPackage[field]), `Lockfile root ${field} matches package.json.`, `Lockfile root ${field} is out of sync; run npm run sync:project-metadata.`);
  }
}
check(packageLock.lockfileVersion === 3, "package-lock.json uses lockfileVersion 3.", `Expected lockfileVersion 3; found ${packageLock.lockfileVersion ?? "missing"}.`);
const lockedElectronVersion = packageLock.packages?.["node_modules/electron"]?.version;
check(lockedElectronVersion === baseline.electron.version, `Locked Electron version is ${baseline.electron.version}.`, `Locked Electron version must be ${baseline.electron.version}; found ${lockedElectronVersion ?? "missing"}.`);
const lockedTypesVersion = packageLock.packages?.["node_modules/@types/node"]?.version;
check(parseSemver(lockedTypesVersion ?? "")?.major === nodeMajor, `Locked @types/node major is ${nodeMajor}.`, `Locked @types/node must use major ${nodeMajor}; found ${lockedTypesVersion ?? "missing"}.`);

printHeader("Electron install files");
const electronRoot = path.join(projectRoot, "node_modules", "electron");
const electronPathTxt = path.join(electronRoot, "path.txt");
let electronExecutable = "";
if (fs.existsSync(electronPathTxt)) {
  const binaryPath = fs.readFileSync(electronPathTxt, "utf8").trim();
  if (binaryPath) {
    pass(`node_modules/electron/path.txt exists (${binaryPath}).`);
    electronExecutable = path.isAbsolute(binaryPath) ? binaryPath : path.join(electronRoot, "dist", binaryPath);
  } else {
    fail("node_modules/electron/path.txt is empty. Crystal Electron runtime installation did not finish correctly.");
  }
} else {
  fail("node_modules/electron/path.txt is missing. Crystal Electron runtime installation did not finish correctly.");
}

if (electronExecutable) {
  check(fs.existsSync(electronExecutable), `Electron executable exists at ${path.relative(projectRoot, electronExecutable)}.`, `Electron executable is missing: ${electronExecutable}`);
}

printHeader("Electron executable");
if (electronExecutable && fs.existsSync(electronExecutable)) {
  const versionResult = runExecutable(electronExecutable, ["--version"], { cwd: projectRoot });
  if (versionResult.status === 0) {
    const actual = versionResult.stdout.trim();
    console.log(`Electron: ${actual}`);
    check(actual === `v${baseline.electron.version}`, `Electron executable reports v${baseline.electron.version}.`, `Electron executable reports ${actual}; expected v${baseline.electron.version}.`);
  } else {
    fail(`Electron --version failed: ${diagnostic(versionResult)}`);
  }
}

printHeader("Environment variables");
for (const key of envKeys) console.log(`${key}: ${process.env[key] ?? "(unset)"}`);
if (hasTruthyEnvValue(process.env.ELECTRON_SKIP_BINARY_DOWNLOAD)) fail("ELECTRON_SKIP_BINARY_DOWNLOAD is enabled; Crystal cannot install the Electron runtime binary.");
if (process.env.ELECTRON_MIRROR) warn("ELECTRON_MIRROR is set; Electron downloads may come from a non-default mirror.");
if (process.env.ELECTRON_CUSTOM_DIR) warn("ELECTRON_CUSTOM_DIR is set; Electron downloads may resolve from a non-default directory.");
if (hasTruthyEnvValue(process.env.npm_config_ignore_scripts)) fail("npm_config_ignore_scripts is enabled; the Crystal root postinstall and Electron lifecycle scripts will be skipped.");

printHeader("Result");
if (warnings.length > 0) console.log(`${warnings.length} warning(s).`);
if (failures.length > 0) {
  console.error(`${failures.length} failure(s).`);
  process.exitCode = 1;
} else {
  console.log("Electron development environment passed diagnostics.");
}

function readJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    fail(`${relativePath} is invalid JSON: ${error.message}`);
    return {};
  }
}

function readText(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function printHeader(title) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
}

function check(condition, success, failure) {
  if (condition) pass(success);
  else fail(failure);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`FAIL ${message}`);
}

function warn(message) {
  warnings.push(message);
  console.warn(`WARN ${message}`);
}

function hasTruthyEnvValue(value) {
  return Boolean(value && ["1", "true", "yes"].includes(value.toLowerCase()));
}

function diagnostic(result) {
  return result.stderr.trim() || result.stdout.trim() || result.error?.message || `exit code ${result.status}`;
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
