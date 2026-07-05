import type { CrystalCommand, CrystalCommandHandler } from "./command.types";

export class CommandBus {
  private readonly handlers = new Map<string, CrystalCommandHandler>();

  register<TCommand extends CrystalCommand>(type: TCommand["type"], handler: CrystalCommandHandler<TCommand>): void {
    if (this.handlers.has(type)) {
      throw new Error(`Command handler already registered: ${type}`);
    }

    this.handlers.set(type, handler as CrystalCommandHandler);
  }

  async execute<TResult = unknown>(command: CrystalCommand): Promise<TResult> {
    const handler = this.handlers.get(command.type);

    if (!handler) {
      throw new Error(`No command handler registered for: ${command.type}`);
    }

    return handler(command) as Promise<TResult>;
  }
}

export const commandBus = new CommandBus();
