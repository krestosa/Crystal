export interface CrystalPreloadApi {
  readonly app: {
    readonly getVersion: () => Promise<string>;
    readonly getPlatform: () => Promise<NodeJS.Platform>;
  };
}
