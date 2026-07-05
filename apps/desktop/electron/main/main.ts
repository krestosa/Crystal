import { app } from "electron";
import { registerAppIpcHandlers } from "./ipc/register-app-ipc";
import { registerProjectIpcHandlers } from "./ipc/register-project-ipc";
import { stopProjectWatcher } from "./ipc/project-live-service";
import { registerProjectPreviewProtocolHandler, registerProjectPreviewProtocolPrivileges } from "./preview/project-preview-protocol";
import { createMainWindow } from "./windows/create-main-window";

registerProjectPreviewProtocolPrivileges();
registerAppIpcHandlers();
registerProjectIpcHandlers();

app.whenReady().then(() => {
  registerProjectPreviewProtocolHandler();
  void createMainWindow();

  app.on("activate", () => {
    void createMainWindow();
  });
});

app.on("before-quit", () => {
  void stopProjectWatcher();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
