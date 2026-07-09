import {
  assertFileIncludes,
  assertNoForbiddenTokens,
  assertPackageScript,
  createValidationContext,
  finishValidation,
  parsePackageJson,
  pushValidationError,
  readRequiredFile,
  recordCheck
} from "./validation/validation-assertions.mjs";

const context = createValidationContext("CSS/Sass Inspector surface validation");
const surfaceRoot = "apps/desktop/electron/renderer/views/inspector/css-sass-inspector";

const requiredFiles = [
  `${surfaceRoot}/css-sass-inspector.constants.ts`,
  `${surfaceRoot}/css-sass-inspector.types.ts`,
  `${surfaceRoot}/css-sass-inspector.view-model.ts`,
  `${surfaceRoot}/css-sass-inspector.render.ts`,
  `${surfaceRoot}/css-sass-inspector.elements.ts`,
  `${surfaceRoot}/css-sass-inspector.validation.ts`,
  `${surfaceRoot}/css-sass-inspector.index.ts`,
  `${surfaceRoot}/index.ts`,
  "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html",
  "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.scss",
  "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.ts",
  "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.types.ts",
  "apps/desktop/electron/renderer/components/project-preview-panel/inspector/project-preview-inspector-renderer.ts",
  "docs/architecture/css-sass-inspector-readonly-surface.md",
  "docs/architecture/validation-system.md",
  "docs/full-product-roadmap.md",
  "package.json"
];

const sourceFileContent = new Map();
for (const file of requiredFiles) {
  sourceFileContent.set(file, readRequiredFile(context, file));
}

const packageJson = parsePackageJson(context, sourceFileContent.get("package.json") ?? "{}");
assertPackageScript(context, packageJson, "validate:css-sass-inspector-surface");
assertPackageScript(context, packageJson, "validate:local:quick:ui");

requireIncludes(`${surfaceRoot}/css-sass-inspector.constants.ts`, [
  "CSS/Sass Inspector",
  "Apply unavailable — style write runtime not enabled",
  "No real cascade is calculated",
  "No computed styles are read",
  "No Preview DOM mutation occurs",
  "No write IPC exists",
  "Apply remains unavailable",
  "source writes unavailable",
  "iframe DOM access blocked"
]);

requireIncludes(`${surfaceRoot}/css-sass-inspector.types.ts`, [
  "CSSSassInspectorSurfaceViewModel",
  "empty",
  "inventory-only",
  "blocked",
  "unsupported",
  "linkedCssCount",
  "linkedScssCount",
  "inlineStyleBlockCount",
  "inlineStyleAttributeCount",
  "unsupportedSourceCount",
  "missingSourceCount",
  "canInspectComputedStyles: false",
  "canEditStyles: false",
  "canApply: false",
  "canWriteSource: false",
  "ariaDisabled: true",
  "dataDisabled: true"
]);

requireIncludes(`${surfaceRoot}/css-sass-inspector.view-model.ts`, [
  "createCSSSassInspectorSurfaceViewModel",
  "SelectedNodeStyleReadinessPreview",
  "StyleSourceInventoryPreview",
  "StyleRulePreview",
  "linked-css",
  "linked-scss",
  "canInspectComputedStyles: false",
  "canEditStyles: false",
  "canApply: false"
]);

requireIncludes(`${surfaceRoot}/css-sass-inspector.render.ts`, [
  "renderCSSSassInspectorSurface",
  "replaceChildren",
  "cssSassInspectorApplyUnavailableAffordance.setAttribute(\"aria-disabled\", \"true\")",
  "cssSassInspectorApplyUnavailableAffordance.setAttribute(\"data-disabled\", \"true\")",
  "Rule preview unavailable — source text not provided"
]);

requireIncludes("apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html", [
  "data-css-sass-inspector-surface",
  "CSS/Sass Inspector",
  "data-css-sass-inspector-sources",
  "data-css-sass-inspector-rules",
  "data-css-sass-inspector-safety",
  "data-css-sass-inspector-apply-unavailable",
  "aria-disabled=\"true\"",
  "data-disabled=\"true\"",
  "Apply unavailable — style write runtime not enabled",
  "No real cascade is calculated",
  "No computed styles are read",
  "No Preview DOM mutation occurs",
  "No write IPC exists",
  "Apply remains unavailable"
]);

requireIncludes("apps/desktop/electron/renderer/components/project-preview-panel/inspector/project-preview-inspector-renderer.ts", [
  "createStyleSourceInventoryPreview",
  "createSelectedNodeStyleReadinessPreview",
  "createCSSSassInspectorSurfaceViewModel",
  "renderCSSSassInspectorSurface",
  "dependency.type === \"stylesheet\"",
  "canReadSource: false",
  "Sass/SCSS source preview is unsupported"
]);

requireIncludes("apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.types.ts", ["CSSSassInspectorSurfaceElements"]);
requireIncludes("apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.ts", [
  "cssSassInspectorApplyUnavailableAffordance: query(\"[data-css-sass-inspector-apply-unavailable]\", HTMLElement)"
]);

recordCheck(context, "validate:local:quick:ui includes css sass inspector validator");
if (!packageJson.scripts?.["validate:local:quick:ui"]?.includes("validate:css-sass-inspector-surface")) {
  pushValidationError(context, {
    kind: "package script missing",
    file: "package.json",
    condition: "validate:local:quick:ui must include validate:css-sass-inspector-surface",
    token: "validate:css-sass-inspector-surface",
    message: "package.json validate:local:quick:ui must include validate:css-sass-inspector-surface."
  });
}

const guardedSourceFiles = requiredFiles.filter((file) => /\.(ts|html|scss)$/.test(file) && !file.startsWith("docs/"));
const forbiddenPatterns = [
  { label: "getComputedStyle", pattern: /\bgetComputedStyle\b/ },
  { label: "document.styleSheets", pattern: /\bdocument\.styleSheets\b/ },
  { label: "CSSStyleSheet", pattern: /\bCSSStyleSheet\b/ },
  { label: "CSSRule", pattern: /\bCSSRule\b/ },
  { label: "CSSStyleRule", pattern: /\bCSSStyleRule\b/ },
  { label: "iframe.contentDocument", pattern: /iframe\.contentDocument/ },
  { label: "iframe.contentWindow.document", pattern: /iframe\.contentWindow\.document/ },
  { label: ".contentDocument", pattern: /\.contentDocument\b/ },
  { label: ".contentWindow.document", pattern: /\.contentWindow\.document\b/ },
  { label: "insertAdjacentHTML", pattern: /\binsertAdjacentHTML\b/ },
  { label: "contenteditable", pattern: /\bcontenteditable\b/i },
  { label: "execCommand", pattern: /\bexecCommand\b/ },
  { label: "localStorage", pattern: /\blocalStorage\b/ },
  { label: "filesystem write", pattern: /\bwriteFile\b|\bappendFile\b|\bmkdir\b|\bunlink\b/ },
  { label: "real patch application symbol", pattern: /\bapplyPatch\b/ },
  { label: "allow-same-origin", pattern: /allow-same-origin/ },
  { label: "write/save/apply IPC channel", pattern: /ipc(Main|Renderer)\.(handle|on|invoke|send)\([^\n]*["'][^"']*(write|save|apply)[^"']*["']/i }
];
assertNoForbiddenTokens(context, guardedSourceFiles, forbiddenPatterns);

const previewPanelHtml = sourceFileContent.get("apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html") ?? "";
const surfaceStart = previewPanelHtml.indexOf("data-css-sass-inspector-surface");
const applyMarker = previewPanelHtml.indexOf("data-css-sass-inspector-apply-unavailable", surfaceStart);
const applyEnd = previewPanelHtml.indexOf("</p>", applyMarker);
const cssSassSurface = surfaceStart >= 0 && applyMarker >= 0 && applyEnd >= 0 ? previewPanelHtml.slice(surfaceStart, applyEnd) : "";

recordCheck(context, "CSS/Sass Inspector surface markup can be isolated");
if (!cssSassSurface) pushValidationError(context, "CSS/Sass Inspector surface markup could not be isolated.");

recordCheck(context, "CSS/Sass Inspector surface has no button");
if (/<button\b/i.test(cssSassSurface)) pushValidationError(context, "CSS/Sass Inspector surface must not contain a button.");

recordCheck(context, "CSS/Sass Inspector surface has no editable form controls");
if (/<input\b|<textarea\b|<select\b|<form\b/i.test(cssSassSurface)) pushValidationError(context, "CSS/Sass Inspector surface must not contain editable form controls.");

recordCheck(context, "CSS/Sass Inspector Apply affordance is passive paragraph");
if (!/<p\b[^>]*data-css-sass-inspector-apply-unavailable/i.test(cssSassSurface)) {
  pushValidationError(context, "CSS/Sass Inspector Apply affordance must be a passive paragraph.");
}

recordCheck(context, "CSS/Sass Inspector Apply affordance is aria/data disabled");
if (!/<p\b[^>]*aria-disabled="true"[^>]*data-disabled="true"[^>]*data-css-sass-inspector-apply-unavailable/i.test(cssSassSurface)) {
  pushValidationError(context, "CSS/Sass Inspector Apply affordance must include aria-disabled=\"true\" and data-disabled=\"true\".");
}

for (const doc of ["docs/architecture/css-sass-inspector-readonly-surface.md", "docs/architecture/validation-system.md"]) {
  requireIncludes(doc, [
    "Phase 8B — CSS/Sass Inspector read-only visual surface",
    "Phase 8B boundary: CSS/Sass Inspector read-only visual surface only. No real cascade is calculated. No computed styles are read. No style editing is implemented. No source files are written. No patch apply is available. No write IPC exists. Apply remains unavailable. No contenteditable is used. No undo/redo execution runs. Dirty-state is not persisted. No refresh execution runs. No Preview DOM mutation occurs.",
    "real cascade calculation",
    "computed style inspection",
    "style editing",
    "CSS/Sass source writes",
    "Sass compilation",
    "Sass import resolution",
    "patch apply",
    "IPC write",
    "save/apply workflow",
    "real undo/redo execution",
    "dirty-state persistence",
    "refresh execution",
    "DOM mutation",
    "Apply enablement"
  ], "docs boundary missing");
}

recordCheck(context, "full roadmap untouched sentinel absent");
if ((sourceFileContent.get("docs/full-product-roadmap.md") ?? "").includes("Phase 8B css sass inspector validator touched this file")) {
  pushValidationError(context, "docs/full-product-roadmap.md must not be modified for Phase 8B.");
}

finishValidation(context, {
  inspectHints: [
    "Open the reported file.",
    "Search for the exact required string or forbidden token.",
    "Re-run npm run validate:css-sass-inspector-surface."
  ],
  resolutionHints: [
    "Restore the exact read-only CSS/Sass Inspector contract, empty-state copy, package script wiring, or docs boundary.",
    "Keep forbidden-token scans scoped to CSS/Sass Inspector and Preview panel integration files."
  ],
  doNotHints: [
    "Do not relax scripts/validate-css-sass-inspector-surface.mjs.",
    "Do not move required runtime strings only to docs.",
    "Do not add cascade, computed style reads, write IPC, DOM mutation, or Apply enablement."
  ]
});

function requireIncludes(file, tokens, label = "required token") {
  const content = sourceFileContent.has(file) ? sourceFileContent.get(file) : readRequiredFile(context, file);
  for (const token of tokens) {
    assertFileIncludes(context, file, content ?? "", token, label);
  }
}
