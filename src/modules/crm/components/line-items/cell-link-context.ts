import { createContext } from "react"

/** The href every read-only cell of the current row opens instead of the
 *  full-value modal; undefined → the modal. See `CellLink`. */
export const CellLinkContext = createContext<string | undefined>(undefined)
