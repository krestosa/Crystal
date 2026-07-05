import type { ProjectScanResult } from "../../../../../packages/core/project/graph/project-graph.types";

let currentProjectRoot: string | null = null;
let currentScanResult: ProjectScanResult | null = null;

export function setCurrentProjectScanResult(result: ProjectScanResult): void {
  currentProjectRoot = result.rootPath;
  currentScanResult = result;
}

export function getCurrentProjectRoot(): string | null {
  return currentProjectRoot;
}

export function getCurrentProjectScanResult(): ProjectScanResult | null {
  return currentScanResult;
}
