import type { ProjectDomSnapshotState } from "../../../../../../packages/core/project/dom/project-dom-snapshot.types";
import type { ProjectGraph } from "../../../../../../packages/core/project/graph/project-graph.types";
import type { ProjectPreviewState } from "../../../../../../packages/core/project/preview/project-preview.types";
import type { ProjectPreviewSelectionState } from "../../../../../../packages/core/project/preview-selection/project-preview-selection.types";
import type { HtmlElementInsertionMode, HtmlElementLibraryCategory, HtmlElementLibraryItem } from "../../../../../../packages/core/project/html-element-library";
import { DEFAULT_HTML_ELEMENT_LIBRARY_CATEGORY } from "./html-element-library-panel.constants";

export interface HtmlElementLibraryPanelRuntimeState {
  activeCategory: HtmlElementLibraryCategory;
  selectedItem: HtmlElementLibraryItem | null;
  insertionMode: HtmlElementInsertionMode;
  latestProjectGraph: ProjectGraph | null;
  latestPreviewState: ProjectPreviewState | null;
  latestDomSnapshotState: ProjectDomSnapshotState | null;
  latestPreviewSelectionState: ProjectPreviewSelectionState | null;
}

export function createHtmlElementLibraryPanelState(): HtmlElementLibraryPanelRuntimeState {
  return {
    activeCategory: DEFAULT_HTML_ELEMENT_LIBRARY_CATEGORY,
    selectedItem: null,
    insertionMode: "before",
    latestProjectGraph: null,
    latestPreviewState: null,
    latestDomSnapshotState: null,
    latestPreviewSelectionState: null
  };
}
