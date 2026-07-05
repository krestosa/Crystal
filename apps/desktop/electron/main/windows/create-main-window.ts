import { BrowserWindow } from "electron";
import path from "node:path";
import { getSecureWebPreferences } from "../security/web-preferences";

let mainWindow: BrowserWindow | null = null;

export async function createMainWindow(): Promise<BrowserWindow> {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "Crystal",
    backgroundColor: "#0d1017",
    webPreferences: getSecureWebPreferences()
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadFile(path.resolve(__dirname, "../renderer/index.html"));
  return mainWindow;
}
