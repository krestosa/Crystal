import type { HtmlElementInsertionMode, HtmlElementLibraryCategory, HtmlElementLibraryItem, HtmlInsertionTargetEligibility } from "../../../../../../packages/core/project/html-element-library";

export interface HtmlElementLibraryPanelElements {
  readonly root: HTMLElement;
  readonly categoryTabs: HTMLElement;
  readonly itemList: HTMLElement;
  readonly selectedEmpty: HTMLElement;
  readonly selectedPanel: HTMLElement;
  readonly selectedTitle: HTMLElement;
  readonly selectedKind: HTMLElement;
  readonly selectedDescription: HTMLElement;
  readonly selectedDetails: HTMLElement;
  readonly targetSummary: HTMLElement;
  readonly insertionModePicker: HTMLElement;
  readonly patchPreview: HTMLElement;
  readonly futureAction: HTMLButtonElement;
}

export interface HtmlElementLibraryPanelState {
  readonly activeCategory: HtmlElementLibraryCategory;
  readonly selectedItem: HtmlElementLibraryItem | null;
  readonly targetEligibility: HtmlInsertionTargetEligibility;
  readonly insertionMode: HtmlElementInsertionMode;
}
