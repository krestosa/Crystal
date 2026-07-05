import { existsSync, watch, type FSWatcher } from "node:fs";
import path from "node:path";
import { normalizeProjectWatchEvent } from "../../core/project/watching/project-watch-event-normalizer";
import type { ProjectRawFileWatchEvent, ProjectWatchOptions, ProjectWatchSession, ProjectWatcherState } from "../../core/project/watching/project-watch.types";
import type { FileWatchEventCallback, FileWatchFailureCallback, FileWatcherAdapter } from "./file-watcher.types";

export class NodeFileWatcherAdapter implements FileWatcherAdapter {
  private watcher: FSWatcher | null = null;
  private session: ProjectWatchSession | null = null;
  private state: ProjectWatcherState = createStoppedState("idle");

  async start(options: ProjectWatchOptions, onEvent: FileWatchEventCallback, onFailure: FileWatchFailureCallback): Promise<ProjectWatchSession> {
    await this.stop();
    const startedAt = Date.now();
    const session: ProjectWatchSession = { id: `watch-${startedAt}`, rootPath: path.resolve(options.rootPath), startedAt, status: "watching" };
    this.session = session;
    this.state = { ...createStoppedState("watching"), rootPath: session.rootPath, sessionId: session.id, startedAt };

    try {
      this.watcher = watch(session.rootPath, { recursive: true }, (eventType, fileName) => {
        const absolutePath = path.resolve(session.rootPath, fileName ? String(fileName) : ".");
        const rawEvent = createRawEvent(eventType, absolutePath);
        const normalized = normalizeProjectWatchEvent(rawEvent, options);
        if (!normalized.event) return;
        this.state = { ...this.state, lastWatchEventAt: normalized.event.timestamp, recentWatchEvents: [normalized.event, ...this.state.recentWatchEvents].slice(0, 20) };
        onEvent(normalized.event);
      });
      this.watcher.on("error", (failure) => {
        this.state = { ...this.state, status: "failed", lastError: failure.message };
        onFailure(failure);
      });
      return session;
    } catch (failure) {
      const error = failure instanceof Error ? failure : new Error(String(failure));
      this.state = { ...this.state, status: "failed", lastError: error.message };
      onFailure(error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.watcher) this.watcher.close();
    this.watcher = null;
    this.session = null;
    this.state = { ...this.state, status: "stopped", sessionId: null, startedAt: null };
  }

  getState(): ProjectWatcherState {
    return this.state;
  }
}

function createRawEvent(eventType: string, absolutePath: string): ProjectRawFileWatchEvent {
  const exists = existsSync(absolutePath);
  const type = eventType === "change" ? "changed" : eventType === "rename" && exists ? "created" : eventType === "rename" ? "deleted" : "unknown";
  return { type, absolutePath, timestamp: Date.now() };
}

function createStoppedState(status: ProjectWatcherState["status"]): ProjectWatcherState {
  return {
    status,
    rootPath: null,
    sessionId: null,
    startedAt: null,
    lastWatchEventAt: null,
    lastRefreshAt: null,
    pendingWatchEvents: [],
    recentWatchEvents: [],
    refreshMode: "none",
    lastRefreshDurationMs: null,
    cacheStatus: "empty",
    cacheVersion: null,
    lastError: null
  };
}
