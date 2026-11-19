import { Link } from "react-router-dom"

import { StatusBadge } from "@/components/common/display/StatusBadge"
import { formatIST_date } from "@shared/lib/date"

import type { InwardException } from "../../api"
import {
  INWARD_EXCEPTION_STATUS_LABEL,
  INWARD_EXCEPTION_STATUS_VARIANT,
  RETURN_METHOD_LABEL,
  type InwardExceptionStatus,
  type ReturnMethod,
} from "../../constants/inward-exception"
import {
  RENTAL_SCAN_KIND_LABEL,
  RENTAL_SCAN_KIND_VARIANT,
  type RentalScanKind,
} from "../../constants/rental-scan"
import { Detail } from "../shared/Detail"
import { inwardExceptionSourcePath } from "./inward-exceptions-helpers"
import { INWARD_EXCEPTIONS_STRINGS as S } from "./inward-exceptions.strings"

const F = S.detail.facts
const date = (v: string | null) => (v ? formatIST_date(v) : F.none)

/** Every fact about a held box — what was scanned, what it is, and how it
 *  was resolved. */
export function InwardExceptionFacts({ row }: { row: InwardException }) {
  const kind = row.kind as RentalScanKind
  const status = row.status as InwardExceptionStatus
  const method = row.return_method as ReturnMethod | null
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Detail
        label={F.kind}
        value={<StatusBadge variant={RENTAL_SCAN_KIND_VARIANT[kind] ?? "neutral"}>{RENTAL_SCAN_KIND_LABEL[kind] ?? row.kind}</StatusBadge>}
      />
      <Detail
        label={F.status}
        value={<StatusBadge variant={INWARD_EXCEPTION_STATUS_VARIANT[status] ?? "neutral"}>{INWARD_EXCEPTION_STATUS_LABEL[status] ?? row.status}</StatusBadge>}
      />
      <Detail label={F.customer} value={row.account_name ?? F.none} />
      <Detail label={F.request} value={<SourceRequestLink row={row} />} />
      <Detail label={F.batch} value={row.grn_number ?? F.none} />
      <Detail label={F.makerSerial} value={row.scanned_manufacturer_serial ?? F.none} />
      <Detail label={F.raised} value={date(row.created_at)} />
      <Detail label={F.resolvedAt} value={date(row.resolved_at)} />
      <Detail label={F.resolutionNotes} value={row.resolution_notes ?? F.none} />
      {method && <Detail label={F.returnMethod} value={RETURN_METHOD_LABEL[method] ?? method} />}
      {row.return_challan_number && <Detail label={F.challan} value={row.return_challan_number} />}
      {row.returned_dispatched_at && <Detail label={F.dispatchedAt} value={date(row.returned_dispatched_at)} />}
      {row.returned_delivered_at && <Detail label={F.deliveredAt} value={date(row.returned_delivered_at)} />}
      <StockFacts row={row} />
    </div>
  )
}

/** When the box was brought into stock, and the unit it became. */
function StockFacts({ row }: { row: InwardException }) {
  if (!row.stocked_at || !row.stock_item_id) return null
  return (
    <>
      <Detail label={F.stockedAt} value={date(row.stocked_at)} />
      <Detail
        label={F.stockUnit}
        value={
          <Link to={`/wms/devices/${row.stock_item_id}`} className="text-primary hover:underline">
            {F.openStockUnit}
          </Link>
        }
      />
    </>
  )
}

/** The RRET / RR number, linking to that request. */
function SourceRequestLink({ row }: { row: InwardException }) {
  const path = inwardExceptionSourcePath(row)
  if (!row.request_number || !path) return <>{row.request_number ?? F.none}</>
  return (
    <Link to={path} className="min-w-0 break-words text-primary hover:underline">
      {row.request_number}
    </Link>
  )
}
