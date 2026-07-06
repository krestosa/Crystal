import { BrowserWindow } from "electron";
import { access } from "node:fs/promises";
import path from "node:path";
import { eventBus } from "../../../../../packages/core/events/event-bus";
import { projectPreviewEventTypes } from "../../../../../packages/core/events/project-preview-events";
import type { ProjectDependency } from "../../../../../packages/core/project/graph/project-graph.types";
import { createProjectPreviewIssue, getLastProjectPreviewIssueTimestamp, getProjectPreviewIssueCount, mergeProjectPreviewIssue } from "../../../../../packages/core/project/preview/project-preview-issues";
import { selectProjectPreviewTarget } from "../../../../../packages/core/project/preview/project-preview-target";
import { createProjectPreviewWatchReloadKey, shouldReloadProjectPreviewForEvents } from "../../../../../packages/core/project/preview/project-preview-reload";
import { initialProjectPreviewState } from "../../../../../packages/core/project/preview/project-preview-state";
import type { ProjectPreviewIssue, ProjectPreviewLoadId, ProjectPreviewLoadResult, ProjectPreviewReloadReason, ProjectPreviewState, ProjectPreviewTarget } from "../../../../../packages/core/project/preview/project-preview.types";
import type { ProjectGraphRefreshResult } from "../../../../../packages/core/project/refresh/project-graph-refresh.types";
import type { ProjectFileWatchEvent } from "../../../../../packages/core/project/watching/project-watch.types";
import { appState } from "../../../../../packages/core/state/app-state";
import { crystalIpcChannels } from "../../../../../packages/shared/constants/ipc.constants";
import { clearProjectDomSnapshot, markProjectDomSnapshotStale } from "../dom/project-dom-snapshot-service";
import { getCurrentProjectScanResult } from "../ipc/project-ipc-state";
import { createProjectPreviewUrl } from "./project-preview-url";

let previewOperationInFlight = false;
let lastWatcherReloadKey: string | null = null;
let previewLoadCounter = 0;

export function getProjectPreviewState(): ProjectPreviewState {
  return appState.getSnapshot().preview;
}

export async function loadProjectPreview(reason: ProjectPreviewReloadReason = "manual", preferredRelativePath: string | null = null): Promise<ProjectPreviewLoadResult> {
  if (previewOperationInFlight) return failWithCurrentState("reload-skipped", "Preview load was skipped because another preview operation is already running.", null);

  previewOperationInFlight = true;
  const loadId = createProjectPreviewLoadId();
  const requestedStatus = reason === "manual" && getProjectPreviewState().status !== "ready" ? "loading" : "reloading";
  patchPreview({ activeLoadId: loadId, status: requestedStatus, lastError: null, issues: [], issueCount: 0, lastIssueAt: null, lastReloadReason: reason });
  emitPreviewRequestEvent(reason);

  try {
    const scanResult = getCurrentProjectScanResult();
    const currentTarget = getProjectPreviewState().target;
    const targetSelection = selectProjectPreviewTarget(scanResult, preferredRelativePath ?? currentTarget?.relativePath ?? null);
    if (!targetSelection.ok || !targetSelection.target) return failPreview(targetSelection.issue ?? createIssue("no-preview-target", "No preview target could be resolved.", null, "target", loadId), reason);

    const pendingState = patchPreview({ activeLoadId: loadId, rootPath: targetSelection.target.rootPath, target: targetSelection.target, previewUrl: null, status: requestedStatus, lastError: null, issues: [], issueCount: 0, lastIssueAt: null, lastReloadReason: reason, isSyncedWithProjectGraph: false });
    notifyProjectPreviewRenderer(pendingState);

    try { await access(targetSelection.target.absolutePath); }
    catch { return failPreview(createIssue("file-not-found", "Preview target was not found inside the active project root.", targetSelection.target.relativePath, "target", loadId), reason); }

    const now = Date.now();
    const previewUrl = createProjectPreviewUrl(targetSelection.target.relativePath, now, loadId);
    const state = patchPreview({ activeLoadId: loadId, rootPath: targetSelection.target.rootPath, target: targetSelection.target, previewUrl, status: "ready", lastLoadedAt: reason === "manual" || reason === "project-open" || reason === "page-change" ? now : getProjectPreviewState().lastLoadedAt, lastReloadedAt: reason === "watch" || reason === "manual" ? now : getProjectPreviewState().lastReloadedAt, lastReloadReason: reason, lastError: null, issues: [], issueCount: 0, lastIssueAt: null, isSyncedWithProjectGraph: true });
    markProjectDomSnapshotStale(state.target?.relativePath ?? null);
    const result: ProjectPreviewLoadResult = { ok: true, state, issue: null };
    emitPreviewSuccessEvent(reason, result);
    notifyProjectPreviewRenderer(state);
    return result;
  } catch {
    return failPreview(createIssue("protocol-error", "Preview failed while preparing the requested target.", null, "load", loadId), reason);
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
  clearProjectDomSnapshot();
  eventBus.emit({ type: projectPreviewEventTypes.projectPreviewTargetChanged, payload: { target: null, state }, createdAt: Date.now() });
  notifyProjectPreviewRenderer(state);
  return state;
}

export function prepareProjectPreviewForScanResult(): ProjectPreviewState {
  const scanResult = getCurrentProjectScanResult();
  const selection = selectProjectPreviewTarget(scanResult);
  const issues = selection.issue ? [selection.issue] : [];
  const state = patchPreview({ ...initialProjectPreviewState, rootPath: scanResult?.rootPath ?? null, target: selection.target, status: selection.ok ? "idle" : "failed", lastError: selection.issue?.message ?? null, lastIssueAt: getLastProjectPreviewIssueTimestamp(issues), issueCount: getProjectPreviewIssueCount(issues), isSyncedWithProjectGraph: Boolean(selection.ok), issues });
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

export function reportProjectPreviewResourceIssue(issue: ProjectPreviewIssue): ProjectPreviewState {
  const currentState = getProjectPreviewState();
  if (!isPreviewIssueRelevantToCurrentTarget(issue, currentState)) return currentState;

  const issues = mergeProjectPreviewIssue(currentState.issues, issue);
  const state = patchPreview({ issues, issueCount: getProjectPreviewIssueCount(issues), lastIssueAt: getLastProjectPreviewIssueTimestamp(issues) });
  eventBus.emit({ type: projectPreviewEventTypes.projectPreviewIssueReported, payload: { issue, state }, createdAt: Date.now() });
  notifyProjectPreviewRenderer(state);
  return state;
}

function isPreviewIssueRelevantToCurrentTarget(issue: ProjectPreviewIssue, state: ProjectPreviewState): boolean {
  if (issue.source !== "protocol") return true;
  const target = state.target;
  if (!target) return false;

  const issuePath = normalizeProjectRelativeIssuePath(issue.relativePath ?? issue.path);
  if (!issuePath) return false;

  const targetPath = normalizeProjectRelativeIssuePath(target.relativePath);
  if (issuePath === targetPath) return !issue.loadId || issue.loadId === state.activeLoadId;
  if (!issue.loadId || issue.loadId !== state.activeLoadId) return false;

  if (target.directDependencyRelativePaths.some((relativePath) => normalizeProjectRelativeIssuePath(relativePath) === issuePath)) return true;
  return target.dependencies.some((dependency) => isPreviewIssuePathForDependency(issuePath, target, dependency));
}

function isPreviewIssuePathForDependency(issuePath: string, target: ProjectPreviewTarget, dependency: ProjectDependency): boolean {
  if (dependency.isExternal) return false;
  if (dependency.resolvedPath && normalizeProjectRelativeIssuePath(dependency.resolvedPath) === issuePath) return true;
  const dependencyPath = resolveDependencySpecifierPath(target.relativePath, dependency.normalizedSpecifier);
  return dependencyPath === issuePath;
}

function resolveDependencySpecifierPath(fromPath: string, specifier: string): string | null {
  if (!specifier || specifier.startsWith("#") || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(specifier)) return null;
  const normalizedFromPath = normalizeProjectRelativeIssuePath(fromPath);
  const baseDirectory = normalizedFromPath ? path.posix.dirname(normalizedFromPath) : ".";
  const joined = specifier.startsWith("/") ? specifier.slice(1) : path.posix.join(baseDirectory === "." ? "" : baseDirectory, specifier);
  return normalizeProjectRelativeIssuePath(joined);
}

function normalizeProjectRelativeIssuePath(value: string | null): string | null {
  if (!value) return null;
  const normalized = path.posix.normalize(value.replace(/\\/g, "/").replace(/^\.\//, ""));
  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized === ".." || path.posix.isAbsolute(normalized)) return null;
  return normalized;
}

function createProjectPreviewLoadId(): ProjectPreviewLoadId {
  previewLoadCounter = previewLoadCounter >= Number.MAX_SAFE_INTEGER ? 1 : previewLoadCounter + 1;
  return `${Date.now().toString(36)}-${previewLoadCounter.toString(36)}`;
}

function patchPreview(patch: Partial<ProjectPreviewState>): ProjectPreviewState { appState.patchProjectPreview(patch); return appState.getSnapshot().preview; }
function failWithCurrentState(code: ProjectPreviewIssue["code"], message: string, issuePath: string | null): ProjectPreviewLoadResult { const issue = createIssue(code, message, issuePath, "load", getProjectPreviewState().activeLoadId); return { ok: false, state: getProjectPreviewState(), issue }; }
function failPreview(issue: ProjectPreviewIssue, reason: ProjectPreviewReloadReason): ProjectPreviewLoadResult { const issues = mergeProjectPreviewIssue(getProjectPreviewState().issues, issue); const state = patchPreview({ status: "failed", lastError: issue.message, lastReloadReason: reason, isSyncedWithProjectGraph: false, issues, issueCount: getProjectPreviewIssueCount(issues), lastIssueAt: getLastProjectPreviewIssueTimestamp(issues) }); const result: ProjectPreviewLoadResult = { ok: false, state, issue }; emitPreviewFailureEvent(reason, issue, state); notifyProjectPreviewRenderer(state); return result; }
function emitPreviewRequestEvent(reason: ProjectPreviewReloadReason): void { const eventType = reason === "watch" ? projectPreviewEventTypes.projectPreviewReloadRequested : projectPreviewEventTypes.projectPreviewLoadRequested; eventBus.emit({ type: eventType, payload: { state: getProjectPreviewState() }, createdAt: Date.now() }); }
function emitPreviewSuccessEvent(reason: ProjectPreviewReloadReason, result: ProjectPreviewLoadResult): void { const eventType = reason === "watch" ? projectPreviewEventTypes.projectPreviewReloaded : projectPreviewEventTypes.projectPreviewLoaded; eventBus.emit({ type: eventType, payload: { result }, createdAt: Date.now() }); }
function emitPreviewFailureEvent(reason: ProjectPreviewReloadReason, issue: ProjectPreviewIssue, state: ProjectPreviewState): void { const eventType = reason === "watch" ? projectPreviewEventTypes.projectPreviewReloadFailed : projectPreviewEventTypes.projectPreviewLoadFailed; eventBus.emit({ type: eventType, payload: { issue, state }, createdAt: Date.now() }); }
function notifyProjectPreviewRenderer(state: ProjectPreviewState): void { for (const browserWindow of BrowserWindow.getAllWindows()) if (!browserWindow.isDestroyed()) browserWindow.webContents.send(crystalIpcChannels.projectPreviewUpdated, state); }
function createIssue(code: ProjectPreviewIssue["code"], message: string, issuePath: string | null, source: ProjectPreviewIssue["source"], loadId: ProjectPreviewLoadId | null): ProjectPreviewIssue { return createProjectPreviewIssue({ code, message, path: issuePath, loadId, source }); }
