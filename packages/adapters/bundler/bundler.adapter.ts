export interface BundleInput {
  readonly entryPoint: string;
  readonly outputFile: string;
  readonly platform: "node" | "browser";
}

export interface BundlerAdapter {
  bundle(input: BundleInput): Promise<void>;
}
