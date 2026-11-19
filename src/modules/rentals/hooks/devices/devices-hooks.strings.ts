/** Toasts the device hooks raise (§16.12, §6.9.5 — hooks never import components). */
export const DEVICES_HOOKS_STRINGS = {
  held: "Unit put on hold",
  unheld: "Hold lifted",
  delivered: "Delivery recorded; this unit now bills from that date",
  deviceExtended: "Unit extended; its order now ends on the new date",
  deviceExtendQueued: "Rate change sent for approval; nothing changes until it is approved",
} as const;
