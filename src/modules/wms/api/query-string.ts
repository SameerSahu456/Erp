// Query-string builders for the WMS list fetchers. Keys are written in the
// order given so the URL (and anything keyed on it) stays byte-identical.

type QueryValue = string | number | readonly string[] | null | undefined;

/** Arrays → one repeated key per item; other values set only when truthy. */
export function appendQuery<T extends object>(
  qs: URLSearchParams,
  params: T,
  keys: readonly (keyof T & string)[],
): void {
  for (const key of keys) {
    const value = params[key] as QueryValue;
    if (Array.isArray(value)) {
      for (const item of value as readonly string[]) qs.append(key, item);
    } else if (value) {
      qs.set(key, String(value));
    }
  }
}

/** FastAPI list style: a single value or an array, each sent as a repeated key
 *  (a lone empty string is still sent, unlike `appendQuery`). */
export function appendLists<T extends object>(
  qs: URLSearchParams,
  params: T,
  keys: readonly (keyof T & string)[],
): void {
  for (const key of keys) {
    const value = params[key] as string | readonly string[] | null | undefined;
    if (value == null) continue;
    const items: readonly string[] = Array.isArray(value) ? value : [value as string];
    for (const item of items) qs.append(key, item);
  }
}
