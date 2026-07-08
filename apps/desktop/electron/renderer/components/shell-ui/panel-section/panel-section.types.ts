export type ShellPanelSlotRole = "tool" | "main" | "secondary";

export interface ShellPanelSectionOptions {
  readonly compact?: boolean;
  readonly slotRole?: ShellPanelSlotRole;
}
