import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"

import { RentalReturnLineRow } from "./RentalReturnLineRow"
import { RENTAL_RETURN_REQUESTS_STRINGS as S } from "./rental-return-requests.strings"
import type { RentalReturnDetailState } from "../../hooks/rental-return-requests/useRentalReturnDetail"

const A = S.detail.approval

type Props = {
  state: RentalReturnDetailState
  onApprove: () => void
  onReject: () => void
}

/** The lines, with the PM's batch approve / reject bar. */
export function RentalReturnLinesCard({ state, onApprove, onReject }: Props) {
  const picked = state.selectedDecidable.length
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>{S.detail.lines.heading}</CardTitle>
        {picked > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <Typography variant="caption" tone="muted">
              {A.selected(picked)}
            </Typography>
            <Button size="sm" onClick={onApprove} disabled={state.deciding}>
              {A.approve}
            </Button>
            <Button size="sm" variant="outline" onClick={onReject} disabled={state.deciding}>
              {A.reject}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {/* Inner-scroll past ~10 lines so the header/action bar stay put (§7). */}
        <ul className="max-h-[32rem] divide-y overflow-y-auto">
          {state.items.map((item) => (
            <RentalReturnLineRow
              key={item.id}
              item={item}
              canDecide={state.canDecide}
              selectedIds={state.selectedIds}
              toggle={state.toggle}
              canCloseLine={state.canCloseLine}
              setCloseTarget={state.setCloseTarget}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
