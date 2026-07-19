import type {
  ParsedSourceVersion,
  SourceVersion,
  SourceVersionComparison,
  SourceVersionParseResult
} from "./source-version.types";

const SOURCE_VERSION_PATTERN = /^sha256:(0|[1-9][0-9]*):([0-9a-f]{64})$/;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

export function formatSourceVersion(byteLength: number, digestHex: string): SourceVersion {
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
    throw new RangeError("Source version byteLength must be a non-negative safe integer.");
  }
  if (!SHA256_HEX_PATTERN.test(digestHex)) {
    throw new TypeError("Source version digest must contain exactly 64 lowercase hexadecimal characters.");
  }
  return `sha256:${byteLength}:${digestHex}` as SourceVersion;
}

export function parseSourceVersion(value: unknown): SourceVersionParseResult {
  if (typeof value !== "string") return { valid: false, reason: "not-a-string" };
  if (value.length === 0) return { valid: false, reason: "empty" };

  const match = SOURCE_VERSION_PATTERN.exec(value);
  if (!match) {
    if (!value.startsWith("sha256:")) return { valid: false, reason: "invalid-format" };
    const parts = value.split(":");
    if (parts.length !== 3) return { valid: false, reason: "invalid-format" };
    if (!/^(0|[1-9][0-9]*)$/.test(parts[1] ?? "")) return { valid: false, reason: "invalid-byte-length" };
    if (!SHA256_HEX_PATTERN.test(parts[2] ?? "")) return { valid: false, reason: "invalid-digest" };
    return { valid: false, reason: "invalid-format" };
  }

  const byteLength = Number(match[1]);
  if (!Number.isSafeInteger(byteLength)) return { valid: false, reason: "invalid-byte-length" };

  const token = value as SourceVersion;
  const parsed: ParsedSourceVersion = {
    token,
    algorithm: "sha256",
    byteLength,
    digestHex: match[2]
  };
  return { valid: true, value: parsed };
}

export function validateSourceVersion(value: unknown): value is SourceVersion {
  return parseSourceVersion(value).valid;
}

export function compareSourceVersions(expected: unknown, observed: unknown): SourceVersionComparison {
  const expectedMissing = expected === undefined || expected === null;
  const observedMissing = observed === undefined || observed === null;
  if (expectedMissing || observedMissing) {
    return {
      status: "unavailable",
      missing: expectedMissing && observedMissing ? "both" : expectedMissing ? "expected" : "observed"
    };
  }

  const parsedExpected = parseSourceVersion(expected);
  if (!parsedExpected.valid) return { status: "invalid-expected", reason: parsedExpected.reason };

  const parsedObserved = parseSourceVersion(observed);
  if (!parsedObserved.valid) return { status: "invalid-observed", reason: parsedObserved.reason };

  return parsedExpected.value.token === parsedObserved.value.token
    ? { status: "match", expected: parsedExpected.value, observed: parsedObserved.value }
    : { status: "mismatch", expected: parsedExpected.value, observed: parsedObserved.value };
}
