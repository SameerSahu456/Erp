import { useEffect, useRef, useState } from "react";

/**
 * Caret-safe mirror for a controlled text `<input>` whose value is owned
 * upstream (a URL param, a parent hook, a store — anything more than one render
 * away from the input).
 *
 * The problem: when an `<input>`'s `value` comes from upstream state, editing
 * mid-string can reset the caret to the END. Each keystroke triggers an upstream
 * update (often a `setSearchParams` navigation), the value round-trips back down,
 * and React re-commits `node.value` from a source that doesn't match the DOM at
 * caret-time — the browser then drops the selection to the end. This is why the
 * URL-backed list searches "jump to end" when you delete from the start.
 *
 * The fix: bind the input to LOCAL state that's updated synchronously inside the
 * same change handler as the native edit, so React never re-commits a lagging
 * value and the caret stays put. Changes still propagate upstream via `onChange`.
 * When the upstream value changes for a reason OTHER than our own echo — a Clear
 * button, a tab switch, a back/forward navigation — we adopt it.
 *
 * Usage:
 *   const [value, onValueChange] = useMirroredValue(externalValue, onExternalChange)
 *   <input value={value} onChange={(e) => onValueChange(e.target.value)} />
 */
export function useMirroredValue(
  external: string,
  onChange: (next: string) => void,
): [string, (next: string) => void] {
  const [local, setLocal] = useState(external);

  // The last value we emitted upstream. Lets us distinguish our own echo (the
  // upstream value catching up to what the user typed — ignore it) from a
  // genuine external reset (adopt it).
  const echoRef = useRef(external);

  useEffect(() => {
    if (external !== echoRef.current) {
      echoRef.current = external;
      setLocal(external);
    }
  }, [external]);

  function handleChange(next: string) {
    echoRef.current = next;
    setLocal(next); // synchronous → DOM value matches → caret preserved
    onChange(next);
  }

  return [local, handleChange];
}
