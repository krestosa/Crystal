import { protocol } from "electron";
import { Buffer } from "node:buffer";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { createProjectPreviewIssue } from "../../../../../packages/core/project/preview/project-preview-issues";
import { resolveProjectPreviewPath } from "../../../../../packages/core/project/preview/project-preview-path";
import type { ProjectPreviewIssue } from "../../../../../packages/core/project/preview/project-preview.types";
import { getCurrentProjectRoot } from "../ipc/project-ipc-state";
import { PROJECT_PREVIEW_SELECTION_SCRIPT } from "../preview-selection/project-preview-selection-script";
import { getProjectPreviewMimeResult } from "./project-preview-mime";
import { reportProjectPreviewResourceIssue } from "./project-preview-service";
import { getProjectPreviewLoadIdFromUrl, parseProjectPreviewUrl, projectPreviewScheme, sanitizeProjectPreviewRequestUrl } from "./project-preview-url";

let protocolHandlerRegistered = false;

export function registerProjectPreviewProtocolPrivileges(): void {
  protocol.registerSchemesAsPrivileged([{ scheme: projectPreviewScheme, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
}

export function registerProjectPreviewProtocolHandler(): void {
  if (protocolHandlerRegistered) return;
  protocol.handle(projectPreviewScheme, async (request) => handleProjectPreviewRequest(request));
  protocolHandlerRegistered = true;
}

async function handleProjectPreviewRequest(request: Request): Promise<Response> {
  const requestUrl = request.url;
  const safeRequestUrl = sanitizeProjectPreviewRequestUrl(requestUrl);
  const requestLoadId = getProjectPreviewRequestLoadId(request);
  const rootPath = getCurrentProjectRoot();
  if (!rootPath) {
    reportIssue(createProtocolIssue("no-project-root", "No active Crystal project root is available for preview requests.", null, safeRequestUrl, requestLoadId));
    return createTextResponse(404, "No active Crystal project root.");
  }

  const parsedUrl = parseProjectPreviewUrl(requestUrl);
  if (!parsedUrl.ok) {
    reportIssue(createProtocolIssue("protocol-error", parsedUrl.reason, null, safeRequestUrl, requestLoadId));
    return createTextResponse(400, parsedUrl.reason);
  }

  const loadId = parsedUrl.loadId ?? requestLoadId;
  const resolution = resolveProjectPreviewPath(rootPath, parsedUrl.relativePath);
  if (!resolution.ok || !resolution.absolutePath || !resolution.relativePath) {
    const issue = resolution.issue ?? createProtocolIssue("protocol-error", "Preview path rejected.", parsedUrl.relativePath, safeRequestUrl, loadId);
    reportIssue(createProtocolIssue(issue.code, issue.message, issue.relativePath ?? issue.path ?? parsedUrl.relativePath, safeRequestUrl, loadId));
    return createTextResponse(403, issue.message);
  }

  const rootRealPath = await realpath(rootPath).catch(() => rootPath);
  const targetRealPath = await realpath(resolution.absolutePath).catch(() => null);
  if (!targetRealPath) {
    reportIssue(createProtocolIssue("file-not-found", "Preview resource was not found inside the active project root.", resolution.relativePath, safeRequestUrl, loadId));
    return createTextResponse(404, "Preview resource was not found inside the active project root.");
  }

  if (isOutsideRoot(rootRealPath, targetRealPath)) {
    reportIssue(createProtocolIssue("outside-project-root", "Preview resource resolves outside the active project root.", resolution.relativePath, safeRequestUrl, loadId));
    return createTextResponse(403, "Preview resource was blocked by Crystal.");
  }

  try {
    const file = await readFile(targetRealPath);
    const mime = getProjectPreviewMimeResult(targetRealPath);
    if (mime.isFallback) reportIssue(createProjectPreviewIssue({ code: "unsupported-mime", severity: "warning", message: "Preview resource uses an unsupported MIME extension and was served with a safe fallback.", path: resolution.relativePath, requestUrl: safeRequestUrl, loadId, reason: `Unsupported MIME extension${mime.extension ? `: ${mime.extension}` : "."}`, source: "protocol" }));
    return createPreviewResourceResponse(file, mime.mimeType);
  } catch {
    reportIssue(createProtocolIssue("protocol-error", "Preview resource could not be read by Crystal.", resolution.relativePath, safeRequestUrl, loadId));
    return createTextResponse(500, "Preview resource could not be read by Crystal.");
  }
}

function createPreviewResourceResponse(file: Buffer, mimeType: string): Response {
  const body = isHtmlMimeType(mimeType) ? injectPreviewSelectionScript(file.toString("utf8")) : new Uint8Array(file);
  return new Response(body, { status: 200, headers: { "content-type": mimeType, "cache-control": "no-store" } });
}

function isHtmlMimeType(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith("text/html");
}

function injectPreviewSelectionScript(html: string): string {
  if (html.includes("__CRYSTAL_PREVIEW_SELECTION__")) return html;
  const scriptElement = `<script>\n${PROJECT_PREVIEW_SELECTION_SCRIPT}\n</script>`;
  const lowerHtml = html.toLowerCase();
  const bodyCloseIndex = lowerHtml.lastIndexOf("</body>");
  if (bodyCloseIndex < 0) return `${html}\n${scriptElement}\n`;
  return `${html.slice(0, bodyCloseIndex)}${scriptElement}\n${html.slice(bodyCloseIndex)}`;
}

function createTextResponse(status: number, message: string): Response {
  return new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}

function createProtocolIssue(code: ProjectPreviewIssue["code"], message: string, relativePath: string | null, requestUrl: string | null, loadId: string | null): ProjectPreviewIssue {
  return createProjectPreviewIssue({ code, message, path: relativePath, requestUrl, loadId, source: "protocol" });
}

function getProjectPreviewRequestLoadId(request: Request): string | null {
  return getProjectPreviewLoadIdFromUrl(request.url) ?? getProjectPreviewReferrerLoadId(request);
}

function getProjectPreviewReferrerLoadId(request: Request): string | null {
  const referrer = request.headers.get("referer") ?? request.headers.get("referrer");
  return referrer ? getProjectPreviewLoadIdFromUrl(referrer) : null;
}

function reportIssue(issue: ProjectPreviewIssue): void {
  reportProjectPreviewResourceIssue(issue);
}

function isOutsideRoot(rootRealPath: string, targetRealPath: string): boolean {
  const relativeFromRoot = path.relative(rootRealPath, targetRealPath);
  return relativeFromRoot === "" || relativeFromRoot === ".." || relativeFromRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeFromRoot);
}
