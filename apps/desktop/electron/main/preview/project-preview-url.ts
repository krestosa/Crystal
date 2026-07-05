export const projectPreviewScheme = "crystal-preview";
export const projectPreviewHost = "current";

const projectPreviewUrlPrefix = `${projectPreviewScheme}://${projectPreviewHost}/`;

export function createProjectPreviewUrl(relativePath: string, reloadToken: number): string {
  const encodedPath = relativePath.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  return `${projectPreviewUrlPrefix}${encodedPath}?reload=${reloadToken}`;
}

export function parseProjectPreviewUrl(rawUrl: string): { readonly ok: true; readonly relativePath: string } | { readonly ok: false; readonly reason: string } {
  if (!rawUrl.startsWith(projectPreviewUrlPrefix)) return { ok: false, reason: "Preview URL is not handled by Crystal." };

  const encodedPath = getEncodedProjectPreviewPath(rawUrl);
  if (!encodedPath) return { ok: false, reason: "Preview URL does not contain a project-relative path." };

  try {
    return { ok: true, relativePath: decodeURIComponent(encodedPath) };
  } catch {
    return { ok: false, reason: "Preview URL contains an invalid encoded path." };
  }
}

export function sanitizeProjectPreviewRequestUrl(rawUrl: string): string | null {
  if (!rawUrl.startsWith(projectPreviewUrlPrefix)) return null;
  const encodedPath = getEncodedProjectPreviewPath(rawUrl);
  return encodedPath ? `${projectPreviewUrlPrefix}${encodedPath}` : null;
}

function getEncodedProjectPreviewPath(rawUrl: string): string {
  const pathAndQuery = rawUrl.slice(projectPreviewUrlPrefix.length);
  const queryIndex = pathAndQuery.indexOf("?");
  const hashIndex = pathAndQuery.indexOf("#");
  const cutIndex = getFirstUrlSuffixIndex(queryIndex, hashIndex);
  return cutIndex >= 0 ? pathAndQuery.slice(0, cutIndex) : pathAndQuery;
}

function getFirstUrlSuffixIndex(queryIndex: number, hashIndex: number): number {
  if (queryIndex < 0) return hashIndex;
  if (hashIndex < 0) return queryIndex;
  return Math.min(queryIndex, hashIndex);
}
