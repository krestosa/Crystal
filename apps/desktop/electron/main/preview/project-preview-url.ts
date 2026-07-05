export const projectPreviewScheme = "crystal-preview";
export const projectPreviewHost = "current";

export function createProjectPreviewUrl(relativePath: string, reloadToken: number): string {
  const encodedPath = relativePath.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  return `${projectPreviewScheme}://${projectPreviewHost}/${encodedPath}?reload=${reloadToken}`;
}

export function parseProjectPreviewUrl(rawUrl: string): { readonly ok: true; readonly relativePath: string } | { readonly ok: false; readonly reason: string } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Invalid preview URL." };
  }

  if (url.protocol !== `${projectPreviewScheme}:` || url.hostname !== projectPreviewHost) return { ok: false, reason: "Preview URL is not handled by Crystal." };
  const pathname = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  if (!pathname) return { ok: false, reason: "Preview URL does not contain a project-relative path." };

  try {
    return { ok: true, relativePath: decodeURIComponent(pathname) };
  } catch {
    return { ok: false, reason: "Preview URL contains an invalid encoded path." };
  }
}
