import { getProjectGraphInvalidationReason, requiresFullProjectGraphRescan } from "./project-graph-invalidation";
import type { ProjectGraphRefreshPlan } from "./project-graph-refresh.types";
import type { ProjectFileWatchEvent } from "../watching/project-watch.types";

export function createProjectGraphRefreshPlan(rootPath: string, events: readonly ProjectFileWatchEvent[]): ProjectGraphRefreshPlan {
  const relevantEvents = events.filter((event) => event.affectsProjectGraph);
  if (relevantEvents.length === 0) {
    return { mode: "none", rootPath, events: relevantEvents, reason: "No graph-relevant watch events.", requiresFullRescan: false };
  }
  const requiresFullRescan = requiresFullProjectGraphRescan(relevantEvents);
  return {
    mode: requiresFullRescan ? "full" : "semi-incremental",
    rootPath,
    events: relevantEvents,
    reason: getProjectGraphInvalidationReason(relevantEvents),
    requiresFullRescan
  };
}
