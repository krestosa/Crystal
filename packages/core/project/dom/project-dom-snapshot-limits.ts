export interface ProjectDomSnapshotLimits {
  readonly maxNodes: number;
  readonly maxDepth: number;
  readonly maxTextPreviewLength: number;
  readonly maxAttributeValueLength: number;
  readonly maxAttributesPerNode: number;
}

export const defaultProjectDomSnapshotLimits: ProjectDomSnapshotLimits = {
  maxNodes: 500,
  maxDepth: 32,
  maxTextPreviewLength: 96,
  maxAttributeValueLength: 120,
  maxAttributesPerNode: 24
};
