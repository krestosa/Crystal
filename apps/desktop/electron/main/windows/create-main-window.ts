import { BrowserWindow } from "electron";
import path from "node:path";
import { getSecureWebPreferences } from "../security/web-preferences";

const CRYSTAL_TITLE_BAR_OVERLAY_HEIGHT = 32;
const CRYSTAL_OPEN_DEVTOOLS = "1";

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
    backgroundColor: "#050403",
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#050403",
      symbolColor: "#f7f2ec",
      height: CRYSTAL_TITLE_BAR_OVERLAY_HEIGHT
    },
    webPreferences: getSecureWebPreferences()
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadFile(path.resolve(__dirname, "../renderer/index.html"));

  if (process.env.CRYSTAL_OPEN_DEVTOOLS === CRYSTAL_OPEN_DEVTOOLS) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  return mainWindow;
}
