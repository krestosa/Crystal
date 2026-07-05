import { dialog, ipcMain } from "electron";
import path from "node:path";
import { crystalIpcChannels } from "../../../../../packages/shared/constants/ipc.constants";
import { getCurrentProjectRoot, getCurrentProjectScanResult } from "./project-ipc-state";
import { scanProjectRoot } from "./project-scan-service";

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
}
