export const STYLE_SOURCE_KIND_LINKED_CSS = "linked-css";
export const STYLE_SOURCE_KIND_LINKED_SCSS = "linked-scss";
export const STYLE_SOURCE_KIND_INLINE_STYLE_BLOCK = "inline-style-block";
export const STYLE_SOURCE_KIND_INLINE_STYLE_ATTRIBUTE = "inline-style-attribute";
export const STYLE_SOURCE_KIND_UNKNOWN = "unknown";

export const STYLE_SOURCE_DISCOVERED_STATUS = "discovered";
export const STYLE_SOURCE_UNAVAILABLE_STATUS = "unavailable";
export const STYLE_SOURCE_UNSUPPORTED_STATUS = "unsupported";
export const STYLE_SOURCE_BLOCKED_STATUS = "blocked";

export const STYLE_INVENTORY_EMPTY_STATUS = "empty";
export const STYLE_INVENTORY_DISCOVERED_STATUS = "discovered";
export const STYLE_INVENTORY_PARTIAL_STATUS = "partial";
export const STYLE_INVENTORY_BLOCKED_STATUS = "blocked";

export const STYLE_SELECTOR_NOT_EVALUATED_STATUS = "not-evaluated";
export const STYLE_SELECTOR_UNSUPPORTED_STATUS = "unsupported";
export const STYLE_SELECTOR_BLOCKED_STATUS = "blocked";

export const STYLE_DECLARATION_PARSED_STATUS = "parsed";
export const STYLE_DECLARATION_UNSUPPORTED_STATUS = "unsupported";
export const STYLE_DECLARATION_BLOCKED_STATUS = "blocked";

export const STYLE_RULE_PARSED_STATUS = "parsed";
export const STYLE_RULE_PARTIAL_STATUS = "partial";
export const STYLE_RULE_UNSUPPORTED_STATUS = "unsupported";
export const STYLE_RULE_BLOCKED_STATUS = "blocked";

export const SELECTED_NODE_STYLE_READINESS_BLOCKED_STATUS = "blocked";
export const SELECTED_NODE_STYLE_READINESS_INVENTORY_ONLY_STATUS = "inventory-only";
export const SELECTED_NODE_STYLE_READINESS_UNSUPPORTED_STATUS = "unsupported";

export const AUTHORED_SELECTOR_MATCHED_FROM_SNAPSHOT_STATUS = "matched-from-snapshot";
export const AUTHORED_SELECTOR_NOT_MATCHED_FROM_SNAPSHOT_STATUS = "not-matched-from-snapshot";
export const AUTHORED_SELECTOR_UNSUPPORTED_STATUS = "unsupported-selector";
export const AUTHORED_SELECTOR_NOT_EVALUATED_STATUS = "not-evaluated";
export const AUTHORED_SELECTOR_INVENTORY_UNAVAILABLE_STATUS = "inventory-unavailable";
export const AUTHORED_SELECTOR_SOURCE_TEXT_UNAVAILABLE_STATUS = "source-text-unavailable";
export const AUTHORED_STYLE_MATCHING_BLOCKED_STATUS = "blocked";

export const STYLE_ENGINE_READONLY_SAFETY_NOTE =
  "Style Engine Phase 8A is read-only source inventory only; it cannot edit styles, write files, apply patches, enable Apply, run refresh, persist dirty state, execute undo/redo, or mutate Preview DOM.";

export const STYLE_ENGINE_COMPUTED_STYLE_BLOCKED_REASON =
  "Computed style inspection is blocked until a later CSS/Sass Inspector phase defines a safe non-iframe source of truth.";

export const STYLE_ENGINE_APPLY_BLOCKED_REASON =
  "Style editing Apply is blocked until write runtime, patch application, write IPC, dirty-state persistence, refresh execution, and undo/redo execution are implemented.";

export const STYLE_AUTHORED_MATCHING_READONLY_SAFETY_NOTE =
  "Authored style matching Phase 8C is read-only candidate matching over DOM Snapshot data only.";

export const STYLE_AUTHORED_MATCHING_NO_CASCADE_NOTE =
  "Candidate match only — no cascade.";

export const STYLE_AUTHORED_MATCHING_NO_COMPUTED_STYLES_NOTE =
  "Computed styles unavailable.";

export const STYLE_AUTHORED_MATCHING_NO_IFRAME_DOM_NOTE =
  "Iframe internals unavailable; only DOM Snapshot plain data is used.";

export const STYLE_AUTHORED_MATCHING_APPLY_BLOCKED_REASON =
  "Apply unavailable; authored style matching cannot write files, apply patches, open write IPC, persist dirty state, refresh, execute undo/redo, or mutate Preview DOM.";

export const STYLE_ENGINE_MISSING_REQUIREMENTS = [
  "trusted Preview Inspector selection",
  "DOM Snapshot node path",
  "style source inventory"
] as const;
