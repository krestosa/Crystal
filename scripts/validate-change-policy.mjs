import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runExecutable } from "./tooling/process-runner.mjs";
import { parseStrictCliArguments, renderCliHelp } from "./tooling/strict-cli.mjs";

const isMain = path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url);

export function loadChangePolicy(projectRoot = process.cwd()) {
  const policyPath = path.join(projectRoot, "config", "change-policy.json");
  const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
  if (policy.schemaVersion !== 1 || !Array.isArray(policy.policies)) {
    throw new Error("config/change-policy.json must use schemaVersion 1 and define policies[].");
  }
  return policy;
}

export function detectBranch(options = {}) {
  if (options.branch) return { branch: options.branch, source: "flag", detected: true };
  const env = options.env ?? process.env;
  for (const [name, value] of [
    ["CRYSTAL_CHANGE_POLICY_BRANCH", env.CRYSTAL_CHANGE_POLICY_BRANCH],
    ["GITHUB_HEAD_REF", env.GITHUB_HEAD_REF],
    ["GITHUB_REF_NAME", env.GITHUB_REF_NAME]
  ]) {
    if (value) return { branch: value, source: name, detected: true };
  }
  const result = runExecutable("git", ["branch", "--show-current"], { cwd: options.projectRoot ?? process.cwd(), env });
  const branch = result.status === 0 ? result.stdout.trim() : "";
  if (branch) return { branch, source: "git", detected: true };
  return { branch: "", source: "unknown", detected: false };
}

export function resolveBaseRef(options = {}) {
  const projectRoot = options.projectRoot ?? process.cwd();
  const env = options.env ?? process.env;
  const explicit = options.base || env.CRYSTAL_CHANGE_POLICY_BASE;
  const candidates = [];
  if (explicit) candidates.push({ ref: explicit, source: options.base ? "flag" : "CRYSTAL_CHANGE_POLICY_BASE" });
  if (env.GITHUB_BASE_REF) {
    candidates.push({ ref: `origin/${env.GITHUB_BASE_REF}`, source: "GITHUB_BASE_REF" });
    candidates.push({ ref: env.GITHUB_BASE_REF, source: "GITHUB_BASE_REF" });
  }
  candidates.push({ ref: "origin/main", source: "default" }, { ref: "main", source: "default" });

  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate.ref)) continue;
    seen.add(candidate.ref);
    const verify = runExecutable("git", ["rev-parse", "--verify", "--quiet", candidate.ref], { cwd: projectRoot, env });
    if (verify.status === 0) return { base: candidate.ref, source: candidate.source, detected: true };
  }
  return { base: "", source: "unknown", detected: false };
}

export function readChangedFiles(base, options = {}) {
  const result = runExecutable("git", ["diff", "--name-status", "-z", "--find-renames", `${base}...HEAD`], {
    cwd: options.projectRoot ?? process.cwd(),
    env: options.env ?? process.env
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.error?.message || `Unable to compare ${base}...HEAD.`);
  }
  return parseNameStatus(result.stdout);
}

export function parseNameStatus(output) {
  const parts = output.split("\0");
  if (parts.at(-1) === "") parts.pop();
  const changes = [];
  for (let index = 0; index < parts.length;) {
    const statusToken = parts[index++];
    if (!statusToken) continue;
    const status = statusToken[0];
    if (!["A", "C", "D", "M", "R", "T", "U"].includes(status)) {
      throw new Error(`Unsupported git name-status token: ${statusToken}`);
    }
    if (status === "R" || status === "C") {
      const oldPath = normalizePath(parts[index++] ?? "");
      const newPath = normalizePath(parts[index++] ?? "");
      if (!oldPath || !newPath) throw new Error(`Incomplete ${statusToken} record in git diff output.`);
      changes.push({ status, statusToken, oldPath, path: newPath });
    } else {
      const filePath = normalizePath(parts[index++] ?? "");
      if (!filePath) throw new Error(`Incomplete ${statusToken} record in git diff output.`);
      changes.push({ status, statusToken, oldPath: null, path: filePath });
    }
  }
  return changes;
}

export function evaluateChangePolicy(branch, changes, policyConfig) {
  const policy = policyConfig.policies.find((candidate) => branch.startsWith(candidate.branchPrefix));
  if (!policy) return { policy: "unrestricted", errors: [] };

  const errors = [];
  for (const change of changes) {
    const paths = change.oldPath ? [change.oldPath, change.path] : [change.path];
    for (const filePath of paths) {
      if (!policy.allow.some((pattern) => matchPath(pattern, filePath))) {
        errors.push(`${change.statusToken} ${filePath} is outside the ${policy.name} allowlist.`);
      }
      const extension = path.posix.extname(filePath).toLowerCase();
      if (policy.denyExtensions.includes(extension)) {
        errors.push(`${change.statusToken} ${filePath} uses forbidden ${extension} content for ${policy.name} branches.`);
      }
    }
  }
  return { policy: policy.name, errors };
}

export function runChangePolicy(options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const env = options.env ?? process.env;
  const strict = options.strict ?? Boolean(env.CI || env.GITHUB_ACTIONS);
  const branchInfo = detectBranch({ ...options, projectRoot, env });
  const policyConfig = loadChangePolicy(projectRoot);

  if (!branchInfo.detected) {
    return {
      status: strict ? "FAIL" : "PASS",
      branch: "",
      branchSource: "unknown",
      base: "",
      baseSource: "unknown",
      policy: "unknown",
      changes: [],
      errors: strict ? ["Branch detection failed in CI; change policy fails closed."] : [],
      warnings: strict ? [] : ["Branch detection failed outside CI; no branch-specific policy was applied."]
    };
  }

  const selectedPolicy = policyConfig.policies.find((candidate) => branchInfo.branch.startsWith(candidate.branchPrefix));
  if (!selectedPolicy) {
    return {
      status: "PASS",
      branch: branchInfo.branch,
      branchSource: branchInfo.source,
      base: "",
      baseSource: "not-required",
      policy: "unrestricted",
      changes: [],
      errors: [],
      warnings: []
    };
  }

  const baseInfo = resolveBaseRef({ ...options, projectRoot, env });
  if (!baseInfo.detected) {
    return {
      status: strict ? "FAIL" : "PASS",
      branch: branchInfo.branch,
      branchSource: branchInfo.source,
      base: "",
      baseSource: "unknown",
      policy: selectedPolicy.name,
      changes: [],
      errors: strict ? ["Base ref detection failed in CI; change policy fails closed."] : [],
      warnings: strict ? [] : ["Base ref detection failed outside CI; branch-specific file checks were not executed."]
    };
  }

  try {
    const changes = options.changes ?? readChangedFiles(baseInfo.base, { projectRoot, env });
    const evaluation = evaluateChangePolicy(branchInfo.branch, changes, policyConfig);
    return {
      status: evaluation.errors.length === 0 ? "PASS" : "FAIL",
      branch: branchInfo.branch,
      branchSource: branchInfo.source,
      base: baseInfo.base,
      baseSource: baseInfo.source,
      policy: evaluation.policy,
      changes,
      errors: evaluation.errors,
      warnings: []
    };
  } catch (error) {
    return {
      status: strict ? "FAIL" : "PASS",
      branch: branchInfo.branch,
      branchSource: branchInfo.source,
      base: baseInfo.base,
      baseSource: baseInfo.source,
      policy: selectedPolicy.name,
      changes: [],
      errors: strict ? [error.message] : [],
      warnings: strict ? [] : [error.message]
    };
  }
}

function matchPath(pattern, filePath) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regexSource = escaped
    .replace(/\*\*/g, "::DOUBLE_STAR::")
    .replace(/\*/g, "[^/]*")
    .replace(/::DOUBLE_STAR::/g, ".*");
  return new RegExp(`^${regexSource}$`).test(filePath);
}

function normalizePath(value) {
  return value.replace(/\\/g, "/");
}

export function parseChangePolicyCli(args) {
  return parseStrictCliArguments(args, {
    booleanFlags: ["--json", "--help"],
    valueFlags: ["--branch", "--base"]
  });
}

const changePolicyHelp = renderCliHelp({
  command: "node scripts/validate-change-policy.mjs",
  description: "Validate changed paths against the policy selected for the current branch.",
  flags: [
    ["--branch=<name>", "Override branch detection."],
    ["--base=<ref>", "Override the exact comparison base."],
    ["--json", "Emit JSON only."],
    ["--help", "Show help without validating."]
  ]
});

if (isMain) {
  const parsed = parseChangePolicyCli(process.argv.slice(2));
  const json = parsed.values.json === true;
  if (!parsed.ok) {
    const result = { status: "FAIL", branch: "", branchSource: "unknown", base: "", baseSource: "unknown", policy: "unknown", changes: [], errors: parsed.errors, warnings: [] };
    emitChangePolicy(result, json);
    process.exitCode = 1;
  } else if (parsed.values.help) {
    if (json) process.stdout.write(`${JSON.stringify({ status: "PASS", mode: "help", help: changePolicyHelp })}\n`);
    else process.stdout.write(`${changePolicyHelp}\n`);
    process.exitCode = 0;
  } else {
    const result = runChangePolicy({ branch: parsed.values.branch, base: parsed.values.base });
    emitChangePolicy(result, json);
    process.exitCode = result.status === "PASS" ? 0 : 1;
  }
}

function emitChangePolicy(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  console.log("Change policy validation");
  console.log(`Branch: ${result.branch || "unknown"} (${result.branchSource})`);
  console.log(`Base: ${result.base || "not resolved"} (${result.baseSource})`);
  console.log(`Policy: ${result.policy}`);
  console.log(`Changed paths: ${result.changes.length}`);
  for (const warning of result.warnings) console.warn(`WARN ${warning}`);
  for (const error of result.errors) console.error(`- ${error}`);
  console.log(`Result: ${result.status}`);
}
