export const VALIDATION_PASS_STATUS = "PASS";
export const VALIDATION_FAIL_STATUS = "FAIL";
export const VALIDATION_SKIPPED_STATUS = "SKIPPED";

export const VALIDATION_FAILURE_NONE = "none";
export const VALIDATION_FAILURE_COMMAND_EXECUTION = "command-execution";
export const VALIDATION_FAILURE_MISSING_NPM_SCRIPT = "missing-npm-script";
export const VALIDATION_FAILURE_MISSING_DIRECT_SCRIPT = "missing-direct-script";
export const VALIDATION_FAILURE_VALIDATOR = "validator-failure";
export const VALIDATION_FAILURE_SKIPPED = "skipped";

export function createValidationResult({
  id,
  label,
  category,
  status,
  durationMs,
  command,
  executedCommand = command,
  executionMode = "unknown",
  exitCode = null,
  stdout = "",
  stderr = "",
  errors = [],
  hints = [],
  failureType = VALIDATION_FAILURE_NONE
}) {
  return {
    id,
    label,
    category,
    status,
    durationMs,
    command,
    executedCommand,
    executionMode,
    exitCode,
    stdout,
    stderr,
    errors,
    hints,
    failureType
  };
}

export function isFailingValidationResult(result, options = {}) {
  if (result.status === VALIDATION_FAIL_STATUS) return true;
  if (result.status === VALIDATION_SKIPPED_STATUS && !options.allowSkips) return true;
  return false;
}
