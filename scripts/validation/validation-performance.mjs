export function summarizePerformance(results, metrics = {}) {
  const durationMs = metrics.durationMs ?? results.reduce((sum, result) => sum + result.durationMs, 0);
  return {
    durationMs,
    slowestCheck: getSlowestChecks(results, 1)[0] ?? null,
    slowestChecks: getSlowestChecks(results, metrics.topSlowest ?? 5),
    executionModes: countExecutionModes(results),
    processLaunches: results.filter((result) => result.status !== "SKIPPED").length,
    duplicateWarnings: detectObviousDuplicateExecutions(results)
  };
}

export function getSlowestChecks(results, limit = 5) {
  return [...results]
    .filter((result) => result.status !== "SKIPPED")
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, Math.max(0, limit));
}

export function countExecutionModes(results) {
  const counts = new Map();
  for (const result of results) {
    const mode = result.executionMode ?? inferExecutionMode(result);
    counts.set(mode, (counts.get(mode) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function formatTotalDuration(results) {
  return results.reduce((sum, result) => sum + result.durationMs, 0);
}

export function inferExecutionMode(result) {
  if (result.status === "SKIPPED") return "skipped";
  if (String(result.executedCommand ?? "").includes("npm")) return "npm";
  return "direct-node";
}

export function detectObviousDuplicateExecutions(results) {
  const warnings = [];
  const seen = new Map();
  for (const result of results) {
    if (!result.executedCommand || result.status === "SKIPPED") continue;
    const key = result.executedCommand;
    const previous = seen.get(key);
    if (previous) warnings.push(`${previous.label} and ${result.label} both executed ${key}`);
    else seen.set(key, result);
  }
  return warnings;
}
