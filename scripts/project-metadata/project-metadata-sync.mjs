import fs from "node:fs";
import path from "node:path";
import { readProjectBaseline, getNodeTypesMajor, parseSemver, satisfiesVersionRange } from "./project-baseline.mjs";
import { replaceGeneratedBlock } from "./generated-blocks.mjs";
import { validationCatalog, applyCatalogScripts, getValidationCatalogStats, validateValidationCatalog } from "../validation/validation-suite.mjs";
import { runExecutable } from "../tooling/process-runner.mjs";

const DEPENDENCY_GROUPS = ["dependencies", "devDependencies", "optionalDependencies"];
const MANAGED_DIRECT_DEPENDENCIES = new Set(["electron", "@types/node"]);

const ROOT_METADATA_FIELDS = [
  "name",
  "version",
  "workspaces",
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "engines"
];

export function synchronizeProjectMetadata(options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const write = options.write === true;
  const checkGit = options.checkGit ?? true;
  const errors = [];
  const hints = [];
  const expectedFiles = new Map();
  let baseline;
  const catalog = options.catalog ?? validationCatalog;

  try {
    baseline = readProjectBaseline({ projectRoot });
  } catch (error) {
    return report("FAIL", write, [], [error.message], []);
  }

  const packagePath = path.join(projectRoot, "package.json");
  const lockPath = path.join(projectRoot, "package-lock.json");
  const packageResult = readJson(packagePath, "package.json", errors);
  const lockResult = readJson(lockPath, "package-lock.json", errors);
  if (!packageResult || !lockResult) return report("FAIL", write, [], errors, hints);

  const packageJson = structuredClone(packageResult.value);
  const packageLock = structuredClone(lockResult.value);

  if (packageLock.lockfileVersion !== 3) errors.push(`package-lock.json lockfileVersion must equal 3; found ${packageLock.lockfileVersion ?? "missing"}.`);
  if (!packageLock.packages || typeof packageLock.packages[""] !== "object") errors.push('package-lock.json must contain packages[""].');

  packageJson.engines = { ...(packageJson.engines ?? {}), node: baseline.node.engine, npm: baseline.npm.engine };
  const catalogErrors = validateValidationCatalog(catalog, { projectRoot });
  errors.push(...catalogErrors);
  const scriptResult = applyCatalogScripts(packageJson.scripts ?? {}, catalog);
  errors.push(...scriptResult.errors);
  packageJson.scripts = scriptResult.scripts;
  packageJson.devDependencies = { ...(packageJson.devDependencies ?? {}) };
  packageJson.devDependencies.electron = baseline.electron.packageRange;
  packageJson.devDependencies["@types/node"] = deriveNodeTypesRange(packageJson.devDependencies["@types/node"], getNodeTypesMajor(baseline));

  validateLockGraphCompatibility(packageResult.value, packageJson, packageLock, errors, hints);

  if (packageLock.packages?.[""]) {
    synchronizeRootMetadata(packageJson, packageLock.packages[""]);
  }

  expectedFiles.set(".nvmrc", `${baseline.node.baseline}\n`);
  expectedFiles.set("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
  expectedFiles.set("package-lock.json", `${JSON.stringify(packageLock, null, 2)}\n`);

  addGeneratedDocument(expectedFiles, projectRoot, "README.md", "toolchain", renderReadmeToolchain(baseline), errors);
  addGeneratedDocument(expectedFiles, projectRoot, "docs/development.md", "toolchain", renderDevelopmentToolchain(baseline), errors);
  addGeneratedDocument(expectedFiles, projectRoot, "docs/architecture/validation-system.md", "validation-catalog", renderValidationCatalog(catalog), errors);

  if (checkGit && fs.existsSync(path.join(projectRoot, ".git"))) validateLockfileGitPolicy(projectRoot, errors);
  if (errors.length > 0) return report("FAIL", write, [], errors, unique(hints));

  const changedFiles = [];
  for (const [relativePath, expectedContent] of expectedFiles) {
    const absolutePath = path.join(projectRoot, relativePath);
    const currentContent = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null;
    const platformExpectedContent = currentContent === null ? expectedContent : preserveExistingEol(expectedContent, currentContent);
    if (currentContent === platformExpectedContent) continue;
    changedFiles.push(relativePath);
    if (write) {
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, platformExpectedContent, "utf8");
    }
  }

  if (!write && changedFiles.length > 0) {
    return report(
      "FAIL",
      false,
      changedFiles,
      changedFiles.map((file) => `${file} is out of sync with canonical project metadata.`),
      ["Run npm run sync:project-metadata and commit the deterministic generated changes."]
    );
  }

  return report("PASS", write, changedFiles, [], unique(hints));
}

export function renderReadmeToolchain(baseline) {
  return [
    "<!-- Do not edit manually. Run npm run sync:project-metadata. -->",
    "",
    "| Requirement | Canonical value |",
    "| --- | --- |",
    `| Node.js local baseline | ${baseline.node.baseline} (${baseline.node.engine}) |`,
    `| npm engine | ${baseline.npm.engine} |`,
    `| Electron package | ${baseline.electron.version} (${baseline.electron.packageRange}) |`,
    `| Electron internal Node.js | ${baseline.electron.embeddedNode} |`,
    `| Electron Chromium | ${baseline.electron.chromium} |`,
    "| Reproducible install | `npm ci` from the committed `package-lock.json` |",
    "| Lockfile policy | Keep `package-lock.json` tracked; use `npm install` only for explicit dependency resolution. |"
  ].join("\n");
}

export function renderDevelopmentToolchain(baseline) {
  return [
    "<!-- Do not edit manually. Run npm run sync:project-metadata. -->",
    "",
    "Crystal reads the selected toolchain baseline from `config/project-baseline.json`.",
    "",
    "| Runtime | Canonical value |",
    "| --- | --- |",
    `| Local Node.js | ${baseline.node.baseline} |`,
    `| Node engine | ${baseline.node.engine} |`,
    `| npm engine | ${baseline.npm.engine} |`,
    `| Electron | ${baseline.electron.version} |`,
    `| Electron package range | ${baseline.electron.packageRange} |`,
    `| Electron internal Node.js | ${baseline.electron.embeddedNode} |`,
    `| Electron Chromium | ${baseline.electron.chromium} |`,
    "",
    "With nvm-windows:",
    "",
    "```powershell",
    `nvm install ${baseline.node.baseline}`,
    `nvm use ${baseline.node.baseline}`,
    "node --version",
    "npm --version",
    "```",
    "",
    "Install reproducibly with `npm ci --foreground-scripts`. Use `npm install` or `npm install --package-lock-only` only when intentionally resolving a direct dependency change. Metadata synchronization never resolves packages or rewrites transitive dependency nodes."
  ].join("\n");
}

export function renderValidationCatalog(catalog = validationCatalog) {
  const stats = getValidationCatalogStats(catalog);
  const lines = [
    "<!-- Do not edit manually. Run npm run sync:project-metadata. -->",
    "",
    `Canonical checks: ${stats.total}. Local quick checks: ${stats.localQuick}. Full validation checks: ${stats.full}.`,
    "",
    "| Group | ID | Label | npm script | Ownership | Required | Local quick | Full | Execution | Direct script | Args |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  ];
  for (const item of catalog) {
    const args = item.args.length > 0 ? `\`${escapeCell(JSON.stringify(item.args))}\`` : "—";
    lines.push(`| ${escapeCell(item.documentationGroup)} | \`${item.id}\` | ${escapeCell(item.label)} | \`${item.npmScript}\` | ${item.scriptOwnership} | ${item.required ? "yes" : "no"} | ${item.includeInLocalQuick ? "yes" : "no"} | ${item.includeInFullValidation ? "yes" : "no"} | ${item.executionMode} | ${item.directScriptPath ? `\`${item.directScriptPath}\`` : "—"} | ${args} |`);
  }
  return lines.join("\n");
}

function addGeneratedDocument(expectedFiles, projectRoot, relativePath, blockId, body, errors) {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`${relativePath} must exist before generated metadata can be synchronized.`);
    return;
  }
  const current = fs.readFileSync(absolutePath, "utf8");
  try {
    expectedFiles.set(relativePath, replaceGeneratedBlock(current, blockId, body, { filePath: relativePath }));
  } catch (error) {
    errors.push(error.message);
  }
}

function synchronizeRootMetadata(packageJson, rootPackage) {
  for (const field of ROOT_METADATA_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(packageJson, field)) rootPackage[field] = structuredClone(packageJson[field]);
    else delete rootPackage[field];
  }
}

function validateLockGraphCompatibility(_currentPackage, expectedPackage, packageLock, errors, hints) {
  const lockRoot = packageLock.packages?.[""] ?? {};
  const resolutionHint = "Run npm install or npm install --package-lock-only to resolve the direct dependency change, then run npm run sync:project-metadata.";

  for (const group of DEPENDENCY_GROUPS) {
    const lockedDirect = lockRoot[group] ?? {};
    const expectedDirect = expectedPackage[group] ?? {};
    const names = new Set([...Object.keys(lockedDirect), ...Object.keys(expectedDirect)]);

    for (const name of names) {
      const expectedHas = Object.prototype.hasOwnProperty.call(expectedDirect, name);
      const lockedHas = Object.prototype.hasOwnProperty.call(lockedDirect, name);
      const expectedRange = expectedDirect[name];
      const lockedRange = lockedDirect[name];
      if (expectedHas && lockedHas && expectedRange === lockedRange) continue;

      if (MANAGED_DIRECT_DEPENDENCIES.has(name) && expectedHas && lockedHas) {
        const unsupportedReason = getUnsupportedDependencyRangeReason(expectedRange);
        if (unsupportedReason) {
          errors.push(`${group}.${name} uses unsupported dependency range ${JSON.stringify(expectedRange)}: ${unsupportedReason}.`);
          hints.push(resolutionHint);
          continue;
        }

        const installed = packageLock.packages?.[`node_modules/${name}`]?.version;
        if (!installed || !satisfiesVersionRange(installed, expectedRange)) {
          errors.push(`${group}.${name} changed to ${expectedRange}, but package-lock.json does not contain a compatible installed package graph.`);
          hints.push(resolutionHint);
        }
        continue;
      }

      if (expectedHas) {
        const unsupportedReason = getUnsupportedDependencyRangeReason(expectedRange);
        if (unsupportedReason) {
          errors.push(`${group}.${name} uses unsupported dependency range ${JSON.stringify(expectedRange)}; run npm because metadata synchronization only manages electron and @types/node. Cause: ${unsupportedReason}.`);
        } else if (!lockedHas) {
          errors.push(`${group}.${name} is declared in package.json but missing from package-lock.json root metadata; metadata synchronization must not fabricate a dependency graph.`);
        } else {
          errors.push(`${group}.${name} differs between package.json (${expectedRange}) and package-lock.json (${lockedRange}); metadata synchronization only auto-manages electron and @types/node.`);
        }
      } else {
        errors.push(`${group}.${name} remains in package-lock.json root metadata after removal from package.json; metadata synchronization must not leave an orphaned direct dependency graph.`);
      }
      hints.push(resolutionHint);
    }
  }
}

function getUnsupportedDependencyRangeReason(range) {
  if (typeof range !== "string" || range.trim() === "") return "range must be a non-empty string";
  try {
    satisfiesVersionRange("0.0.0", range);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function validateLockfileGitPolicy(projectRoot, errors) {
  const tracked = runExecutable("git", ["ls-files", "--error-unmatch", "package-lock.json"], { cwd: projectRoot });
  if (tracked.status !== 0) errors.push("package-lock.json must remain tracked by git.");
  const ignored = runExecutable("git", ["check-ignore", "-q", "package-lock.json"], { cwd: projectRoot });
  if (ignored.status === 0) errors.push("package-lock.json must not be ignored by git.");
}

function preserveExistingEol(expectedContent, currentContent) {
  const eol = currentContent.includes("\r\n") ? "\r\n" : "\n";
  return expectedContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, eol);
}

function deriveNodeTypesRange(existingRange, expectedMajor) {
  if (typeof existingRange === "string") {
    const parsed = parseSemver(existingRange.replace(/^[~^]/, ""));
    if (parsed?.major === expectedMajor) return existingRange;
  }
  return `^${expectedMajor}.0.0`;
}


function readJson(filePath, label, errors) {
  if (!fs.existsSync(filePath)) {
    errors.push(`${label} must exist.`);
    return null;
  }
  try {
    return { value: JSON.parse(fs.readFileSync(filePath, "utf8")) };
  } catch (error) {
    errors.push(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

function report(status, write, changedFiles, errors, hints) {
  return {
    status,
    mode: write ? "write" : "check",
    changedFiles,
    errors,
    hints
  };
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function unique(values) {
  return [...new Set(values)];
}
