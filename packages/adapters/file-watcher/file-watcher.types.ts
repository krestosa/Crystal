import type { ProjectFileWatchEvent, ProjectWatchOptions, ProjectWatchSession, ProjectWatcherState } from "../../core/project/watching/project-watch.types";

export type FileWatchEventCallback = (event: ProjectFileWatchEvent) => void;
export type FileWatchFailureCallback = (failure: Error) => void;

export interface FileWatcherAdapter {
  readonly start: (options: ProjectWatchOptions, onEvent: FileWatchEventCallback, onFailure: FileWatchFailureCallback) => Promise<ProjectWatchSession>;
  readonly stop: () => Promise<void>;
  readonly getState: () => ProjectWatcherState;
}
