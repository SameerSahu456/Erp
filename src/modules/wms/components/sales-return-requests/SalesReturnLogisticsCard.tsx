import { Barcode, CalendarClock, Package, Pencil, Truck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatIST_date } from "@shared/lib/date"
import type { SalesReturnRequestWire } from "@modules/crm"

import { DetailFact, FactGrid } from "../shared/section-primitives"
import {
  SALES_RETURN_PICKUP_LABEL,
  type SalesReturnPickupBy,
} from "../../constants/sales-return-status"
import { SALES_RETURN_REQUESTS_STRINGS as S } from "./sales-return-requests.strings"

interface SalesReturnLogisticsCardProps {
  sret: SalesReturnRequestWire
  /** Show the Edit affordance (editable status AND a warehouse user). */
  canEdit: boolean
  onEdit: () => void
}

/** Logistics — recorded, never state-bearing. Editing a few fields is a
 *  dialog, not an inline swap (§2 / §3.1). */
export function SalesReturnLogisticsCard({
  sret,
  canEdit,
  onEdit,
}: SalesReturnLogisticsCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Truck className="size-4 text-primary" />
          {S.detail.logistics.heading}
        </CardTitle>
        {/* Cancelled / rejected returns are terminal — logistics is
            read-only. Outline + icon mirrors the Dispatch
            detail page for a consistent edit affordance. */}
        {canEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="size-4" data-icon="inline-start" />
            {S.detail.logistics.edit}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <FactGrid>
          <DetailFact
            icon={Truck}
            label={S.detail.logistics.pickupBy}
            value={
              sret.pickup_by
                ? (SALES_RETURN_PICKUP_LABEL[
                    sret.pickup_by as SalesReturnPickupBy
                  ] ?? sret.pickup_by)
                : S.detail.lines.unknown
            }
          />
          <DetailFact
            icon={Package}
            label={S.detail.logistics.courier}
            value={sret.courier_name ?? S.detail.lines.unknown}
          />
          <DetailFact
            icon={Barcode}
            label={S.detail.logistics.awb}
            value={sret.awb_number ?? S.detail.lines.unknown}
          />
          <DetailFact
            icon={CalendarClock}
            label={S.detail.logistics.expectedArrival}
            value={
              sret.expected_arrival_date
                ? formatIST_date(sret.expected_arrival_date)
                : S.detail.lines.unknown
            }
          />
        </FactGrid>
      </CardContent>
    </Card>
  )
}
