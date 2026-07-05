import type { ProjectFileWatchEvent } from "../watching/project-watch.types";

export function requiresFullProjectGraphRescan(events: readonly ProjectFileWatchEvent[]): boolean {
  if (events.length > 25) return true;
  return events.some((event) => event.type === "unknown" || event.type === "renamed" || event.type === "deleted");
}

export function getProjectGraphInvalidationReason(events: readonly ProjectFileWatchEvent[]): string {
  if (events.length === 0) return "No watch events to refresh.";
  if (events.length > 25) return `Large watch batch (${events.length} events) requires full Project Graph rescan.`;
  const complex = events.find((event) => event.type === "unknown" || event.type === "renamed" || event.type === "deleted");
  if (complex) return `${complex.type} event for ${complex.relativePath} requires full Project Graph rescan.`;
  return `Clear watch batch (${events.length} event(s)) can use semi-incremental refresh.`;
}
