import type { ProjectScanOptions, ProjectScanResult } from "../../project/graph/project-graph.types";
import type { ProjectGraphRefreshResult } from "../../project/refresh/project-graph-refresh.types";
import type { ProjectWatcherState } from "../../project/watching/project-watch.types";
import type { CrystalCommand } from "../command.types";

export const projectCommandTypes = {
  openProjectFolder: "OpenProjectFolderCommand",
  openHtmlFile: "OpenHtmlFileCommand",
  scanProject: "ScanProjectCommand",
  refreshProjectGraph: "RefreshProjectGraphCommand",
  startProjectWatcher: "StartProjectWatcherCommand",
  stopProjectWatcher: "StopProjectWatcherCommand",
  refreshProjectGraphIncremental: "RefreshProjectGraphIncrementalCommand",
  invalidateProjectGraphCache: "InvalidateProjectGraphCacheCommand",
  clearProjectGraphCache: "ClearProjectGraphCacheCommand"
} as const;

export type OpenProjectFolderCommand = CrystalCommand<{ readonly rootPath: string }, ProjectScanResult> & { readonly type: "OpenProjectFolderCommand" };
export type OpenHtmlFileCommand = CrystalCommand<{ readonly htmlFilePath: string }, ProjectScanResult> & { readonly type: "OpenHtmlFileCommand" };
export type ScanProjectCommand = CrystalCommand<{ readonly rootPath: string; readonly options?: ProjectScanOptions }, ProjectScanResult> & { readonly type: "ScanProjectCommand" };
export type RefreshProjectGraphCommand = CrystalCommand<{ readonly rootPath: string }, ProjectScanResult> & { readonly type: "RefreshProjectGraphCommand" };
export type StartProjectWatcherCommand = CrystalCommand<{ readonly rootPath: string }, ProjectWatcherState> & { readonly type: "StartProjectWatcherCommand" };
export type StopProjectWatcherCommand = CrystalCommand<void, ProjectWatcherState> & { readonly type: "StopProjectWatcherCommand" };
export type RefreshProjectGraphIncrementalCommand = CrystalCommand<{ readonly rootPath: string }, ProjectGraphRefreshResult> & { readonly type: "RefreshProjectGraphIncrementalCommand" };
export type InvalidateProjectGraphCacheCommand = CrystalCommand<{ readonly rootPath: string; readonly reason: string }, void> & { readonly type: "InvalidateProjectGraphCacheCommand" };
export type ClearProjectGraphCacheCommand = CrystalCommand<{ readonly rootPath?: string }, void> & { readonly type: "ClearProjectGraphCacheCommand" };

export type ProjectCommand =
  | OpenProjectFolderCommand
  | OpenHtmlFileCommand
  | ScanProjectCommand
  | RefreshProjectGraphCommand
  | StartProjectWatcherCommand
  | StopProjectWatcherCommand
  | RefreshProjectGraphIncrementalCommand
  | InvalidateProjectGraphCacheCommand
  | ClearProjectGraphCacheCommand;
