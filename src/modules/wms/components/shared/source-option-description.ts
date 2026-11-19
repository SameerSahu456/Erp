// The second line of a source-document dropdown row (sales order, PO, demo,
// replacement, return): who it is for and what is on it — short, so the number
// is recognisable without opening the document. No date: every document
// number already carries its date (SO-2024-11-19-00001).
export function sourceOptionDescription(parts: {
  who?: string | null;
  partsSummary?: string | null;
}): string | null {
  const bits = [parts.who, parts.partsSummary].filter(
    (b): b is string => !!b && b.trim().length > 0,
  );
  return bits.length ? bits.join(" · ") : null;
}
