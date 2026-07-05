import { app } from "electron";
import { registerAppIpcHandlers } from "./ipc/register-app-ipc";
import { registerProjectIpcHandlers } from "./ipc/register-project-ipc";
import { createMainWindow } from "./windows/create-main-window";

registerAppIpcHandlers();
registerProjectIpcHandlers();

app.whenReady().then(() => {
  void createMainWindow();

  app.on("activate", () => {
    void createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
