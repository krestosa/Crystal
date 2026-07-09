export function detectTerminalCapabilities(env = process.env, stream = process.stdout) {
  const isTTY = stream?.isTTY === true;
  const isCI = env.CI === "true" || env.CI === "1";
  const term = env.TERM ?? "";
  const isDumb = term.toLowerCase() === "dumb";
  const hasNoColor = Object.prototype.hasOwnProperty.call(env, "NO_COLOR");
  const columns = Number.isInteger(stream?.columns) && stream.columns > 0 ? stream.columns : 100;
  const platform = process.platform;
  const supportsUnicode = !isDumb && env.NO_UNICODE !== "1";
  const canUseColor = isTTY && !isCI && !isDumb && !hasNoColor;

  return {
    isTTY,
    isCI,
    isDumb,
    hasNoColor,
    columns,
    platform,
    supportsUnicode,
    canUseColor,
    canUseLiveProgress: isTTY && !isCI && !isDumb
  };
}

export function getTerminalWidth(capabilities = detectTerminalCapabilities()) {
  return Math.max(60, Math.min(160, capabilities.columns ?? 100));
}
