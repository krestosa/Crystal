export type ProjectRoot = string;
export type ProjectPath = string;

export type ProjectFileKind =
  | "html"
  | "css"
  | "sass"
  | "javascript"
  | "typescript"
  | "image"
  | "svg"
  | "font"
  | "video"
  | "audio"
  | "asset"
  | "unknown";

export interface ProjectFile {
  readonly absolutePath: ProjectPath;
  readonly relativePath: ProjectPath;
  readonly name: string;
  readonly extension: string;
  readonly kind: ProjectFileKind;
  readonly sizeBytes: number;
  readonly isText: boolean;
  readonly isBinaryHeavy: boolean;
  readonly discoveredAt: number;
}

export interface ProjectPage {
  readonly absolutePath: ProjectPath;
  readonly relativePath: ProjectPath;
  readonly displayName: string;
  readonly isEntrypoint: boolean;
  readonly dependencies: readonly ProjectDependency[];
}

export type ProjectAssetKind = "image" | "svg" | "font" | "video" | "audio" | "other";

export interface ProjectAsset {
  readonly file: ProjectFile;
  readonly kind: ProjectAssetKind;
}

export type ProjectDependencyType =
  | "stylesheet"
  | "script"
  | "image"
  | "source"
  | "video"
  | "audio"
  | "iframe"
  | "svg"
  | "font"
  | "css-import"
  | "css-url"
  | "js-import"
  | "js-dynamic-import"
  | "commonjs-require"
  | "unknown";

export type ProjectDependencyStatus = "resolved" | "missing" | "external" | "unresolved";

export interface RawProjectDependency {
  readonly type: ProjectDependencyType;
  readonly fromPath: ProjectPath;
  readonly fromAbsolutePath: ProjectPath;
  readonly rawSpecifier: string;
  readonly source: "html" | "css" | "script";
  readonly line: number | null;
}

export interface ProjectDependency extends RawProjectDependency {
  readonly id: string;
  readonly normalizedSpecifier: string;
  readonly resolvedPath: ProjectPath | null;
  readonly resolvedAbsolutePath: ProjectPath | null;
  readonly status: ProjectDependencyStatus;
  readonly isExternal: boolean;
}

export type ProjectScanIssueSeverity = "info" | "warning" | "error";

export type ProjectScanIssueCode =
  | "missing-dependency"
  | "file-read-failed"
  | "scan-limit-reached"
  | "binary-file-skipped"
  | "unknown-file-kind";

export interface ProjectScanIssue {
  readonly code: ProjectScanIssueCode;
  readonly severity: ProjectScanIssueSeverity;
  readonly message: string;
  readonly filePath: ProjectPath | null;
  readonly dependencySpecifier?: string;
}

export interface ProjectScanOptions {
  readonly ignoredDirectoryNames?: readonly string[];
  readonly maxFiles?: number;
  readonly maxFileBytes?: number;
  readonly maxDepth?: number;
}

export interface ProjectGraphSummary {
  readonly totalFiles: number;
  readonly totalPages: number;
  readonly totalAssets: number;
  readonly totalDependencies: number;
  readonly missingDependencies: number;
  readonly filesByKind: Readonly<Record<ProjectFileKind, number>>;
}

export interface ProjectGraph {
  readonly root: ProjectRoot;
  readonly files: readonly ProjectFile[];
  readonly pages: readonly ProjectPage[];
  readonly assets: readonly ProjectAsset[];
  readonly dependencies: readonly ProjectDependency[];
  readonly issues: readonly ProjectScanIssue[];
  readonly summary: ProjectGraphSummary;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface ProjectScanResult {
  readonly rootPath: string;
  readonly files: readonly ProjectFile[];
  readonly pages: readonly ProjectPage[];
  readonly assets: readonly ProjectAsset[];
  readonly dependencies: readonly ProjectDependency[];
  readonly issues: readonly ProjectScanIssue[];
  readonly graph: ProjectGraph;
  readonly scannedAt: number;
}

export interface ProjectFileSystemEntry {
  readonly absolutePath: string;
  readonly name: string;
  readonly isDirectory: boolean;
  readonly sizeBytes: number;
}

export interface ProjectFileSystem {
  readonly readDirectory: (absolutePath: string) => Promise<readonly ProjectFileSystemEntry[]>;
  readonly readTextFile: (absolutePath: string, maxBytes: number) => Promise<string>;
}
