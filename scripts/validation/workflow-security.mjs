const ACTION_ALLOWLIST = new Set(["actions/checkout", "actions/setup-node", "actions/upload-artifact"]);
const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/;

export function validateWorkflowSecurity(sourceText, options = {}) {
  const errors = [];
  const requirePinnedActions = options.requirePinnedActions ?? true;
  if (/^\s*pull_request_target\s*:/m.test(sourceText)) errors.push("Validation workflow must not use pull_request_target.");
  if (!/^permissions:\s*\n(?:\s+[^\n]+\n)*?\s+contents:\s*read\s*$/m.test(sourceText)) errors.push("Validation workflow must declare contents: read permissions.");
  if (/^\s+[A-Za-z_-]+:\s*write\s*$/m.test(sourceText)) errors.push("Validation workflow must not grant write permissions.");

  const steps = splitWorkflowSteps(sourceText);
  const checkoutSteps = [];
  for (const step of steps) {
    const action = parseActionReference(step.text);
    if (!action) continue;
    if (!ACTION_ALLOWLIST.has(action.repository)) errors.push(`Validation workflow uses non-allowlisted action ${action.repository}.`);
    if (requirePinnedActions) {
      if (!FULL_SHA_PATTERN.test(action.ref)) errors.push(`Action ${action.repository} must be pinned to a full commit SHA.`);
      else if (!/#\s*v\d+(?:\.\d+){0,2}\b/.test(action.line)) errors.push(`Pinned action ${action.repository} must retain a human-readable version comment.`);
    }
    if (action.repository === "actions/checkout") checkoutSteps.push(step);
    if (action.repository === "actions/upload-artifact") errors.push(...validateArtifactStep(step));
  }
  if (checkoutSteps.length === 0) errors.push("Validation workflow must include actions/checkout at a tag or full SHA.");
  for (const step of checkoutSteps) {
    if (!/^\s*persist-credentials:\s*false\s*(?:#.*)?$/m.test(step.text)) errors.push("Validation workflow checkout must set persist-credentials: false.");
  }
  return [...new Set(errors)];
}

export function splitWorkflowSteps(sourceText) {
  const lines = sourceText.split(/\r\n|\r|\n/);
  const steps = [];
  let current = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s{6}-\s+(?:name|uses|run):/.test(line)) {
      if (current) steps.push(current);
      current = { line: index + 1, lines: [line] };
    } else if (current) current.lines.push(line);
  }
  if (current) steps.push(current);
  return steps.map((step) => ({ ...step, text: step.lines.join("\n") }));
}

function parseActionReference(stepText) {
  const match = stepText.match(/^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s+(#.*))?$/m);
  if (!match || match[1].startsWith("./") || match[1].startsWith("docker://")) return null;
  const separator = match[1].lastIndexOf("@");
  if (separator <= 0) return null;
  return {
    repository: match[1].slice(0, separator).toLowerCase(),
    ref: match[1].slice(separator + 1),
    line: match[0]
  };
}

function validateArtifactStep(step) {
  const errors = [];
  for (const uploadPath of extractYamlPaths(step.text)) {
    const normalized = normalizeYamlScalar(uploadPath);
    if (isDangerousArtifactPath(normalized)) errors.push(`Validation workflow artifact path is unsafe: ${normalized}.`);
  }
  return errors;
}

function extractYamlPaths(stepText) {
  const lines = stepText.split("\n");
  const paths = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^\s*path:\s*(.*)$/);
    if (!match) continue;
    const value = match[1].trim();
    if (value === "|" || value === ">") {
      const indent = lines[index].match(/^\s*/)[0].length;
      for (index += 1; index < lines.length; index += 1) {
        const lineIndent = lines[index].match(/^\s*/)[0].length;
        if (lines[index].trim() && lineIndent <= indent) { index -= 1; break; }
        if (lines[index].trim()) paths.push(lines[index].trim());
      }
    } else if (value) paths.push(value);
  }
  return paths;
}

function normalizeYamlScalar(value) {
  return value.trim().replace(/^(["'])(.*)\1$/, "$2").replace(/\/$/, "");
}

function isDangerousArtifactPath(value) {
  const normalized = value.replace(/\\/g, "/").toLowerCase();
  if ([".", "**/*", "${{ github.workspace }}", "${{ runner.temp }}", "${{ runner.tool_cache }}", "~", "${{ env.home }}"].includes(normalized)) return true;
  if (normalized === ".git" || normalized.startsWith(".git/")) return true;
  if (normalized === ".env" || normalized.endsWith("/.env") || normalized === ".npmrc" || normalized.endsWith("/.npmrc")) return true;
  if (/credential|gitconfig|\.git\/config|\.ssh|id_rsa|id_ed25519/.test(normalized)) return true;
  return false;
}
