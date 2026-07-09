function nodeScript(scriptPath, npmScript) {
  return {
    npmScript,
    required: true,
    command: process.execPath,
    args: [scriptPath],
    directScriptPath: scriptPath,
    displayCommand: `npm run ${npmScript}`,
    executionMode: "direct-node"
  };
}

function npmRun(scriptName) {
  return {
    npmScript: scriptName,
    required: true,
    commandMode: "npm",
    displayCommand: `npm run ${scriptName}`,
    executionMode: "npm"
  };
}

export const localQuickValidationChecks = [
  { id: "validation-system", label: "Validation System", category: "validation", ...nodeScript("scripts/validate-validation-system.mjs", "validate:validation-system") },
  { id: "guided-docs", label: "Guided docs", category: "docs", ...nodeScript("scripts/validate-guided-docs.mjs", "validate:guided-docs") },
  { id: "architecture-docs", label: "Architecture docs", category: "docs", ...nodeScript("scripts/validate-architecture-docs.mjs", "validate:architecture-docs") },
  { id: "build-html", label: "Build HTML", category: "build", ...nodeScript("scripts/build-html.mjs", "build:html") },
  { id: "build-scss", label: "Build SCSS", category: "build", ...nodeScript("scripts/build-scss.mjs", "build:scss") },
  { id: "build-ts", label: "Build TS", category: "build", ...nodeScript("scripts/build-ts.mjs", "build:ts") },
  { id: "typecheck", label: "Typecheck", category: "build", ...npmRun("typecheck") },
  { id: "structure", label: "Structure", category: "core", ...nodeScript("scripts/validate-structure.mjs", "validate:structure") },
  { id: "project-graph", label: "Project Graph", category: "core", ...nodeScript("scripts/validate-project-graph.mjs", "validate:project-graph") },
  { id: "project-watch", label: "Project Watch", category: "core", ...nodeScript("scripts/validate-project-watch.mjs", "validate:project-watch") },
  { id: "history-foundation", label: "History Foundation", category: "core", ...nodeScript("scripts/validate-history-foundation.mjs", "validate:history-foundation") },
  { id: "design-editing-preflight", label: "Design Editing Preflight", category: "core", ...nodeScript("scripts/validate-design-editing-preflight.mjs", "validate:design-editing-preflight") },
  { id: "inspector-editing-foundation", label: "Inspector Editing Foundation", category: "core", ...nodeScript("scripts/validate-inspector-editing-foundation.mjs", "validate:inspector-editing-foundation") },
  { id: "style-engine-foundation", label: "Style Engine Foundation", category: "core", ...nodeScript("scripts/validate-style-engine-foundation.mjs", "validate:style-engine-foundation") },
  { id: "authored-style-matching", label: "Authored Style Matching", category: "core", ...nodeScript("scripts/validate-authored-style-matching.mjs", "validate:authored-style-matching") },
  { id: "preview", label: "Preview", category: "preview", ...nodeScript("scripts/validate-preview.mjs", "validate:preview") },
  { id: "dom-snapshot", label: "DOM Snapshot", category: "preview", ...nodeScript("scripts/validate-dom-snapshot.mjs", "validate:dom-snapshot") },
  { id: "preview-selection", label: "Preview Selection", category: "preview", ...nodeScript("scripts/validate-preview-selection.mjs", "validate:preview-selection") },
  { id: "preview-inspector", label: "Preview Inspector", category: "preview", ...nodeScript("scripts/validate-preview-inspector.mjs", "validate:preview-inspector") },
  { id: "design-canvas", label: "Design Canvas", category: "ui", ...nodeScript("scripts/validate-design-canvas.mjs", "validate:design-canvas") },
  { id: "visual-selection-overlay", label: "Visual Selection Overlay", category: "ui", ...nodeScript("scripts/validate-visual-selection-overlay.mjs", "validate:visual-selection-overlay") },
  { id: "html-element-library", label: "HTML Element Library", category: "ui", ...nodeScript("scripts/validate-html-element-library.mjs", "validate:html-element-library") },
  { id: "source-patch-preview", label: "Source Patch Preview", category: "ui", ...nodeScript("scripts/validate-source-patch-preview.mjs", "validate:source-patch-preview") },
  { id: "editable-inspector-surface", label: "Editable Inspector Surface", category: "ui", ...nodeScript("scripts/validate-editable-inspector-surface.mjs", "validate:editable-inspector-surface") },
  { id: "css-sass-inspector-surface", label: "CSS/Sass Inspector Surface", category: "ui", ...nodeScript("scripts/validate-css-sass-inspector-surface.mjs", "validate:css-sass-inspector-surface") },
  { id: "ui-flow", label: "UI Flow", category: "ui", ...nodeScript("scripts/validate-ui-flow.mjs", "validate:ui-flow") },
  { id: "local-watch", label: "Local Watch", category: "watch", ...nodeScript("scripts/validate-local-watch.mjs", "validate:local:watch") },
  { id: "electron-doctor", label: "Electron Doctor", category: "doctor", ...nodeScript("scripts/doctor-electron.mjs", "doctor:electron") }
];
