import { app, BrowserWindow, ipcMain } from "electron";
import { crystalIpcChannels } from "../../../../../packages/shared/constants/ipc.constants";

export function registerAppIpcHandlers(): void {
  ipcMain.handle(crystalIpcChannels.appGetVersion, () => app.getVersion());
  ipcMain.handle(crystalIpcChannels.appGetPlatform, () => process.platform);
  ipcMain.handle(crystalIpcChannels.appOpenDevTools, (event) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    if (!ownerWindow || ownerWindow.isDestroyed()) return false;
    ownerWindow.webContents.openDevTools({ mode: "detach" });
    return true;
  });
}
