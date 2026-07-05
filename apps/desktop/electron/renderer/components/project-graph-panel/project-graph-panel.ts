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
  ensureWatcherControls(panel);
  const elements = getProjectGraphPanelElements(panel);
  panel.querySelector("[data-project-open-folder]")?.addEventListener("click", () => void runProjectScanAction(elements, () => window.crystal.project.openFolder()));
  panel.querySelector("[data-project-open-html]")?.addEventListener("click", () => void runProjectScanAction(elements, () => window.crystal.project.openHtmlFile()));
  panel.querySelector("[data-project-refresh]")?.addEventListener("click", () => void runProjectRefreshAction(elements));
  panel.querySelector("[data-project-start-watcher]")?.addEventListener("click", () => void runWatcherAction(elements, () => window.crystal.project.startWatcher()));
  panel.querySelector("[data-project-stop-watcher]")?.addEventListener("click", () => void runWatcherAction(elements, () => window.crystal.project.stopWatcher()));
  panel.querySelector("[data-project-clear-cache]")?.addEventListener("click", () => void runWatcherAction(elements, () => window.crystal.project.clearCache()));
  window.crystal.project.onWatcherStateChanged((payload) => {
    if (payload.refresh) renderProjectRefreshResult(elements, payload.refresh);
    renderWatcherState(elements, payload.watcherState);
  });
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
  try { renderWatcherState(elements, await action()); }
  catch (error) { elements.status.textContent = error instanceof Error ? error.message : String(error); }
}

function renderProjectRefreshResult(elements: ProjectGraphPanelElements, refresh: ProjectGraphRefreshResult): void {
  renderProjectScanResult(elements, refresh.result);
  elements.lastRefresh.textContent = `Last refresh: ${formatTimestamp(refresh.refreshedAt)}`;
  elements.refreshMode.textContent = `Refresh mode: ${refresh.mode}`;
}

function renderProjectScanResult(elements: ProjectGraphPanelElements, result: ProjectScanResult): void {
  elements.status.textContent = `${result.graph.summary.totalFiles} files, ${result.graph.summary.totalPages} pages, ${result.graph.summary.missingDependencies} missing dependencies.`;
  renderCounts(elements.fileCounts, result.graph.summary.filesByKind);
  renderList(elements.pages, result.pages.map((page) => `${page.displayName}${page.isEntrypoint ? " - entry" : ""}`));
  renderList(elements.files, result.files.slice(0, 80).map((file) => `${file.relativePath} - ${file.kind}`));
  renderList(elements.issues, result.issues.map((issue) => issue.message));
}

function renderWatcherState(elements: ProjectGraphPanelElements, state: ProjectWatcherState): void {
  elements.watcherState.textContent = `Watcher: ${state.status}`;
  elements.cacheState.textContent = `Cache: ${state.cacheStatus}${state.cacheVersion ? ` - ${state.cacheVersion}` : ""}`;
  elements.lastRefresh.textContent = `Last refresh: ${state.lastRefreshAt ? formatTimestamp(state.lastRefreshAt) : "none"}`;
  elements.refreshMode.textContent = `Refresh mode: ${state.refreshMode}`;
  renderList(elements.watchEvents, formatVisibleWatchEvents(state.recentWatchEvents));
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
  if (actions && !actions.querySelector("[data-project-start-watcher]")) actions.append(createButton("Start Watcher", "project-start-watcher"), createButton("Stop Watcher", "project-stop-watcher"), createButton("Clear Cache", "project-clear-cache"));
  ensureParagraph(panel, "data-project-watcher-state", "Watcher: idle");
  ensureParagraph(panel, "data-project-cache-state", "Cache: empty");
  ensureParagraph(panel, "data-project-last-refresh", "Last refresh: none");
  ensureParagraph(panel, "data-project-refresh-mode", "Refresh mode: none");
  if (panel.querySelector("[data-project-watch-events]")) return;
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  const list = document.createElement("ul");
  section.className = "crystal-project-graph-panel__section";
  heading.className = "crystal-project-graph-panel__heading";
  heading.textContent = "Recent events";
  list.className = "crystal-project-graph-panel__list";
  list.setAttribute("data-project-watch-events", "");
  section.append(heading, list);
  panel.insertBefore(section, panel.querySelector("[data-project-file-counts]")?.closest("section") ?? null);
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
  const query = (selector: string) => queryPanelElement(panel, selector);
  return { status: query("[data-project-status]"), fileCounts: query("[data-project-file-counts]"), pages: query("[data-project-pages]"), files: query("[data-project-files]"), issues: query("[data-project-issues]"), watcherState: query("[data-project-watcher-state]"), cacheState: query("[data-project-cache-state]"), lastRefresh: query("[data-project-last-refresh]"), refreshMode: query("[data-project-refresh-mode]"), watchEvents: query("[data-project-watch-events]") };
}

function queryPanelElement(panel: HTMLElement, selector: string): HTMLElement {
  const element = panel.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing Project Graph panel element: ${selector}`);
  return element;
}

function formatTimestamp(timestamp: number): string { return new Date(timestamp).toLocaleTimeString(); }
