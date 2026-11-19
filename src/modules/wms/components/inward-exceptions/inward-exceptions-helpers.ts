import type { InwardException } from "../../api"
import { EXCEPTION_ACTIONS_BY_KIND } from "../../constants/inward-exception"
import { rentalReturnDetailPath } from "../rental-return-requests/rental-return-request-detail-helpers"
import { LIST_ROUTE as REPLACEMENTS_ROUTE } from "../replacement-requests/replacement-request-detail-helpers"

export const INWARD_EXCEPTIONS_LIST_ROUTE = "/wms/inward-exceptions"

export const inwardExceptionDetailPath = (id: string) => `${INWARD_EXCEPTIONS_LIST_ROUTE}/${id}`

/** The return request the box arrived on — a rental return or a replacement. */
export function inwardExceptionSourcePath(row: InwardException): string | null {
  if (row.rental_return_request_id) return rentalReturnDetailPath(row.rental_return_request_id)
  if (row.replacement_request_id) return `${REPLACEMENTS_ROUTE}/${row.replacement_request_id}`
  return null
}

export type InwardExceptionAction = "stock" | "link" | "void" | "return" | "delivered"

/** Actions allowed on this exception now (§8); approve-kind links need the stronger code. */
export function inwardExceptionActions(
  row: InwardException,
  perms: { canResolve: boolean; canApprove: boolean },
): readonly InwardExceptionAction[] {
  if (!perms.canResolve) return []
  if (row.status === "returning") return ["delivered"]
  // A settled unit whose box has no stock row yet — open (a legacy unit
  // settled at finalize) or already linked. The server decides.
  const stock: InwardExceptionAction[] = row.can_bring_into_stock ? ["stock"] : []
  if (row.status !== "open") return stock
  const allowed = EXCEPTION_ACTIONS_BY_KIND[row.kind] ?? []
  // A replacement return settles its own lines at close; the server refuses
  // a link there, so it is never offered.
  const linkable = !row.replacement_request_id && (!row.needs_approval || perms.canApprove)
  return [...stock, ...allowed.filter((a) => a !== "link" || linkable)]
}
