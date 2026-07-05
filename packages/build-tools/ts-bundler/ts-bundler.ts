export interface TsBundleTarget {
  readonly name: "main" | "preload" | "renderer";
  readonly entryPoint: string;
  readonly outputFile: string;
}
