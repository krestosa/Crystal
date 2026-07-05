import type { ProjectScanResult } from "../../../../../../packages/core/project/graph/project-graph.types";

interface ProjectGraphPanelElements {
  readonly status: HTMLElement;
  readonly fileCounts: HTMLElement;
  readonly pages: HTMLElement;
  readonly files: HTMLElement;
  readonly issues: HTMLElement;
}

export function initializeProjectGraphPanel(): void {
  const panel = document.querySelector<HTMLElement>("[data-project-graph-panel]");
  if (!panel) return;
  const elements = getProjectGraphPanelElements(panel);
  panel.querySelector("[data-project-open-folder]")?.addEventListener("click", () => void runProjectAction(elements, () => window.crystal.project.openFolder()));
  panel.querySelector("[data-project-open-html]")?.addEventListener("click", () => void runProjectAction(elements, () => window.crystal.project.openHtmlFile()));
  panel.querySelector("[data-project-refresh]")?.addEventListener("click", () => void runProjectAction(elements, () => window.crystal.project.scan()));
}

async function runProjectAction(elements: ProjectGraphPanelElements, action: () => Promise<ProjectScanResult | null>): Promise<void> {
  elements.status.textContent = "Scanning project...";
  try {
    const result = await action();
    if (!result) {
      elements.status.textContent = "Project selection cancelled.";
      return;
    }
    renderProjectScanResult(elements, result);
  } catch (error) {
    elements.status.textContent = error instanceof Error ? error.message : String(error);
  }
}

function renderProjectScanResult(elements: ProjectGraphPanelElements, result: ProjectScanResult): void {
  elements.status.textContent = `${result.graph.summary.totalFiles} files, ${result.graph.summary.totalPages} pages, ${result.graph.summary.missingDependencies} missing dependencies.`;
  renderCounts(elements.fileCounts, result.graph.summary.filesByKind);
  renderList(elements.pages, result.pages.map((page) => `${page.displayName}${page.isEntrypoint ? " · entry" : ""}`));
  renderList(elements.files, result.files.slice(0, 80).map((file) => `${file.relativePath} · ${file.kind}`));
  renderList(elements.issues, result.issues.map((issue) => issue.message));
}

function renderCounts(container: HTMLElement, counts: Readonly<Record<string, number>>): void {
  container.textContent = "";
  for (const [kind, count] of Object.entries(counts).filter(([, count]) => count > 0)) {
    const term = document.createElement("dt");
    term.textContent = kind;
    const definition = document.createElement("dd");
    definition.textContent = String(count);
    container.append(term, definition);
  }
}

function renderList(container: HTMLElement, items: readonly string[]): void {
  container.textContent = "";
  for (const item of items.length > 0 ? items : ["None"]) {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    container.append(listItem);
  }
}

function getProjectGraphPanelElements(panel: HTMLElement): ProjectGraphPanelElements {
  return {
    status: queryPanelElement(panel, "[data-project-status]"),
    fileCounts: queryPanelElement(panel, "[data-project-file-counts]"),
    pages: queryPanelElement(panel, "[data-project-pages]"),
    files: queryPanelElement(panel, "[data-project-files]"),
    issues: queryPanelElement(panel, "[data-project-issues]")
  };
}

function queryPanelElement(panel: HTMLElement, selector: string): HTMLElement {
  const element = panel.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing Project Graph panel element: ${selector}`);
  return element;
}
