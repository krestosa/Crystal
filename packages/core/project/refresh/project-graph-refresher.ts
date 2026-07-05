import { createProjectGraphRefreshPlan } from "./project-graph-refresh-plan";
import type { ProjectGraphRefreshResult } from "./project-graph-refresh.types";
import { readProjectFileMetadata } from "../files/project-file-metadata-reader";
import type { ProjectFileMetadataFileSystem } from "../files/project-file-metadata.types";
import type { ProjectScanResult } from "../graph/project-graph.types";
import type { ProjectScanner } from "../scanning/project-scanner";
import type { ProjectFileWatchEvent } from "../watching/project-watch.types";
import type { ProjectGraphCache } from "../cache/project-graph-cache.types";

export class ProjectGraphRefresher {
  constructor(
    private readonly scanner: ProjectScanner,
    private readonly cache?: ProjectGraphCache,
    private readonly metadataFileSystem?: ProjectFileMetadataFileSystem
  ) {}

  async refresh(rootPath: string, events: readonly ProjectFileWatchEvent[], currentResult: ProjectScanResult | null): Promise<ProjectGraphRefreshResult> {
    const startedAt = Date.now();
    const plan = createProjectGraphRefreshPlan(rootPath, events);
    if (plan.mode === "none" && currentResult) {
      return { rootPath, mode: "none", reason: plan.reason, result: currentResult, refreshedAt: startedAt, durationMs: Date.now() - startedAt };
    }

    const result = await this.scanner.scan(rootPath);
    const fileMetadata = await readProjectFileMetadata({ files: result.files, pages: result.pages, assets: result.assets, dependencies: result.dependencies, fileSystem: this.metadataFileSystem });
    this.cache?.save({ rootPath: result.rootPath, graph: result.graph, fileMetadata, scannedAt: result.scannedAt, issues: result.issues });
    return { rootPath: result.rootPath, mode: plan.mode === "none" ? "full" : plan.mode, reason: plan.reason, result, refreshedAt: Date.now(), durationMs: Date.now() - startedAt };
  }
}
