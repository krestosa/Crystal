export interface CrystalEvent<TPayload = unknown> {
  readonly type: string;
  readonly payload: TPayload;
  readonly createdAt: number;
}

export type CrystalEventHandler<TEvent extends CrystalEvent = CrystalEvent> = (event: TEvent) => void;
