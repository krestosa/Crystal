import type { CrystalCommand } from "./command.types";
import type { ProjectPreviewReloadReason, ProjectPreviewSetTargetRequest } from "../project/preview/project-preview.types";

export const projectPreviewCommandTypes = {
  loadProjectPreview: "LoadProjectPreviewCommand",
  reloadProjectPreview: "ReloadProjectPreviewCommand",
  setProjectPreviewTarget: "SetProjectPreviewTargetCommand",
  clearProjectPreview: "ClearProjectPreviewCommand"
} as const;

export type LoadProjectPreviewCommand = CrystalCommand<{ readonly reason: ProjectPreviewReloadReason }, "load-project-preview"> & { readonly type: "LoadProjectPreviewCommand" };
export type ReloadProjectPreviewCommand = CrystalCommand<{ readonly reason: ProjectPreviewReloadReason }, "reload-project-preview"> & { readonly type: "ReloadProjectPreviewCommand" };
export type SetProjectPreviewTargetCommand = CrystalCommand<ProjectPreviewSetTargetRequest, "set-project-preview-target"> & { readonly type: "SetProjectPreviewTargetCommand" };
export type ClearProjectPreviewCommand = CrystalCommand<Record<string, never>, "clear-project-preview"> & { readonly type: "ClearProjectPreviewCommand" };

export type ProjectPreviewCommand = LoadProjectPreviewCommand | ReloadProjectPreviewCommand | SetProjectPreviewTargetCommand | ClearProjectPreviewCommand;
