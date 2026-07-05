export interface AssetPipelineStatus {
  readonly ready: false;
  readonly reason: "asset-pipeline-not-implemented";
}

export const assetPipelineStatus: AssetPipelineStatus = {
  ready: false,
  reason: "asset-pipeline-not-implemented"
};
