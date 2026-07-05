import { crystalIpcChannels } from "../constants/ipc.constants";
import type { CrystalIpcChannel } from "../types/ipc.types";

const validChannels = new Set<string>(Object.values(crystalIpcChannels));

export function isCrystalIpcChannel(value: unknown): value is CrystalIpcChannel {
  return typeof value === "string" && validChannels.has(value);
}
