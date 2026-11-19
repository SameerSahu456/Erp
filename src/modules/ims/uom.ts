// Backend CHECK constraint on `parts.uom` (lowercase enum):
//   ck_parts_ck_parts_uom: pcs | set | kg | roll | m | l | box
// FE displays uppercase labels for readability; values stay lowercase so the
// payload matches the constraint and survives `extra='forbid'` validation.

export interface UoMOption {
  value: string;
  label: string;
}

export const UOM_OPTIONS: readonly UoMOption[] = [
  { value: "pcs", label: "PCS" },
  { value: "box", label: "BOX" },
  { value: "set", label: "SET" },
  { value: "roll", label: "ROLL" },
  { value: "mtr", label: "MTR" },
  { value: "ltr", label: "LTR" },
  { value: "kg", label: "KG" },
];

const LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  UOM_OPTIONS.map((u) => [u.value, u.label]),
);

/** Render an uppercase label for any backend uom code. Falls back to the
 *  raw value uppercased so unknown codes still read sensibly. */
export function uomLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return LABEL_BY_VALUE[value] ?? value.toUpperCase();
}
