export function initializeDeveloperView(): void {
  document.querySelector<HTMLElement>('[data-crystal-view="developer"]')?.setAttribute("data-ready", "true");
}
