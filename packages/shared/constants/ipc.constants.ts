export const crystalIpcChannels = {
  appGetVersion: "app:get-version",
  appGetPlatform: "app:get-platform",
  projectOpenFolder: "project:open-folder",
  projectOpenHtmlFile: "project:open-html-file",
  projectScan: "project:scan",
  projectGetGraph: "project:get-graph",
  projectStartWatcher: "project:start-watcher",
  projectStopWatcher: "project:stop-watcher",
  projectGetWatcherState: "project:get-watcher-state",
  projectRefreshGraph: "project:refresh-graph",
  projectClearCache: "project:clear-cache",
  projectWatcherUpdated: "project:watcher-updated"
} as const;
