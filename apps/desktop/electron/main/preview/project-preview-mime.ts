import path from "node:path";

export interface ProjectPreviewMimeResult {
  readonly extension: string;
  readonly mimeType: string;
  readonly isFallback: boolean;
}

const fallbackProjectPreviewMimeType = "application/octet-stream";

const previewMimeByExtension = new Map<string, string>([
  [".html", "text/html; charset=utf-8"],
  [".htm", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".mjs", "application/javascript; charset=utf-8"],
  [".cjs", "application/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

export function getProjectPreviewMimeResult(filePath: string): ProjectPreviewMimeResult {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = previewMimeByExtension.get(extension);
  return { extension, mimeType: mimeType ?? fallbackProjectPreviewMimeType, isFallback: !mimeType };
}

export function getProjectPreviewMimeType(filePath: string): string {
  return getProjectPreviewMimeResult(filePath).mimeType;
}
