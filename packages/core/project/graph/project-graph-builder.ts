import { projectFileKinds } from "../files/project-file-kind.constants";
import type { ProjectAsset, ProjectDependency, ProjectFile, ProjectFileKind, ProjectGraph, ProjectPage, ProjectScanIssue } from "./project-graph.types";

export function createProjectGraph(input: {
  readonly rootPath: string;
  readonly files: readonly ProjectFile[];
  readonly pages: readonly ProjectPage[];
  readonly assets: readonly ProjectAsset[];
  readonly dependencies: readonly ProjectDependency[];
  readonly issues: readonly ProjectScanIssue[];
  readonly timestamp: number;
}): ProjectGraph {
  const filesByKind = createEmptyKindRecord();
  for (const file of input.files) filesByKind[file.kind] += 1;
  return {
    root: input.rootPath,
    files: input.files,
    pages: input.pages,
    assets: input.assets,
    dependencies: input.dependencies,
    issues: input.issues,
    summary: {
      totalFiles: input.files.length,
      totalPages: input.pages.length,
      totalAssets: input.assets.length,
      totalDependencies: input.dependencies.length,
      missingDependencies: input.dependencies.filter((dependency) => dependency.status === "missing").length,
      filesByKind
    },
    createdAt: input.timestamp,
    updatedAt: input.timestamp
  };
}

function createEmptyKindRecord(): Record<ProjectFileKind, number> {
  const record = {} as Record<ProjectFileKind, number>;
  for (const kind of Object.values(projectFileKinds) as ProjectFileKind[]) record[kind] = 0;
  return record;
}
