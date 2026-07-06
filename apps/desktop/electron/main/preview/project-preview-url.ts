export const projectPreviewScheme = "crystal-preview";
export const projectPreviewHost = "current";
export const projectPreviewLoadIdQueryParam = "crystalPreviewLoadId";

const projectPreviewUrlPrefix = `${projectPreviewScheme}://${projectPreviewHost}/`;
const validProjectPreviewLoadIdPattern = /^[a-zA-Z0-9._:-]{1,120}$/;

export function createProjectPreviewUrl(relativePath: string, reloadToken: number, loadId: string): string {
  const encodedPath = relativePath.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  return `${projectPreviewUrlPrefix}${encodedPath}?reload=${reloadToken}&${projectPreviewLoadIdQueryParam}=${encodeURIComponent(loadId)}`;
}

export function parseProjectPreviewUrl(rawUrl: string): { readonly ok: true; readonly relativePath: string; readonly loadId: string | null } | { readonly ok: false; readonly reason: string } {
  if (!rawUrl.startsWith(projectPreviewUrlPrefix)) return { ok: false, reason: "Preview URL is not handled by Crystal." };

  const encodedPath = getEncodedProjectPreviewPath(rawUrl);
  if (!encodedPath) return { ok: false, reason: "Preview URL does not contain a project-relative path." };

  try {
    return { ok: true, relativePath: decodeURIComponent(encodedPath), loadId: getProjectPreviewLoadIdFromUrl(rawUrl) };
  } catch {
    return { ok: false, reason: "Preview URL contains an invalid encoded path." };
  }
}

export function sanitizeProjectPreviewRequestUrl(rawUrl: string): string | null {
  if (!rawUrl.startsWith(projectPreviewUrlPrefix)) return null;
  const encodedPath = getEncodedProjectPreviewPath(rawUrl);
  return encodedPath ? `${projectPreviewUrlPrefix}${encodedPath}` : null;
}

export function getProjectPreviewLoadIdFromUrl(rawUrl: string): string | null {
  if (!rawUrl.startsWith(projectPreviewUrlPrefix)) return null;
  const query = getProjectPreviewQueryString(rawUrl);
  if (!query) return null;
  const value = new URLSearchParams(query).get(projectPreviewLoadIdQueryParam);
  return value && validProjectPreviewLoadIdPattern.test(value) ? value : null;
}

function getEncodedProjectPreviewPath(rawUrl: string): string {
  const pathAndQuery = rawUrl.slice(projectPreviewUrlPrefix.length);
  const queryIndex = pathAndQuery.indexOf("?");
  const hashIndex = pathAndQuery.indexOf("#");
  const cutIndex = getFirstUrlSuffixIndex(queryIndex, hashIndex);
  return cutIndex >= 0 ? pathAndQuery.slice(0, cutIndex) : pathAndQuery;
}

function getProjectPreviewQueryString(rawUrl: string): string | null {
  const pathAndQuery = rawUrl.slice(projectPreviewUrlPrefix.length);
  const queryIndex = pathAndQuery.indexOf("?");
  if (queryIndex < 0) return null;
  const hashIndex = pathAndQuery.indexOf("#");
  const queryEnd = hashIndex >= 0 && hashIndex > queryIndex ? hashIndex : pathAndQuery.length;
  return pathAndQuery.slice(queryIndex + 1, queryEnd);
}

function getFirstUrlSuffixIndex(queryIndex: number, hashIndex: number): number {
  if (queryIndex < 0) return hashIndex;
  if (hashIndex < 0) return queryIndex;
  return Math.min(queryIndex, hashIndex);
}
