import type { AssistantChartUnit } from "../types";

const CRORE = 10_000_000;
const LAKH = 100_000;
const THOUSAND = 1_000;
const MAX_AXIS_LABEL_CHARS = 18;

const INDIAN = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

/** ₹ in the Indian short scale: ₹1.2 Cr, ₹4.5 L, ₹12.3 K. */
function formatMoneyShort(value: number): string {
  const size = Math.abs(value);
  if (size >= CRORE) return `₹${INDIAN.format(value / CRORE)} Cr`;
  if (size >= LAKH) return `₹${INDIAN.format(value / LAKH)} L`;
  if (size >= THOUSAND) return `₹${INDIAN.format(value / THOUSAND)} K`;
  return `₹${INDIAN.format(value)}`;
}

export function formatChartValue(value: number, unit: AssistantChartUnit): string {
  if (unit === "money") return formatMoneyShort(value);
  if (unit === "days") return `${INDIAN.format(value)} d`;
  return INDIAN.format(value);
}

export function shortenLabel(label: string): string {
  return label.length > MAX_AXIS_LABEL_CHARS
    ? `${label.slice(0, MAX_AXIS_LABEL_CHARS - 1)}…`
    : label;
}
