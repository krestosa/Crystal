export interface SassCompileInput {
  readonly sourceFile: string;
  readonly outputFile: string;
}

export interface SassCompilerAdapter {
  compile(input: SassCompileInput): Promise<void>;
}
