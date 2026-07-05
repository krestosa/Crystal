import path from "node:path";
import type { WebPreferences } from "electron";

export function getSecureWebPreferences(): WebPreferences {
  return {
    preload: path.resolve(__dirname, "../preload/preload.js"),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true
  };
}
