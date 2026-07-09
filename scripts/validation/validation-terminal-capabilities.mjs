export function detectTerminalCapabilities(env = process.env, stream = process.stdout) {
  const isTTY = stream?.isTTY === true;
  const isCI = env.CI === "true" || env.CI === "1";
  const term = env.TERM ?? "";
  const isDumb = term.toLowerCase() === "dumb";
  const columns = Number.isInteger(stream?.columns) && stream.columns > 0 ? stream.columns : 100;
  const platform = process.platform;
  const supportsUnicode = !isDumb && env.NO_UNICODE !== "1";

  return {
    isTTY,
    isCI,
    isDumb,
    columns,
    platform,
    supportsUnicode,
    canUseLiveProgress: isTTY && !isCI && !isDumb
  };
}

export function getTerminalWidth(capabilities = detectTerminalCapabilities()) {
  return Math.max(60, Math.min(160, capabilities.columns ?? 100));
}
