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
  panelHtml: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.html",
  panelScss: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.scss",
  panelTs: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.ts",
  panelTypes: "apps/desktop/electron/renderer/components/html-element-library-panel/html-element-library-panel.types.ts",
  designHtml: "apps/desktop/electron/renderer/views/design/design.html",
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
const runtimeSource = [coreSource, commandSource, source.panelHtml, source.panelScss, source.panelTs, source.panelTypes, source.designHtml, source.mainScss, source.bootstrap, source.mainWindow, source.webPreferences].join("\n");
const uiPanelSource = [source.panelHtml, source.panelScss, source.panelTs, source.panelTypes].join("\n");

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
expect(source.commandValidators.includes("valid: false") && source.commandValidators.includes("not implemented"), "Command validator must block execution in this phase.");
expect(!commandSource.includes("fs") && !commandSource.includes("writeFile") && !commandSource.includes("appendFile"), "Command contracts must not write files.");

expect(source.panelHtml.includes("data-html-element-library-panel"), "Element Library panel markup is missing.");
expect(source.panelHtml.includes("Command foundation only"), "Element Library panel must expose disabled command foundation affordance.");
expect(source.panelTs.includes("createElement") && source.panelTs.includes("textContent") && source.panelTs.includes("replaceChildren"), "Panel controller must build dynamic catalog UI safely.");
expect(!source.panelTs.includes("innerHTML"), "Panel controller must not use innerHTML for dynamic content.");
expect(source.panelTs.includes("selectHtmlInsertionTargetEligibility"), "Panel does not render insertion target eligibility.");
expect(source.panelTs.includes("Patch preview not implemented"), "Panel does not show read-only patch preview placeholder.");
expect(source.panelScss.includes("crystal-html-element-library-panel") && source.panelScss.includes(":focus-visible"), "Panel styles or focus-visible state are missing.");
expect(source.designHtml.includes("html-element-library-panel/html-element-library-panel.html"), "Design mode does not include the Element Library panel.");
expect(source.mainScss.includes("html-element-library-panel/html-element-library-panel"), "Renderer SCSS does not include the Element Library panel styles.");
expect(source.bootstrap.includes("initializeHtmlElementLibraryPanel"), "Renderer bootstrap does not initialize the Element Library panel.");
expect(!source.panelTs.includes("aria-disabled", "true") && !source.panelTs.includes("aria-disabled\", \"true"), "Selectable Element Library item buttons must not use aria-disabled=true.");
expect(source.panelTs.includes("aria-pressed") && source.panelTs.includes("dataset.htmlElementLibraryCommandState"), "Selectable Element Library items must preserve selection state and command-foundation metadata.");
expect(source.panelHtml.includes("data-html-element-library-future-action") && source.panelHtml.includes("disabled"), "Future insertion action must remain disabled.");
expect(source.panelTs.includes("elements.futureAction.disabled = true"), "Panel controller must keep the future insertion action disabled.");

for (const forbiddenToken of forbiddenRuntimeTokens) {
  expect(!runtimeSource.includes(forbiddenToken), `Forbidden runtime token found: ${forbiddenToken}`);
}
for (const forbiddenToken of forbiddenRuntimeTokens) {
  expect(!uiPanelSource.includes(forbiddenToken), `Forbidden UI panel token found: ${forbiddenToken}`);
}

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
