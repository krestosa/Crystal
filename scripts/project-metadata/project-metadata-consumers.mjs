import fs from "node:fs";
import path from "node:path";
import { validateObjectShape } from "./configuration-schemas.mjs";

export const PROJECT_METADATA_CONSUMERS_RELATIVE_PATH = "config/project-metadata-consumers.json";
const KINDS = new Set(["generated-document", "generated-json", "generated-file", "runtime-import", "doctor-check"]);
const CONSUMER_KEYS = ["field", "kind", "path", "block", "module", "targetPath"];

export function readProjectMetadataConsumers(projectRoot = process.cwd()) {
  const filePath = path.join(projectRoot, PROJECT_METADATA_CONSUMERS_RELATIVE_PATH);
  const config = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const errors = validateProjectMetadataConsumersConfig(config);
  if (errors.length > 0) throw new Error(`Invalid project metadata consumers:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  return config;
}

export function validateProjectMetadataConsumersConfig(config) {
  const errors = validateObjectShape(config, {
    name: "project metadata consumers",
    requiredKeys: ["schemaVersion", "consumers"],
    allowedKeys: ["schemaVersion", "consumers"]
  });
  if (config?.schemaVersion !== 1) errors.push("project metadata consumers schemaVersion must equal 1.");
  if (!Array.isArray(config?.consumers) || config.consumers.length === 0) {
    errors.push("project metadata consumers must define a non-empty consumers array.");
    return unique(errors);
  }
  const identities = new Set();
  for (const [index, consumer] of config.consumers.entries()) {
    const subject = `project metadata consumers[${index}]`;
    errors.push(...validateObjectShape(consumer, {
      name: subject,
      requiredKeys: ["field", "kind", "path"],
      allowedKeys: CONSUMER_KEYS
    }));
    if (typeof consumer?.field !== "string" || !/^[a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+$/.test(consumer.field)) errors.push(`${subject}.field must be a dotted baseline field path.`);
    if (!KINDS.has(consumer?.kind)) errors.push(`${subject}.kind is unsupported: ${consumer?.kind}.`);
    if (!isRelativePath(consumer?.path)) errors.push(`${subject}.path must be a normalized repository-relative path.`);
    if (consumer?.kind === "generated-document" && (typeof consumer.block !== "string" || consumer.block === "")) errors.push(`${subject}.block is required for generated-document consumers.`);
    if (["runtime-import", "doctor-check"].includes(consumer?.kind) && (typeof consumer.module !== "string" || consumer.module === "")) errors.push(`${subject}.module is required for runtime consumers.`);
    if (consumer?.kind === "generated-json" && (!Array.isArray(consumer.targetPath) || consumer.targetPath.some((item) => typeof item !== "string"))) errors.push(`${subject}.targetPath must be an array of strings for generated-json consumers.`);
    const identity = JSON.stringify([consumer?.field, consumer?.kind, consumer?.path, consumer?.block ?? null, consumer?.module ?? null, consumer?.targetPath ?? null]);
    if (identities.has(identity)) errors.push(`${subject} duplicates an existing consumer.`);
    identities.add(identity);
  }
  return unique(errors);
}

export function validateProjectMetadataConsumers({ projectRoot, baseline, expectedFiles = new Map(), config = null }) {
  const consumerConfig = config ?? readProjectMetadataConsumers(projectRoot);
  const errors = validateProjectMetadataConsumersConfig(consumerConfig);
  if (errors.length > 0) return errors;
  const coveredGeneratedPaths = new Set();
  for (const consumer of consumerConfig.consumers) {
    const value = getDottedValue(baseline, consumer.field);
    if (value === undefined) {
      errors.push(`Consumer ${consumer.path} references unknown baseline field ${consumer.field}.`);
      continue;
    }
    const absolutePath = path.join(projectRoot, consumer.path);
    if (!fs.existsSync(absolutePath) && !expectedFiles.has(consumer.path)) {
      errors.push(`Consumer path does not exist: ${consumer.path}.`);
      continue;
    }
    const content = expectedFiles.get(consumer.path) ?? fs.readFileSync(absolutePath, "utf8");
    if (consumer.kind === "generated-file") {
      coveredGeneratedPaths.add(consumer.path);
      if (content.trim() !== String(value)) errors.push(`${consumer.path} does not derive ${consumer.field} from the canonical baseline.`);
    } else if (consumer.kind === "generated-json") {
      coveredGeneratedPaths.add(consumer.path);
      let json;
      try { json = JSON.parse(content); } catch (error) { errors.push(`${consumer.path} cannot be parsed for consumer validation: ${error.message}`); continue; }
      if (getArrayPathValue(json, consumer.targetPath) !== value) errors.push(`${consumer.path} target ${consumer.targetPath.join(".")} does not derive ${consumer.field}.`);
    } else if (consumer.kind === "generated-document") {
      coveredGeneratedPaths.add(consumer.path);
      const block = extractGeneratedBlock(content, consumer.block, consumer.path, errors);
      if (block && !block.body.includes(String(value))) errors.push(`${consumer.path} generated block ${consumer.block} does not contain ${consumer.field}.`);
      if (block && containsIndependentVersionConstant(`${block.prefix}${block.suffix}`)) errors.push(`${consumer.path} contains an independent version constant outside generated block ${consumer.block}.`);
    } else {
      if (!content.includes(`from ${JSON.stringify(consumer.module)}`) && !content.includes(`from '${consumer.module}'`)) errors.push(`${consumer.path} must import canonical baseline module ${consumer.module}.`);
      if (containsIndependentVersionConstant(content)) errors.push(`${consumer.path} contains an independent version constant instead of using ${consumer.module}.`);
    }
  }
  for (const requiredPath of [".nvmrc", "package.json", "package-lock.json", "README.md", "docs/development.md"]) {
    if (!coveredGeneratedPaths.has(requiredPath)) errors.push(`Generated metadata output ${requiredPath} has no registered canonical consumer.`);
  }
  return unique(errors);
}

function extractGeneratedBlock(content, blockId, filePath, errors) {
  const start = `<!-- crystal-generated:${blockId}:start -->`;
  const end = `<!-- crystal-generated:${blockId}:end -->`;
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    errors.push(`${filePath} is missing valid generated block ${blockId}.`);
    return null;
  }
  return {
    prefix: content.slice(0, startIndex),
    body: content.slice(startIndex + start.length, endIndex),
    suffix: content.slice(endIndex + end.length)
  };
}

function containsIndependentVersionConstant(content) {
  return /\bv?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\b/.test(content);
}

function getDottedValue(object, dottedPath) {
  return dottedPath.split(".").reduce((value, key) => value?.[key], object);
}

function getArrayPathValue(object, targetPath) {
  return targetPath.reduce((value, key) => value?.[key], object);
}

function isRelativePath(value) {
  return typeof value === "string" && value !== "" && value === value.trim() && !path.isAbsolute(value) && !value.includes("\\") && !value.split("/").includes("..");
}

function unique(values) { return [...new Set(values)]; }
