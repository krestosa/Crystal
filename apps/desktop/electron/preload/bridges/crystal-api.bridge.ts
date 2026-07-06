import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { crystalIpcChannels } from "../../../../../packages/shared/constants/ipc.constants";
import type { CrystalIpcChannel, CrystalIpcResponseMap } from "../../../../../packages/shared/types/ipc.types";
import { isCrystalIpcChannel } from "../../../../../packages/shared/validators/ipc-channel.validator";
import type { CrystalPreloadApi } from "../types/preload-api.types";

function invokeCrystal<TChannel extends CrystalIpcChannel>(channel: TChannel): Promise<CrystalIpcResponseMap[TChannel]> {
  if (!isCrystalIpcChannel(channel)) return Promise.reject(new Error("Invalid Crystal IPC channel."));
  return ipcRenderer.invoke(channel) as Promise<CrystalIpcResponseMap[TChannel]>;
}

function invokePreviewTarget(relativePath: string): Promise<CrystalIpcResponseMap["project:preview-set-target"]> {
  return ipcRenderer.invoke(crystalIpcChannels.projectPreviewSetTarget, { relativePath }) as Promise<CrystalIpcResponseMap["project:preview-set-target"]>;
}

function invokePreviewSelectedNode(payload: unknown): Promise<CrystalIpcResponseMap["project:preview-selection:set-selected-node"]> {
  return ipcRenderer.invoke(crystalIpcChannels.projectPreviewSelectionSetSelectedNode, payload) as Promise<CrystalIpcResponseMap["project:preview-selection:set-selected-node"]>;
}

function onCrystal<TChannel extends CrystalIpcChannel>(channel: TChannel, listener: (payload: CrystalIpcResponseMap[TChannel]) => void): () => void {
  if (!isCrystalIpcChannel(channel)) throw new Error("Invalid Crystal IPC channel.");
  const subscription = (_event: IpcRendererEvent, payload: CrystalIpcResponseMap[TChannel]) => listener(payload);
  ipcRenderer.on(channel, subscription);
  return () => ipcRenderer.removeListener(channel, subscription);
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
    getGraph: () => invokeCrystal(crystalIpcChannels.projectGetGraph),
    startWatcher: () => invokeCrystal(crystalIpcChannels.projectStartWatcher),
    stopWatcher: () => invokeCrystal(crystalIpcChannels.projectStopWatcher),
    getWatcherState: () => invokeCrystal(crystalIpcChannels.projectGetWatcherState),
    refreshGraph: () => invokeCrystal(crystalIpcChannels.projectRefreshGraph),
    clearCache: () => invokeCrystal(crystalIpcChannels.projectClearCache),
    loadPreview: () => invokeCrystal(crystalIpcChannels.projectPreviewLoad),
    reloadPreview: () => invokeCrystal(crystalIpcChannels.projectPreviewReload),
    setPreviewTarget: (relativePath) => invokePreviewTarget(relativePath),
    getPreviewState: () => invokeCrystal(crystalIpcChannels.projectPreviewGetState),
    buildDomSnapshot: () => invokeCrystal(crystalIpcChannels.projectDomSnapshotBuild),
    getDomSnapshotState: () => invokeCrystal(crystalIpcChannels.projectDomSnapshotGetState),
    clearDomSnapshot: () => invokeCrystal(crystalIpcChannels.projectDomSnapshotClear),
    getPreviewSelectionState: () => invokeCrystal(crystalIpcChannels.projectPreviewSelectionGetState),
    enablePreviewSelection: () => invokeCrystal(crystalIpcChannels.projectPreviewSelectionEnable),
    disablePreviewSelection: () => invokeCrystal(crystalIpcChannels.projectPreviewSelectionDisable),
    clearPreviewSelection: () => invokeCrystal(crystalIpcChannels.projectPreviewSelectionClear),
    setPreviewSelectedNode: (payload) => invokePreviewSelectedNode(payload),
    onWatcherStateChanged: (listener) => onCrystal(crystalIpcChannels.projectWatcherUpdated, listener),
    onPreviewStateChanged: (listener) => onCrystal(crystalIpcChannels.projectPreviewUpdated, listener),
    onDomSnapshotStateChanged: (listener) => onCrystal(crystalIpcChannels.projectDomSnapshotUpdated, listener),
    onPreviewSelectionStateChanged: (listener) => onCrystal(crystalIpcChannels.projectPreviewSelectionStateChanged, listener)
  }
};

export function exposeCrystalApi(): void {
  contextBridge.exposeInMainWorld("crystal", crystalApi);
}
