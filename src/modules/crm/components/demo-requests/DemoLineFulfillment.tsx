import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Typography } from "@/components/ui/typography"

import type { DemoStageRollupWire, DemoUnitWire } from "../../api"
import {
  DEMO_UNIT_CUSTODY_LABELS,
  DEMO_UNIT_CUSTODY_VARIANT,
} from "../../constants/demo-request-status"
import { DEMO_REQUESTS_STRINGS as S } from "./demo-requests.strings"
import { hasNoFulfillmentActivity, inProgressCount } from "./demoFulfillment"

function Count({ label, value }: { label: string; value: number }) {
  return (
    <Typography variant="helper" tone="muted" asChild>
      <span>
        <Typography variant="helper" tone="default" className="font-medium tabular-nums" asChild>
          <span>{value}</span>
        </Typography>{" "}
        {label}
      </span>
    </Typography>
  )
}

/**
 * One line's fulfillment, in the same words the card strip uses.
 *
 * Counts are shown only when non-zero: a line that is entirely with the
 * customer should read "3 With Customer", not a row of zeroes the reader has
 * to scan past to find the one number that moved.
 */
export function DemoLineFulfillment({
  totals,
  units,
}: {
  totals: DemoStageRollupWire
  units: DemoUnitWire[]
}) {
  const [open, setOpen] = useState(false)
  const F = S.detail.fulfillment

  if (hasNoFulfillmentActivity(totals)) return null

  const inProgress = inProgressCount(totals)
  const Chevron = open ? ChevronDown : ChevronRight

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {inProgress > 0 && <Count label={F.inProgress} value={inProgress} />}
        {totals.with_customer > 0 && (
          <Count label={F.withCustomer} value={totals.with_customer} />
        )}
        {totals.under_return > 0 && <Count label={F.underReturn} value={totals.under_return} />}
        {totals.returned > 0 && <Count label={F.returned} value={totals.returned} />}
        {totals.sold > 0 && <Count label={F.converted} value={totals.sold} />}
      </div>

      {units.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 rounded text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Chevron className="size-3.5 shrink-0" />
            <Typography variant="helper" tone="inherit" asChild>
              <span>
                {F.unitsTitle} ({units.length})
              </span>
            </Typography>
          </button>

          {open && (
            <ul className="mt-1.5 flex flex-col gap-1">
              {units.map((unit) => (
                <li
                  key={unit.dispatch_request_item_id}
                  className="flex items-center justify-between gap-2"
                >
                  {/* min-w-0 is load-bearing: without it the truncate below is
                      a no-op in a flex child and a long serial blows the row
                      out horizontally (Coding-guideline §8.7). */}
                  <Typography
                    variant="helper"
                    tone="muted"
                    className="min-w-0 flex-1 truncate font-mono"
                    asChild
                  >
                    <span>{unit.internal_serial}</span>
                  </Typography>
                  <StatusBadge variant={DEMO_UNIT_CUSTODY_VARIANT[unit.custody]}>
                    {DEMO_UNIT_CUSTODY_LABELS[unit.custody]}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
