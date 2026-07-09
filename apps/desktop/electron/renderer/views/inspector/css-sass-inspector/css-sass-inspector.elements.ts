import type { CSSSassInspectorSurfaceElements } from "./css-sass-inspector.types";

export function createCSSSassInspectorSurfaceElements(root: ParentNode): CSSSassInspectorSurfaceElements {
  return {
    cssSassInspectorStatus: queryCSSSassInspectorElement(root, "[data-css-sass-inspector-status]", HTMLElement),
    cssSassInspectorMessage: queryCSSSassInspectorElement(root, "[data-css-sass-inspector-message]", HTMLElement),
    cssSassInspectorReadiness: queryCSSSassInspectorElement(root, "[data-css-sass-inspector-readiness]", HTMLDListElement),
    cssSassInspectorSources: queryCSSSassInspectorElement(root, "[data-css-sass-inspector-sources]", HTMLUListElement),
    cssSassInspectorSourcesEmpty: queryCSSSassInspectorElement(root, "[data-css-sass-inspector-sources-empty]", HTMLElement),
    cssSassInspectorRules: queryCSSSassInspectorElement(root, "[data-css-sass-inspector-rules]", HTMLUListElement),
    cssSassInspectorRulesEmpty: queryCSSSassInspectorElement(root, "[data-css-sass-inspector-rules-empty]", HTMLElement),
    cssSassInspectorSafety: queryCSSSassInspectorElement(root, "[data-css-sass-inspector-safety]", HTMLUListElement),
    cssSassInspectorApplyUnavailableAffordance: queryCSSSassInspectorElement(root, "[data-css-sass-inspector-apply-unavailable]", HTMLElement)
  };
}

function queryCSSSassInspectorElement<TElement extends HTMLElement>(root: ParentNode, selector: string, elementType: new () => TElement): TElement {
  const element = root.querySelector(selector);
  if (!(element instanceof elementType)) throw new Error(`Missing CSS/Sass Inspector element: ${selector}`);
  return element;
}
