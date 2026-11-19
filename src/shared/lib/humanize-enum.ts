/** Fallback "pending_qc" → "Pending Qc" for values with no fixed enum label map (§16.12). */
export function humanizeEnum(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
