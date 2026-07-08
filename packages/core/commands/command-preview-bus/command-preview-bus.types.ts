import type { SourcePatchPreview } from "../../source-patch";

export type CommandPreviewStatus = "preview-ready" | "blocked" | "invalid" | "unsupported";

export interface CommandEnvelope<TPayload = unknown> {
  readonly commandId: string;
  readonly commandKind: string;
  readonly source: string;
  readonly createdAt: number;
  readonly payload: TPayload;
  readonly dryRun: true;
}

export interface CommandPreviewResult {
  readonly commandId: string;
  readonly commandKind: string;
  readonly status: CommandPreviewStatus;
  readonly sourcePatchPreview?: SourcePatchPreview;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly humanSummary: string;
}

export interface CommandExecutionBlocker {
  readonly ok: false;
  readonly reason: string;
  readonly commandKind: string;
}

export interface CommandBusValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export type CommandPreviewPlanner<TPayload = unknown, TContext = unknown> = (envelope: CommandEnvelope<TPayload>, context: TContext) => CommandPreviewResult;
