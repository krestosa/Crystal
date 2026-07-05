import type { ProjectScanOptions, ProjectScanResult } from "../../project/graph/project-graph.types";
import type { CrystalCommand } from "../command.types";

export const projectCommandTypes = {
  openProjectFolder: "OpenProjectFolderCommand",
  openHtmlFile: "OpenHtmlFileCommand",
  scanProject: "ScanProjectCommand",
  refreshProjectGraph: "RefreshProjectGraphCommand"
} as const;

export type OpenProjectFolderCommand = CrystalCommand<{ readonly rootPath: string }, ProjectScanResult> & { readonly type: "OpenProjectFolderCommand" };
export type OpenHtmlFileCommand = CrystalCommand<{ readonly htmlFilePath: string }, ProjectScanResult> & { readonly type: "OpenHtmlFileCommand" };
export type ScanProjectCommand = CrystalCommand<{ readonly rootPath: string; readonly options?: ProjectScanOptions }, ProjectScanResult> & { readonly type: "ScanProjectCommand" };
export type RefreshProjectGraphCommand = CrystalCommand<{ readonly rootPath: string }, ProjectScanResult> & { readonly type: "RefreshProjectGraphCommand" };

export type ProjectCommand = OpenProjectFolderCommand | OpenHtmlFileCommand | ScanProjectCommand | RefreshProjectGraphCommand;
