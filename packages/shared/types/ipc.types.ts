export type CrystalIpcChannel = "app:get-version" | "app:get-platform";

export interface CrystalIpcRequestMap {
  readonly "app:get-version": void;
  readonly "app:get-platform": void;
}

export interface CrystalIpcResponseMap {
  readonly "app:get-version": string;
  readonly "app:get-platform": NodeJS.Platform;
}
