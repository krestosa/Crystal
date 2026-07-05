import { contextBridge, ipcRenderer } from "electron";
import { crystalIpcChannels } from "../../../../../packages/shared/constants/ipc.constants";
import type { CrystalPreloadApi } from "../types/preload-api.types";

const crystalApi: CrystalPreloadApi = {
  app: {
    getVersion: () => ipcRenderer.invoke(crystalIpcChannels.appGetVersion),
    getPlatform: () => ipcRenderer.invoke(crystalIpcChannels.appGetPlatform)
  }
};

export function exposeCrystalApi(): void {
  contextBridge.exposeInMainWorld("crystal", crystalApi);
}
