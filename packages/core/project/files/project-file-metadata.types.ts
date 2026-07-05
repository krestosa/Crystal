import type { ProjectFileKind, ProjectPath } from "../graph/project-graph.types";

export interface ProjectFileMetadata {
  readonly absolutePath: ProjectPath;
  readonly relativePath: ProjectPath;
  readonly mtimeMs: number;
  readonly size: number;
  readonly kind: ProjectFileKind;
  readonly dependencyCount: number;
  readonly isAsset: boolean;
  readonly isPage: boolean;
}

export interface ProjectFileMetadataStats {
  readonly mtimeMs: number;
  readonly size: number;
}

export interface ProjectFileMetadataFileSystem {
  readonly readFileMetadata: (absolutePath: ProjectPath) => Promise<ProjectFileMetadataStats>;
}
