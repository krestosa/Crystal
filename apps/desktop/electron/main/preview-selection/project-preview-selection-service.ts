import { BrowserWindow } from "electron";
import { appState } from "../../../../../packages/core/state/app-state";
import { createProjectPreviewSelectionIssue, validateProjectPreviewSelectedNodePayload } from "../../../../../packages/core/project/preview-selection/project-preview-selection-validators";
import type { ProjectPreviewSelectionState } from "../../../../../packages/core/project/preview-selection/project-preview-selection.types";
import { crystalIpcChannels } from "../../../../../packages/shared/constants/ipc.constants";

export function getProjectPreviewSelectionState(): ProjectPreviewSelectionState {
  return appState.getSnapshot().previewSelection;
}

export function enableProjectPreviewSelection(): ProjectPreviewSelectionState {
  return patchProjectPreviewSelection({ enabled: true, mode: "selecting", selectedNode: null, lastSelectedAt: null, lastIssue: null });
}

export function disableProjectPreviewSelection(): ProjectPreviewSelectionState {
  return patchProjectPreviewSelection({ enabled: false, mode: "idle", selectedNode: null, lastSelectedAt: null, lastIssue: null });
}

export function clearProjectPreviewSelection(): ProjectPreviewSelectionState {
  const current = getProjectPreviewSelectionState();
  return patchProjectPreviewSelection({ selectedNode: null, lastSelectedAt: null, mode: current.enabled ? "selecting" : "idle", lastIssue: null });
}

export function setProjectPreviewSelectedNode(payload: unknown): ProjectPreviewSelectionState {
  const result = validateProjectPreviewSelectedNodePayload(payload);
  if (!result.ok || !result.selectedNode) {
    return patchProjectPreviewSelection({ mode: "failed", lastIssue: result.issue ?? createProjectPreviewSelectionIssue("unknown", "Selected node payload could not be validated.") });
  }

  return patchProjectPreviewSelection({
    enabled: true,
    mode: "selected",
    selectedNode: result.selectedNode,
    lastSelectedAt: Date.now(),
    lastIssue: null
  });
}

function patchProjectPreviewSelection(patch: Partial<ProjectPreviewSelectionState>): ProjectPreviewSelectionState {
  appState.patchProjectPreviewSelection(patch);
  const state = appState.getSnapshot().previewSelection;
  notifyProjectPreviewSelectionRenderer(state);
  return state;
}

function notifyProjectPreviewSelectionRenderer(state: ProjectPreviewSelectionState): void {
  for (const browserWindow of BrowserWindow.getAllWindows()) if (!browserWindow.isDestroyed()) browserWindow.webContents.send(crystalIpcChannels.projectPreviewSelectionStateChanged, state);
}
