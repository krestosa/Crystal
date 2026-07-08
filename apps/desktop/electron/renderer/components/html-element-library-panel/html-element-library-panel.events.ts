import type { ProjectDomSnapshotState } from "../../../../../../packages/core/project/dom/project-dom-snapshot.types";
import type { ProjectPreviewState } from "../../../../../../packages/core/project/preview/project-preview.types";
import type { ProjectPreviewSelectionState } from "../../../../../../packages/core/project/preview-selection/project-preview-selection.types";
import type { HtmlElementLibraryPanelRuntimeState } from "./html-element-library-panel.state";

interface HtmlElementLibraryPanelEventBindings {
  readonly state: HtmlElementLibraryPanelRuntimeState;
  readonly render: () => void;
}

export function bindHtmlElementLibraryPanelEvents(bindings: HtmlElementLibraryPanelEventBindings): () => void {
  const cleanup: Array<() => void> = [];
  const { state, render } = bindings;

  const refreshGraph = async (): Promise<void> => {
    try { state.latestProjectGraph = await window.crystal.project.getGraph(); }
    catch { state.latestProjectGraph = null; }
    render();
  };

  const handleProjectOpened = (): void => { void refreshGraph(); };
  const handlePreviewState = (previewState: ProjectPreviewState): void => {
    state.latestPreviewState = previewState;
    render();
  };
  const handleDomSnapshotState = (domSnapshotState: ProjectDomSnapshotState): void => {
    state.latestDomSnapshotState = domSnapshotState;
    render();
  };
  const handlePreviewSelectionState = (previewSelectionState: ProjectPreviewSelectionState): void => {
    state.latestPreviewSelectionState = previewSelectionState;
    render();
  };

  window.addEventListener("crystal:workspace-project-opened", handleProjectOpened);
  cleanup.push(() => window.removeEventListener("crystal:workspace-project-opened", handleProjectOpened));
  cleanup.push(window.crystal.project.onWatcherStateChanged(() => { void refreshGraph(); }));
  cleanup.push(window.crystal.project.onPreviewStateChanged(handlePreviewState));
  cleanup.push(window.crystal.project.onDomSnapshotStateChanged(handleDomSnapshotState));
  cleanup.push(window.crystal.project.onPreviewSelectionStateChanged(handlePreviewSelectionState));

  void refreshGraph();
  void window.crystal.project.getPreviewState().then(handlePreviewState).catch(() => { state.latestPreviewState = null; render(); });
  void window.crystal.project.getDomSnapshotState().then(handleDomSnapshotState).catch(() => { state.latestDomSnapshotState = null; render(); });
  void window.crystal.project.getPreviewSelectionState().then(handlePreviewSelectionState).catch(() => { state.latestPreviewSelectionState = null; render(); });

  return () => {
    for (const destroy of cleanup.splice(0).reverse()) destroy();
  };
}
