export interface ProjectPreviewPanelElements {
  readonly status: HTMLElement;
  readonly target: HTMLSelectElement;
  readonly page: HTMLElement;
  readonly lastLoad: HTMLElement;
  readonly lastReload: HTMLElement;
  readonly reason: HTMLElement;
  readonly issueCount: HTMLElement;
  readonly lastIssue: HTMLElement;
  readonly error: HTMLElement;
  readonly selectionMode: HTMLElement;
  readonly selectedTag: HTMLElement;
  readonly selectedPath: HTMLElement;
  readonly selectedSelector: HTMLElement;
  readonly selectedAttributes: HTMLElement;
  readonly selectedText: HTMLElement;
  readonly selectionIssue: HTMLElement;
  readonly issuesEmpty: HTMLElement;
  readonly issuesList: HTMLUListElement;
  readonly frame: HTMLIFrameElement;
  readonly loadButton: HTMLButtonElement;
  readonly reloadButton: HTMLButtonElement;
  readonly selectModeButton: HTMLButtonElement;
  readonly clearSelectionButton: HTMLButtonElement;
}
