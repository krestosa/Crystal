export interface SelectionEngineStatus {
  readonly ready: false;
  readonly reason: "phase-3-not-implemented";
}

export const selectionEngineStatus: SelectionEngineStatus = {
  ready: false,
  reason: "phase-3-not-implemented"
};
