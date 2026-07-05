type CrystalViewName = "design" | "inspector" | "developer";

export function initializeTabs(): void {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-crystal-view-tab]"));
  const views = Array.from(document.querySelectorAll<HTMLElement>("[data-crystal-view]"));

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      const nextView = tab.dataset.crystalViewTab as CrystalViewName | undefined;
      if (!nextView) {
        return;
      }

      for (const item of tabs) {
        item.setAttribute("aria-pressed", String(item === tab));
      }

      for (const view of views) {
        view.hidden = view.dataset.crystalView !== nextView;
      }
    });
  }
}
