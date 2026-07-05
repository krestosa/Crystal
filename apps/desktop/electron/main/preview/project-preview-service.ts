import { BrowserWindow } from "electron";
import { access } from "node:fs/promises";
import { eventBus } from "../../../../../packages/core/events/event-bus";
import { projectPreviewEventTypes } from "../../../../../packages/core/events/project-preview-events";
import { selectProjectPreviewTarget } from "../../../../../packages/core/project/preview/project-preview-target";
import { createProjectPreviewWatchReloadKey, shouldReloadProjectPreviewForEvents } from "../../../../../packages/core/project/preview/project-preview-reload";
import { initialProjectPreviewState } from "../../../../../packages/core/project/preview/project-preview-state";
import type { ProjectPreviewIssue, ProjectPreviewLoadResult, ProjectPreviewReloadReason, ProjectPreviewState } from "../../../../../packages/core/project/preview/project-preview.types";
import type { ProjectGraphRefreshResult } from "../../../../../packages/core/project/refresh/project-graph-refresh.types";
import type { ProjectFileWatchEvent } from "../../../../../packages/core/project/watching/project-watch.types";
import { appState } from "../../../../../packages/core/state/app-state";
import { crystalIpcChannels } from "../../../../../packages/shared/constants/ipc.constants";
import { getCurrentProjectScanResult } from "../ipc/project-ipc-state";
import { createProjectPreviewUrl } from "./project-preview-url";

let previewOperationInFlight = false;
let lastWatcherReloadKey: string | null = null;

export function getProjectPreviewState(): ProjectPreviewState {
  return appState.getSnapshot().preview;
}

export async function loadProjectPreview(reason: ProjectPreviewReloadReason = "manual", preferredRelativePath: string | null = null): Promise<ProjectPreviewLoadResult> {
  if (previewOperationInFlight) return failWithCurrentState("reload-skipped", "Preview load was skipped because another preview operation is already running.", null);

  previewOperationInFlight = true;
  const requestedStatus = reason === "manual" && getProjectPreviewState().status !== "ready" ? "loading" : "reloading";
  patchPreview({ status: requestedStatus, lastError: null, issues: [], lastReloadReason: reason });
  emitPreviewRequestEvent(reason);

  try {
    const scanResult = getCurrentProjectScanResult();
    const currentTarget = getProjectPreviewState().target;
    const targetSelection = selectProjectPreviewTarget(scanResult, preferredRelativePath ?? currentTarget?.relativePath ?? null);
    if (!targetSelection.ok || !targetSelection.target) return failPreview(targetSelection.issue ?? createIssue("no-preview-target", "No preview target could be resolved.", null), reason);

    await access(targetSelection.target.absolutePath);
    const now = Date.now();
    const previewUrl = createProjectPreviewUrl(targetSelection.target.relativePath, now);
    const state = patchPreview({
      rootPath: targetSelection.target.rootPath,
      target: targetSelection.target,
      previewUrl,
      status: "ready",
      lastLoadedAt: reason === "manual" || reason === "project-open" || reason === "page-change" ? now : getProjectPreviewState().lastLoadedAt,
      lastReloadedAt: reason === "watch" || reason === "manual" ? now : getProjectPreviewState().lastReloadedAt,
      lastReloadReason: reason,
      lastError: null,
      isSyncedWithProjectGraph: true,
      issues: []
    });
    const result: ProjectPreviewLoadResult = { ok: true, state, issue: null };
    emitPreviewSuccessEvent(reason, result);
    notifyProjectPreviewRenderer(state);
    return result;
  } catch (error) {
    return failPreview(createIssue("file-not-found", error instanceof Error ? error.message : String(error), null), reason);
  } finally {
    previewOperationInFlight = false;
  }
}

export function reloadProjectPreview(reason: ProjectPreviewReloadReason = "manual"): Promise<ProjectPreviewLoadResult> {
  return loadProjectPreview(reason, getProjectPreviewState().target?.relativePath ?? null);
}

export function setProjectPreviewTarget(relativePath: string): Promise<ProjectPreviewLoadResult> {
  return loadProjectPreview("page-change", relativePath);
}

export function clearProjectPreview(): ProjectPreviewState {
  const state = patchPreview(initialProjectPreviewState);
  eventBus.emit({ type: projectPreviewEventTypes.projectPreviewTargetChanged, payload: { target: null, state }, createdAt: Date.now() });
  notifyProjectPreviewRenderer(state);
  return state;
}

export function prepareProjectPreviewForScanResult(): ProjectPreviewState {
  const scanResult = getCurrentProjectScanResult();
  const selection = selectProjectPreviewTarget(scanResult);
  const state = patchPreview({
    ...initialProjectPreviewState,
    rootPath: scanResult?.rootPath ?? null,
    target: selection.target,
    status: selection.ok ? "idle" : "failed",
    lastError: selection.issue?.message ?? null,
    isSyncedWithProjectGraph: Boolean(selection.ok),
    issues: selection.issue ? [selection.issue] : []
  });
  eventBus.emit({ type: projectPreviewEventTypes.projectPreviewTargetChanged, payload: { target: state.target, state }, createdAt: Date.now() });
  notifyProjectPreviewRenderer(state);
  return state;
}

export async function reloadProjectPreviewAfterGraphRefresh(events: readonly ProjectFileWatchEvent[], refresh: ProjectGraphRefreshResult): Promise<void> {
  const state = getProjectPreviewState();
  const reloadKey = createProjectPreviewWatchReloadKey(events, refresh.refreshedAt);
  if (reloadKey === lastWatcherReloadKey) return;
  if (!shouldReloadProjectPreviewForEvents(state, events, refresh.result.graph)) return;
  lastWatcherReloadKey = reloadKey;
  await reloadProjectPreview("watch");
}

function patchPreview(patch: Partial<ProjectPreviewState>): ProjectPreviewState {
  appState.patchProjectPreview(patch);
  return appState.getSnapshot().preview;
}

function failWithCurrentState(code: ProjectPreviewIssue["code"], message: string, issuePath: string | null): ProjectPreviewLoadResult {
  const issue = createIssue(code, message, issuePath);
  return { ok: false, state: getProjectPreviewState(), issue };
}

function failPreview(issue: ProjectPreviewIssue, reason: ProjectPreviewReloadReason): ProjectPreviewLoadResult {
  const state = patchPreview({ status: "failed", lastError: issue.message, lastReloadReason: reason, isSyncedWithProjectGraph: false, issues: [issue] });
  const result: ProjectPreviewLoadResult = { ok: false, state, issue };
  emitPreviewFailureEvent(reason, issue, state);
  notifyProjectPreviewRenderer(state);
  return result;
}

function emitPreviewRequestEvent(reason: ProjectPreviewReloadReason): void {
  const eventType = reason === "watch" ? projectPreviewEventTypes.projectPreviewReloadRequested : projectPreviewEventTypes.projectPreviewLoadRequested;
  eventBus.emit({ type: eventType, payload: { state: getProjectPreviewState() }, createdAt: Date.now() });
}

function emitPreviewSuccessEvent(reason: ProjectPreviewReloadReason, result: ProjectPreviewLoadResult): void {
  const eventType = reason === "watch" ? projectPreviewEventTypes.projectPreviewReloaded : projectPreviewEventTypes.projectPreviewLoaded;
  eventBus.emit({ type: eventType, payload: { result }, createdAt: Date.now() });
}

function emitPreviewFailureEvent(reason: ProjectPreviewReloadReason, issue: ProjectPreviewIssue, state: ProjectPreviewState): void {
  const eventType = reason === "watch" ? projectPreviewEventTypes.projectPreviewReloadFailed : projectPreviewEventTypes.projectPreviewLoadFailed;
  eventBus.emit({ type: eventType, payload: { issue, state }, createdAt: Date.now() });
}

function notifyProjectPreviewRenderer(state: ProjectPreviewState): void {
  for (const browserWindow of BrowserWindow.getAllWindows()) {
    if (!browserWindow.isDestroyed()) browserWindow.webContents.send(crystalIpcChannels.projectPreviewUpdated, state);
  }
}

function createIssue(code: ProjectPreviewIssue["code"], message: string, issuePath: string | null): ProjectPreviewIssue {
  return { code, severity: "error", message, path: issuePath };
}
