import fs from "node:fs";
import path from "node:path";

export const PROJECT_BASELINE_SCHEMA_VERSION = 1;
export const PROJECT_BASELINE_RELATIVE_PATH = "config/project-baseline.json";

export function readProjectBaseline(options = {}) {
  const projectRoot = options.projectRoot ?? process.cwd();
  const baselinePath = options.baselinePath ?? path.join(projectRoot, PROJECT_BASELINE_RELATIVE_PATH);
  const sourceText = fs.readFileSync(baselinePath, "utf8");
  const baseline = JSON.parse(sourceText);
  const errors = validateProjectBaseline(baseline);
  if (errors.length > 0) {
    throw new Error(`Invalid project baseline:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }
  return baseline;
}

export function validateProjectBaseline(baseline) {
  const errors = [];
  if (!baseline || typeof baseline !== "object" || Array.isArray(baseline)) {
    return ["baseline must be a JSON object."];
  }

  if (baseline.schemaVersion !== PROJECT_BASELINE_SCHEMA_VERSION) {
    errors.push(`schemaVersion must equal ${PROJECT_BASELINE_SCHEMA_VERSION}.`);
  }

  const nodeBaseline = requireVersion(errors, baseline.node?.baseline, "node.baseline");
  const nodeEngine = requireString(errors, baseline.node?.engine, "node.engine");
  const npmEngine = requireString(errors, baseline.npm?.engine, "npm.engine");
  const electronVersion = requireVersion(errors, baseline.electron?.version, "electron.version");
  const electronRange = requireString(errors, baseline.electron?.packageRange, "electron.packageRange");
  const embeddedNode = requireVersion(errors, baseline.electron?.embeddedNode, "electron.embeddedNode");
  requireDottedVersion(errors, baseline.electron?.chromium, "electron.chromium");

  if (nodeBaseline && nodeEngine && !satisfiesVersionRange(baseline.node.baseline, baseline.node.engine)) {
    errors.push(`node.baseline ${baseline.node.baseline} must satisfy node.engine ${baseline.node.engine}.`);
  }

  if (electronVersion && electronRange && !satisfiesVersionRange(baseline.electron.version, baseline.electron.packageRange)) {
    errors.push(`electron.version ${baseline.electron.version} must satisfy electron.packageRange ${baseline.electron.packageRange}.`);
  }

  if (nodeBaseline && embeddedNode && nodeBaseline.major !== embeddedNode.major) {
    const justification = baseline.electron?.embeddedNodeMajorMismatchJustification;
    if (typeof justification !== "string" || justification.trim().length < 12) {
      errors.push("electron.embeddedNode must share the Node baseline major unless embeddedNodeMajorMismatchJustification is provided.");
    }
  }

  if (npmEngine) {
    try {
      parseVersionRange(npmEngine);
    } catch (error) {
      errors.push(`npm.engine is invalid: ${error.message}`);
    }
  }

  if (nodeEngine) {
    try {
      parseVersionRange(nodeEngine);
    } catch (error) {
      errors.push(`node.engine is invalid: ${error.message}`);
    }
  }

  if (electronRange) {
    try {
      parseVersionRange(electronRange);
    } catch (error) {
      errors.push(`electron.packageRange is invalid: ${error.message}`);
    }
  }

  return errors;
}

export function parseSemver(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
  if (!match) return null;
  return {
    raw: value,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null
  };
}

export function compareSemver(left, right) {
  const parsedLeft = typeof left === "string" ? parseSemver(left) : left;
  const parsedRight = typeof right === "string" ? parseSemver(right) : right;
  if (!parsedLeft || !parsedRight) throw new TypeError("compareSemver requires parseable semantic versions.");
  for (const key of ["major", "minor", "patch"]) {
    if (parsedLeft[key] > parsedRight[key]) return 1;
    if (parsedLeft[key] < parsedRight[key]) return -1;
  }
  if (parsedLeft.prerelease === parsedRight.prerelease) return 0;
  if (parsedLeft.prerelease === null) return 1;
  if (parsedRight.prerelease === null) return -1;
  return parsedLeft.prerelease.localeCompare(parsedRight.prerelease);
}

export function satisfiesVersionRange(version, range) {
  const parsedVersion = parseSemver(version);
  if (!parsedVersion) return false;
  const predicates = parseVersionRange(range);
  return predicates.every((predicate) => predicate(parsedVersion));
}

export function renderProjectBaseline(baseline) {
  const errors = validateProjectBaseline(baseline);
  if (errors.length > 0) throw new Error(`Cannot render invalid project baseline:\n${errors.join("\n")}`);
  return `${JSON.stringify(baseline, null, 2)}\n`;
}

export function getNodeTypesMajor(baseline) {
  const parsed = parseSemver(baseline.node.baseline);
  if (!parsed) throw new Error(`Unable to derive @types/node major from ${baseline.node.baseline}.`);
  return parsed.major;
}

function parseVersionRange(range) {
  if (typeof range !== "string" || range.trim() === "") throw new Error("range must be a non-empty string.");
  const trimmed = range.trim();

  if (trimmed.startsWith("^")) {
    const lower = parseSemver(trimmed.slice(1));
    if (!lower) throw new Error(`unsupported caret range: ${range}`);
    const upper = lower.major > 0
      ? { ...lower, major: lower.major + 1, minor: 0, patch: 0, prerelease: null }
      : lower.minor > 0
        ? { ...lower, minor: lower.minor + 1, patch: 0, prerelease: null }
        : { ...lower, patch: lower.patch + 1, prerelease: null };
    return [
      (version) => compareSemver(version, lower) >= 0,
      (version) => compareSemver(version, upper) < 0
    ];
  }

  if (parseSemver(trimmed)) {
    return [(version) => compareSemver(version, trimmed) === 0];
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) throw new Error(`unsupported range: ${range}`);
  return tokens.map((token) => {
    const match = token.match(/^(>=|<=|>|<|=)?(\d+(?:\.\d+){0,2})$/);
    if (!match) throw new Error(`unsupported comparator: ${token}`);
    const operator = match[1] ?? "=";
    const normalized = normalizePartialVersion(match[2], operator);
    return (version) => {
      const comparison = compareSemver(version, normalized.version);
      if (normalized.majorOnlyUpperBound) return version.major < normalized.version.major;
      if (operator === ">=") return comparison >= 0;
      if (operator === "<=") return comparison <= 0;
      if (operator === ">") return comparison > 0;
      if (operator === "<") return comparison < 0;
      return comparison === 0;
    };
  });
}

function normalizePartialVersion(value, operator) {
  const parts = value.split(".").map(Number);
  if (parts.length === 1 && operator === "<") {
    return { version: { major: parts[0], minor: 0, patch: 0, prerelease: null }, majorOnlyUpperBound: true };
  }
  while (parts.length < 3) parts.push(0);
  return { version: { major: parts[0], minor: parts[1], patch: parts[2], prerelease: null }, majorOnlyUpperBound: false };
}

function requireString(errors, value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${field} must be a non-empty string.`);
    return null;
  }
  return value;
}

function requireDottedVersion(errors, value, field) {
  const text = requireString(errors, value, field);
  if (!text) return null;
  if (!/^\d+(?:\.\d+){2,3}$/.test(text)) errors.push(`${field} must be a parseable dotted version.`);
  return text;
}

function requireVersion(errors, value, field) {
  const text = requireString(errors, value, field);
  if (!text) return null;
  const parsed = parseSemver(text);
  if (!parsed) errors.push(`${field} must be a parseable semantic version.`);
  return parsed;
}
