export const VALIDATION_RENDER_AUTO = "auto";
export const VALIDATION_RENDER_UNICODE = "unicode";
export const VALIDATION_RENDER_ASCII = "ascii";
export const VALIDATION_RENDER_PLAIN = "plain";
export const VALIDATION_RENDER_RAW = "raw";
export const VALIDATION_RENDER_JSON_SUMMARY = "json-summary";

export const VALIDATION_RENDER_MODES = [
  VALIDATION_RENDER_AUTO,
  VALIDATION_RENDER_UNICODE,
  VALIDATION_RENDER_ASCII,
  VALIDATION_RENDER_PLAIN,
  VALIDATION_RENDER_RAW,
  VALIDATION_RENDER_JSON_SUMMARY
];

export function resolveRenderMode(flags = {}, capabilities = {}) {
  if (flags.jsonSummary) return VALIDATION_RENDER_JSON_SUMMARY;
  if (flags.raw) return VALIDATION_RENDER_RAW;
  if (flags.unicode) return VALIDATION_RENDER_UNICODE;
  if (flags.ascii) return VALIDATION_RENDER_ASCII;
  if (flags.plain) return VALIDATION_RENDER_PLAIN;

  if (capabilities.isCI || capabilities.isDumb || capabilities.isTTY !== true) return VALIDATION_RENDER_PLAIN;
  if (capabilities.supportsUnicode) return VALIDATION_RENDER_UNICODE;
  return VALIDATION_RENDER_ASCII;
}

export function isHumanRenderMode(renderMode) {
  return renderMode !== VALIDATION_RENDER_RAW && renderMode !== VALIDATION_RENDER_JSON_SUMMARY;
}

export function isPlainRenderMode(renderMode) {
  return renderMode === VALIDATION_RENDER_ASCII || renderMode === VALIDATION_RENDER_PLAIN || renderMode === VALIDATION_RENDER_RAW || renderMode === VALIDATION_RENDER_JSON_SUMMARY;
}

export function resolveColorEnabled(renderMode, flags = {}, capabilities = {}) {
  if (flags.noColor) return false;
  if (renderMode === VALIDATION_RENDER_RAW || renderMode === VALIDATION_RENDER_JSON_SUMMARY) return false;
  if (renderMode === VALIDATION_RENDER_ASCII || renderMode === VALIDATION_RENDER_PLAIN) return false;
  if (flags.color) return true;
  return capabilities.canUseColor === true;
}

export function shouldUseLiveProgress(renderMode, flags = {}, capabilities = {}) {
  if (flags.noProgress) return false;
  if (!isHumanRenderMode(renderMode)) return false;
  return capabilities.canUseLiveProgress === true;
}
