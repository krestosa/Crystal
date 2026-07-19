import { projectFileKinds } from "./project-file-kind.constants";
import type { ProjectFileMetadata, ProjectFileMetadataFileSystem } from "./project-file-metadata.types";
import type { ProjectAsset, ProjectDependency, ProjectFile, ProjectPage } from "../graph/project-graph.types";

export async function readProjectFileMetadata(input: {
  readonly files: readonly ProjectFile[];
  readonly pages: readonly ProjectPage[];
  readonly assets: readonly ProjectAsset[];
  readonly dependencies: readonly ProjectDependency[];
  readonly fileSystem?: ProjectFileMetadataFileSystem;
}): Promise<readonly ProjectFileMetadata[]> {
  const pages = new Set(input.pages.map((page) => page.relativePath));
  const assets = new Set(input.assets.map((asset) => asset.file.relativePath));
  const dependencyCounts = countDependenciesByFile(input.dependencies);
  const metadata: ProjectFileMetadata[] = [];

  for (const file of input.files) {
    const stats = input.fileSystem ? await input.fileSystem.readFileMetadata(file.absolutePath) : { mtimeMs: file.modifiedAtMs, size: file.sizeBytes };
    metadata.push({
      absolutePath: file.absolutePath,
      relativePath: file.relativePath,
      mtimeMs: stats.mtimeMs,
      size: stats.size,
      kind: file.kind,
      dependencyCount: dependencyCounts.get(file.relativePath) ?? 0,
      isAsset: assets.has(file.relativePath) || isAssetKind(file.kind),
      isPage: pages.has(file.relativePath)
    });
  }

  return metadata;
}

function countDependenciesByFile(dependencies: readonly ProjectDependency[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const dependency of dependencies) counts.set(dependency.fromPath, (counts.get(dependency.fromPath) ?? 0) + 1);
  return counts;
}

function isAssetKind(kind: ProjectFile["kind"]): boolean {
  return kind === projectFileKinds.image || kind === projectFileKinds.svg || kind === projectFileKinds.font || kind === projectFileKinds.video || kind === projectFileKinds.audio || kind === projectFileKinds.asset;
}
