export interface PreviewEngineStatus {
  readonly ready: false;
  readonly reason: "phase-2-not-implemented";
}

export const previewEngineStatus: PreviewEngineStatus = {
  ready: false,
  reason: "phase-2-not-implemented"
};
