import { useEffect, useRef, useState } from 'react'

/**
 * Drop-in replacement for useState that persists to sessionStorage under `key`.
 * Survives in-app navigation (e.g. list → detail → back) but resets when the
 * tab closes, so URLs stay clean and nothing leaks between sessions.
 *
 * If `key` is the empty string, behaves exactly like useState with no
 * persistence (useful when persistence is conditional).
 */
export function usePersistedState<T>(
  key: string,
  initial: T | (() => T),
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (!key) return typeof initial === 'function' ? (initial as () => T)() : initial
    try {
      const raw = sessionStorage.getItem(key)
      if (raw !== null) return JSON.parse(raw) as T
    } catch {
      // corrupt storage — fall through to initial
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial
  })

  const firstRun = useRef(true)
  useEffect(() => {
    if (!key) return
    // Skip the first write — initial state was already loaded from storage (or is the default)
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage quota exceeded — silently drop; this is non-critical
    }
  }, [key, value])

  return [value, setValue]
}

/** Clear a persisted-state key (e.g. after a successful form submit). */
export function clearPersistedState(key: string) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* noop */
  }
}

