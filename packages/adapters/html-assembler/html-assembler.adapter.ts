export interface HtmlAssembleInput {
  readonly sourceFile: string;
  readonly outputFile: string;
}

export interface HtmlAssemblerAdapter {
  assemble(input: HtmlAssembleInput): Promise<void>;
}
