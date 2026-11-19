import { Badge } from "@/components/ui/badge"

import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"

/** "Rental" on a replacement request raised against a rental order — on the
 *  list, the detail header and the PM approvals queue. Same look as the
 *  rental tag on the sales-order list, so the two read as one marker.
 *  Renders nothing for a sale order's request. */
export function RentalOrderTag({ isRental }: { isRental: boolean | null | undefined }) {
  if (!isRental) return null
  return (
    <Badge variant="info" size="sm" title={S.rentalTagHint}>
      {S.rentalTag}
    </Badge>
  )
}
