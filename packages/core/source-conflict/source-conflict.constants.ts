export const SOURCE_CONFLICT_NOT_CHECKED_STATUS = "not-checked";
export const SOURCE_CONFLICT_CLEAN_PREVIEW_STATUS = "clean-preview";
export const SOURCE_CONFLICT_RISK_STATUS = "conflict-risk";
export const SOURCE_CONFLICT_BLOCKED_STATUS = "blocked";
export const SOURCE_CONFLICT_UNSUPPORTED_STATUS = "unsupported";

export const SOURCE_CONFLICT_PREVIEW_SAFETY_NOTE =
  "Source conflict previews may consume canonical read-only revision evidence; they never write files, apply patches, or authorize Apply.";

export const SOURCE_CONFLICT_RECHECK_REQUIRED_NOTE =
  "Future writes must recheck fresh source in main/core immediately before patch application.";
