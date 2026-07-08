export function createHtmlElementLibraryText<K extends keyof HTMLElementTagNameMap>(tagName: K, className: string, text: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

export function createHtmlElementLibraryButton(className: string, text: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  return button;
}

export function setHtmlElementLibraryHidden(element: HTMLElement, hidden: boolean): void {
  element.hidden = hidden;
}

export function formatHtmlElementLibraryCompactValue(value: string | null | undefined, fallback = "none"): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}
