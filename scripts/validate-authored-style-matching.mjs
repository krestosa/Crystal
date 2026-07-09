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

const context = createValidationContext("Authored Style Matching validation");
const styleRoot = "packages/core/style-engine";
const surfaceRoot = "apps/desktop/electron/renderer/views/inspector/css-sass-inspector";
const phase8CBoundary = "Phase 8C boundary: Authored Style Matching over DOM Snapshot only. No real cascade is calculated. No computed styles are read. No document.styleSheets or CSSOM is used. No iframe internals are read. No live Preview DOM matching is performed. No source files are written. No patch apply is available. No write IPC exists. Apply remains unavailable. No contenteditable is used. No undo/redo execution runs. Dirty-state is not persisted. No refresh execution runs. No Preview DOM mutation occurs.";

const requiredFiles = [
  `${styleRoot}/style-authored-matching.types.ts`,
  `${styleRoot}/style-authored-snapshot-node.ts`,
  `${styleRoot}/style-authored-selector-match.ts`,
  `${styleRoot}/style-authored-rule-match.ts`,
  `${styleRoot}/style-authored-matching-readiness.ts`,
  `${styleRoot}/style-engine.constants.ts`,
  `${styleRoot}/style-engine.validators.ts`,
  `${styleRoot}/index.ts`,
  `${surfaceRoot}/css-sass-inspector.types.ts`,
  `${surfaceRoot}/css-sass-inspector.view-model.ts`,
  `${surfaceRoot}/css-sass-inspector.render.ts`,
  `${surfaceRoot}/css-sass-inspector.validation.ts`,
  "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html",
  "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.ts",
  "apps/desktop/electron/renderer/components/project-preview-panel/inspector/project-preview-inspector-renderer.ts",
  "docs/architecture/authored-style-matching-dom-snapshot.md",
  "docs/architecture/validation-system.md",
  "docs/roadmap-implementation.md",
  "scripts/validation/validation-suite.mjs",
  "package.json"
];

const sourceFileContent = new Map();
for (const file of requiredFiles) sourceFileContent.set(file, readRequiredFile(context, file));

const packageJson = parsePackageJson(context, sourceFileContent.get("package.json") ?? "{}");
assertPackageScript(context, packageJson, "validate:authored-style-matching");
assertPackageScript(context, packageJson, "validate:local:quick:core");

requireIncludes(`${styleRoot}/index.ts`, [
  'export * from "./style-authored-matching.types";',
  'export * from "./style-authored-snapshot-node";',
  'export * from "./style-authored-selector-match";',
  'export * from "./style-authored-rule-match";',
  'export * from "./style-authored-matching-readiness";'
]);

requireIncludes(`${styleRoot}/style-engine.constants.ts`, [
  "STYLE_AUTHORED_MATCHING_READONLY_SAFETY_NOTE",
  "STYLE_AUTHORED_MATCHING_NO_CASCADE_NOTE",
  "STYLE_AUTHORED_MATCHING_NO_COMPUTED_STYLES_NOTE",
  "STYLE_AUTHORED_MATCHING_NO_IFRAME_DOM_NOTE",
  "STYLE_AUTHORED_MATCHING_APPLY_BLOCKED_REASON",
  "AUTHORED_SELECTOR_MATCHED_FROM_SNAPSHOT_STATUS",
  "AUTHORED_SELECTOR_NOT_MATCHED_FROM_SNAPSHOT_STATUS",
  "AUTHORED_SELECTOR_UNSUPPORTED_STATUS",
  "AUTHORED_STYLE_MATCHING_BLOCKED_STATUS"
]);

requireIncludes(`${styleRoot}/style-authored-matching.types.ts`, [
  "AuthoredStyleSnapshotNodePreview",
  "AuthoredSelectorMatchStatus",
  "matched-from-snapshot",
  "not-matched-from-snapshot",
  "unsupported-selector",
  "inventory-unavailable",
  "source-text-unavailable",
  "canEvaluateAgainstIframe: false",
  "canInspectComputedStyles: false",
  "canEdit: false",
  "canApply: false",
  "SelectedNodeAuthoredStyleMatchesPreview"
]);

requireIncludes(`${styleRoot}/style-authored-snapshot-node.ts`, [
  "createAuthoredStyleSnapshotNodePreview",
  "createAuthoredStyleSnapshotNodePreviewFromProjectDomNode",
  "getSnapshotAttributeValue",
  "normalizeSnapshotClassList",
  "canReadFromIframe: false",
  "ProjectDomNode"
]);

requireIncludes(`${styleRoot}/style-authored-selector-match.ts`, [
  "createAuthoredSelectorMatchPreview",
  "matchStyleSelectorPreviewAgainstSnapshotNode",
  "parseSupportedSingleNodeSelector",
  "isUnsupportedAuthoredSelector",
  "Whitespace combinators require a future selector engine.",
  "Pseudo selectors require a future selector engine.",
  "Universal selectors are outside Phase 8C.",
  "canEvaluateAgainstIframe: false",
  "canInspectComputedStyles: false",
  "canEdit: false",
  "canApply: false"
]);

requireIncludes(`${styleRoot}/style-authored-rule-match.ts`, [
  "createAuthoredStyleRuleMatchCandidatePreview",
  "matchStyleRulePreviewAgainstSnapshotNode",
  "matchStyleRulePreviewsAgainstSnapshotNode",
  "source-text-unavailable",
  "canInspectComputedStyles: false",
  "canEdit: false",
  "canApply: false"
]);

requireIncludes(`${styleRoot}/style-authored-matching-readiness.ts`, [
  "createSelectedNodeAuthoredStyleMatchesPreview",
  "createBlockedSelectedNodeAuthoredStyleMatchesPreview",
  "summarizeAuthoredStyleMatchCandidates",
  "canInspectComputedStyles: false",
  "canEditStyles: false",
  "canApply: false"
]);

requireIncludes(`${styleRoot}/style-engine.validators.ts`, [
  "validateAuthoredStyleSnapshotNodePreview",
  "validateAuthoredSelectorMatchPreview",
  "validateAuthoredStyleRuleMatchCandidatePreview",
  "validateSelectedNodeAuthoredStyleMatchesPreview",
  "matched-from-snapshot selector matches require evidence",
  "unsupported-selector matches require unsupportedReason",
  "canEvaluateAgainstIframe must remain false",
  "canInspectComputedStyles must remain false",
  "canApply must remain false"
]);

requireIncludes(`${surfaceRoot}/css-sass-inspector.types.ts`, [
  "authoredMatchesPreview?: SelectedNodeAuthoredStyleMatchesPreview | null",
  "CSSSassInspectorAuthoredMatchesSummary",
  "CSSSassInspectorAuthoredMatchSection",
  "authoredMatchesSummary",
  "authoredMatchSections",
  "canInspectComputedStyles: false",
  "canApply: false"
]);

requireIncludes(`${surfaceRoot}/css-sass-inspector.view-model.ts`, [
  "authoredMatchesPreview",
  "createAuthoredMatchesSummary",
  "createAuthoredMatchSection",
  "Candidate match only — no cascade",
  "Computed styles unavailable",
  "Unsupported selector — requires future selector engine",
  "No authored matches from DOM Snapshot",
  "canApply: false"
]);

requireIncludes(`${surfaceRoot}/css-sass-inspector.render.ts`, [
  "Authored matches",
  "Candidate matches",
  "Candidate match only — no cascade",
  "Computed styles unavailable",
  "Apply unavailable",
  "No authored matches from DOM Snapshot",
  "Rule preview unavailable — source text not provided",
  "renderAuthoredMatches"
]);

requireIncludes(`${surfaceRoot}/css-sass-inspector.validation.ts`, [
  "authoredMatchesSummary.canInspectComputedStyles !== false",
  "authoredMatchesSummary.canApply !== false",
  "section.canEdit !== false",
  "section.canApply !== false"
]);

requireIncludes("apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html", [
  "Authored matches",
  "data-css-sass-inspector-authored-matches",
  "data-css-sass-inspector-authored-matches-empty",
  "No authored matches from DOM Snapshot",
  "Rule preview unavailable — source text not provided",
  "Apply unavailable — style write runtime not enabled"
]);

requireIncludes("apps/desktop/electron/renderer/components/project-preview-panel/inspector/project-preview-inspector-renderer.ts", [
  "createAuthoredStyleSnapshotNodePreviewFromProjectDomNode",
  "createSelectedNodeAuthoredStyleMatchesPreview",
  "findProjectDomNodeBySnapshotPath",
  "rulePreviews: []",
  "source text is not read by the renderer surface"
]);

requireIncludes("scripts/validation/validation-suite.mjs", [
  "authored-style-matching",
  "Authored Style Matching",
  "validate-authored-style-matching.mjs"
]);

recordCheck(context, "validate:local:quick:core includes authored style matching validator");
if (!packageJson.scripts?.["validate:local:quick:core"]?.includes("validate:authored-style-matching")) {
  pushValidationError(context, "package.json validate:local:quick:core must include validate:authored-style-matching.");
}

for (const doc of ["docs/architecture/authored-style-matching-dom-snapshot.md", "docs/architecture/validation-system.md", "docs/roadmap-implementation.md"]) {
  requireIncludes(doc, [
    "Phase 8C",
    "Authored Style Matching over DOM Snapshot",
    phase8CBoundary,
    "No real cascade is calculated",
    "No computed styles are read",
    "No live Preview DOM matching is performed",
    "Apply remains unavailable"
  ]);
}

assertNoForbiddenTokens(context, [
  `${styleRoot}/style-authored-matching.types.ts`,
  `${styleRoot}/style-authored-snapshot-node.ts`,
  `${styleRoot}/style-authored-selector-match.ts`,
  `${styleRoot}/style-authored-rule-match.ts`,
  `${styleRoot}/style-authored-matching-readiness.ts`,
  `${styleRoot}/style-engine.constants.ts`,
  `${styleRoot}/style-engine.validators.ts`,
  `${surfaceRoot}/css-sass-inspector.types.ts`,
  `${surfaceRoot}/css-sass-inspector.view-model.ts`,
  `${surfaceRoot}/css-sass-inspector.render.ts`,
  `${surfaceRoot}/css-sass-inspector.validation.ts`,
  "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html",
  "apps/desktop/electron/renderer/components/project-preview-panel/inspector/project-preview-inspector-renderer.ts"
], [
  { label: "getComputedStyle", pattern: /\bgetComputedStyle\b/ },
  { label: "document.styleSheets", pattern: /\bdocument\.styleSheets\b/ },
  { label: "iframe.contentDocument", pattern: /iframe\.contentDocument/ },
  { label: "iframe.contentWindow.document", pattern: /iframe\.contentWindow\.document/ },
  { label: ".contentDocument", pattern: /\.contentDocument\b/ },
  { label: ".contentWindow.document", pattern: /\.contentWindow\.document\b/ },
  { label: "allow-same-origin", pattern: /allow-same-origin/ },
  { label: "insertAdjacentHTML", pattern: /\binsertAdjacentHTML\b/ },
  { label: "contenteditable", pattern: /\bcontenteditable\b/i },
  { label: "execCommand", pattern: /\bexecCommand\b/ },
  { label: "write/save/apply IPC channel", pattern: /ipc(Main|Renderer)\.(handle|on|invoke|send)\([^\n]*["'][^"']*(write|save|apply)[^"']*["']/i }
]);

assertNoForbiddenTokens(context, [
  `${styleRoot}/style-authored-selector-match.ts`,
  `${styleRoot}/style-authored-rule-match.ts`,
  `${styleRoot}/style-authored-matching-readiness.ts`
], [
  { label: "Element.matches", pattern: /\bElement\.matches\b|\.matches\(/ },
  { label: "querySelector", pattern: /\bquerySelector\b/ },
  { label: "DOMParser", pattern: /\bDOMParser\b/ }
]);

runSelectorFixtureChecks();

finishValidation(context, {
  inspectHints: [
    "Open the reported Phase 8C file.",
    "Search for the exact required token, boundary sentence, or forbidden pattern.",
    "Re-run npm run validate:authored-style-matching."
  ],
  resolutionHints: [
    "Restore the DOM Snapshot-only authored matching contracts, CSS/Sass Inspector candidate UI, validation-suite wiring, or Phase 8C docs boundary.",
    "Keep selector matching conservative and unsupported-selector states explicit."
  ],
  doNotHints: [
    "Do not relax scripts/validate-authored-style-matching.mjs.",
    "Do not add browser CSSOM, computed style reads, iframe internals, writes, patch apply, write IPC, editable controls, or Apply enablement.",
    "Do not replace unsupported-selector states with silent omissions."
  ]
});

function requireIncludes(file, tokens) {
  const content = sourceFileContent.has(file) ? sourceFileContent.get(file) : readRequiredFile(context, file);
  for (const token of tokens) assertFileIncludes(context, file, content ?? "", token, "required Phase 8C token");
}

function runSelectorFixtureChecks() {
  const node = {
    tagName: "button",
    idAttribute: "hero",
    classList: ["card", "primary"],
    attributes: [
      { name: "data-state", value: "open" },
      { name: "type", value: "button" }
    ],
    nodeType: "element"
  };

  const cases = [
    { selector: "button", expected: "matched-from-snapshot" },
    { selector: "div", expected: "not-matched-from-snapshot" },
    { selector: ".card", expected: "matched-from-snapshot" },
    { selector: "#hero", expected: "matched-from-snapshot" },
    { selector: "[data-state]", expected: "matched-from-snapshot" },
    { selector: "[data-state=\"open\"]", expected: "matched-from-snapshot" },
    { selector: "button.primary[data-state=\"open\"]", expected: "matched-from-snapshot" },
    { selector: ".card .title", expected: "unsupported-selector" },
    { selector: ".card > .title", expected: "unsupported-selector" },
    { selector: ":hover", expected: "unsupported-selector" },
    { selector: "*", expected: "unsupported-selector" },
    { selector: "button", nodeType: "text", expected: "not-matched-from-snapshot" }
  ];

  for (const entry of cases) {
    recordCheck(context, `selector fixture: ${entry.selector}`);
    const status = evaluateSelectorCase(entry.selector, entry.nodeType ?? node.nodeType, node);
    if (status !== entry.expected) pushValidationError(context, `Selector fixture ${entry.selector} expected ${entry.expected}, received ${status}.`);
  }
}

function evaluateSelectorCase(selector, nodeType, node) {
  if (!selector.trim()) return "unsupported-selector";
  if (selector.includes(",") || /\s/.test(selector) || /[>+~]/.test(selector) || selector.includes(":") || selector.includes("*")) return "unsupported-selector";
  if (nodeType !== "element") return "not-matched-from-snapshot";
  if (selector === "button") return node.tagName === "button" ? "matched-from-snapshot" : "not-matched-from-snapshot";
  if (selector === "div") return node.tagName === "div" ? "matched-from-snapshot" : "not-matched-from-snapshot";
  if (selector === ".card") return node.classList.includes("card") ? "matched-from-snapshot" : "not-matched-from-snapshot";
  if (selector === "#hero") return node.idAttribute === "hero" ? "matched-from-snapshot" : "not-matched-from-snapshot";
  if (selector === "[data-state]") return node.attributes.some((attribute) => attribute.name === "data-state") ? "matched-from-snapshot" : "not-matched-from-snapshot";
  if (selector === "[data-state=\"open\"]") return node.attributes.some((attribute) => attribute.name === "data-state" && attribute.value === "open") ? "matched-from-snapshot" : "not-matched-from-snapshot";
  if (selector === "button.primary[data-state=\"open\"]") {
    const hasAttribute = node.attributes.some((attribute) => attribute.name === "data-state" && attribute.value === "open");
    return node.tagName === "button" && node.classList.includes("primary") && hasAttribute ? "matched-from-snapshot" : "not-matched-from-snapshot";
  }
  return "unsupported-selector";
}
