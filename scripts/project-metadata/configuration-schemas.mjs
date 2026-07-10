import fs from "node:fs";
import path from "node:path";

export function validateObjectShape(value, { name, requiredKeys, allowedKeys }) {
  const errors = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return [`${name} must be a JSON object.`];
  for (const key of requiredKeys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) errors.push(`${name} is missing required field ${key}.`);
  }
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) errors.push(`${name} contains unknown field ${key}.`);
  }
  return errors;
}

export function validateChangePolicyConfig(config) {
  const errors = validateObjectShape(config, {
    name: "change policy configuration",
    requiredKeys: ["schemaVersion", "policies"],
    allowedKeys: ["schemaVersion", "policies"]
  });
  if (config?.schemaVersion !== 1) errors.push("change policy schemaVersion must equal 1.");
  if (!Array.isArray(config?.policies)) {
    errors.push("change policy policies must be an array.");
    return unique(errors);
  }
  const names = new Set();
  const prefixes = new Map();
  for (const [index, policy] of config.policies.entries()) {
    const subject = `change policy policies[${index}]`;
    errors.push(...validateObjectShape(policy, {
      name: subject,
      requiredKeys: ["name", "branchPrefix", "allow", "denyExtensions"],
      allowedKeys: ["name", "branchPrefix", "allow", "denyExtensions", "priority"]
    }));
    validateUniqueNonEmptyString(errors, names, policy?.name, `${subject}.name`);
    validateUniqueNonEmptyString(errors, new Set(prefixes.keys()), policy?.branchPrefix, `${subject}.branchPrefix`);
    if (typeof policy?.branchPrefix === "string" && policy.branchPrefix !== "") prefixes.set(policy.branchPrefix, policy);
    if (policy?.priority !== undefined && !Number.isInteger(policy.priority)) errors.push(`${subject}.priority must be an integer when present.`);
    if (!Array.isArray(policy?.allow) || policy.allow.length === 0) errors.push(`${subject}.allow must be a non-empty array.`);
    else validatePolicyPatterns(errors, policy.allow, `${subject}.allow`);
    if (!Array.isArray(policy?.denyExtensions)) errors.push(`${subject}.denyExtensions must be an array.`);
    else validateExtensions(errors, policy.denyExtensions, `${subject}.denyExtensions`);
  }
  const entries = [...prefixes.entries()];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const [leftPrefix, left] = entries[i];
      const [rightPrefix, right] = entries[j];
      if (leftPrefix.startsWith(rightPrefix) || rightPrefix.startsWith(leftPrefix)) {
        if (!Number.isInteger(left.priority) || !Number.isInteger(right.priority) || left.priority === right.priority) {
          errors.push(`change policy branch prefixes ${leftPrefix} and ${rightPrefix} overlap without distinct integer priorities.`);
        }
      }
    }
  }
  return unique(errors);
}

export function validateDocumentationContract(config, options = {}) {
  const errors = validateObjectShape(config, {
    name: "documentation contract",
    requiredKeys: ["schemaVersion", "documents", "readingNodes", "minimumGuidedMermaidDiagrams"],
    allowedKeys: ["schemaVersion", "documents", "readingNodes", "minimumGuidedMermaidDiagrams"]
  });
  if (config?.schemaVersion !== 1) errors.push("documentation contract schemaVersion must equal 1.");
  if (!Number.isInteger(config?.minimumGuidedMermaidDiagrams) || config.minimumGuidedMermaidDiagrams < 0) {
    errors.push("documentation contract minimumGuidedMermaidDiagrams must be a non-negative integer.");
  }
  validateUniqueStringArray(errors, config?.readingNodes, "documentation contract readingNodes");
  if (!Array.isArray(config?.documents) || config.documents.length === 0) {
    errors.push("documentation contract documents must be a non-empty array.");
    return unique(errors);
  }
  const paths = new Set();
  for (const [index, document] of config.documents.entries()) {
    const subject = `documentation contract documents[${index}]`;
    errors.push(...validateObjectShape(document, {
      name: subject,
      requiredKeys: ["path", "required", "requiresReadNext", "requiresPosition", "requiresRationale", "validateLinks", "requiredPhrases"],
      allowedKeys: ["path", "required", "requiresReadNext", "requiresPosition", "requiresRationale", "validateLinks", "requiredPhrases"]
    }));
    if (!isNormalizedRepositoryPath(document?.path) || !(document.path === "README.md" || document.path.startsWith("docs/"))) {
      errors.push(`${subject}.path must be a normalized path under docs/** or README.md.`);
    } else {
      if (paths.has(document.path)) errors.push(`${subject}.path duplicates ${document.path}.`);
      paths.add(document.path);
      if (options.projectRoot && document.required && !fs.existsSync(path.join(options.projectRoot, document.path))) {
        errors.push(`${subject}.path does not exist: ${document.path}.`);
      }
    }
    for (const key of ["required", "requiresReadNext", "requiresPosition", "requiresRationale", "validateLinks"]) {
      if (typeof document?.[key] !== "boolean") errors.push(`${subject}.${key} must be boolean.`);
    }
    validateUniqueStringArray(errors, document?.requiredPhrases, `${subject}.requiredPhrases`);
  }
  return unique(errors);
}

export function readDocumentationContract(projectRoot) {
  const contractPath = path.join(projectRoot, "docs", "metadata", "documentation-contract.json");
  const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const errors = validateDocumentationContract(contract, { projectRoot });
  if (errors.length > 0) throw new Error(`Invalid documentation contract:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  return contract;
}

function validatePolicyPatterns(errors, patterns, subject) {
  const seen = new Set();
  for (const [index, pattern] of patterns.entries()) {
    if (typeof pattern !== "string" || pattern.trim() === "") {
      errors.push(`${subject}[${index}] must be a non-empty string.`);
      continue;
    }
    if (pattern !== pattern.trim()) errors.push(`${subject}[${index}] must not contain surrounding whitespace.`);
    if (path.posix.isAbsolute(pattern) || pattern.includes("\\") || pattern.split("/").includes("..")) {
      errors.push(`${subject}[${index}] must be a normalized repository-relative pattern.`);
    }
    if (seen.has(pattern)) errors.push(`${subject}[${index}] duplicates ${pattern}.`);
    seen.add(pattern);
  }
}

function validateExtensions(errors, extensions, subject) {
  const seen = new Set();
  for (const [index, extension] of extensions.entries()) {
    if (typeof extension !== "string" || !/^\.[a-z0-9]+$/.test(extension)) errors.push(`${subject}[${index}] must be a lowercase extension beginning with a dot.`);
    if (seen.has(extension)) errors.push(`${subject}[${index}] duplicates ${extension}.`);
    seen.add(extension);
  }
}

function validateUniqueNonEmptyString(errors, seen, value, subject) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${subject} must be a non-empty string.`);
    return;
  }
  if (value !== value.trim()) errors.push(`${subject} must not contain surrounding whitespace.`);
  if (seen.has(value)) errors.push(`${subject} duplicates ${value}.`);
  seen.add(value);
}

function validateUniqueStringArray(errors, value, subject) {
  if (!Array.isArray(value)) {
    errors.push(`${subject} must be an array.`);
    return;
  }
  const seen = new Set();
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string" || item.trim() === "") errors.push(`${subject}[${index}] must be a non-empty string.`);
    else {
      if (item !== item.trim()) errors.push(`${subject}[${index}] must not contain surrounding whitespace.`);
      if (seen.has(item)) errors.push(`${subject}[${index}] duplicates ${item}.`);
      seen.add(item);
    }
  }
}

function isNormalizedRepositoryPath(value) {
  return typeof value === "string" && value !== "" && value === value.trim() && !path.posix.isAbsolute(value) && !value.includes("\\") && !value.split("/").includes("..");
}

function unique(values) {
  return [...new Set(values)];
}
