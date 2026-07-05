export function initializeInspectorView(): void {
  document.querySelector<HTMLElement>('[data-crystal-view="inspector"]')?.setAttribute("data-ready", "true");
}
