import { readFile } from "node:fs/promises";

const failures = [];

const paths = {
  packageJson: "package.json",
  libraryIndex: "packages/core/project/html-element-library/index.ts",
  libraryTypes: "packages/core/project/html-element-library/html-element-library.types.ts",
  libraryConstants: "packages/core/project/html-element-library/html-element-library.constants.ts",
  libraryCatalog: "packages/core/project/html-element-library/html-element-library.catalog.ts",
  librarySelectors: "packages/core/project/html-element-library/html-element-library.selectors.ts",
  libraryValidators: "packages/core/project/html-element-library/html-element-library.validators.ts",
  insertionTargetTypes: "packages/core/project/html-element-library/insertion-target.types.ts",
  insertionTargetSelectors: "packages/core/project/html-element-library/insertion-target.selectors.ts",
  commandIndex: "packages/core/commands/html-insertion/index.ts",
  commandTypes: "packages/core/commands/html-insertion/html-insertion-command.types.ts",
  commandConstants: "packages/core/commands/html-insertion/html-insertion-command.constants.ts",
  commandValidators: "packages/core/commands/html-insertion/html-insertion-command.validators.ts",
  commandBlockers: "packages/core/commands/html-insertion/html-insertion-command.blockers.ts",
  shellPanelHeaderHtml: "apps/desktop/electron/renderer/components/shell-ui/panel-header/panel-header.html",
  shellPanelHeaderScss: "apps/desktop/electron/renderer/components/shell-ui/panel-header/panel-header.scss",
  shellPanelHeaderTypes: "apps/desktop/electron/renderer/components/shell-ui/panel-header/panel-header.types.ts",
  shellPanelSectionHtml: "apps/desktop/electron/renderer/components/shell-ui/panel-section/panel-section.html",
  shellPanelSectionScss: "apps/desktop/electron/renderer/components/shell-ui/panel-section/panel-section.scss",
  shellPanelSectionTypes: "apps/desktop/electron/renderer/components/shell-ui/panel-section/panel-section.types.ts",
  shellMetadataRowTs: "apps/desktop/electron/renderer/components/shell-ui/metadata-row/metadata-row.ts",
  shellMetadataRowTypes: "apps/desktop/electron/renderer/components/shell-ui/metadata-row/metadata-row.types.ts",
  shellMetadataRowScss: "apps/desktop/electron/renderer/components/shell-ui/metadata-row/metadata-row.scss",
  shellEmptyStateTs: "apps/desktop/electron/renderer/components/shell-ui/empty-state/empty-state.ts",
  shellEmptyStateTypes: "apps/desktop/electron/renderer/components/shell-ui/empty-state/empty-state.types.ts",
  shellEmptyStateScss: "apps/desktop/electron/renderer/components/shell-ui/empty-state/empty-state.scss",
  shellCompactControlScss: "apps/desktop/electron/renderer/components/shell-ui/compact-control/compact-control.scss",
  shellStatusBadgeScss: "apps/desktop/electron/renderer/components/shell-ui/status-badge/status-badge.scss",
  shellScrollRegionScss: "apps/desktop/electron/renderer/components/shell-ui/scroll-region/scroll-region.scss",
  shellSidebarStackScss: "apps/desktop/electron/renderer/components/shell-ui/sidebar-stack/sidebar-stack.scss",
  panelHtml: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.html",
  panelScss: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.scss",
  panelTs: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.ts",
  panelTypes: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.types.ts",
  panelConstants: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.constants.ts",
  panelState: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.state.ts",
  panelDom: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.dom.ts",
  panelEvents: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.events.ts",
  rendererCategoryTabs: "apps/desktop/electron/renderer/components/html-element-library-panel/renderers/category-tabs.renderer.ts",
  rendererItemList: "apps/desktop/electron/renderer/components/html-element-library-panel/renderers/item-list.renderer.ts",
  rendererItemDetails: "apps/desktop/electron/renderer/components/html-element-library-panel/renderers/item-details.renderer.ts",
  rendererTargetStatus: "apps/desktop/electron/renderer/components/html-element-library-panel/renderers/target-status.renderer.ts",
  rendererCommandPreview: "apps/desktop/electron/renderer/components/html-element-library-panel/renderers/command-preview.renderer.ts",
  graphHtml: "apps/desktop/electron/renderer/components/project-graph-panel/project-graph-panel.html",
  graphScss: "apps/desktop/electron/renderer/components/project-graph-panel/project-graph-panel.scss",
  previewHtml: "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.html",
  previewScss: "apps/desktop/electron/renderer/components/project-preview-panel/project-preview-panel.scss",
  domTreeHtml: "apps/desktop/electron/renderer/components/project-dom-tree-panel/project-dom-tree-panel.html",
  domTreeScss: "apps/desktop/electron/renderer/components/project-dom-tree-panel/project-dom-tree-panel.scss",
  designHtml: "apps/desktop/electron/renderer/views/design/design.html",
  designScss: "apps/desktop/electron/renderer/views/design/design.scss",
  mainScss: "apps/desktop/electron/renderer/main.scss",
  bootstrap: "apps/desktop/electron/renderer/app/bootstrap/bootstrap.ts",
  mainWindow: "apps/desktop/electron/main/windows/create-main-window.ts",
  webPreferences: "apps/desktop/electron/main/security/web-preferences.ts",
  validateLocal: "scripts/validate-local.mjs"
};

const source = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, filePath]) => [key, await readText(filePath)])));
const packageData = parsePackageJson(source.packageJson);
const mandatoryCategories = ["structure", "text", "media", "forms", "lists-and-tables", "interaction", "semantic-accessibility", "presets"];
const mandatoryItemIds = [
  "div", "section", "article", "main", "header", "footer", "aside", "nav",
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "blockquote", "code", "pre", "strong", "em", "small",
  "img", "picture", "source", "video", "audio", "svg", "canvas",
  "form", "label", "input", "textarea", "select", "option", "button", "fieldset", "legend",
  "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td",
  "details", "summary", "dialog",
  "landmark-nav", "landmark-main", "landmark-aside", "accessible-button", "labelled-input",
  "hero-section", "card", "navbar", "footer-preset", "product-grid", "modal", "form-group", "cta-block", "gallery", "menu-section"
];
const forbiddenRuntimeTokens = ["contenteditable", "insertAdjacentHTML", "iframe.contentDocument", "iframe.contentWindow.document", ".contentDocument", ".contentWindow.document", "localStorage", "execCommand", "allow-same-origin"];
const coreSource = [source.libraryTypes, source.libraryConstants, source.libraryCatalog, source.librarySelectors, source.libraryValidators, source.insertionTargetTypes, source.insertionTargetSelectors].join("\n");
const commandSource = [source.commandTypes, source.commandConstants, source.commandValidators, source.commandBlockers].join("\n");
const shellUiSource = [
  source.shellPanelHeaderHtml,
  source.shellPanelHeaderScss,
  source.shellPanelHeaderTypes,
  source.shellPanelSectionHtml,
  source.shellPanelSectionScss,
  source.shellPanelSectionTypes,
  source.shellMetadataRowTs,
  source.shellMetadataRowTypes,
  source.shellMetadataRowScss,
  source.shellEmptyStateTs,
  source.shellEmptyStateTypes,
  source.shellEmptyStateScss,
  source.shellCompactControlScss,
  source.shellStatusBadgeScss,
  source.shellScrollRegionScss,
  source.shellSidebarStackScss
].join("\n");
const panelRendererSource = [source.rendererCategoryTabs, source.rendererItemList, source.rendererItemDetails, source.rendererTargetStatus, source.rendererCommandPreview].join("\n");
const panelSource = [source.panelHtml, source.panelScss, source.panelTs, source.panelTypes, source.panelConstants, source.panelState, source.panelDom, source.panelEvents, panelRendererSource].join("\n");
const shellIntegrationSource = [source.graphHtml, source.graphScss, source.previewHtml, source.previewScss, source.domTreeHtml, source.domTreeScss, source.designHtml, source.designScss, source.mainScss, source.bootstrap].join("\n");
const runtimeSource = [coreSource, commandSource, shellUiSource, panelSource, shellIntegrationSource, source.mainWindow, source.webPreferences].join("\n");

expect(packageData.scripts?.["validate:html-element-library"] === "node scripts/validate-html-element-library.mjs", "package.json does not expose validate:html-element-library.");
expect(packageData.scripts?.["validate:local"]?.includes("validate:html-element-library"), "validate:local does not include validate:html-element-library.");
expect(packageData.scripts?.["validate:local:quick:ui"]?.includes("validate:html-element-library"), "validate:local:quick:ui does not include validate:html-element-library.");
expect(packageData.scripts?.["validate:local:quick"], "validate:local:quick script is missing.");
expect(packageData.scripts?.["validate:local:quick:core"], "validate:local:quick:core script is missing.");
expect(packageData.scripts?.["validate:local:quick:preview"], "validate:local:quick:preview script is missing.");
expect(packageData.scripts?.["validate:local:quick:ui"], "validate:local:quick:ui script is missing.");

expectIsBarrel(source.libraryIndex, "html-element-library index.ts");
expect(source.libraryIndex.includes("html-element-library.catalog"), "HTML Element Library barrel does not export catalog.");
expect(source.libraryIndex.includes("html-element-library.constants"), "HTML Element Library barrel does not export constants.");
expect(source.libraryIndex.includes("html-element-library.selectors"), "HTML Element Library barrel does not export selectors.");
expect(source.libraryIndex.includes("html-element-library.types"), "HTML Element Library barrel does not export types.");
expect(source.libraryIndex.includes("html-element-library.validators"), "HTML Element Library barrel does not export validators.");
expect(source.libraryIndex.includes("insertion-target.selectors"), "HTML Element Library barrel does not export insertion target selectors.");
expect(source.libraryIndex.includes("insertion-target.types"), "HTML Element Library barrel does not export insertion target types.");

expect(source.libraryTypes.includes("HtmlElementLibraryItem") && source.libraryTypes.includes("HtmlElementInsertionMode"), "HTML Element Library types are not isolated.");
expect(source.libraryConstants.includes("HTML_ELEMENT_LIBRARY_CATEGORIES") && source.libraryConstants.includes("HTML_ELEMENT_VOID_TAG_NAMES"), "HTML Element Library constants are not isolated.");
expect(source.libraryCatalog.includes("HTML_ELEMENT_LIBRARY_CATALOG"), "HTML Element Library catalog is missing.");
expect(source.librarySelectors.includes("getHtmlElementLibraryCategories") && source.librarySelectors.includes("findHtmlElementLibraryItem"), "HTML Element Library selectors are missing.");
expect(source.libraryValidators.includes("validateHtmlElementLibraryCatalog"), "HTML Element Library validator is missing.");
expect(source.insertionTargetTypes.includes("HtmlInsertionTargetEligibility"), "Insertion target eligibility types are missing.");
expect(source.insertionTargetSelectors.includes("selectHtmlInsertionTargetEligibility") && source.insertionTargetSelectors.includes("findDomSnapshotNodeByPath"), "Insertion target selectors are missing.");
expect(!coreSource.includes("DOMParser") && !coreSource.includes("document.createElement"), "Core HTML Element Library must stay renderer-independent and avoid DOM construction.");

for (const category of mandatoryCategories) {
  expect(source.libraryConstants.includes(`id: "${category}"`), `Missing mandatory category: ${category}`);
}

const itemIds = readItemIds(source.libraryCatalog);
const uniqueItemIds = new Set(itemIds);
expect(itemIds.length >= mandatoryItemIds.length, `Catalog has too few items: ${itemIds.length}.`);
expect(itemIds.length === uniqueItemIds.size, "Catalog item IDs must be unique.");
for (const itemId of mandatoryItemIds) {
  expect(uniqueItemIds.has(itemId), `Missing mandatory catalog item: ${itemId}`);
}

for (const requiredField of ["readonly id: string", "readonly label: string", "readonly category", "readonly kind", "readonly description", "readonly allowedInsertionModes", "readonly isImplemented: false"]) {
  expect(source.libraryTypes.includes(requiredField), `Catalog item metadata field is missing from types: ${requiredField}`);
}
expect(!coreSource.includes("isImplemented: true"), "No catalog item may be implemented in this foundation phase.");
expect(countToken(source.libraryCatalog, "isImplemented: false") >= 1, "Catalog does not enforce read-only item implementation state.");

for (const state of ["none", "no-project", "no-preview-target", "no-selection", "missing-snapshot", "stale-snapshot", "mismatched-selection", "ambiguous-selection", "matched-target", "unsupported-target"]) {
  expect(source.insertionTargetTypes.includes(`| "${state}"`) || source.insertionTargetSelectors.includes(`state: "${state}"`), `Insertion target state missing: ${state}`);
}
for (const targetField of ["targetTagName", "targetSnapshotPath", "targetFilePath", "canInsertBefore", "canInsertAfter", "canInsertInside", "reason"]) {
  expect(source.insertionTargetTypes.includes(targetField) || source.insertionTargetSelectors.includes(targetField), `Matched target metadata field missing: ${targetField}`);
}

expectIsBarrel(source.commandIndex, "html-insertion index.ts");
expect(source.commandIndex.includes("html-insertion-command.blockers"), "HTML insertion barrel does not export blockers.");
expect(source.commandIndex.includes("html-insertion-command.constants"), "HTML insertion barrel does not export constants.");
expect(source.commandIndex.includes("html-insertion-command.types"), "HTML insertion barrel does not export types.");
expect(source.commandIndex.includes("html-insertion-command.validators"), "HTML insertion barrel does not export validators.");
expect(source.commandTypes.includes("AddHtmlElementCommand"), "AddHtmlElementCommand contract is missing.");
for (const commandField of ["commandId", "kind", "elementId", "targetFilePath", "targetSnapshotPath", "insertionMode", "requestedAt", "source"]) {
  expect(source.commandTypes.includes(commandField), `AddHtmlElementCommand payload field missing: ${commandField}`);
}
for (const commandConstant of ["ADD_HTML_ELEMENT_COMMAND_KIND", "HTML_ELEMENT_LIBRARY_COMMAND_SOURCE", "HTML_INSERTION_NOT_IMPLEMENTED_REASON"]) {
  expect(source.commandConstants.includes(commandConstant), `HTML insertion command constant missing: ${commandConstant}`);
}
expect(source.commandValidators.includes("validateAddHtmlElementCommand"), "HTML insertion command validator is missing.");
expect(source.commandBlockers.includes("createHtmlInsertionExecutionBlocker") && source.commandBlockers.includes("assertHtmlInsertionExecutionBlocked"), "HTML insertion blockers are missing.");
expect(source.commandValidators.includes("valid: false") && commandSource.includes("not implemented"), "Command validator must block execution in this phase.");
expect(!commandSource.includes("fs") && !commandSource.includes("writeFile") && !commandSource.includes("appendFile"), "Command contracts must not write files.");

expect(source.mainScss.includes("components/shell-ui/panel-section/panel-section"), "Shell panel-section primitive is not imported.");
expect(source.mainScss.includes("components/shell-ui/panel-header/panel-header"), "Shell panel-header primitive is not imported.");
expect(source.mainScss.includes("components/shell-ui/metadata-row/metadata-row"), "Shell metadata-row primitive is not imported.");
expect(source.mainScss.includes("components/shell-ui/empty-state/empty-state"), "Shell empty-state primitive is not imported.");
expect(source.mainScss.includes("components/shell-ui/compact-control/compact-control"), "Shell compact-control primitive is not imported.");
expect(source.mainScss.includes("components/shell-ui/status-badge/status-badge"), "Shell status-badge primitive is not imported.");
expect(source.mainScss.includes("components/shell-ui/scroll-region/scroll-region"), "Shell scroll-region primitive is not imported.");
expect(source.mainScss.includes("components/shell-ui/sidebar-stack/sidebar-stack"), "Shell sidebar-stack primitive is not imported.");
expect(source.shellPanelHeaderScss.includes("crystal-shell-panel-header") && source.shellPanelSectionScss.includes("crystal-shell-panel-stack"), "Shell panel/header primitives are incomplete.");
expect(source.shellMetadataRowTs.includes("createShellMetadataRow") && source.shellMetadataRowTs.includes("textContent") && source.shellMetadataRowTs.includes("replaceChildren"), "Shell metadata row helper is missing or unsafe.");
expect(source.shellEmptyStateTs.includes("createShellEmptyState") && source.shellEmptyStateTs.includes("textContent"), "Shell empty state helper is missing or unsafe.");
expect(source.shellCompactControlScss.includes("crystal-shell-compact-button") && source.shellCompactControlScss.includes(":focus-visible"), "Shell compact control primitive is incomplete.");
expect(source.shellStatusBadgeScss.includes("crystal-shell-status-badge"), "Shell status badge primitive is missing.");
expect(source.shellScrollRegionScss.includes("min-height: 0") && source.shellScrollRegionScss.includes("overflow: auto") && source.shellScrollRegionScss.includes("scrollbar-gutter: stable"), "Shell scroll region primitive must contain scroll safely.");
expect(source.shellSidebarStackScss.includes("crystal-shell-panel-stack__tool") && source.shellSidebarStackScss.includes("crystal-shell-panel-stack__main") && source.shellSidebarStackScss.includes("crystal-shell-panel-stack__secondary"), "Shell sidebar stack slots are missing.");

expect(source.panelHtml.includes("data-html-element-library-panel"), "Element Library panel markup is missing.");
expect(source.panelHtml.includes("crystal-shell-panel") && source.panelHtml.includes("crystal-shell-panel-header") && source.panelHtml.includes("crystal-shell-scroll-region"), "Element Library does not use shell UI primitives.");
expect(source.panelHtml.includes("Element Library"), "Element Library title is missing.");
expect(!source.panelHtml.includes("Grouped by intent") && !source.panelHtml.includes("Metadata only") && !source.panelHtml.includes("Selection eligibility"), "Element Library UI still exposes verbose documentation labels.");
expect(source.panelHtml.includes("data-html-element-library-category-tabs"), "Compact category controls are missing.");
expect(source.panelHtml.includes("data-html-element-library-item-list"), "Active category item list is missing.");
expect(!source.panelHtml.includes("data-html-element-library-categories"), "Panel must not render the full expanded category tree container.");
expect(source.panelHtml.includes("data-html-element-library-future-action") && source.panelHtml.includes("disabled"), "Future insertion action must remain disabled.");
expect(!panelSource.includes("innerHTML"), "Element Library panel must not use innerHTML.");
expect(!panelSource.includes("insertAdjacentHTML"), "Element Library panel must not use insertAdjacentHTML.");
expect(!panelSource.includes("aria-disabled"), "Selectable Element Library item buttons must not use aria-disabled.");
expect(source.panelTs.includes("renderHtmlElementLibraryCategoryTabs") && source.panelTs.includes("renderHtmlElementLibraryItemList"), "Panel controller must orchestrate modular renderers.");
expect(countToken(source.panelTs, "document.createElement") === 0, "Panel controller must not construct all DOM blocks directly.");
expect(!source.panelTs.includes("createCatalogItemButton") && !source.panelTs.includes("renderCatalog("), "Panel controller still looks monolithic.");
expect(source.panelState.includes("HtmlElementLibraryPanelRuntimeState") && source.panelState.includes("activeCategory"), "Panel local state is not isolated or typed.");
expect(source.panelEvents.includes("bindHtmlElementLibraryPanelEvents"), "Panel event binding is not isolated.");
expect(source.panelDom.includes("getHtmlElementLibraryPanelElements"), "Panel DOM queries are not isolated.");
expect(source.rendererCategoryTabs.includes("role") && source.rendererCategoryTabs.includes("tab"), "Category tabs renderer is missing tab semantics.");
expect(source.rendererItemList.includes("aria-pressed") && source.rendererItemList.includes("dataset.htmlElementLibraryCommandState"), "Item list renderer must keep selectable read-only item semantics.");
expect(source.rendererItemDetails.includes("createShellMetadataRow") && source.rendererItemDetails.includes("selectedPanel") && source.rendererItemDetails.includes("selectedEmpty"), "Item details renderer must use metadata primitive and render metadata conditionally.");
expect(source.rendererTargetStatus.includes("Target:") && source.rendererTargetStatus.includes("renderHtmlElementLibraryModes"), "Target status renderer must be compact.");
expect(source.rendererCommandPreview.includes("futureAction.disabled = true") && source.rendererCommandPreview.includes("futureAction.hidden"), "Command preview must keep future command disabled and compact.");
expect(!panelSource.includes("html-element-library-control-blocks.renderer"), "Local control-block renderer should be replaced by shell-ui primitives.");

expect(source.panelScss.includes("max-height: clamp"), "Element Library CSS must cap panel height.");
expect(source.panelScss.includes("grid-template-rows") && source.panelScss.includes("minmax(42px, 1fr)"), "Element Library body must use contained grid rows.");
expect(source.panelScss.includes("crystal-html-element-library-panel__item-list"), "Element Library item list styles are missing.");
expect(source.panelScss.includes(":hidden") || source.panelScss.includes("[hidden]"), "Element Library must hide conditional blocks safely.");
expect(!source.panelScss.includes("__section-header") && !source.panelScss.includes("__category-title"), "Old nested card/category styles should not remain.");
expect(countToken(source.panelScss, "border: 1px solid") === 0, "Element Library SCSS should not reintroduce boxed nesting; use shell primitives.");

expect(source.previewHtml.includes("crystal-shell-panel-stack__main"), "Preview Inspector panel is not assigned to the sidebar main slot.");
expect(source.domTreeHtml.includes("crystal-shell-panel-stack__secondary"), "DOM Snapshot panel is not assigned to the sidebar secondary slot.");
expect(source.graphHtml.includes("crystal-shell-compact-button") && source.domTreeHtml.includes("crystal-shell-compact-button") && source.previewHtml.includes("crystal-shell-compact-button"), "Touched shell controls do not use compact button primitive.");
expect(source.graphHtml.includes("crystal-shell-section") && source.graphHtml.includes("crystal-shell-scroll-region"), "Project Graph panel does not adopt reusable section/scroll primitives.");
expect(source.previewHtml.includes("crystal-shell-metadata") && source.domTreeHtml.includes("crystal-shell-panel-stack__secondary"), "Preview/DOM panels do not expose shared metadata/sidebar primitives.");
expect(source.shellSidebarStackScss.includes("overflow: hidden") && source.shellSidebarStackScss.includes("overflow: auto"), "Right sidebar stack must avoid parent scrolling and preserve child scroll regions.");
expect(source.shellSidebarStackScss.includes("flex: 1 1 auto") && source.shellSidebarStackScss.includes("clamp(86px, 20vh, 180px)"), "Right sidebar slots must reserve main Inspector space and cap secondary panels.");

expect(source.designHtml.includes("html-element-library-panel/html-element-library-panel.html"), "Design mode does not include the Element Library panel.");
expect(source.mainScss.includes("html-element-library-panel/html-element-library-panel"), "Renderer SCSS does not include the Element Library panel styles.");
expect(source.bootstrap.includes("initializeHtmlElementLibraryPanel"), "Renderer bootstrap does not initialize the Element Library panel.");

for (const forbiddenToken of forbiddenRuntimeTokens) {
  expect(!runtimeSource.includes(forbiddenToken), `Forbidden runtime token found: ${forbiddenToken}`);
}
expect(!runtimeSource.includes("writeFile") && !runtimeSource.includes("appendFile") && !runtimeSource.includes("mkdir") && !runtimeSource.includes("unlink"), "Runtime source must not add file-writing primitives.");

expect(!source.mainWindow.includes("openDevTools"), "DevTools must not open automatically from the main window.");
expect(source.mainWindow.includes("webPreferences: getSecureWebPreferences()"), "Main window security preferences must remain centralized.");
expect(source.webPreferences.includes("contextIsolation: true"), "contextIsolation must remain enabled.");
expect(source.webPreferences.includes("nodeIntegration: false"), "nodeIntegration must remain disabled.");
expect(source.webPreferences.includes("sandbox: true"), "Renderer sandbox must remain enabled.");
expect(!source.webPreferences.includes("allow-same-origin"), "Sandbox must not be relaxed with allow-same-origin.");

expect(!packageData.dependencies, "No runtime dependencies should be added for this phase.");
expectSameKeys(packageData.devDependencies ?? {}, ["@types/node", "electron", "esbuild", "sass", "typescript"], "devDependencies changed unexpectedly.");

if (failures.length > 0) {
  console.error("HTML Element Library foundation validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`HTML Element Library foundation validation passed. Catalog items: ${itemIds.length}.`);

async function readText(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    failures.push(`Missing or unreadable file: ${filePath}`);
    return "";
  }
}

function parsePackageJson(sourceText) {
  try {
    return JSON.parse(sourceText);
  } catch {
    failures.push("package.json is not valid JSON.");
    return {};
  }
}

function readItemIds(sourceText) {
  return [...sourceText.matchAll(/item\("([^"]+)"/g)].map((match) => match[1]);
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function countToken(sourceText, token) {
  return sourceText.split(token).length - 1;
}

function expectSameKeys(record, expectedKeys, message) {
  const actual = Object.keys(record).sort();
  const expected = [...expectedKeys].sort();
  expect(actual.length === expected.length && actual.every((key, index) => key === expected[index]), message);
}

function expectIsBarrel(sourceText, label) {
  const implementationTokens = ["function ", "const ", "let ", "interface ", "type ", "class "];
  expect(sourceText.trim().split("\n").every((line) => line.trim().startsWith("export * from") || line.trim() === ""), `${label} must be a barrel export only.`);
  for (const token of implementationTokens) {
    expect(!sourceText.includes(token), `${label} contains implementation token: ${token.trim()}`);
  }
}
