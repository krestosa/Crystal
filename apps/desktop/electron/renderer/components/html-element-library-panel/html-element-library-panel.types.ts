import type { HtmlElementLibraryItem, HtmlInsertionTargetEligibility } from "../../../../../../packages/core/project/html-element-library";

export interface HtmlElementLibraryPanelElements {
  readonly root: HTMLElement;
  readonly categoryList: HTMLElement;
  readonly selectedTitle: HTMLElement;
  readonly selectedKind: HTMLElement;
  readonly selectedDescription: HTMLElement;
  readonly selectedAttributes: HTMLElement;
  readonly selectedAccessibility: HTMLElement;
  readonly targetStatus: HTMLElement;
  readonly targetReason: HTMLElement;
  readonly targetDetails: HTMLElement;
  readonly patchPreview: HTMLElement;
  readonly futureAction: HTMLButtonElement;
}

export interface HtmlElementLibraryPanelState {
  readonly selectedItem: HtmlElementLibraryItem | null;
  readonly targetEligibility: HtmlInsertionTargetEligibility;
}
