import path from "node:path";

export const VALIDATION_EXECUTION_DIRECT_NODE = "direct-node";
export const VALIDATION_EXECUTION_NPM = "npm";
export const VALIDATION_SCRIPT_OWNERSHIP_GENERATED = "generated";
export const VALIDATION_SCRIPT_OWNERSHIP_EXTERNAL = "external";

export const KNOWN_VALIDATION_CATEGORIES = Object.freeze([
  "docs",
  "build",
  "core",
  "preview",
  "ui",
  "watch",
  "doctor",
  "validation"
]);

const CATEGORY_SET = new Set(KNOWN_VALIDATION_CATEGORIES);
const ENTRY_KEYS = new Set([
  "id",
  "label",
  "category",
  "npmScript",
  "required",
  "executionMode",
  "directScriptPath",
  "args",
  "includeInLocalQuick",
  "includeInFullValidation",
  "documentationGroup",
  "scriptOwnership",
  "suiteExclusionJustification"
]);

const directNode = (directScriptPath, args = []) => ({
  executionMode: VALIDATION_EXECUTION_DIRECT_NODE,
  directScriptPath,
  args
});
const externalNpm = () => ({ executionMode: VALIDATION_EXECUTION_NPM, directScriptPath: null, args: [] });

export const validationCatalog = Object.freeze([
  entry("validation-system", "Validation System", "validation", "validate:validation-system", directNode("scripts/validate-validation-system.mjs"), "Validation foundation"),
  entry("project-metadata", "Project Metadata", "validation", "validate:project-metadata", directNode("scripts/sync-project-metadata.mjs", ["--check"]), "Generated metadata"),
  entry("change-policy", "Change Policy", "validation", "validate:change-policy", directNode("scripts/validate-change-policy.mjs"), "Change policy"),
  entry("markdown-integrity", "Markdown Integrity", "docs", "validate:markdown-integrity", directNode("scripts/validate-markdown-integrity.mjs"), "Documentation"),
  entry("guided-docs", "Guided docs", "docs", "validate:guided-docs", directNode("scripts/validate-guided-docs.mjs"), "Documentation"),
  entry("architecture-docs", "Architecture docs", "docs", "validate:architecture-docs", directNode("scripts/validate-architecture-docs.mjs"), "Documentation"),
  entry("build-html", "Build HTML", "build", "build:html", directNode("scripts/build-html.mjs"), "Build"),
  entry("build-scss", "Build SCSS", "build", "build:scss", directNode("scripts/build-scss.mjs"), "Build"),
  entry("build-ts", "Build TS", "build", "build:ts", directNode("scripts/build-ts.mjs"), "Build"),
  entry("typecheck", "Typecheck", "build", "typecheck", externalNpm(), "Build", { scriptOwnership: VALIDATION_SCRIPT_OWNERSHIP_EXTERNAL }),
  entry("structure", "Structure", "core", "validate:structure", directNode("scripts/validate-structure.mjs"), "Core"),
  entry("source-tree-boundaries", "Source Tree Boundaries", "core", "validate:source-tree-boundaries", directNode("scripts/validate-source-tree-boundaries.mjs"), "Core"),
  entry("source-freshness-foundation", "Source Freshness Foundation", "core", "validate:source-freshness-foundation", directNode("scripts/validate-source-freshness-foundation.mjs"), "Core"),
  entry("project-graph", "Project Graph", "core", "validate:project-graph", directNode("scripts/validate-project-graph.mjs"), "Core"),
  entry("project-watch", "Project Watch", "core", "validate:project-watch", directNode("scripts/validate-project-watch.mjs"), "Core"),
  entry("history-foundation", "History Foundation", "core", "validate:history-foundation", directNode("scripts/validate-history-foundation.mjs"), "Core"),
  entry("design-editing-preflight", "Design Editing Preflight", "core", "validate:design-editing-preflight", directNode("scripts/validate-design-editing-preflight.mjs"), "Core"),
  entry("inspector-editing-foundation", "Inspector Editing Foundation", "core", "validate:inspector-editing-foundation", directNode("scripts/validate-inspector-editing-foundation.mjs"), "Core"),
  entry("style-engine-foundation", "Style Engine Foundation", "core", "validate:style-engine-foundation", directNode("scripts/validate-style-engine-foundation.mjs"), "Core"),
  entry("authored-style-matching", "Authored Style Matching", "core", "validate:authored-style-matching", directNode("scripts/validate-authored-style-matching.mjs"), "Core"),
  entry("preview", "Preview", "preview", "validate:preview", directNode("scripts/validate-preview.mjs"), "Preview"),
  entry("dom-snapshot", "DOM Snapshot", "preview", "validate:dom-snapshot", directNode("scripts/validate-dom-snapshot.mjs"), "Preview"),
  entry("preview-selection", "Preview Selection", "preview", "validate:preview-selection", directNode("scripts/validate-preview-selection.mjs"), "Preview"),
  entry("preview-inspector", "Preview Inspector", "preview", "validate:preview-inspector", directNode("scripts/validate-preview-inspector.mjs"), "Preview"),
  entry("design-canvas", "Design Canvas", "ui", "validate:design-canvas", directNode("scripts/validate-design-canvas.mjs"), "UI"),
  entry("repository-graph-view", "Repository Graph View", "ui", "validate:repository-graph-view", directNode("scripts/validate-repository-graph-view.mjs"), "UI"),
  entry("visual-selection-overlay", "Visual Selection Overlay", "ui", "validate:visual-selection-overlay", directNode("scripts/validate-visual-selection-overlay.mjs"), "UI"),
  entry("html-element-library", "HTML Element Library", "ui", "validate:html-element-library", directNode("scripts/validate-html-element-library.mjs"), "UI"),
  entry("source-patch-preview", "Source Patch Preview", "ui", "validate:source-patch-preview", directNode("scripts/validate-source-patch-preview.mjs"), "UI"),
  entry("editable-inspector-surface", "Editable Inspector Surface", "ui", "validate:editable-inspector-surface", directNode("scripts/validate-editable-inspector-surface.mjs"), "UI"),
  entry("css-sass-inspector-surface", "CSS/Sass Inspector Surface", "ui", "validate:css-sass-inspector-surface", directNode("scripts/validate-css-sass-inspector-surface.mjs"), "UI"),
  entry("ui-flow", "UI Flow", "ui", "validate:ui-flow", directNode("scripts/validate-ui-flow.mjs"), "UI"),
  entry("local-watch", "Local Watch", "watch", "validate:local:watch", directNode("scripts/validate-local-watch.mjs"), "Environment"),
  entry("electron-doctor", "Electron Doctor", "doctor", "doctor:electron", directNode("scripts/doctor-electron.mjs"), "Environment")
]);

const catalogErrors = validateValidationCatalog(validationCatalog);
if (catalogErrors.length > 0) {
  throw new Error(`Invalid validation catalog:\n${catalogErrors.map((error) => `- ${error}`).join("\n")}`);
}

export const localQuickValidationChecks = Object.freeze(
  validationCatalog.filter((item) => item.includeInLocalQuick).map(toExecutionCheck)
);

export const fullValidationChecks = Object.freeze(
  validationCatalog.filter((item) => item.includeInFullValidation).map(toExecutionCheck)
);

export function createValidationEntry(id, label, category, npmScript, execution, documentationGroup, options = {}) {
  return entry(id, label, category, npmScript, execution, documentationGroup, options);
}

export function createDirectNodeExecution(directScriptPath, args = []) {
  return directNode(directScriptPath, args);
}

export function createExternalNpmExecution() {
  return externalNpm();
}

export function getGeneratedValidationScripts(catalog = validationCatalog) {
  const errors = validateValidationCatalog(catalog);
  if (errors.length > 0) throw new Error(`Cannot generate scripts from invalid validation catalog:\n${errors.join("\n")}`);
  return Object.fromEntries(
    catalog
      .filter((item) => item.scriptOwnership === VALIDATION_SCRIPT_OWNERSHIP_GENERATED)
      .map((item) => [item.npmScript, renderGeneratedNpmScript(item)])
  );
}

export function validateCatalogScriptOwnership(packageScripts, catalog = validationCatalog) {
  const errors = [];
  const scripts = packageScripts && typeof packageScripts === "object" && !Array.isArray(packageScripts)
    ? packageScripts
    : {};
  for (const item of catalog) {
    const current = scripts[item.npmScript];
    if (item.scriptOwnership === VALIDATION_SCRIPT_OWNERSHIP_GENERATED) {
      const expected = renderGeneratedNpmScript(item);
      if (current !== undefined && current !== expected) {
        errors.push(`Generated npm script collision for ${item.npmScript}: expected ${JSON.stringify(expected)}, found ${JSON.stringify(current)}. Resolve the manual script before synchronization.`);
      }
    } else if (item.scriptOwnership === VALIDATION_SCRIPT_OWNERSHIP_EXTERNAL) {
      if (typeof current !== "string" || current.trim() === "") {
        errors.push(`External npm script ${item.npmScript} required by validation ${item.id} is missing.`);
      }
    }
  }
  return errors;
}

export function applyCatalogScripts(packageScripts, catalog = validationCatalog) {
  const errors = [
    ...validateValidationCatalog(catalog),
    ...validateCatalogScriptOwnership(packageScripts, catalog)
  ];
  if (errors.length > 0) return { scripts: { ...(packageScripts ?? {}) }, errors };
  const scripts = { ...(packageScripts ?? {}) };
  for (const [name, command] of Object.entries(getGeneratedValidationScripts(catalog))) {
    if (scripts[name] === undefined) scripts[name] = command;
  }
  return { scripts, errors: [] };
}

export function renderGeneratedNpmScript(item) {
  if (item.scriptOwnership !== VALIDATION_SCRIPT_OWNERSHIP_GENERATED) {
    throw new Error(`Validation ${item.id} is not owned by the generator.`);
  }
  if (item.executionMode !== VALIDATION_EXECUTION_DIRECT_NODE) {
    throw new Error(`Generated validation ${item.id} must use direct-node execution.`);
  }
  return ["node", item.directScriptPath, ...item.args].map(quoteNpmArgument).join(" ");
}

export function quoteNpmArgument(value) {
  if (typeof value !== "string") throw new TypeError("npm script arguments must be strings.");
  if (value === "") return '""';
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

export function toExecutionCheck(item) {
  const common = {
    ...item,
    args: [...item.args],
    displayCommand: `npm run ${item.npmScript}`
  };
  if (item.executionMode === VALIDATION_EXECUTION_DIRECT_NODE) {
    return {
      ...common,
      command: process.execPath,
      args: [item.directScriptPath, ...item.args]
    };
  }
  return {
    ...common,
    commandMode: "npm"
  };
}

export function getValidationCatalogStats(catalog = validationCatalog) {
  const categories = {};
  for (const item of catalog) categories[item.category] = (categories[item.category] ?? 0) + 1;
  return {
    total: catalog.length,
    required: catalog.filter((item) => item.required).length,
    localQuick: catalog.filter((item) => item.includeInLocalQuick).length,
    full: catalog.filter((item) => item.includeInFullValidation).length,
    localOnly: catalog.filter((item) => item.includeInLocalQuick && !item.includeInFullValidation).length,
    fullOnly: catalog.filter((item) => !item.includeInLocalQuick && item.includeInFullValidation).length,
    categories
  };
}

export function validateValidationCatalog(catalog, options = {}) {
  const errors = [];
  if (!Array.isArray(catalog) || catalog.length === 0) return ["validation catalog must be a non-empty array."];
  const ids = new Set();
  const labels = new Set();
  const npmScripts = new Set();
  const directPaths = new Set();

  for (const [index, item] of catalog.entries()) {
    const subject = item?.id ? `Validation ${item.id}` : `Validation entry ${index}`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${subject} must be an object.`);
      continue;
    }
    for (const key of Object.keys(item)) {
      if (!ENTRY_KEYS.has(key)) errors.push(`${subject} contains unknown field ${key}.`);
    }

    validateUniqueString(errors, ids, item.id, `${subject} id`, /^[a-z0-9][a-z0-9-]*$/);
    validateUniqueString(errors, labels, item.label, `${subject} label`);
    validateUniqueString(errors, npmScripts, item.npmScript, `${subject} npmScript`);
    if (!CATEGORY_SET.has(item.category)) errors.push(`${subject} uses unknown category ${JSON.stringify(item.category)}.`);
    if (typeof item.required !== "boolean") errors.push(`${subject} required must be boolean.`);
    if (typeof item.includeInLocalQuick !== "boolean") errors.push(`${subject} includeInLocalQuick must be boolean.`);
    if (typeof item.includeInFullValidation !== "boolean") errors.push(`${subject} includeInFullValidation must be boolean.`);
    if (typeof item.documentationGroup !== "string" || item.documentationGroup.trim() === "") errors.push(`${subject} documentationGroup must be a non-empty string.`);
    if (![VALIDATION_EXECUTION_DIRECT_NODE, VALIDATION_EXECUTION_NPM].includes(item.executionMode)) errors.push(`${subject} uses unknown executionMode ${JSON.stringify(item.executionMode)}.`);
    if (![VALIDATION_SCRIPT_OWNERSHIP_GENERATED, VALIDATION_SCRIPT_OWNERSHIP_EXTERNAL].includes(item.scriptOwnership)) errors.push(`${subject} uses unknown scriptOwnership ${JSON.stringify(item.scriptOwnership)}.`);
    if (!Array.isArray(item.args) || item.args.some((argument) => typeof argument !== "string")) errors.push(`${subject} args must be an array of strings.`);

    if (item.executionMode === VALIDATION_EXECUTION_DIRECT_NODE) {
      if (!isRepositoryRelativePath(item.directScriptPath)) {
        errors.push(`${subject} directScriptPath must be a normalized repository-relative path.`);
      } else {
        if (directPaths.has(item.directScriptPath)) errors.push(`${subject} reuses directScriptPath ${item.directScriptPath}; direct script paths must be unique.`);
        directPaths.add(item.directScriptPath);
        if (options.projectRoot) {
          const absolute = path.resolve(options.projectRoot, item.directScriptPath);
          if (!isInsideRoot(options.projectRoot, absolute)) errors.push(`${subject} directScriptPath escapes the repository.`);
        }
      }
    } else if (item.directScriptPath !== null) {
      errors.push(`${subject} with npm execution must set directScriptPath to null.`);
    }

    if (item.scriptOwnership === VALIDATION_SCRIPT_OWNERSHIP_GENERATED && item.executionMode !== VALIDATION_EXECUTION_DIRECT_NODE) {
      errors.push(`${subject} generated scripts must use direct-node execution.`);
    }
    if (item.scriptOwnership === VALIDATION_SCRIPT_OWNERSHIP_EXTERNAL && item.executionMode !== VALIDATION_EXECUTION_NPM) {
      errors.push(`${subject} external scripts must use npm execution.`);
    }

    const included = item.includeInLocalQuick || item.includeInFullValidation;
    if (!included) {
      if (typeof item.suiteExclusionJustification !== "string" || item.suiteExclusionJustification.trim() === "") {
        errors.push(`${subject} is excluded from all suites and must define suiteExclusionJustification.`);
      }
    } else if (item.suiteExclusionJustification !== null) {
      errors.push(`${subject} must set suiteExclusionJustification to null while included in a suite.`);
    }
  }
  return errors;
}

function entry(id, label, category, npmScript, execution, documentationGroup, options = {}) {
  return Object.freeze({
    id,
    label,
    category,
    npmScript,
    required: options.required ?? true,
    executionMode: execution.executionMode,
    directScriptPath: execution.directScriptPath,
    args: Object.freeze([...(options.args ?? execution.args ?? [])]),
    includeInLocalQuick: options.includeInLocalQuick ?? true,
    includeInFullValidation: options.includeInFullValidation ?? true,
    documentationGroup,
    scriptOwnership: options.scriptOwnership ?? VALIDATION_SCRIPT_OWNERSHIP_GENERATED,
    suiteExclusionJustification: options.suiteExclusionJustification ?? null
  });
}

function validateUniqueString(errors, seen, value, field, pattern = null) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${field} must be a non-empty string.`);
    return;
  }
  if (value !== value.trim()) errors.push(`${field} must not contain surrounding whitespace.`);
  if (pattern && !pattern.test(value)) errors.push(`${field} has invalid format: ${value}.`);
  if (seen.has(value)) errors.push(`${field} must be unique: ${value}.`);
  seen.add(value);
}

function isRepositoryRelativePath(value) {
  return typeof value === "string"
    && value.trim() === value
    && value !== ""
    && !path.isAbsolute(value)
    && !value.includes("\\")
    && !value.split("/").includes("..");
}

function isInsideRoot(root, target) {
  const relative = path.relative(path.resolve(root), target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
