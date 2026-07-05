import type { ProjectFileKind } from "../graph/project-graph.types";

export const projectFileKinds = {
  html: "html",
  css: "css",
  sass: "sass",
  javascript: "javascript",
  typescript: "typescript",
  image: "image",
  svg: "svg",
  font: "font",
  video: "video",
  audio: "audio",
  asset: "asset",
  unknown: "unknown"
} as const satisfies Record<string, ProjectFileKind>;

export const projectTextFileKinds = new Set<ProjectFileKind>([
  projectFileKinds.html,
  projectFileKinds.css,
  projectFileKinds.sass,
  projectFileKinds.javascript,
  projectFileKinds.typescript,
  projectFileKinds.svg
]);
