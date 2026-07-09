import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const isWindows = process.platform === "win32";

const expectedNodeVersion = "24.18.0";
const expectedNodeMajor = 24;
const expectedElectronVersion = "v43.1.0";

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
  const invocation = resolveInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: projectRoot,
    encoding: "utf8",
    shell: false,
    windowsHide: true
  });

  return {
    status: result.status,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
    error: result.error
  };
}

function resolveInvocation(command, args) {
  if (!isWindows || (command !== "npm" && command !== "npx")) {
    return { command, args };
  }

  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", [command, ...args].join(" ")]
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

function parseVersion(version) {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

function compareVersions(left, right) {
  const parsedLeft = parseVersion(left);
  const parsedRight = parseVersion(right);

  if (!parsedLeft || !parsedRight) {
    return null;
  }

  for (const part of ["major", "minor", "patch"]) {
    if (parsedLeft[part] > parsedRight[part]) return 1;
    if (parsedLeft[part] < parsedRight[part]) return -1;
  }

  return 0;
}

printHeader("Runtime");

const nodeVersion = process.versions.node;
const parsedNodeVersion = parseVersion(nodeVersion);
console.log(`Node: ${nodeVersion}`);

if (!parsedNodeVersion) {
  markFailure(`Unable to parse Node version: ${nodeVersion}.`);
} else if (parsedNodeVersion.major !== expectedNodeMajor) {
  markFailure(`Crystal local development expects Node ${expectedNodeMajor}.x aligned with Electron 43.1.0 embedded Node 24.18.0.`);
} else {
  markPass("Node major version is 24.x.");
}

const nodeComparison = compareVersions(nodeVersion, expectedNodeVersion);
if (nodeComparison === null) {
  markFailure(`Unable to compare Node version ${nodeVersion} against ${expectedNodeVersion}.`);
} else if (nodeComparison < 0) {
  markFailure(`Expected Node >=${expectedNodeVersion}; current Node is ${nodeVersion}.`);
} else {
  markPass(`Node version satisfies >=${expectedNodeVersion}.`);
}

const npmResult = run("npm", ["--version"]);
if (npmResult.status === 0) {
  console.log(`npm: ${npmResult.stdout}`);
  const npmVersion = parseVersion(npmResult.stdout);
  if (!npmVersion) {
    markFailure(`Unable to parse npm version: ${npmResult.stdout}.`);
  } else if (npmVersion.major < 10) {
    markFailure("Expected npm >=10.0.0 for the current local development environment.");
  } else {
    markPass("npm is available and satisfies >=10.0.0.");
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
  console.log(`Electron: ${electronVersionResult.stdout}`);
  if (electronVersionResult.stdout === expectedElectronVersion) {
    markPass(`npx electron --version returned ${expectedElectronVersion}.`);
  } else {
    markFailure(`Expected npx electron --version to return ${expectedElectronVersion}; got ${electronVersionResult.stdout}.`);
  }
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

if (process.env.ELECTRON_MIRROR) {
  markWarning("ELECTRON_MIRROR is set; Electron downloads may come from a non-default mirror.");
}

if (process.env.ELECTRON_CUSTOM_DIR) {
  markWarning("ELECTRON_CUSTOM_DIR is set; Electron downloads may resolve from a non-default directory.");
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
