import { protocol } from "electron";
import { readFile } from "node:fs/promises";
import { resolveProjectPreviewPath } from "../../../../../packages/core/project/preview/project-preview-path";
import { getCurrentProjectRoot } from "../ipc/project-ipc-state";
import { getProjectPreviewMimeType } from "./project-preview-mime";
import { parseProjectPreviewUrl, projectPreviewScheme } from "./project-preview-url";

let protocolHandlerRegistered = false;

export function registerProjectPreviewProtocolPrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: projectPreviewScheme,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true
      }
    }
  ]);
}

export function registerProjectPreviewProtocolHandler(): void {
  if (protocolHandlerRegistered) return;
  protocol.handle(projectPreviewScheme, async (request) => handleProjectPreviewRequest(request.url));
  protocolHandlerRegistered = true;
}

async function handleProjectPreviewRequest(requestUrl: string): Promise<Response> {
  const rootPath = getCurrentProjectRoot();
  if (!rootPath) return createTextResponse(404, "No active Crystal project root.");

  const parsedUrl = parseProjectPreviewUrl(requestUrl);
  if (!parsedUrl.ok) return createTextResponse(400, parsedUrl.reason);

  const resolution = resolveProjectPreviewPath(rootPath, parsedUrl.relativePath);
  if (!resolution.ok || !resolution.absolutePath) return createTextResponse(403, resolution.issue?.message ?? "Preview path rejected.");

  try {
    const file = await readFile(resolution.absolutePath);
    return new Response(new Uint8Array(file), {
      status: 200,
      headers: {
        "content-type": getProjectPreviewMimeType(resolution.absolutePath),
        "cache-control": "no-store"
      }
    });
  } catch {
    return createTextResponse(404, "Preview file was not found inside the active project root.");
  }
}

function createTextResponse(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
