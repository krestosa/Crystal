import type { ProjectScanResult } from "../../../../../../packages/core/project/graph/project-graph.types";
import type { ProjectGraphRefreshResult } from "../../../../../../packages/core/project/refresh/project-graph-refresh.types";
import type { ProjectWatcherState } from "../../../../../../packages/core/project/watching/project-watch.types";

interface ProjectGraphPanelElements {
  readonly status: HTMLElement;
  readonly fileCounts: HTMLElement;
  readonly pages: HTMLElement;
  readonly files: HTMLElement;
  readonly issues: HTMLElement;
  readonly watcherState: HTMLElement;
  readonly cacheState: HTMLElement;
  readonly lastRefresh: HTMLElement;
  readonly refreshMode: HTMLElement;
  readonly watchEvents: HTMLElement;
}

export function initializeProjectGraphPanel(): void {
  const panel = document.querySelector<HTMLElement>("[data-project-graph-panel]");
  if (!panel) return;
  ensureWatcherControls(panel);
  const elements = getProjectGraphPanelElements(panel);
  panel.querySelector("[data-project-open-folder]")?.addEventListener("click", () => void runProjectScanAction(elements, () => window.crystal.project.openFolder()));
  panel.querySelector("[data-project-open-html]")?.addEventListener("click", () => void runProjectScanAction(elements, () => window.crystal.project.openHtmlFile()));
  panel.querySelector("[data-project-refresh]")?.addEventListener("click", () => void runProjectRefreshAction(elements));
  panel.querySelector("[data-project-start-watcher]")?.addEventListener("click", () => void runWatcherAction(elements, () => window.crystal.project.startWatcher()));
  panel.querySelector("[data-project-stop-watcher]")?.addEventListener("click", () => void runWatcherAction(elements, () => window.crystal.project.stopWatcher()));
  panel.querySelector("[data-project-clear-cache]")?.addEventListener("click", () => void runWatcherAction(elements, () => window.crystal.project.clearCache()));
  void window.crystal.project.getWatcherState().then((state) => renderWatcherState(elements, state)).catch(() => undefined);
}

async function runProjectScanAction(elements: ProjectGraphPanelElements, action: () => Promise<ProjectScanResult | null>): Promise<void> {
  elements.status.textContent = "Scanning project...";
  try {
    const result = await action();
    if (!result) {
      elements.status.textContent = "Project selection cancelled.";
      return;
    }
    renderProjectScanResult(elements, result);
    renderWatcherState(elements, await window.crystal.project.getWatcherState());
  } catch (error) {
    elements.status.textContent = error instanceof Error ? error.message : String(error);
  }
}

async function runProjectRefreshAction(elements: ProjectGraphPanelElements): Promise<void> {
  elements.status.textContent = "Refreshing Project Graph...";
  try {
    const refresh = await window.crystal.project.refreshGraph();
    renderProjectRefreshResult(elements, refresh);
    renderWatcherState(elements, await window.crystal.project.getWatcherState());
  } catch (error) {
    elements.status.textContent = error instanceof Error ? error.message : String(error);
  }
}

async function runWatcherAction(elements: ProjectGraphPanelElements, action: () => Promise<ProjectWatcherState>): Promise<void> {
  try {
    renderWatcherState(elements, await action());
  } catch (error) {
    elements.status.textContent = error instanceof Error ? error.message : String(error);
  }
}

function renderProjectRefreshResult(elements: ProjectGraphPanelElements, refresh: ProjectGraphRefreshResult): void {
  renderProjectScanResult(elements, refresh.result);
  elements.lastRefresh.textContent = `Last refresh: ${formatTimestamp(refresh.refreshedAt)}`;
  elements.refreshMode.textContent = `Refresh mode: ${refresh.mode}`;
}

function renderProjectScanResult(elements: ProjectGraphPanelElements, result: ProjectScanResult): void {
  elements.status.textContent = `${result.graph.summary.totalFiles} files, ${result.graph.summary.totalPages} pages, ${result.graph.summary.missingDependencies} missing dependencies.`;
  renderCounts(elements.fileCounts, result.graph.summary.filesByKind);
  renderList(elements.pages, result.pages.map((page) => `${page.displayName}${page.isEntrypoint ? " · entry" : ""}`));
  renderList(elements.files, result.files.slice(0, 80).map((file) => `${file.relativePath} · ${file.kind}`));
  renderList(elements.issues, result.issues.map((issue) => issue.message));
}

function renderWatcherState(elements: ProjectGraphPanelElements, state: ProjectWatcherState): void {
  elements.watcherState.textContent = `Watcher: ${state.status}`;
  elements.cacheState.textContent = `Cache: ${state.cacheStatus}${state.cacheVersion ? ` · ${state.cacheVersion}` : ""}`;
  elements.lastRefresh.textContent = `Last refresh: ${state.lastRefreshAt ? formatTimestamp(state.lastRefreshAt) : "none"}`;
  elements.refreshMode.textContent = `Refresh mode: ${state.refreshMode}`;
  renderList(elements.watchEvents, state.recentWatchEvents.map((event) => `${event.type} · ${event.relativePath} · ${event.affectsProjectGraph ? "graph" : "ignored"}`));
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

function ensureWatcherControls(panel: HTMLElement): void {
  const actions = panel.querySelector<HTMLElement>(".crystal-project-graph-panel__actions");
  if (actions && !actions.querySelector("[data-project-start-watcher]")) {
    actions.append(createButton("Start Watcher", "project-start-watcher"), createButton("Stop Watcher", "project-stop-watcher"), createButton("Clear Cache", "project-clear-cache"));
  }
  ensureParagraph(panel, "data-project-watcher-state", "Watcher: idle");
  ensureParagraph(panel, "data-project-cache-state", "Cache: empty");
  ensureParagraph(panel, "data-project-last-refresh", "Last refresh: none");
  ensureParagraph(panel, "data-project-refresh-mode", "Refresh mode: none");
  if (!panel.querySelector("[data-project-watch-events]")) {
    const section = document.createElement("section");
    section.className = "crystal-project-graph-panel__section";
    const heading = document.createElement("h3");
    heading.className = "crystal-project-graph-panel__heading";
    heading.textContent = "Recent events";
    const list = document.createElement("ul");
    list.className = "crystal-project-graph-panel__list";
    list.setAttribute("data-project-watch-events", "");
    section.append(heading, list);
    panel.insertBefore(section, panel.querySelector("[data-project-file-counts]")?.closest("section") ?? null);
  }
}

function createButton(label: string, dataName: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "crystal-project-graph-panel__button";
  button.type = "button";
  button.textContent = label;
  button.setAttribute(`data-${dataName}`, "");
  return button;
}

function ensureParagraph(panel: HTMLElement, dataName: string, text: string): void {
  if (panel.querySelector(`[${dataName}]`)) return;
  const paragraph = document.createElement("p");
  paragraph.className = "crystal-project-graph-panel__meta";
  paragraph.setAttribute(dataName, "");
  paragraph.textContent = text;
  panel.insertBefore(paragraph, panel.querySelector("[data-project-file-counts]")?.closest("section") ?? null);
}

function getProjectGraphPanelElements(panel: HTMLElement): ProjectGraphPanelElements {
  return {
    status: queryPanelElement(panel, "[data-project-status]"),
    fileCounts: queryPanelElement(panel, "[data-project-file-counts]"),
    pages: queryPanelElement(panel, "[data-project-pages]"),
    files: queryPanelElement(panel, "[data-project-files]"),
    issues: queryPanelElement(panel, "[data-project-issues]"),
    watcherState: queryPanelElement(panel, "[data-project-watcher-state]"),
    cacheState: queryPanelElement(panel, "[data-project-cache-state]"),
    lastRefresh: queryPanelElement(panel, "[data-project-last-refresh]"),
    refreshMode: queryPanelElement(panel, "[data-project-refresh-mode]"),
    watchEvents: queryPanelElement(panel, "[data-project-watch-events]")
  };
}

function queryPanelElement(panel: HTMLElement, selector: string): HTMLElement {
  const element = panel.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing Project Graph panel element: ${selector}`);
  return element;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}
