import type { ShellEmptyStateOptions } from "./empty-state.types";

export function createShellEmptyState(options: ShellEmptyStateOptions): HTMLParagraphElement {
  const emptyState = document.createElement("p");
  emptyState.className = options.compact ? "crystal-shell-empty-state crystal-shell-empty-state--compact" : "crystal-shell-empty-state";
  emptyState.textContent = options.message;
  return emptyState;
}
