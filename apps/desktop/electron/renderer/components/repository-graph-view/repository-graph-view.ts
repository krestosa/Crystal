import { bindRepositoryGraphViewInteractions } from "./repository-graph-view.interactions";
import { getRepositoryGraphViewElements, renderRepositoryGraphView } from "./repository-graph-view.render";
import { createRepositoryGraphViewState, setRepositoryGraphProject } from "./repository-graph-view.state";

let activeRepositoryGraphViewCleanup: (() => void) | null = null;

export function initializeRepositoryGraphView(): void {
  activeRepositoryGraphViewCleanup?.();
  const root = document.querySelector<HTMLElement>("[data-repository-graph-view]");
  if (!root) return;

  const elements = getRepositoryGraphViewElements(root);
  const state = createRepositoryGraphViewState();
  const render = (): void => renderRepositoryGraphView(elements, state);
  const cleanup: Array<() => void> = [bindRepositoryGraphViewInteractions(elements, state, render)];

  const loadCurrentGraph = async (): Promise<void> => {
    try {
      setRepositoryGraphProject(state, await window.crystal.project.getGraph());
    } catch (error) {
      setRepositoryGraphProject(state, null);
      elements.status.hidden = false;
      elements.status.textContent = error instanceof Error ? error.message : String(error);
    }
    render();
  };

  const onProjectOpened = (): void => void loadCurrentGraph();
  window.addEventListener("crystal:workspace-project-opened", onProjectOpened);
  cleanup.push(() => window.removeEventListener("crystal:workspace-project-opened", onProjectOpened));
  cleanup.push(window.crystal.project.onWatcherStateChanged((payload) => {
    if (!payload.refresh) return;
    setRepositoryGraphProject(state, payload.refresh.result.graph);
    render();
  }));

  activeRepositoryGraphViewCleanup = () => {
    for (const dispose of cleanup.splice(0).reverse()) dispose();
    activeRepositoryGraphViewCleanup = null;
  };

  render();
  void loadCurrentGraph();
}
