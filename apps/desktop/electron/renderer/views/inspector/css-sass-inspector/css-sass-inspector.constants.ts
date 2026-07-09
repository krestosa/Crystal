export const CSS_SASS_INSPECTOR_SURFACE_ID = "css-sass-inspector";
export const CSS_SASS_INSPECTOR_TITLE = "CSS/Sass Inspector";
export const CSS_SASS_INSPECTOR_APPLY_LABEL = "Apply unavailable — style write runtime not enabled";
export const CSS_SASS_INSPECTOR_EMPTY_MESSAGE = "No CSS/Sass style inventory is available for the current selection.";
export const CSS_SASS_INSPECTOR_BLOCKED_MESSAGE = "Trusted selection, DOM Snapshot, and Style Source Inventory are required before authored styles can be inspected.";
export const CSS_SASS_INSPECTOR_RULES_UNAVAILABLE = "Rule preview unavailable — source text not provided";

export const CSS_SASS_INSPECTOR_SAFETY_NOTES = [
  "No real cascade is calculated",
  "No computed styles are read",
  "No Preview DOM mutation occurs",
  "No write IPC exists",
  "Apply remains unavailable",
  "source writes unavailable",
  "iframe DOM access blocked",
  "computed styles unavailable",
  "cascade not calculated"
] as const;
