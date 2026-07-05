import { app, ipcMain } from "electron";
import { crystalIpcChannels } from "../../../../../packages/shared/constants/ipc.constants";

export function registerAppIpcHandlers(): void {
  ipcMain.handle(crystalIpcChannels.appGetVersion, () => app.getVersion());
  ipcMain.handle(crystalIpcChannels.appGetPlatform, () => process.platform);
}
