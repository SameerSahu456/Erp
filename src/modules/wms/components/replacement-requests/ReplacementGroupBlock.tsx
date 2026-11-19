import type { ReactNode } from "react"

/** Fragment wrapper so grouped rows stay sibling `<tr>`s (valid table markup). */
export function GroupBlock({ children }: { children: ReactNode }) {
  return <>{children}</>
}
