export interface ProjectDomTreePanelElements {
  readonly status: HTMLElement;
  readonly target: HTMLElement;
  readonly nodeCount: HTMLElement;
  readonly maxDepth: HTMLElement;
  readonly issueCount: HTMLElement;
  readonly error: HTMLElement;
  readonly issuesEmpty: HTMLElement;
  readonly issuesList: HTMLUListElement;
  readonly tree: HTMLElement;
  readonly buildButton: HTMLButtonElement;
  readonly clearButton: HTMLButtonElement;
}
