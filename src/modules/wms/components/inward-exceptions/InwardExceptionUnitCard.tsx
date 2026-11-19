import { Link } from "react-router-dom"

import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"
import { formatINR } from "@/lib/currency"
import { formatIST_date } from "@shared/lib/date"
import { EMPTY_VALUE } from "@/shared/constants"
import { usePart, useVariant } from "@modules/ims"
import {
  deviceStatusBadge,
  rentalSalesOrderPath,
  rentalUnitPath,
  type DeviceDisplayStatus,
} from "@modules/rentals"

import type { InwardException } from "../../api"
import { Detail } from "../shared/Detail"
import { INWARD_EXCEPTIONS_STRINGS } from "./inward-exceptions.strings"

const S = INWARD_EXCEPTIONS_STRINGS.unitCard
type RentalUnit = NonNullable<InwardException["rental_unit"]>

const linkClass = "min-w-0 break-words text-primary hover:underline"

/** The rental unit a held box is, and its sales order — what ops needs to
 *  recognise the box before linking or stocking it. */
export function InwardExceptionUnitCard({ row }: { row: InwardException }) {
  const unit = row.rental_unit
  return (
    <Card>
      <CardHeader>
        <CardTitle>{S.title}</CardTitle>
        <CardDescription>{S.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {unit ? (
          <UnitFacts unit={unit} />
        ) : (
          <Typography variant="body" tone="muted">
            {S.noUnit}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

function UnitFacts({ unit }: { unit: RentalUnit }) {
  const badge = deviceStatusBadge(unit.status as DeviceDisplayStatus, false)
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Detail
        label={S.salesOrder}
        value={
          <Link to={rentalSalesOrderPath(unit.sales_order_id)} className={linkClass}>
            {unit.sales_order_number ?? EMPTY_VALUE}
          </Link>
        }
      />
      <Detail
        label={S.serial}
        value={
          <Link to={rentalUnitPath(unit.rental_device_id)} className={linkClass}>
            {unit.serial_number ?? EMPTY_VALUE}
          </Link>
        }
      />
      <PartFacts unit={unit} />
      <Detail
        label={S.status}
        value={<StatusBadge variant={badge.variant ?? "neutral"}>{badge.label ?? unit.status}</StatusBadge>}
      />
      <Detail label={S.rate} value={formatINR(Number(unit.monthly_rate))} />
      <Detail
        label={S.contractEnd}
        value={unit.contracted_end_date ? formatIST_date(unit.contracted_end_date) : EMPTY_VALUE}
      />
    </div>
  )
}

/** Part name and number: the IMS part's when the unit is mapped to one,
 *  else what the rental book recorded — the part number, and the first line
 *  of the description, which is the part's name for a migrated unit. */
function PartFacts({ unit }: { unit: RentalUnit }) {
  const variantId = unit.part_variant_id ?? ""
  const variant = useVariant(variantId).data
  const part = usePart(variant?.part_id ?? "").data
  const bookedName = unit.description?.split("\n")[0]?.trim() || null
  return (
    <>
      <Detail label={S.partName} value={part?.name ?? bookedName ?? EMPTY_VALUE} />
      <Detail label={S.partNumber} value={part?.part_number ?? unit.part_number ?? EMPTY_VALUE} />
      <Detail
        label={S.imsPart}
        value={
          !variantId ? S.notMapped : variant ? `${variant.name} · ${variant.sku_code}` : EMPTY_VALUE
        }
      />
    </>
  )
}
