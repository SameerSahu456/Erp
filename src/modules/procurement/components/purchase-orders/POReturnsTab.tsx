import { Link } from "react-router-dom"

import { Typography } from "@/components/ui/typography"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { formatINRCompact } from "@/lib/currency"
import { formatIST_date } from "@shared/lib/date"

import { PURCHASE_ORDERS_STRINGS } from "./purchase-orders.strings"
import { countDispositions } from "./poReturns"
import type { PurchaseReturn } from "../../api"

const RET_S = PURCHASE_ORDERS_STRINGS.detail.returns

const STATUS_VARIANT: Record<PurchaseReturn["status"], StatusBadgeVariant> = {
  raised: "warning",
  partially_dispatched: "info",
  dispatched: "info",
  closed: "success",
  cancelled: "neutral",
}

function money(v: string): string {
  return formatINRCompact(Number(v))
}

/** The Returns tab — the audit trail shown to a disputing vendor. Each row is
 *  a PRET document linking to its detail (GRN batch + per-unit dispositions). */
export function POReturnsTab({ returns }: { returns: PurchaseReturn[] }) {
  if (returns.length === 0) {
    return (
      <Typography variant="body" tone="muted" asChild>
        <p className="px-[18px] py-6">{RET_S.empty}</p>
      </Typography>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>
            <Typography variant="badge" tone="muted">
              {RET_S.columns.pretNumber}
            </Typography>
          </TableHead>
          <TableHead className="text-center">
            <Typography variant="badge" tone="muted">
              {RET_S.columns.units}
            </Typography>
          </TableHead>
          <TableHead className="text-center">
            <Typography variant="badge" tone="muted">
              {RET_S.columns.replaced}
            </Typography>
          </TableHead>
          <TableHead className="text-center">
            <Typography variant="badge" tone="muted">
              {RET_S.columns.refunded}
            </Typography>
          </TableHead>
          <TableHead>
            <Typography variant="badge" tone="muted">
              {RET_S.columns.status}
            </Typography>
          </TableHead>
          <TableHead className="text-right">
            <Typography variant="badge" tone="muted">
              {RET_S.columns.credit}
            </Typography>
          </TableHead>
          <TableHead>
            <Typography variant="badge" tone="muted">
              {RET_S.columns.created}
            </Typography>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {returns.map((ret) => {
          const counts = countDispositions(ret.items)
          return (
            <TableRow key={ret.id} className="hover:bg-transparent">
              <TableCell className="align-top">
                <Typography
                  variant="body-strong"
                  asChild
                  className="hover:underline"
                >
                  <Link to={`/wms/purchase-returns/${ret.id}`}>
                    {ret.pret_number}
                  </Link>
                </Typography>
              </TableCell>
              <TableCell className="align-top text-center tabular-nums">
                {counts.total}
              </TableCell>
              <TableCell className="align-top text-center tabular-nums">
                {counts.replace}
              </TableCell>
              <TableCell className="align-top text-center tabular-nums">
                {counts.refund}
              </TableCell>
              <TableCell className="align-top">
                <StatusBadge variant={STATUS_VARIANT[ret.status]}>
                  {RET_S.statusLabels[ret.status]}
                </StatusBadge>
              </TableCell>
              <TableCell className="align-top text-right tabular-nums">
                {money(ret.credit_total)}
              </TableCell>
              <TableCell className="align-top">
                <Typography variant="body" tone="muted">
                  {formatIST_date(ret.created_at)}
                </Typography>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
