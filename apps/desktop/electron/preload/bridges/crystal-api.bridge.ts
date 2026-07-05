import { contextBridge, ipcRenderer } from "electron";
import { crystalIpcChannels } from "../../../../../packages/shared/constants/ipc.constants";
import type { CrystalIpcChannel, CrystalIpcResponseMap } from "../../../../../packages/shared/types/ipc.types";
import { isCrystalIpcChannel } from "../../../../../packages/shared/validators/ipc-channel.validator";
import type { CrystalPreloadApi } from "../types/preload-api.types";

function invokeCrystal<TChannel extends CrystalIpcChannel>(channel: TChannel): Promise<CrystalIpcResponseMap[TChannel]> {
  if (!isCrystalIpcChannel(channel)) return Promise.reject(new Error(`Invalid Crystal IPC channel: ${channel}`));
  return ipcRenderer.invoke(channel) as Promise<CrystalIpcResponseMap[TChannel]>;
}

const crystalApi: CrystalPreloadApi = {
  app: {
    getVersion: () => invokeCrystal(crystalIpcChannels.appGetVersion),
    getPlatform: () => invokeCrystal(crystalIpcChannels.appGetPlatform)
  },
  project: {
    openFolder: () => invokeCrystal(crystalIpcChannels.projectOpenFolder),
    openHtmlFile: () => invokeCrystal(crystalIpcChannels.projectOpenHtmlFile),
    scan: () => invokeCrystal(crystalIpcChannels.projectScan),
    getGraph: () => invokeCrystal(crystalIpcChannels.projectGetGraph)
  }
};

export function exposeCrystalApi(): void {
  contextBridge.exposeInMainWorld("crystal", crystalApi);
}
