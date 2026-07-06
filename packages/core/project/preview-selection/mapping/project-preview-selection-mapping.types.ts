export type ProjectPreviewSelectionMappingStatus =
  | "unknown"
  | "matched"
  | "mismatched"
  | "ambiguous"
  | "stale"
  | "missing-snapshot";

export interface ProjectPreviewSelectionMappingMetadata {
  readonly mappingStatus: ProjectPreviewSelectionMappingStatus;
  readonly mappedSnapshotPath: string | null;
  readonly mappingReason: string | null;
  readonly mappingCheckedAt: number | null;
  readonly snapshotGeneratedAt: number | null;
}
