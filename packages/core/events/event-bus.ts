import type { CrystalEvent, CrystalEventHandler } from "./event.types";

export class EventBus {
  private readonly handlers = new Map<string, Set<CrystalEventHandler>>();

  on<TEvent extends CrystalEvent>(type: TEvent["type"], handler: CrystalEventHandler<TEvent>): () => void {
    const handlers = this.handlers.get(type) ?? new Set<CrystalEventHandler>();
    handlers.add(handler as CrystalEventHandler);
    this.handlers.set(type, handlers);

    return () => this.off(type, handler as CrystalEventHandler);
  }

  off(type: string, handler: CrystalEventHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  emit(event: CrystalEvent): void {
    for (const handler of this.handlers.get(event.type) ?? []) {
      handler(event);
    }
  }
}

export const eventBus = new EventBus();
