import type { ProjectFileWatchEvent } from "./project-watch.types";

export interface ProjectWatchBatcherOptions {
  readonly debounceMs: number;
  readonly maxBatchSize?: number;
  readonly onFlush: (events: readonly ProjectFileWatchEvent[]) => void;
}

const eventPriority: Record<ProjectFileWatchEvent["type"], number> = {
  deleted: 5,
  renamed: 4,
  created: 3,
  changed: 2,
  unknown: 1
};

export class ProjectWatchBatcher {
  private readonly pending = new Map<string, ProjectFileWatchEvent>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: ProjectWatchBatcherOptions) {}

  add(event: ProjectFileWatchEvent): void {
    if (!event.affectsProjectGraph) return;
    const key = getBatchKey(event);
    const previous = this.pending.get(key);
    this.pending.set(key, previous ? chooseDominantEvent(previous, event) : event);
    if (this.options.maxBatchSize && this.pending.size >= this.options.maxBatchSize) {
      this.flush();
      return;
    }
    this.scheduleFlush();
  }

  flush(): readonly ProjectFileWatchEvent[] {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    const events = [...this.pending.values()].sort((a, b) => a.timestamp - b.timestamp || a.relativePath.localeCompare(b.relativePath));
    this.pending.clear();
    if (events.length > 0) this.options.onFlush(events);
    return events;
  }

  clear(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    this.pending.clear();
  }

  getPendingEvents(): readonly ProjectFileWatchEvent[] {
    return [...this.pending.values()];
  }

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), this.options.debounceMs);
  }
}

export function chooseDominantEvent(previous: ProjectFileWatchEvent, next: ProjectFileWatchEvent): ProjectFileWatchEvent {
  if (previous.type === "created" && next.type === "deleted") return { ...next, type: "deleted", reason: "Created and deleted within the same watch batch." };
  if (previous.type === "deleted" && next.type === "created") return { ...next, type: "changed", reason: "Deleted and recreated within the same watch batch." };
  if (eventPriority[next.type] > eventPriority[previous.type]) return next;
  if (eventPriority[next.type] === eventPriority[previous.type] && next.timestamp >= previous.timestamp) return next;
  return previous;
}

function getBatchKey(event: ProjectFileWatchEvent): string {
  return event.previousRelativePath ? `${event.previousRelativePath}->${event.relativePath}` : event.relativePath;
}
