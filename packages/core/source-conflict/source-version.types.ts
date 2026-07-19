export type SourceVersion = `sha256:${number}:${string}`;

export interface ParsedSourceVersion {
  readonly token: SourceVersion;
  readonly algorithm: "sha256";
  readonly byteLength: number;
  readonly digestHex: string;
}

export type SourceVersionParseFailureReason =
  | "not-a-string"
  | "empty"
  | "invalid-format"
  | "invalid-byte-length"
  | "invalid-digest";

export type SourceVersionParseResult =
  | { readonly valid: true; readonly value: ParsedSourceVersion }
  | { readonly valid: false; readonly reason: SourceVersionParseFailureReason };

export type SourceVersionComparison =
  | { readonly status: "match"; readonly expected: ParsedSourceVersion; readonly observed: ParsedSourceVersion }
  | { readonly status: "mismatch"; readonly expected: ParsedSourceVersion; readonly observed: ParsedSourceVersion }
  | { readonly status: "invalid-expected"; readonly reason: SourceVersionParseFailureReason }
  | { readonly status: "invalid-observed"; readonly reason: SourceVersionParseFailureReason }
  | { readonly status: "unavailable"; readonly missing: "expected" | "observed" | "both" };

export type SourceRevisionReadFailureStatus =
  | "invalid-path"
  | "outside-root"
  | "missing"
  | "not-file"
  | "too-large"
  | "unreadable";

export type SourceRevisionReadFailureReason =
  | "project-root-empty"
  | "project-root-not-absolute"
  | "project-root-null-byte"
  | "project-root-missing"
  | "project-root-not-directory"
  | "project-root-unreadable"
  | "relative-path-empty"
  | "relative-path-absolute"
  | "relative-path-dot-segment"
  | "relative-path-null-byte"
  | "max-bytes-invalid"
  | "lexical-root-escape"
  | "canonical-root-escape"
  | "source-file-missing"
  | "source-target-not-file"
  | "source-file-too-large"
  | "source-file-unreadable";

export interface SourceRevisionReadyResult {
  readonly status: "ready";
  readonly relativePath: string;
  readonly sourceVersion: SourceVersion;
  readonly byteLength: number;
}

export interface SourceRevisionFailureResult {
  readonly status: SourceRevisionReadFailureStatus;
  readonly reason: SourceRevisionReadFailureReason;
  readonly relativePath?: string;
  readonly byteLength?: number;
  readonly maxBytes?: number;
}

export type SourceRevisionReadResult = SourceRevisionReadyResult | SourceRevisionFailureResult;
