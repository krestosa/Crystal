const directNode = (directScriptPath) => ({ executionMode: "direct-node", directScriptPath });
const npm = () => ({ executionMode: "npm", directScriptPath: null });

export const validationCatalog = Object.freeze([
  entry("validation-system", "Validation System", "validation", "validate:validation-system", directNode("scripts/validate-validation-system.mjs"), "Validation foundation"),
  entry("project-metadata", "Project Metadata", "validation", "validate:project-metadata", directNode("scripts/sync-project-metadata.mjs"), "Generated metadata"),
  entry("change-policy", "Change Policy", "validation", "validate:change-policy", directNode("scripts/validate-change-policy.mjs"), "Change policy"),
  entry("markdown-integrity", "Markdown Integrity", "docs", "validate:markdown-integrity", directNode("scripts/validate-markdown-integrity.mjs"), "Documentation"),
  entry("guided-docs", "Guided docs", "docs", "validate:guided-docs", directNode("scripts/validate-guided-docs.mjs"), "Documentation"),
  entry("architecture-docs", "Architecture docs", "docs", "validate:architecture-docs", directNode("scripts/validate-architecture-docs.mjs"), "Documentation"),
  entry("build-html", "Build HTML", "build", "build:html", directNode("scripts/build-html.mjs"), "Build"),
  entry("build-scss", "Build SCSS", "build", "build:scss", directNode("scripts/build-scss.mjs"), "Build"),
  entry("build-ts", "Build TS", "build", "build:ts", directNode("scripts/build-ts.mjs"), "Build"),
  entry("typecheck", "Typecheck", "build", "typecheck", npm(), "Build"),
  entry("structure", "Structure", "core", "validate:structure", directNode("scripts/validate-structure.mjs"), "Core"),
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
  entry("visual-selection-overlay", "Visual Selection Overlay", "ui", "validate:visual-selection-overlay", directNode("scripts/validate-visual-selection-overlay.mjs"), "UI"),
  entry("html-element-library", "HTML Element Library", "ui", "validate:html-element-library", directNode("scripts/validate-html-element-library.mjs"), "UI"),
  entry("source-patch-preview", "Source Patch Preview", "ui", "validate:source-patch-preview", directNode("scripts/validate-source-patch-preview.mjs"), "UI"),
  entry("editable-inspector-surface", "Editable Inspector Surface", "ui", "validate:editable-inspector-surface", directNode("scripts/validate-editable-inspector-surface.mjs"), "UI"),
  entry("css-sass-inspector-surface", "CSS/Sass Inspector Surface", "ui", "validate:css-sass-inspector-surface", directNode("scripts/validate-css-sass-inspector-surface.mjs"), "UI"),
  entry("ui-flow", "UI Flow", "ui", "validate:ui-flow", directNode("scripts/validate-ui-flow.mjs"), "UI"),
  entry("local-watch", "Local Watch", "watch", "validate:local:watch", directNode("scripts/validate-local-watch.mjs"), "Environment"),
  entry("electron-doctor", "Electron Doctor", "doctor", "doctor:electron", directNode("scripts/doctor-electron.mjs"), "Environment")
]);

export const localQuickValidationChecks = Object.freeze(
  validationCatalog.filter((item) => item.includeInLocalQuick).map(toExecutionCheck)
);

export const fullValidationChecks = Object.freeze(
  validationCatalog.filter((item) => item.includeInFullValidation).map(toExecutionCheck)
);


export function getGeneratedValidationScripts(catalog = validationCatalog) {
  const categoryScripts = {
    "validate:local:quick:core": renderCategoryScript(catalog, "core"),
    "validate:local:quick:preview": renderCategoryScript(catalog, "preview"),
    "validate:local:quick:ui": renderCategoryScript(catalog, "ui")
  };
  return categoryScripts;
}

function renderCategoryScript(catalog, category) {
  return catalog
    .filter((item) => item.category === category && item.includeInLocalQuick)
    .map((item) => `npm run ${item.npmScript}`)
    .join(" && ");
}

export function getValidationCatalogStats(catalog = validationCatalog) {
  const categories = {};
  for (const item of catalog) categories[item.category] = (categories[item.category] ?? 0) + 1;
  return {
    total: catalog.length,
    localQuick: catalog.filter((item) => item.includeInLocalQuick).length,
    full: catalog.filter((item) => item.includeInFullValidation).length,
    categories
  };
}

function entry(id, label, category, npmScript, execution, documentationGroup) {
  return Object.freeze({
    id,
    label,
    category,
    npmScript,
    required: true,
    executionMode: execution.executionMode,
    directScriptPath: execution.directScriptPath,
    includeInLocalQuick: true,
    includeInFullValidation: true,
    documentationGroup
  });
}

function toExecutionCheck(item) {
  const common = {
    ...item,
    displayCommand: `npm run ${item.npmScript}`
  };
  if (item.executionMode === "direct-node") {
    return {
      ...common,
      command: process.execPath,
      args: [item.directScriptPath]
    };
  }
  return {
    ...common,
    commandMode: "npm"
  };
}
