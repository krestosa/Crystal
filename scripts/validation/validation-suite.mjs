function npmRun(scriptName) {
  return {
    npmScript: scriptName,
    required: true
  };
}

export const localQuickValidationChecks = [
  { id: "guided-docs", label: "Guided docs", category: "docs", ...npmRun("validate:guided-docs") },
  { id: "architecture-docs", label: "Architecture docs", category: "docs", ...npmRun("validate:architecture-docs") },
  { id: "build-html", label: "Build HTML", category: "build", ...npmRun("build:html") },
  { id: "build-scss", label: "Build SCSS", category: "build", ...npmRun("build:scss") },
  { id: "build-ts", label: "Build TS", category: "build", ...npmRun("build:ts") },
  { id: "typecheck", label: "Typecheck", category: "typecheck", ...npmRun("typecheck") },
  { id: "structure", label: "Structure", category: "core", ...npmRun("validate:structure") },
  { id: "project-graph", label: "Project Graph", category: "core", ...npmRun("validate:project-graph") },
  { id: "project-watch", label: "Project Watch", category: "core", ...npmRun("validate:project-watch") },
  { id: "history-foundation", label: "History Foundation", category: "core", ...npmRun("validate:history-foundation") },
  { id: "design-editing-preflight", label: "Design Editing Preflight", category: "core", ...npmRun("validate:design-editing-preflight") },
  { id: "inspector-editing-foundation", label: "Inspector Editing Foundation", category: "core", ...npmRun("validate:inspector-editing-foundation") },
  { id: "style-engine-foundation", label: "Style Engine Foundation", category: "core", ...npmRun("validate:style-engine-foundation") },
  { id: "preview", label: "Preview", category: "preview", ...npmRun("validate:preview") },
  { id: "dom-snapshot", label: "DOM Snapshot", category: "preview", ...npmRun("validate:dom-snapshot") },
  { id: "preview-selection", label: "Preview Selection", category: "preview", ...npmRun("validate:preview-selection") },
  { id: "preview-inspector", label: "Preview Inspector", category: "preview", ...npmRun("validate:preview-inspector") },
  { id: "design-canvas", label: "Design Canvas", category: "ui", ...npmRun("validate:design-canvas") },
  { id: "visual-selection-overlay", label: "Visual Selection Overlay", category: "ui", ...npmRun("validate:visual-selection-overlay") },
  { id: "html-element-library", label: "HTML Element Library", category: "ui", ...npmRun("validate:html-element-library") },
  { id: "source-patch-preview", label: "Source Patch Preview", category: "ui", ...npmRun("validate:source-patch-preview") },
  { id: "editable-inspector-surface", label: "Editable Inspector Surface", category: "ui", ...npmRun("validate:editable-inspector-surface") },
  { id: "css-sass-inspector-surface", label: "CSS/Sass Inspector Surface", category: "ui", ...npmRun("validate:css-sass-inspector-surface") },
  { id: "ui-flow", label: "UI Flow", category: "ui", ...npmRun("validate:ui-flow") },
  { id: "local-watch", label: "Local Watch", category: "watch", ...npmRun("validate:local:watch") },
  { id: "electron-doctor", label: "Electron Doctor", category: "doctor", ...npmRun("doctor:electron") }
];
