import { dialog, ipcMain } from "electron";
import path from "node:path";
import { crystalIpcChannels } from "../../../../../packages/shared/constants/ipc.constants";
import type { ProjectPreviewSetTargetRequest } from "../../../../../packages/core/project/preview/project-preview.types";
import { buildProjectDomSnapshotFromPreviewTarget, clearProjectDomSnapshot, getProjectDomSnapshotState } from "../dom/project-dom-snapshot-service";
import { getCurrentProjectRoot, getCurrentProjectScanResult } from "./project-ipc-state";
import { scanProjectRoot } from "./project-scan-service";
import { clearProjectGraphCache, getProjectWatcherState, refreshProjectGraphFromRenderer, startProjectWatcher, stopProjectWatcher } from "./project-live-service";
import { getProjectPreviewState, loadProjectPreview, reloadProjectPreview, setProjectPreviewTarget } from "../preview/project-preview-service";

export function registerProjectIpcHandlers(): void {
  ipcMain.handle(crystalIpcChannels.projectOpenFolder, async () => {
    const result = await dialog.showOpenDialog({ title: "Open Crystal Project Folder", properties: ["openDirectory"] });
    if (result.canceled || !result.filePaths[0]) return null;
    return scanProjectRoot(result.filePaths[0]);
  });

  ipcMain.handle(crystalIpcChannels.projectOpenHtmlFile, async () => {
    const result = await dialog.showOpenDialog({ title: "Open HTML File", properties: ["openFile"], filters: [{ name: "HTML", extensions: ["html", "htm"] }] });
    if (result.canceled || !result.filePaths[0]) return null;
    return scanProjectRoot(path.dirname(result.filePaths[0]));
  });

  ipcMain.handle(crystalIpcChannels.projectScan, async () => {
    const rootPath = getCurrentProjectRoot();
    if (!rootPath) throw new Error("No project root is open.");
    return scanProjectRoot(rootPath);
  });

  ipcMain.handle(crystalIpcChannels.projectGetGraph, () => getCurrentProjectScanResult()?.graph ?? null);
  ipcMain.handle(crystalIpcChannels.projectStartWatcher, () => startProjectWatcher());
  ipcMain.handle(crystalIpcChannels.projectStopWatcher, () => stopProjectWatcher());
  ipcMain.handle(crystalIpcChannels.projectGetWatcherState, () => getProjectWatcherState());
  ipcMain.handle(crystalIpcChannels.projectRefreshGraph, () => refreshProjectGraphFromRenderer());
  ipcMain.handle(crystalIpcChannels.projectClearCache, () => clearProjectGraphCache());
  ipcMain.handle(crystalIpcChannels.projectPreviewLoad, () => loadProjectPreview("manual"));
  ipcMain.handle(crystalIpcChannels.projectPreviewReload, () => reloadProjectPreview("manual"));
  ipcMain.handle(crystalIpcChannels.projectPreviewSetTarget, (_event, request: ProjectPreviewSetTargetRequest | null) => {
    if (!request || typeof request.relativePath !== "string") throw new Error("Invalid preview target request.");
    return setProjectPreviewTarget(request.relativePath);
  });
  ipcMain.handle(crystalIpcChannels.projectPreviewGetState, () => getProjectPreviewState());
  ipcMain.handle(crystalIpcChannels.projectDomSnapshotBuild, () => buildProjectDomSnapshotFromPreviewTarget());
  ipcMain.handle(crystalIpcChannels.projectDomSnapshotGetState, () => getProjectDomSnapshotState());
  ipcMain.handle(crystalIpcChannels.projectDomSnapshotClear, () => clearProjectDomSnapshot());
}
