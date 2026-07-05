import { BrowserWindow } from "electron";
import { readFile } from "node:fs/promises";
import { eventBus } from "../../../../../packages/core/events/event-bus";
import { projectDomSnapshotEventTypes } from "../../../../../packages/core/events/project-dom-snapshot-events";
import { buildProjectDomSnapshot } from "../../../../../packages/core/project/dom/project-dom-snapshot-builder";
import { initialProjectDomSnapshotState } from "../../../../../packages/core/project/dom/project-dom-snapshot-state";
import type { ProjectDomSnapshotBuildResult, ProjectDomSnapshotIssue, ProjectDomSnapshotState } from "../../../../../packages/core/project/dom/project-dom-snapshot.types";
import type { ProjectPreviewTarget } from "../../../../../packages/core/project/preview/project-preview.types";
import { appState } from "../../../../../packages/core/state/app-state";
import { crystalIpcChannels } from "../../../../../packages/shared/constants/ipc.constants";

let domSnapshotOperationInFlight = false;

export function getProjectDomSnapshotState(): ProjectDomSnapshotState {
  return appState.getSnapshot().domSnapshot;
}

export async function buildProjectDomSnapshotFromPreviewTarget(target: ProjectPreviewTarget | null): Promise<ProjectDomSnapshotBuildResult> {
  if (domSnapshotOperationInFlight) return failWithCurrentState("unknown", "DOM snapshot build was skipped because another snapshot operation is already running.", null, "Snapshot build already running.");

  domSnapshotOperationInFlight = true;
  const requestedState = patchProjectDomSnapshot({ status: "building", lastError: null, issues: [], domSnapshotIssueCount: 0 });
  eventBus.emit({ type: projectDomSnapshotEventTypes.projectDomSnapshotRequested, payload: { state: requestedState }, createdAt: Date.now() });
  notifyProjectDomSnapshotRenderer(requestedState);

  try {
    if (!target) return failSnapshot(createIssue("no-preview-target", "No Preview target is available for DOM snapshot.", null, "Load a Preview target before building a DOM snapshot."));

    let html: string;
    try {
      html = await readFile(target.absolutePath, "utf8");
    } catch {
      return failSnapshot(createIssue("file-not-found", "DOM snapshot target could not be read from the active project.", target.relativePath, "Target file could not be read."));
    }

    const snapshot = buildProjectDomSnapshot({ rootRelativePath: target.relativePath, html });
    const state = patchProjectDomSnapshot({
      status: snapshot.status === "ready" ? "ready" : "failed",
      currentDomSnapshot: snapshot,
      lastDomSnapshotAt: snapshot.generatedAt,
      lastError: snapshot.status === "failed" ? snapshot.issues[0]?.message ?? "DOM snapshot failed." : null,
      domSnapshotIssueCount: snapshot.issues.length,
      issues: snapshot.issues,
      isStale: false
    });
    const result: ProjectDomSnapshotBuildResult = { ok: snapshot.status === "ready", state, snapshot, issues: snapshot.issues };
    eventBus.emit({ type: result.ok ? projectDomSnapshotEventTypes.projectDomSnapshotCreated : projectDomSnapshotEventTypes.projectDomSnapshotFailed, payload: { result }, createdAt: Date.now() });
    notifyProjectDomSnapshotRenderer(state);
    return result;
  } catch {
    return failSnapshot(createIssue("unknown", "DOM snapshot failed unexpectedly.", null, "Unexpected snapshot failure."));
  } finally {
    domSnapshotOperationInFlight = false;
  }
}

export function clearProjectDomSnapshot(): ProjectDomSnapshotState {
  const state = patchProjectDomSnapshot({ ...initialProjectDomSnapshotState, lastClearedAt: Date.now() });
  eventBus.emit({ type: projectDomSnapshotEventTypes.projectDomSnapshotCleared, payload: { state }, createdAt: Date.now() });
  notifyProjectDomSnapshotRenderer(state);
  return state;
}

export function markProjectDomSnapshotStale(rootRelativePath: string | null): ProjectDomSnapshotState {
  const current = getProjectDomSnapshotState();
  if (!current.currentDomSnapshot) return current;
  if (rootRelativePath && current.currentDomSnapshot.rootRelativePath !== rootRelativePath) return clearProjectDomSnapshot();
  const state = patchProjectDomSnapshot({ status: "stale", isStale: true });
  notifyProjectDomSnapshotRenderer(state);
  return state;
}

function failWithCurrentState(code: ProjectDomSnapshotIssue["code"], message: string, relativePath: string | null, reason: string): ProjectDomSnapshotBuildResult {
  const issue = createIssue(code, message, relativePath, reason);
  return { ok: false, state: getProjectDomSnapshotState(), snapshot: null, issues: [issue] };
}

function failSnapshot(issue: ProjectDomSnapshotIssue): ProjectDomSnapshotBuildResult {
  const state = patchProjectDomSnapshot({ status: "failed", currentDomSnapshot: null, lastError: issue.message, domSnapshotIssueCount: 1, issues: [issue], isStale: false });
  const result: ProjectDomSnapshotBuildResult = { ok: false, state, snapshot: null, issues: [issue] };
  eventBus.emit({ type: projectDomSnapshotEventTypes.projectDomSnapshotFailed, payload: { result }, createdAt: Date.now() });
  notifyProjectDomSnapshotRenderer(state);
  return result;
}

function patchProjectDomSnapshot(patch: Partial<ProjectDomSnapshotState>): ProjectDomSnapshotState {
  appState.patchProjectDomSnapshot(patch);
  return appState.getSnapshot().domSnapshot;
}

function notifyProjectDomSnapshotRenderer(state: ProjectDomSnapshotState): void {
  for (const browserWindow of BrowserWindow.getAllWindows()) if (!browserWindow.isDestroyed()) browserWindow.webContents.send(crystalIpcChannels.projectDomSnapshotUpdated, state);
}

function createIssue(code: ProjectDomSnapshotIssue["code"], message: string, relativePath: string | null, reason: string): ProjectDomSnapshotIssue {
  return { code, severity: code === "unknown" ? "warning" : "error", message, relativePath, reason, timestamp: Date.now() };
}
