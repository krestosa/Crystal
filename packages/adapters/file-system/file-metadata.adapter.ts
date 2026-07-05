import { stat } from "node:fs/promises";
import type { ProjectFileMetadataFileSystem, ProjectFileMetadataStats } from "../../core/project/files/project-file-metadata.types";

export class NodeFileMetadataAdapter implements ProjectFileMetadataFileSystem {
  async readFileMetadata(absolutePath: string): Promise<ProjectFileMetadataStats> {
    const entryStats = await stat(absolutePath);
    return { mtimeMs: entryStats.mtimeMs, size: entryStats.size };
  }
}
