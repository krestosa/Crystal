import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const tempDir = path.resolve(".tmp/validation/repository-graph-view");
const bundledCore = path.join(tempDir, "repository-graph-view.mjs");
const failures = [];

const paths = {
  core: "packages/core/project/repository-graph-view/index.ts",
  graphTypes: "packages/core/project/graph/project-graph.types.ts",
  scanner: "packages/core/project/scanning/project-scanner.ts",
  adapter: "packages/adapters/file-system/file-system.adapter.ts",
  html: "apps/desktop/electron/renderer/components/repository-graph-view/repository-graph-view.html",
  scss: "apps/desktop/electron/renderer/components/repository-graph-view/repository-graph-view.scss",
  view: "apps/desktop/electron/renderer/components/repository-graph-view/repository-graph-view.ts",
  render: "apps/desktop/electron/renderer/components/repository-graph-view/repository-graph-view.render.ts",
  interactions: "apps/desktop/electron/renderer/components/repository-graph-view/repository-graph-view.interactions.ts",
  state: "apps/desktop/electron/renderer/components/repository-graph-view/repository-graph-view.state.ts",
  types: "apps/desktop/electron/renderer/components/repository-graph-view/repository-graph-view.types.ts",
  bootstrap: "apps/desktop/electron/renderer/app/bootstrap/bootstrap.ts",
  workbench: "apps/desktop/electron/renderer/layout/workbench/workbench.html",
  topBar: "apps/desktop/electron/renderer/layout/top-bar/top-bar.html",
  tabs: "apps/desktop/electron/renderer/components/tabs/tabs.ts",
  mainScss: "apps/desktop/electron/renderer/main.scss",
  packageJson: "package.json",
  validationSuite: "scripts/validation/validation-suite.mjs",
  architectureDoc: "docs/architecture/repository-graph-view.md",
  roadmap: "docs/roadmap-implementation.md",
  validationDoc: "docs/architecture/validation-system.md"
};

const sources = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, filePath]) => [key, await readText(filePath)])));

try {
  await mkdir(tempDir, { recursive: true });
  await build({ entryPoints: [paths.core], bundle: true, platform: "node", format: "esm", outfile: bundledCore, logLevel: "silent" });
  const graphView = await import(`${pathToFileURL(bundledCore).href}?cache=${Date.now()}`);
  validateBehavior(graphView);
  validateStructure(sources);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("Repository Graph View validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Repository Graph View validation passed: portable deterministic model, real file metadata, internal resolved edges, canvas navigation, session drag, filtering, detail surface, renderer integration, and read-only security boundaries.");

function validateBehavior(graphView) {
  const files = [
    file("styles/main.css", "css", 200, 2000),
    file("README.md", "asset", 80, 1000),
    file("scripts/app.ts", "typescript", 300, 4000),
    file("index.html", "html", 120, 3000)
  ];
  const dependencies = [
    dependency("external", "index.html", null, "external", true, "https://example.com/library.js", "script"),
    dependency("cycle", "scripts/app.ts", "index.html", "resolved", false, "../index.html", "js-import"),
    dependency("missing", "index.html", "missing.css", "missing", false, "./missing.css", "stylesheet"),
    dependency("script", "index.html", "scripts/app.ts", "resolved", false, "./scripts/app.ts", "script"),
    dependency("unresolved", "index.html", null, "unresolved", false, "alias:theme", "unknown"),
    dependency("style", "index.html", "styles/main.css", "resolved", false, "./styles/main.css", "stylesheet")
  ];
  const graph = projectGraph(files, dependencies);
  const reversed = projectGraph([...files].reverse(), [...dependencies].reverse());
  const model = graphView.createRepositoryGraphViewModel(graph);
  const reversedModel = graphView.createRepositoryGraphViewModel(reversed);

  expect(model.nodes.length === files.length, "View model does not create exactly one node per file.");
  expect(model.nodes.some((node) => node.relativePath === "README.md" && node.incomingCount === 0 && node.outgoingCount === 0), "Isolated root file was not preserved.");
  expect(model.nodes.every((node) => node.id === graphView.createRepositoryGraphNodeId(node.relativePath)), "Node IDs are not stable path-derived IDs.");
  expect(JSON.stringify(model) === JSON.stringify(reversedModel), "View model depends on input array order.");
  expect(model.nodes.find((node) => node.relativePath === "index.html")?.modifiedAtMs === 3000, "File modification time was not preserved.");
  expect(model.edges.some((edge) => edge.fromNodeId === "file:index.html" && edge.toNodeId === "file:styles/main.css"), "Resolved internal dependency did not create an edge.");
  expect(!model.edges.some((edge) => edge.id.includes("missing")), "Missing dependency created an edge.");
  expect(!model.edges.some((edge) => edge.id.includes("external")), "External dependency created an edge.");
  expect(!model.edges.some((edge) => edge.id.includes("unresolved")), "Unresolved dependency created an edge.");
  expect(model.edges.length === 3, "Unexpected represented edge count.");
  const indexNode = model.nodes.find((node) => node.relativePath === "index.html");
  expect(indexNode?.incomingCount === 1 && indexNode.outgoingCount === 2, "Incoming/outgoing counters are incorrect.");
  expect(indexNode?.unresolvedCount === 2 && indexNode.externalCount === 1, "Unrepresented dependency counters are incorrect.");
  expect(model.edges.some((edge) => edge.fromNodeId === "file:scripts/app.ts" && edge.toNodeId === "file:index.html"), "Dependency cycles are not represented.");
  expect(noOverlaps(model.nodes), "Initial deterministic layout contains overlapping nodes.");
  expect(model.nodes.find((node) => node.relativePath === "README.md")?.directoryPath === ".", "Root files are not assigned to the root group.");

  const byName = graphView.filterRepositoryGraphView(model, filters({ query: "readme" }));
  expect(byName.nodes.length === 1 && byName.nodes[0].relativePath === "README.md", "Name search is not case-insensitive.");
  const byPath = graphView.filterRepositoryGraphView(model, filters({ query: "styles/" }));
  expect(byPath.nodes.length === 1 && byPath.nodes[0].relativePath === "styles/main.css", "Path search is not implemented.");
  const byKind = graphView.filterRepositoryGraphView(model, filters({ kind: "html" }));
  expect(byKind.nodes.length === 1 && byKind.nodes[0].kind === "html", "Kind filter is incorrect.");
  const connectedOnly = graphView.filterRepositoryGraphView(model, filters({ hideIsolated: true }));
  expect(!connectedOnly.nodes.some((node) => node.relativePath === "README.md"), "Isolated-node filter is incorrect.");
  const selectedEdges = graphView.filterRepositoryGraphView(model, filters({ edgeMode: "selected", selectedNodeId: "file:index.html" }));
  expect(selectedEdges.edges.length === 3, "Selected-edge mode does not retain all incident edges.");

  const reset = graphView.resetRepositoryGraphViewport();
  expect(reset.zoom === 1 && reset.panX === 0 && reset.panY === 0, "Reset viewport is incorrect.");
  const panned = graphView.panRepositoryGraphViewport(reset, 30, -10);
  expect(panned.panX === 30 && panned.panY === -10, "Pan viewport is incorrect.");
  const zoomed = graphView.zoomRepositoryGraphViewportAtPoint(reset, { x: 100, y: 100 }, 2);
  expect(zoomed.zoom === 2 && zoomed.panX === -100 && zoomed.panY === -100, "Pointer-centered zoom is incorrect.");
  const fit = graphView.fitRepositoryGraphViewport(model.bounds, { width: 900, height: 600 });
  expect(fit.zoom >= graphView.REPOSITORY_GRAPH_MIN_ZOOM && fit.zoom <= graphView.REPOSITORY_GRAPH_MAX_ZOOM, "Fit viewport is outside zoom limits.");
  const centered = graphView.centerRepositoryGraphNode({ width: 900, height: 600 }, model.nodes[0], 1);
  expect(Number.isFinite(centered.panX) && Number.isFinite(centered.panY), "Center-selection viewport is invalid.");
}

function validateStructure(source) {
  expect(source.graphTypes.includes("modifiedAtMs: number"), "ProjectFile does not expose modifiedAtMs.");
  expect(source.adapter.includes("modifiedAtMs: entryStats.mtimeMs"), "Filesystem adapter does not use stat.mtimeMs.");
  expect(source.scanner.includes("modifiedAtMs: entry.modifiedAtMs"), "Scanner does not propagate modifiedAtMs.");
  expect(source.topBar.includes('data-crystal-view-tab="graph"') && source.topBar.includes("Graph View"), "Graph View navigation entry is missing.");
  expect(source.tabs.includes('"design" | "graph" | "inspector" | "developer"'), "Graph View is not included in the typed view navigation.");
  expect(source.workbench.includes("repository-graph-view/repository-graph-view.html"), "Graph View is not mounted in the workbench.");
  expect(source.bootstrap.includes("initializeRepositoryGraphView"), "Graph View is not initialized by renderer bootstrap.");
  expect(source.mainScss.includes("repository-graph-view/repository-graph-view"), "Graph View Sass is not included in the renderer bundle.");
  expect(source.html.includes("<svg") && source.html.includes("data-repository-graph-edges"), "SVG edge layer is missing.");
  expect(source.html.includes("data-repository-graph-fit") && source.html.includes("data-repository-graph-reset") && source.html.includes("data-repository-graph-center-selection"), "Fit, Reset, or Center selection control is missing.");
  expect(source.scss.includes("&__node") && source.scss.includes("position: absolute"), "Rectangular positioned node styling is missing.");
  expect(source.interactions.includes("setPointerCapture") && source.interactions.includes("releasePointerCapture"), "Pointer capture lifecycle is missing.");
  expect(source.interactions.includes('"pointercancel"') && source.interactions.includes("/ state.viewport.zoom"), "Zoom-compensated node drag or pointer cancellation is missing.");
  expect(source.interactions.includes("zoomRepositoryGraphViewportAtPoint") && source.interactions.includes("panRepositoryGraphViewport"), "Pan or pointer-centered zoom interaction is missing.");
  expect(source.render.includes("textContent") && !source.render.includes("innerHTML"), "Project metadata is not rendered exclusively through textContent.");
  expect(source.render.includes("Connected files") && source.render.includes("data.repositoryGraphNeighborId"), "Read-only detail neighbors are missing.");
  expect(source.state.includes("positions: new Map()"), "Session-local node position state is missing.");

  const runtimeSource = [source.core, source.view, source.render, source.interactions, source.state, source.types, source.html].join("\n");
  for (const forbidden of ["localStorage", "contentDocument", "contentWindow.document", "allow-same-origin", "contenteditable", "nodeIntegration", "writeFile", "appendFile", "unlink(", "ipcRenderer", "node:fs"]) {
    expect(!runtimeSource.includes(forbidden), `Repository Graph View introduced forbidden token: ${forbidden}`);
  }
  for (const dependency of ["d3", "cytoscape", "sigma", "react-flow", "dagre", "elk", "force-graph", "vis-network"]) {
    expect(!source.packageJson.toLowerCase().includes(`\"${dependency}\"`), `Forbidden graph dependency is declared: ${dependency}`);
  }
  expect(source.packageJson.includes('"validate:repository-graph-view": "node scripts/validate-repository-graph-view.mjs"'), "Package script for Repository Graph View validation is missing.");
  expect(source.validationSuite.includes('entry("repository-graph-view", "Repository Graph View"'), "Validation catalog entry is missing.");
  expect(source.validationDoc.includes("Canonical checks: 34") && source.roadmap.includes("34 required checks"), "Generated validation metadata was not synchronized to 34 checks.");
  expect(source.architectureDoc.includes("read-only") && source.architectureDoc.includes("Project Graph"), "Repository Graph View architecture document is incomplete.");
}

function projectGraph(files, dependencies) {
  const filesByKind = { html: 0, css: 0, sass: 0, javascript: 0, typescript: 0, image: 0, svg: 0, font: 0, video: 0, audio: 0, asset: 0, unknown: 0 };
  for (const item of files) filesByKind[item.kind] += 1;
  return {
    root: "/project",
    files,
    pages: [],
    assets: [],
    dependencies,
    issues: [],
    summary: { totalFiles: files.length, totalPages: 0, totalAssets: 0, totalDependencies: dependencies.length, missingDependencies: dependencies.filter((item) => item.status === "missing").length, filesByKind },
    createdAt: 1,
    updatedAt: 1
  };
}

function file(relativePath, kind, sizeBytes, modifiedAtMs) {
  const name = relativePath.split("/").at(-1);
  const extensionIndex = name.lastIndexOf(".");
  return { absolutePath: `/project/${relativePath}`, relativePath, name, extension: extensionIndex === -1 ? "" : name.slice(extensionIndex), kind, sizeBytes, modifiedAtMs, isText: true, isBinaryHeavy: false, discoveredAt: 10 };
}

function dependency(id, fromPath, resolvedPath, status, isExternal, rawSpecifier, type) {
  return { id, type, fromPath, fromAbsolutePath: `/project/${fromPath}`, rawSpecifier, source: "html", line: 1, normalizedSpecifier: rawSpecifier, resolvedPath, resolvedAbsolutePath: resolvedPath ? `/project/${resolvedPath}` : null, status, isExternal };
}

function filters(overrides = {}) {
  return { query: "", kind: "all", hideIsolated: false, edgeMode: "all", selectedNodeId: null, ...overrides };
}

function noOverlaps(nodes) {
  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex];
      const right = nodes[rightIndex];
      const separated = left.x + left.width <= right.x || right.x + right.width <= left.x || left.y + left.height <= right.y || right.y + right.height <= left.y;
      if (!separated) return false;
    }
  }
  return true;
}

async function readText(filePath) {
  return readFile(path.resolve(filePath), "utf8");
}

function expect(ok, message) {
  if (!ok) failures.push(message);
}
