const APP_OWNER = "desktop";
const DESKTOP_METADATA_PATH = "apps/desktop/package.json";
const DESKTOP_SOURCE_ROOT = "electron";
const ELECTRON_RUNTIME_ROOTS = new Set(["main", "preload", "renderer"]);
const PACKAGE_ROOTS = new Set(["core", "shared", "adapters"]);

export function normalizeRepositoryPath(value) {
  if (typeof value !== "string") {
    return invalidPath(value, "Tracked source paths must be strings.");
  }
  if (value.length === 0) {
    return invalidPath(value, "Tracked source paths must not be empty.");
  }
  if (value.includes("\0")) {
    return invalidPath(value, "Tracked source paths must not contain NUL bytes.");
  }
  if (value.includes("\\")) {
    return invalidPath(value, "Tracked source paths must use forward slashes.");
  }
  if (value.startsWith("/") || value.startsWith("//") || /^[A-Za-z]:\//.test(value)) {
    return invalidPath(value, "Tracked source paths must be repository-relative.");
  }
  if (value.endsWith("/")) {
    return invalidPath(value, "Tracked source paths must identify files, not directory markers.");
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return invalidPath(value, "Tracked source paths must not contain empty, current, or parent segments.");
  }
  return { ok: true, path: value };
}

export function classifySourceTreePath(repositoryPath) {
  const normalized = normalizeRepositoryPath(repositoryPath);
  if (!normalized.ok) return normalized.violation;

  const path = normalized.path;
  const segments = path.split("/");
  const [container, owner, third, fourth] = segments;

  if (container === "apps") {
    if (segments.length <= 2) {
      return violation("misplaced-product-source", path, "Tracked product source cannot live directly at the apps container root.");
    }
    if (owner !== APP_OWNER) {
      return violation("unknown-app-root", path, "Tracked path belongs to an unregistered application owner.");
    }
    if (path === DESKTOP_METADATA_PATH) {
      return null;
    }
    if (segments.length < 3 || third !== DESKTOP_SOURCE_ROOT) {
      return violation("unknown-desktop-root", path, "Tracked desktop path must be package metadata or belong to the electron source root.");
    }
    if (segments.length <= 4) {
      return violation("misplaced-product-source", path, "Tracked product source cannot live directly at the electron container root.");
    }
    if (!ELECTRON_RUNTIME_ROOTS.has(fourth)) {
      return violation("unknown-electron-runtime-root", path, "Tracked path belongs to an unregistered Electron runtime owner.");
    }
    if (segments.length < 5) {
      return violation("misplaced-product-source", path, "Tracked product source must live beneath an Electron runtime owner.");
    }
    return null;
  }

  if (container === "packages") {
    if (segments.length <= 2) {
      return violation("misplaced-product-source", path, "Tracked product source cannot live directly at the packages container root.");
    }
    if (!PACKAGE_ROOTS.has(owner)) {
      return violation("unknown-package-root", path, "Tracked path belongs to an unregistered package owner.");
    }
    if (segments.length < 3) {
      return violation("misplaced-product-source", path, "Tracked product source must live beneath a registered package owner.");
    }
    return null;
  }

  return violation("unclassified-source-path", path, "Tracked path is outside the classified apps and packages source containers.");
}

export function validateSourceTreePaths(paths) {
  if (!Array.isArray(paths)) {
    return {
      status: "FAIL",
      inputPathCount: 0,
      uniquePathCount: 0,
      duplicatePathCount: 0,
      violations: [violation("invalid-repository-path", "<input>", "Tracked source paths must be provided as an array.")]
    };
  }

  const seen = new Set();
  const violations = [];
  let duplicatePathCount = 0;

  for (const value of paths) {
    const normalized = normalizeRepositoryPath(value);
    const deduplicationKey = normalized.ok
      ? `path:${normalized.path}`
      : `invalid:${typeof value}:${renderInvalidPath(value)}`;
    if (seen.has(deduplicationKey)) {
      duplicatePathCount += 1;
      continue;
    }
    seen.add(deduplicationKey);

    if (!normalized.ok) {
      violations.push(normalized.violation);
      continue;
    }
    const classified = classifySourceTreePath(normalized.path);
    if (classified) violations.push(classified);
  }

  const sortedViolations = sortSourceTreeViolations(violations);
  return {
    status: sortedViolations.length === 0 ? "PASS" : "FAIL",
    inputPathCount: paths.length,
    uniquePathCount: seen.size,
    duplicatePathCount,
    violations: sortedViolations
  };
}

export function sortSourceTreeViolations(violations) {
  return [...violations].sort((left, right) => {
    const pathComparison = left.path.localeCompare(right.path);
    if (pathComparison !== 0) return pathComparison;
    const codeComparison = left.code.localeCompare(right.code);
    if (codeComparison !== 0) return codeComparison;
    return left.reason.localeCompare(right.reason);
  });
}

function invalidPath(value, reason) {
  return {
    ok: false,
    violation: violation("invalid-repository-path", renderInvalidPath(value), reason)
  };
}

function renderInvalidPath(value) {
  if (typeof value === "string") return value.replaceAll("\0", "\\0");
  if (value === null) return "<null>";
  if (value === undefined) return "<undefined>";
  return `<${typeof value}:${String(value)}>`;
}

function violation(code, path, reason) {
  return Object.freeze({ code, path, reason });
}
