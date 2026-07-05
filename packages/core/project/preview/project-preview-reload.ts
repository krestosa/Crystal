import type { ProjectGraph } from "../graph/project-graph.types";
import type { ProjectFileWatchEvent } from "../watching/project-watch.types";
import type { ProjectPreviewState } from "./project-preview.types";

const broadReloadKinds = new Set(["html", "css", "sass", "javascript", "typescript", "svg", "image", "font", "asset"]);

export function shouldReloadProjectPreviewForEvents(state: ProjectPreviewState, events: readonly ProjectFileWatchEvent[], graph: ProjectGraph | null): boolean {
  if (!state.target || !graph || events.length === 0) return false;
  if (state.status !== "ready" && state.status !== "failed") return false;

  const relevantEvents = events.filter((event) => event.affectsProjectGraph);
  if (relevantEvents.length === 0) return false;

  const relatedPaths = new Set<string>([state.target.relativePath, ...state.target.directDependencyRelativePaths]);
  for (const event of relevantEvents) {
    if (relatedPaths.has(event.relativePath)) return true;
    if (event.previousRelativePath && relatedPaths.has(event.previousRelativePath)) return true;
  }

  const currentPage = graph.pages.find((page) => page.relativePath === state.target?.relativePath);
  if (!currentPage) return true;

  return relevantEvents.some((event) => broadReloadKinds.has(event.kind) && event.type !== "deleted");
}

export function createProjectPreviewWatchReloadKey(events: readonly ProjectFileWatchEvent[], refreshedAt: number): string {
  const eventKey = events.map((event) => `${event.type}:${event.relativePath}:${event.timestamp}`).sort().join("|");
  return `${refreshedAt}:${eventKey}`;
}
