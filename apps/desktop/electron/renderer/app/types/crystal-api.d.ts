import type { CrystalPreloadApi } from "../../../preload/types/preload-api.types";

declare global {
  interface Window {
    readonly crystal: CrystalPreloadApi;
  }
}

export {};
