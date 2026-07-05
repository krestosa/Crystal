import { app } from "electron";
import { registerAppIpcHandlers } from "./ipc/register-app-ipc";
import { registerProjectIpcHandlers } from "./ipc/register-project-ipc";
import { stopProjectWatcher } from "./ipc/project-live-service";
import { createMainWindow } from "./windows/create-main-window";

registerAppIpcHandlers();
registerProjectIpcHandlers();

app.whenReady().then(() => {
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
