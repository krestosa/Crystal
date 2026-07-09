export const VALIDATION_PASS_STATUS = "PASS";
export const VALIDATION_FAIL_STATUS = "FAIL";
export const VALIDATION_SKIPPED_STATUS = "SKIPPED";

export function createValidationResult({
  id,
  label,
  category,
  status,
  durationMs,
  command,
  exitCode = null,
  stdout = "",
  stderr = "",
  errors = [],
  hints = []
}) {
  return {
    id,
    label,
    category,
    status,
    durationMs,
    command,
    exitCode,
    stdout,
    stderr,
    errors,
    hints
  };
}

export function isFailingValidationResult(result, options = {}) {
  if (result.status === VALIDATION_FAIL_STATUS) return true;
  if (result.status === VALIDATION_SKIPPED_STATUS && !options.allowSkips) return true;
  return false;
}
