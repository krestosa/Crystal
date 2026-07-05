export interface BuildManifestStatus {
  readonly ready: false;
  readonly reason: "manifest-builder-not-implemented";
}

export const buildManifestStatus: BuildManifestStatus = {
  ready: false,
  reason: "manifest-builder-not-implemented"
};
