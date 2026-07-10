import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCatalogScripts,
  createDirectNodeExecution,
  createExternalNpmExecution,
  createValidationEntry,
  getGeneratedValidationScripts,
  getValidationCatalogStats,
  renderGeneratedNpmScript,
  toExecutionCheck,
  validateCatalogScriptOwnership,
  validateValidationCatalog,
  VALIDATION_SCRIPT_OWNERSHIP_EXTERNAL
} from "../../scripts/validation/validation-suite.mjs";
import { renderValidationCatalog } from "../../scripts/project-metadata/project-metadata-sync.mjs";

function generated(overrides = {}) {
  return createValidationEntry(
    overrides.id ?? "fixture",
    overrides.label ?? "Fixture",
    overrides.category ?? "validation",
    overrides.npmScript ?? "validate:fixture",
    overrides.execution ?? createDirectNodeExecution(overrides.directScriptPath ?? "scripts/validate-fixture.mjs", overrides.args ?? []),
    overrides.documentationGroup ?? "Fixture",
    {
      required: overrides.required,
      includeInLocalQuick: overrides.includeInLocalQuick,
      includeInFullValidation: overrides.includeInFullValidation,
      scriptOwnership: overrides.scriptOwnership,
      suiteExclusionJustification: overrides.suiteExclusionJustification
    }
  );
}

function external(overrides = {}) {
  return createValidationEntry(
    overrides.id ?? "external",
    overrides.label ?? "External",
    overrides.category ?? "build",
    overrides.npmScript ?? "typecheck",
    createExternalNpmExecution(),
    overrides.documentationGroup ?? "Build",
    { scriptOwnership: VALIDATION_SCRIPT_OWNERSHIP_EXTERNAL }
  );
}

test("generated script missing is created", () => {
  const item = generated();
  const result = applyCatalogScripts({}, [item]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.scripts[item.npmScript], "node scripts/validate-fixture.mjs");
});

test("generated script with canonical value remains stable", () => {
  const item = generated();
  const scripts = { [item.npmScript]: renderGeneratedNpmScript(item), keep: "node keep.mjs" };
  const result = applyCatalogScripts(scripts, [item]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.scripts, scripts);
});

test("generated script collision fails instead of overwriting", () => {
  const item = generated();
  const scripts = { [item.npmScript]: "node manual-override.mjs" };
  const result = applyCatalogScripts(scripts, [item]);
  assert.match(result.errors.join("\n"), /Generated npm script collision/);
  assert.equal(result.scripts[item.npmScript], "node manual-override.mjs");
});

test("external script missing fails and external script is never modified", () => {
  const item = external();
  assert.match(validateCatalogScriptOwnership({}, [item]).join("\n"), /External npm script typecheck/);
  const scripts = { typecheck: "tsc --noEmit --pretty false" };
  const result = applyCatalogScripts(scripts, [item]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.scripts.typecheck, scripts.typecheck);
});

test("duplicate npmScript is rejected", () => {
  const errors = validateValidationCatalog([
    generated({ id: "one", label: "One", npmScript: "validate:same", directScriptPath: "scripts/one.mjs" }),
    generated({ id: "two", label: "Two", npmScript: "validate:same", directScriptPath: "scripts/two.mjs" })
  ]);
  assert.match(errors.join("\n"), /npmScript must be unique/);
});

test("generated validators cannot silently overwrite manual scripts", () => {
  for (const scriptName of ["build", "dev", "start"]) {
    const item = generated({ id: `fixture-${scriptName}`, label: `Fixture ${scriptName}`, npmScript: scriptName });
    const result = applyCatalogScripts({ [scriptName]: "manual command" }, [item]);
    assert.match(result.errors.join("\n"), new RegExp(`collision for ${scriptName}`));
    assert.equal(result.scripts[scriptName], "manual command");
  }
});

test("direct-node npm representation and direct execution derive from identical args", () => {
  const args = ["normal", "with spaces", "a&b", "x|y", "caret^", 'say "hi"', "", "(group)", "--json", "--strict"];
  const item = generated({ args });
  const npmCommand = getGeneratedValidationScripts([item])[item.npmScript];
  assert.equal(
    npmCommand,
    'node scripts/validate-fixture.mjs normal "with spaces" "a&b" "x|y" "caret^" "say \\"hi\\"" "" "(group)" --json --strict'
  );
  const execution = toExecutionCheck(item);
  assert.equal(execution.command, process.execPath);
  assert.deepEqual(execution.args, ["scripts/validate-fixture.mjs", ...args]);
});

test("local and full suite flags are configurable and documented", () => {
  const fullOnly = generated({ includeInLocalQuick: false, includeInFullValidation: true });
  const regular = generated({ id: "regular", label: "Regular", npmScript: "validate:regular", directScriptPath: "scripts/regular.mjs" });
  const stats = getValidationCatalogStats([fullOnly, regular]);
  assert.deepEqual({ local: stats.localQuick, full: stats.full, fullOnly: stats.fullOnly }, { local: 1, full: 2, fullOnly: 1 });
  const documentation = renderValidationCatalog([fullOnly, regular]);
  assert.match(documentation, /`fixture`[^\n]+\| no \| yes \|/);
});

test("validator excluded from all suites requires explicit justification", () => {
  const item = generated({ includeInLocalQuick: false, includeInFullValidation: false });
  assert.match(validateValidationCatalog([item]).join("\n"), /suiteExclusionJustification/);

  const justified = generated({
    includeInLocalQuick: false,
    includeInFullValidation: false,
    suiteExclusionJustification: "Manual launch validation is intentionally opt-in."
  });
  assert.deepEqual(validateValidationCatalog([justified]), []);
});

test("catalog rejects unknown ownership, invalid args, and repository escape paths", () => {
  const base = generated();
  assert.match(validateValidationCatalog([{ ...base, scriptOwnership: "mystery" }]).join("\n"), /unknown scriptOwnership/);
  assert.match(validateValidationCatalog([{ ...base, args: ["ok", 1] }]).join("\n"), /args must be an array of strings/);
  assert.match(validateValidationCatalog([{ ...base, directScriptPath: "../outside.mjs" }]).join("\n"), /repository-relative path/);
});
