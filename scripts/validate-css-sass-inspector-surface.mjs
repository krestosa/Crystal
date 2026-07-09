import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const errors = [];

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
  "docs/architecture/css-sass-inspector-readonly-surface.md"
];

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
  { label: "allow-same-origin", pattern: /allow-same-origin/ }
];

const ipcWritePattern = /ipc(Main|Renderer)\.(handle|on|invoke|send)\([^\n]*["'][^"']*(write|save|apply)[^"']*["']/i;

function absolute(relativePath) {
  return path.join(repoRoot, relativePath);
}

function read(relativePath) {
  const filePath = absolute(relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(relativePath, phrases) {
  const content = read(relativePath);
  for (const phrase of phrases) {
    if (!content.includes(phrase)) errors.push(`${relativePath} must include: ${phrase}`);
  }
}

for (const file of requiredFiles) read(file);

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

requireIncludes("apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.types.ts", [
  "CSSSassInspectorSurfaceElements"
]);

requireIncludes("apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.ts", [
  "cssSassInspectorApplyUnavailableAffordance: query(\"[data-css-sass-inspector-apply-unavailable]\", HTMLElement)"
]);

requireIncludes("package.json", [
  "\"validate:css-sass-inspector-surface\"",
  "npm run validate:css-sass-inspector-surface"
]);

for (const file of guardedSourceFiles) {
  const content = read(file);
  for (const { label, pattern } of forbiddenPatterns) {
    if (pattern.test(content)) errors.push(`${file} contains forbidden ${label}.`);
  }
  if (ipcWritePattern.test(content)) errors.push(`${file} contains a forbidden write/save/apply IPC channel.`);
}

const previewPanelHtml = read("apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html");
const surfaceStart = previewPanelHtml.indexOf("data-css-sass-inspector-surface");
const applyMarker = previewPanelHtml.indexOf("data-css-sass-inspector-apply-unavailable", surfaceStart);
const applyEnd = previewPanelHtml.indexOf("</p>", applyMarker);
const cssSassSurface = surfaceStart >= 0 && applyMarker >= 0 && applyEnd >= 0 ? previewPanelHtml.slice(surfaceStart, applyEnd) : "";
if (!cssSassSurface) errors.push("CSS/Sass Inspector surface markup could not be isolated.");
if (/<button\b/i.test(cssSassSurface)) errors.push("CSS/Sass Inspector surface must not contain a button.");
if (/<input\b|<textarea\b|<select\b|<form\b/i.test(cssSassSurface)) errors.push("CSS/Sass Inspector surface must not contain editable form controls.");
if (!/<p\b[^>]*data-css-sass-inspector-apply-unavailable/i.test(cssSassSurface)) errors.push("CSS/Sass Inspector Apply affordance must be a passive paragraph.");
if (!/<p\b[^>]*aria-disabled="true"[^>]*data-disabled="true"[^>]*data-css-sass-inspector-apply-unavailable/i.test(cssSassSurface)) {
  errors.push("CSS/Sass Inspector Apply affordance must include aria-disabled=\"true\" and data-disabled=\"true\".");
}

for (const doc of ["docs/architecture/css-sass-inspector-readonly-surface.md", "docs/architecture/validation-system.md"]) {
  const content = read(doc);
  for (const phrase of [
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
  ]) {
    if (!content.includes(phrase)) errors.push(`${doc} must document Phase 8B boundary: ${phrase}`);
  }
}

if (read("docs/full-product-roadmap.md").includes("Phase 8B css sass inspector validator touched this file")) {
  errors.push("docs/full-product-roadmap.md must not be modified for Phase 8B.");
}

if (errors.length > 0) {
  console.error("CSS/Sass Inspector surface validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`CSS/Sass Inspector surface validation passed (${requiredFiles.length} files checked).`);
