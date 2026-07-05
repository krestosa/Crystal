export interface WasmEngineStatus {
  readonly ready: false;
  readonly reason: "phase-8-not-implemented";
}

export const wasmEngineStatus: WasmEngineStatus = {
  ready: false,
  reason: "phase-8-not-implemented"
};
