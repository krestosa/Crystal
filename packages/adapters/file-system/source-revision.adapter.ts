import { createHash } from "node:crypto";
import { open, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { formatSourceVersion } from "../../core/source-conflict";
import type {
  SourceRevisionFailureResult,
  SourceRevisionReadFailureReason,
  SourceRevisionReadFailureStatus,
  SourceRevisionReadResult
} from "../../core/source-conflict";

export interface ReadSourceRevisionInput {
  readonly projectRoot: string;
  readonly relativePath: string;
  readonly maxBytes: number;
}

const READ_CHUNK_SIZE = 64 * 1024;

export async function readSourceRevision(input: ReadSourceRevisionInput): Promise<SourceRevisionReadResult> {
  const validationFailure = validateInput(input);
  if (validationFailure) return validationFailure;

  let canonicalRoot: string;
  try {
    canonicalRoot = await realpath(input.projectRoot);
  } catch (error) {
    return failure(mapMissingOrUnreadable(error), mapRootFailureReason(error));
  }

  let rootStats: Awaited<ReturnType<typeof stat>>;
  try {
    rootStats = await stat(canonicalRoot);
  } catch (error) {
    return failure(mapMissingOrUnreadable(error), mapRootFailureReason(error));
  }
  if (!rootStats.isDirectory()) return failure("invalid-path", "project-root-not-directory");

  const normalizedRelativePath = normalizeRelativePath(input.relativePath);
  const lexicalTarget = path.resolve(canonicalRoot, ...normalizedRelativePath.split("/"));
  if (!isCanonicalPathInsideRoot(canonicalRoot, lexicalTarget)) {
    return failure("outside-root", "lexical-root-escape", normalizedRelativePath);
  }

  let canonicalTarget: string;
  try {
    canonicalTarget = await realpath(lexicalTarget);
  } catch (error) {
    const status = mapMissingOrUnreadable(error);
    const reason = status === "missing" ? "source-file-missing" : "source-file-unreadable";
    return failure(status, reason, normalizedRelativePath);
  }

  if (!isCanonicalPathInsideRoot(canonicalRoot, canonicalTarget)) {
    return failure("outside-root", "canonical-root-escape", normalizedRelativePath);
  }

  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(canonicalTarget, "r");
    const fileStats = await handle.stat();
    if (!fileStats.isFile()) return failure("not-file", "source-target-not-file", normalizedRelativePath);
    if (fileStats.size > input.maxBytes) {
      return failure("too-large", "source-file-too-large", normalizedRelativePath, fileStats.size, input.maxBytes);
    }

    const bytes = await readBoundedBytes(handle, input.maxBytes);
    if (bytes === null) {
      return failure("too-large", "source-file-too-large", normalizedRelativePath, input.maxBytes + 1, input.maxBytes);
    }

    const digestHex = createHash("sha256").update(bytes).digest("hex");
    return {
      status: "ready",
      relativePath: normalizedRelativePath,
      sourceVersion: formatSourceVersion(bytes.byteLength, digestHex),
      byteLength: bytes.byteLength
    };
  } catch {
    return failure("unreadable", "source-file-unreadable", normalizedRelativePath);
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

export function isCanonicalPathInsideRoot(canonicalRoot: string, canonicalTarget: string): boolean {
  const relative = path.relative(path.resolve(canonicalRoot), path.resolve(canonicalTarget));
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function validateInput(input: ReadSourceRevisionInput): SourceRevisionFailureResult | null {
  if (typeof input.projectRoot !== "string" || input.projectRoot.trim() === "") {
    return failure("invalid-path", "project-root-empty");
  }
  if (input.projectRoot.includes("\0")) {
    return failure("invalid-path", "project-root-null-byte");
  }
  if (!path.isAbsolute(input.projectRoot)) {
    return failure("invalid-path", "project-root-not-absolute");
  }
  if (typeof input.relativePath !== "string" || input.relativePath.trim() === "") {
    return failure("invalid-path", "relative-path-empty");
  }
  if (input.relativePath.includes("\0")) {
    return failure("invalid-path", "relative-path-null-byte");
  }
  if (isAbsoluteOnAnySupportedPlatform(input.relativePath)) {
    return failure("invalid-path", "relative-path-absolute");
  }
  const segments = input.relativePath.split(/[\\/]+/);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return failure("invalid-path", "relative-path-dot-segment");
  }
  if (!Number.isSafeInteger(input.maxBytes) || input.maxBytes < 0) {
    return failure("invalid-path", "max-bytes-invalid");
  }
  return null;
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(/[\\/]+/).filter(Boolean).join("/");
}

function isAbsoluteOnAnySupportedPlatform(value: string): boolean {
  return path.isAbsolute(value) || path.win32.isAbsolute(value) || path.posix.isAbsolute(value);
}

async function readBoundedBytes(handle: Awaited<ReturnType<typeof open>>, maxBytes: number): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let total = 0;
  let position = 0;

  while (total <= maxBytes) {
    const remainingCapacity = maxBytes + 1 - total;
    if (remainingCapacity <= 0) return null;
    const buffer = Buffer.allocUnsafe(Math.min(READ_CHUNK_SIZE, remainingCapacity));
    const { bytesRead } = await handle.read(buffer, 0, buffer.byteLength, position);
    if (bytesRead === 0) break;
    chunks.push(buffer.subarray(0, bytesRead));
    total += bytesRead;
    position += bytesRead;
  }

  if (total > maxBytes) return null;
  return Buffer.concat(chunks, total);
}

function mapMissingOrUnreadable(error: unknown): SourceRevisionReadFailureStatus {
  const code = getErrorCode(error);
  return code === "ENOENT" || code === "ENOTDIR" ? "missing" : "unreadable";
}

function mapRootFailureReason(error: unknown): SourceRevisionReadFailureReason {
  const code = getErrorCode(error);
  return code === "ENOENT" || code === "ENOTDIR" ? "project-root-missing" : "project-root-unreadable";
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  const code = error.code;
  return typeof code === "string" ? code : undefined;
}

function failure(
  status: SourceRevisionReadFailureStatus,
  reason: SourceRevisionReadFailureReason,
  relativePath?: string,
  byteLength?: number,
  maxBytes?: number
): SourceRevisionFailureResult {
  return {
    status,
    reason,
    relativePath,
    byteLength,
    maxBytes
  };
}
