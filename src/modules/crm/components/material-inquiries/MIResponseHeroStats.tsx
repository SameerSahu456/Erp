import { CalendarDays, IndianRupee, Package } from "lucide-react"

import { formatINRCompact } from "@/lib/currency"
import { formatIST_date } from "@shared/lib/date"

import type { useMIResponseDetail } from "../../hooks/material-inquiries/useMIResponseDetail"
import { HeroStat } from "./MIResponseStatBits"
import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

type Detail = ReturnType<typeof useMIResponseDetail>

export function MIResponseHeroStats({
  response,
  item,
  qtyRequested,
  totalCost,
}: {
  response: NonNullable<Detail["response"]>
  item: Detail["item"]
  qtyRequested: number
  totalCost: number
}) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <HeroStat
        label={S.heroStats.qtyAvailable}
        value={response.qty_available.toString()}
        sub={
          item
            ? S.heroStats.ofRequested(qtyRequested)
            : response.qty_allocated > 0
              ? S.heroStats.allocated(response.qty_allocated)
              : undefined
        }
        icon={<Package className="size-4" />}
      />
      <HeroStat
        label={S.heroStats.costPerUnit}
        value={formatINRCompact(response.cost_price, { decimals: true })}
        icon={<IndianRupee className="size-4" />}
      />
      <HeroStat
        label={S.heroStats.totalCost}
        value={formatINRCompact(totalCost, { decimals: true })}
        sub={S.heroStats.units(response.qty_available)}
        icon={<IndianRupee className="size-4" />}
      />
      <HeroStat
        label={S.heroStats.availableOn}
        value={
          response.available_date
            ? formatIST_date(response.available_date)
            : "—"
        }
        icon={<CalendarDays className="size-4" />}
      />
    </div>
  )
}
