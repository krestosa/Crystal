export function initializeAppShell(): void {
  const shell = document.querySelector<HTMLElement>("[data-crystal-app-shell]");
  shell?.setAttribute("data-ready", "true");
}
