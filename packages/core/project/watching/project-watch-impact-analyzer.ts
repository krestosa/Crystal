import { projectFileKinds } from "../files/project-file-kind.constants";
import type { ProjectFileWatchEvent } from "./project-watch.types";

const graphRelevantKinds = new Set<string>([
  projectFileKinds.html,
  projectFileKinds.css,
  projectFileKinds.sass,
  projectFileKinds.javascript,
  projectFileKinds.typescript,
  projectFileKinds.image,
  projectFileKinds.svg,
  projectFileKinds.font,
  projectFileKinds.video,
  projectFileKinds.audio,
  projectFileKinds.asset
]);

export interface ProjectWatchImpact {
  readonly affectsProjectGraph: boolean;
  readonly reason: string;
}

export function analyzeProjectWatchImpact(event: Pick<ProjectFileWatchEvent, "kind" | "type" | "relativePath">): ProjectWatchImpact {
  if (!graphRelevantKinds.has(event.kind)) {
    return { affectsProjectGraph: false, reason: `File kind ${event.kind} is not graph-relevant.` };
  }
  if (event.type === "unknown") {
    return { affectsProjectGraph: true, reason: "Unknown watch event may affect the Project Graph." };
  }
  return { affectsProjectGraph: true, reason: `${event.type} ${event.relativePath} affects the Project Graph.` };
}
