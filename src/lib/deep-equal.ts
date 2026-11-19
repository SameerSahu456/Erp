/**
 * Structural equality for the kinds of values forms produce: primitives,
 * arrays, plain objects. Objects compare by their own enumerable string keys.
 *
 * Does NOT handle: Date, Map, Set, RegExp, circular refs, class instances.
 * Form state in this app is restricted to those plain types, so JSON-shaped
 * comparison is sufficient — keep it that way rather than expanding here.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false
  }

  const aIsArray = Array.isArray(a)
  const bIsArray = Array.isArray(b)
  if (aIsArray !== bIsArray) return false

  if (aIsArray) {
    const aa = a as unknown[]
    const bb = b as unknown[]
    if (aa.length !== bb.length) return false
    for (let i = 0; i < aa.length; i++) {
      if (!deepEqual(aa[i], bb[i])) return false
    }
    return true
  }

  const aKeys = Object.keys(a as Record<string, unknown>)
  const bKeys = Object.keys(b as Record<string, unknown>)
  if (aKeys.length !== bKeys.length) return false

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false
    if (
      !deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      )
    ) {
      return false
    }
  }
  return true
}
