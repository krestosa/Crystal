import { NodeFileSystemAdapter } from "../../../../../packages/adapters/file-system/file-system.adapter";
import { eventBus } from "../../../../../packages/core/events/event-bus";
import { projectEventTypes } from "../../../../../packages/core/events/project-events";
import { ProjectScanner } from "../../../../../packages/core/project/scanning/project-scanner";
import type { ProjectScanResult } from "../../../../../packages/core/project/graph/project-graph.types";
import { appState } from "../../../../../packages/core/state/app-state";
import { setCurrentProjectScanResult } from "./project-ipc-state";

const scanner = new ProjectScanner(new NodeFileSystemAdapter());

export async function scanProjectRoot(rootPath: string): Promise<ProjectScanResult> {
  const createdAt = Date.now();
  appState.patch({ workspace: { openedPath: rootPath } });
  appState.patchProjectGraph({ root: rootPath, scanStatus: "scanning", lastError: null });
  eventBus.emit({ type: projectEventTypes.projectOpened, payload: { rootPath }, createdAt });
  eventBus.emit({ type: projectEventTypes.projectScanStarted, payload: { rootPath }, createdAt });

  try {
    const result = await scanner.scan(rootPath);
    setCurrentProjectScanResult(result);
    appState.patchProjectGraph({ root: result.rootPath, graph: result.graph, scanStatus: "completed", issues: result.issues, lastScanAt: result.scannedAt, lastError: null });
    for (const file of result.files) eventBus.emit({ type: projectEventTypes.projectFileDiscovered, payload: { file }, createdAt: Date.now() });
    for (const dependency of result.dependencies.filter((item) => item.status === "missing")) eventBus.emit({ type: projectEventTypes.projectDependencyMissing, payload: { dependency }, createdAt: Date.now() });
    eventBus.emit({ type: projectEventTypes.projectScanCompleted, payload: { result }, createdAt: Date.now() });
    eventBus.emit({ type: projectEventTypes.projectGraphUpdated, payload: { graph: result.graph, issues: result.issues }, createdAt: Date.now() });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appState.patchProjectGraph({ scanStatus: "failed", lastError: message });
    eventBus.emit({ type: projectEventTypes.projectScanFailed, payload: { rootPath, error: message }, createdAt: Date.now() });
    throw error;
  }
}
