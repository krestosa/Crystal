export function initializeDesignView(): void {
  document.querySelector<HTMLElement>('[data-crystal-view="design"]')?.setAttribute("data-ready", "true");
}
