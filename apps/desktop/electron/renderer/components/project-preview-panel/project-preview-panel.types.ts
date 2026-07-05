export interface ProjectPreviewPanelElements {
  readonly status: HTMLElement;
  readonly target: HTMLSelectElement;
  readonly page: HTMLElement;
  readonly lastLoad: HTMLElement;
  readonly lastReload: HTMLElement;
  readonly reason: HTMLElement;
  readonly error: HTMLElement;
  readonly frame: HTMLIFrameElement;
  readonly loadButton: HTMLButtonElement;
  readonly reloadButton: HTMLButtonElement;
}
