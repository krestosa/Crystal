import type { ProjectScanResult } from "../../../../../../packages/core/project/graph/project-graph.types";
import type { ProjectGraphRefreshResult } from "../../../../../../packages/core/project/refresh/project-graph-refresh.types";
import type { ProjectFileWatchEvent, ProjectWatcherState } from "../../../../../../packages/core/project/watching/project-watch.types";

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

interface CoalescedWatchEvent {
  readonly type: ProjectFileWatchEvent["type"];
  readonly relativePath: ProjectFileWatchEvent["relativePath"];
  readonly affectsProjectGraph: ProjectFileWatchEvent["affectsProjectGraph"];
  count: number;
}

export function initializeProjectGraphPanel(): void {
  const panel = document.querySelector<HTMLElement>("[data-project-graph-panel]");
  if (!panel) return;
  const elements = getProjectGraphPanelElements(panel);
  bindProjectAction("[data-project-open-folder]", () => void runProjectScanAction(elements, () => window.crystal.project.openFolder()));
  bindProjectAction("[data-project-open-html]", () => void runProjectScanAction(elements, () => window.crystal.project.openHtmlFile()));
  bindProjectAction("[data-project-refresh]", () => void runProjectRefreshAction(elements));
  bindProjectAction("[data-project-start-watcher]", () => void runWatcherAction(elements, () => window.crystal.project.startWatcher()));
  bindProjectAction("[data-project-stop-watcher]", () => void runWatcherAction(elements, () => window.crystal.project.stopWatcher()));
  bindProjectAction("[data-project-clear-cache]", () => void runWatcherAction(elements, () => window.crystal.project.clearCache()));
  window.crystal.project.onWatcherStateChanged((payload) => {
    if (payload.refresh) renderProjectRefreshResult(elements, payload.refresh);
    renderWatcherState(elements, payload.watcherState);
  });
  void window.crystal.project.getWatcherState().then((state) => renderWatcherState(elements, state)).catch(() => undefined);
  void window.crystal.project.getGraph().then((graph) => setWorkspaceProjectOpen(Boolean(graph))).catch(() => setWorkspaceProjectOpen(false));
}

async function runProjectScanAction(elements: ProjectGraphPanelElements, action: () => Promise<ProjectScanResult | null>): Promise<void> {
  elements.status.textContent = "Scanning...";
  try {
    const result = await action();
    if (!result) {
      elements.status.textContent = "No project open";
      setWorkspaceProjectOpen(false);
      return;
    }
    renderProjectScanResult(elements, result);
    setWorkspaceProjectOpen(true);
    window.dispatchEvent(new CustomEvent("crystal:workspace-project-opened"));
    renderWatcherState(elements, await window.crystal.project.getWatcherState());
  } catch (error) {
    elements.status.textContent = error instanceof Error ? error.message : String(error);
  }
}

async function runProjectRefreshAction(elements: ProjectGraphPanelElements): Promise<void> {
  elements.status.textContent = "Refreshing...";
  try {
    const refresh = await window.crystal.project.refreshGraph();
    renderProjectRefreshResult(elements, refresh);
    renderWatcherState(elements, await window.crystal.project.getWatcherState());
  } catch (error) {
    elements.status.textContent = error instanceof Error ? error.message : String(error);
  }
}

async function runWatcherAction(elements: ProjectGraphPanelElements, action: () => Promise<ProjectWatcherState>): Promise<void> {
  try { renderWatcherState(elements, await action()); }
  catch (error) { elements.status.textContent = error instanceof Error ? error.message : String(error); }
}

function renderProjectRefreshResult(elements: ProjectGraphPanelElements, refresh: ProjectGraphRefreshResult): void {
  renderProjectScanResult(elements, refresh.result);
  elements.lastRefresh.textContent = `Last refresh: ${formatTimestamp(refresh.refreshedAt)}`;
  elements.refreshMode.textContent = `Refresh mode: ${refresh.mode}`;
}

function renderProjectScanResult(elements: ProjectGraphPanelElements, result: ProjectScanResult): void {
  elements.status.textContent = `${result.graph.summary.totalFiles} files · ${result.graph.summary.totalPages} pages · ${result.graph.summary.missingDependencies} issues`;
  renderCounts(elements.fileCounts, result.graph.summary.filesByKind);
  renderList(elements.pages, result.pages.slice(0, 12).map((page) => `${page.displayName}${page.isEntrypoint ? " · entry" : ""}`), "No HTML pages");
  renderList(elements.files, result.files.slice(0, 60).map((file) => `${file.relativePath} · ${file.kind}`), "No files indexed");
  renderList(elements.issues, result.issues.map((issue) => issue.message), "No graph issues");
}

function renderWatcherState(elements: ProjectGraphPanelElements, state: ProjectWatcherState): void {
  elements.watcherState.textContent = `Watcher: ${state.status}`;
  elements.cacheState.textContent = `Cache: ${state.cacheStatus}${state.cacheVersion ? ` · ${state.cacheVersion}` : ""}`;
  elements.lastRefresh.textContent = `Last refresh: ${state.lastRefreshAt ? formatTimestamp(state.lastRefreshAt) : "none"}`;
  elements.refreshMode.textContent = `Refresh mode: ${state.refreshMode}`;
  renderList(elements.watchEvents, formatVisibleWatchEvents(state.recentWatchEvents), "No watcher events");
}

function formatVisibleWatchEvents(events: readonly ProjectFileWatchEvent[]): readonly string[] {
  return coalesceVisibleWatchEvents(events).map((event) => {
    const impact = event.affectsProjectGraph ? "graph" : "ignored";
    const count = event.count > 1 ? ` ×${event.count}` : "";
    return `${event.type} · ${event.relativePath} · ${impact}${count}`;
  });
}

function coalesceVisibleWatchEvents(events: readonly ProjectFileWatchEvent[]): readonly CoalescedWatchEvent[] {
  const coalesced: CoalescedWatchEvent[] = [];
  for (const event of events) {
    const previous = coalesced.at(-1);
    if (previous && isSameVisibleWatchEvent(previous, event)) {
      previous.count += 1;
      continue;
    }
    coalesced.push({ type: event.type, relativePath: event.relativePath, affectsProjectGraph: event.affectsProjectGraph, count: 1 });
  }
  return coalesced;
}

function isSameVisibleWatchEvent(previous: CoalescedWatchEvent, event: ProjectFileWatchEvent): boolean {
  return previous.type === event.type && previous.relativePath === event.relativePath && previous.affectsProjectGraph === event.affectsProjectGraph;
}

function renderCounts(container: HTMLElement, counts: Readonly<Record<string, number>>): void {
  container.textContent = "";
  for (const [kind, count] of Object.entries(counts).filter(([, count]) => count > 0)) {
    const term = document.createElement("dt");
    const definition = document.createElement("dd");
    term.textContent = kind;
    definition.textContent = String(count);
    container.append(term, definition);
  }
}

function renderList(container: HTMLElement, items: readonly string[], emptyLabel = "None"): void {
  container.textContent = "";
  for (const item of items.length > 0 ? items : [emptyLabel]) {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    container.append(listItem);
  }
}

function getProjectGraphPanelElements(panel: HTMLElement): ProjectGraphPanelElements {
  const query = (selector: string) => queryProjectGraphElement(panel, selector);
  return { status: query("[data-project-status]"), fileCounts: query("[data-project-file-counts]"), pages: query("[data-project-pages]"), files: query("[data-project-files]"), issues: query("[data-project-issues]"), watcherState: query("[data-project-watcher-state]"), cacheState: query("[data-project-cache-state]"), lastRefresh: query("[data-project-last-refresh]"), refreshMode: query("[data-project-refresh-mode]"), watchEvents: query("[data-project-watch-events]") };
}

function queryProjectGraphElement(panel: HTMLElement, selector: string): HTMLElement {
  const element = panel.querySelector<HTMLElement>(selector) ?? document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing Project Graph element: ${selector}`);
  return element;
}

function bindProjectAction(selector: string, listener: () => void): void {
  document.querySelectorAll<HTMLButtonElement>(selector).forEach((button) => button.addEventListener("click", listener));
}

function setWorkspaceProjectOpen(isOpen: boolean): void {
  document.querySelector<HTMLElement>("[data-crystal-workspace]")?.setAttribute("data-crystal-project-open", String(isOpen));
}

function formatTimestamp(timestamp: number): string { return new Date(timestamp).toLocaleTimeString(); }
