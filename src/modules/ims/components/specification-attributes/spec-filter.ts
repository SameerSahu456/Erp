// The backend caps keys at 50 chars and values at 200; more than a handful of
// AND-ed conditions is never meaningful, so the URL parser keeps at most 10.
export const MAX_SPEC_CONDITIONS = 10;

/**
 * Parse the `specs` URL param (JSON `[[name, value], …]`) into a filter map.
 * §11.1 — the URL is untrusted: malformed JSON, wrong shapes, blank or
 * over-long strings are DROPPED pair-by-pair rather than failing the page,
 * so a hand-edited link still renders with whatever part of it is valid.
 */
export function parseSpecFilterParam(raw: string): Record<string, string> {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!Array.isArray(parsed)) return {};
  const out: Record<string, string> = {};
  for (const pair of parsed.slice(0, MAX_SPEC_CONDITIONS)) {
    if (!Array.isArray(pair) || pair.length !== 2) continue;
    const [name, value] = pair;
    if (typeof name !== "string" || typeof value !== "string") continue;
    const n = name.trim();
    const v = value.trim();
    if (!n || !v || n.length > 50 || v.length > 200 || n.includes(":")) continue;
    out[n] = v;
  }
  return out;
}

export function serializeSpecFilter(specs: Record<string, string>): string | null {
  const pairs = Object.entries(specs);
  return pairs.length ? JSON.stringify(pairs) : null;
}
