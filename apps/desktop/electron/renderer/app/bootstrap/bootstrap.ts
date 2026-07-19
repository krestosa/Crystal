import { initializeAppShell } from "../../layout/app-shell/app-shell";
import { initializeTabs } from "../../components/tabs/tabs";
import { initializeProjectGraphPanel } from "../../components/project-graph-panel/project-graph-panel";
import { initializeHtmlElementLibraryPanel } from "../../components/html-element-library-panel/html-element-library-panel";
import { initializeProjectPreviewPanel } from "../../components/project-preview-panel/project-preview-panel";
import { initializeProjectDomTreePanel } from "../../components/project-dom-tree-panel/project-dom-tree-panel";
import { initializeRepositoryGraphView } from "../../components/repository-graph-view/repository-graph-view";
import { initializeDesignView } from "../../views/design/design";
import { initializeInspectorView } from "../../views/inspector/inspector";
import { initializeDeveloperView } from "../../views/developer/developer";

export function bootstrapCrystalRenderer(): void {
  initializeAppShell();
  initializeTabs();
  initializeProjectGraphPanel();
  initializeHtmlElementLibraryPanel();
  initializeProjectPreviewPanel();
  initializeProjectDomTreePanel();
  initializeRepositoryGraphView();
  initializeDesignView();
  initializeInspectorView();
  initializeDeveloperView();
}
