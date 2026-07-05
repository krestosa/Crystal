export interface CrystalCommand<TPayload = unknown, TResult = unknown> {
  readonly type: string;
  readonly payload: TPayload;
  readonly meta?: CrystalCommandMeta;
}

export interface CrystalCommandMeta {
  readonly source: "ui" | "system" | "automation";
  readonly createdAt: number;
}

export type CrystalCommandHandler<TCommand extends CrystalCommand = CrystalCommand> = (command: TCommand) => Promise<unknown> | unknown;
