import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_MAX_BUFFER_BYTES,
  DEFAULT_TIMEOUT_MS,
  PROCESS_FAILURE_TYPES,
  runExecutable
} from "../../scripts/tooling/process-runner.mjs";

const node = process.execPath;

test("process runner classifies command not found", () => {
  const result = runExecutable("crystal-command-that-does-not-exist", []);
  assert.equal(result.failureType, PROCESS_FAILURE_TYPES.COMMAND_NOT_FOUND);
  assert.equal(result.status, null);
});

test("process runner classifies nonzero exit", () => {
  const result = runExecutable(node, ["-e", "process.exit(1)"]);
  assert.equal(result.failureType, PROCESS_FAILURE_TYPES.PROCESS_EXIT_FAILURE);
  assert.equal(result.status, 1);
});

test("process runner classifies timeout", () => {
  const result = runExecutable(node, ["-e", "setTimeout(() => {}, 1000)"], { timeout: 30 });
  assert.equal(result.failureType, PROCESS_FAILURE_TYPES.PROCESS_TIMEOUT);
  assert.equal(result.timedOut, true);
});

test("process runner classifies output limit", () => {
  const result = runExecutable(node, ["-e", "process.stdout.write('x'.repeat(50000))"], { maxBuffer: 1024 });
  assert.equal(result.failureType, PROCESS_FAILURE_TYPES.PROCESS_OUTPUT_LIMIT);
  assert.equal(result.outputLimited, true);
});

test("process runner reports signal termination where supported", { skip: process.platform === "win32" }, () => {
  const result = runExecutable(node, ["-e", "process.kill(process.pid, 'SIGTERM')"]);
  assert.equal(result.failureType, PROCESS_FAILURE_TYPES.PROCESS_SIGNALLED);
  assert.equal(result.signal, "SIGTERM");
});

test("process runner preserves metacharacter and empty arguments", () => {
  const args = ["a b", "&", "|", "^", "(x)", '"quoted"', ""];
  const result = runExecutable(node, ["-e", "process.stdout.write(JSON.stringify(process.argv.slice(1)))", ...args]);
  assert.equal(result.failureType, null);
  assert.deepEqual(JSON.parse(result.stdout), args);
});

test("process runner captures normal stdout and stderr", () => {
  const result = runExecutable(node, ["-e", "process.stdout.write('out'); process.stderr.write('err')"]);
  assert.equal(result.stdout, "out");
  assert.equal(result.stderr, "err");
  assert.equal(result.status, 0);
});

test("process runner inherit mode remains successful", () => {
  const result = runExecutable(node, ["-e", "process.exit(0)"], { inherit: true });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});

test("throwOnError preserves normalized result", () => {
  assert.throws(
    () => runExecutable(node, ["-e", "process.exit(2)"], { throwOnError: true }),
    (error) => error.failureType === PROCESS_FAILURE_TYPES.PROCESS_EXIT_FAILURE && error.result.status === 2
  );
});

test("process runner duration and defaults are explicit", () => {
  const result = runExecutable(node, ["-e", "process.exit(0)"]);
  assert.ok(result.durationMs >= 0);
  assert.equal(result.timeout, DEFAULT_TIMEOUT_MS);
  assert.equal(result.maxBuffer, DEFAULT_MAX_BUFFER_BYTES);
});

test("process runner accepts maxBuffer and timeout overrides", () => {
  const result = runExecutable(node, ["-e", "process.exit(0)"], { timeout: 5000, maxBuffer: 4096 });
  assert.equal(result.timeout, 5000);
  assert.equal(result.maxBuffer, 4096);
});
