import type { ShellMetadataRowOptions } from "./metadata-row.types";

export function createShellMetadataRow(options: ShellMetadataRowOptions): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "crystal-shell-metadata-row";

  const label = document.createElement("dt");
  label.className = "crystal-shell-metadata-row__label";
  label.textContent = options.label;

  const value = document.createElement("dd");
  value.className = "crystal-shell-metadata-row__value";
  value.textContent = options.value;
  value.title = options.title ?? options.value;

  row.replaceChildren(label, value);
  return row;
}
