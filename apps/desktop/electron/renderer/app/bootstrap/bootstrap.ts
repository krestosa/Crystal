import { initializeAppShell } from "../../layout/app-shell/app-shell";
import { initializeTabs } from "../../components/tabs/tabs";
import { initializeProjectGraphPanel } from "../../components/project-graph-panel/project-graph-panel";
import { initializeProjectPreviewPanel } from "../../components/project-preview-panel/project-preview-panel";
import { initializeProjectDomTreePanel } from "../../components/project-dom-tree-panel/project-dom-tree-panel";
import { initializeDesignView } from "../../views/design/design";
import { initializeInspectorView } from "../../views/inspector/inspector";
import { initializeDeveloperView } from "../../views/developer/developer";

export function bootstrapCrystalRenderer(): void {
  initializeAppShell();
  initializeTabs();
  initializeProjectGraphPanel();
  initializeProjectPreviewPanel();
  initializeProjectDomTreePanel();
  initializeDesignView();
  initializeInspectorView();
  initializeDeveloperView();
}
