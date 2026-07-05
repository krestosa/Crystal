import path from "node:path";
import { projectFileKinds, projectTextFileKinds } from "./project-file-kind.constants";
import type { ProjectFileKind } from "../graph/project-graph.types";

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp"]);
const fontExtensions = new Set([".woff", ".woff2", ".ttf", ".otf", ".eot"]);
const videoExtensions = new Set([".mp4", ".webm", ".mov", ".m4v", ".ogv"]);
const audioExtensions = new Set([".mp3", ".wav", ".ogg", ".flac", ".m4a"]);

export function classifyProjectFile(filePath: string): ProjectFileKind {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".html" || extension === ".htm") return projectFileKinds.html;
  if (extension === ".css") return projectFileKinds.css;
  if (extension === ".scss" || extension === ".sass") return projectFileKinds.sass;
  if (extension === ".js" || extension === ".mjs" || extension === ".cjs") return projectFileKinds.javascript;
  if (extension === ".ts" || extension === ".mts" || extension === ".cts") return projectFileKinds.typescript;
  if (extension === ".svg") return projectFileKinds.svg;
  if (imageExtensions.has(extension)) return projectFileKinds.image;
  if (fontExtensions.has(extension)) return projectFileKinds.font;
  if (videoExtensions.has(extension)) return projectFileKinds.video;
  if (audioExtensions.has(extension)) return projectFileKinds.audio;
  return extension ? projectFileKinds.asset : projectFileKinds.unknown;
}

export function isProjectTextFileKind(kind: ProjectFileKind): boolean {
  return projectTextFileKinds.has(kind);
}

export function isBinaryHeavyProjectKind(kind: ProjectFileKind): boolean {
  return kind === projectFileKinds.video || kind === projectFileKinds.audio;
}
