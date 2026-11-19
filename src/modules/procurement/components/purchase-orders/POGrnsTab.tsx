import { useState } from "react"
import { GRN_STATUS_LABELS, GRN_STATUS_VARIANT, useGrnBatches } from "@modules/wms"
import type { GrnBatchListItem } from "@modules/wms"

import { Typography } from "@/components/ui/typography"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { EntityRef } from "@/components/common/display/EntityRef"
import { TruncatedText } from "@/components/common/display/TruncatedText"
import { TablePagination } from "@/components/common/tables/TablePagination"
import { LoadErrorState } from "@shared/components/feedback/LoadErrorState"
import { formatIST_date } from "@shared/lib/date"

import { DASH, DETAIL_S } from "./po-detail-helpers"
import { PO_RECEIPTS_PAGE_SIZE, poGrnParams } from "./po-receipts-query"

const G = DETAIL_S.grns

function warehouseLabel(row: GrnBatchListItem): string {
  const wh = row.to_warehouse
  if (!wh) return DASH
  return wh.code ? `${wh.code} — ${wh.name}` : wh.name
}

/** GRNs tab — every inward batch received against this PO, newest first. Each
 *  GRN number opens the batch (and its devices) in WMS. */
export function POGrnsTab({ poId }: { poId: string }) {
  const [page, setPage] = useState(1)
  const query = useGrnBatches(poGrnParams(poId, page))

  if (query.isLoading) {
    return (
      <div className="space-y-2 px-[18px] py-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }
  if (query.isError) {
    return <LoadErrorState error={query.error} fallback={G.loadFailed} compact className="m-4" />
  }

  const rows = query.data?.items ?? []
  const total = query.data?.total ?? 0
  if (rows.length === 0) {
    return (
      <Typography variant="body" tone="muted" asChild>
        <p className="px-[18px] py-6">{G.empty}</p>
      </Typography>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>
              <Typography variant="badge" tone="muted">{G.columns.grnNumber}</Typography>
            </TableHead>
            <TableHead>
              <Typography variant="badge" tone="muted">{G.columns.warehouse}</Typography>
            </TableHead>
            <TableHead className="text-right">
              <Typography variant="badge" tone="muted">{G.columns.units}</Typography>
            </TableHead>
            <TableHead>
              <Typography variant="badge" tone="muted">{G.columns.receivedBy}</Typography>
            </TableHead>
            <TableHead>
              <Typography variant="badge" tone="muted">{G.columns.status}</Typography>
            </TableHead>
            <TableHead>
              <Typography variant="badge" tone="muted">{G.columns.created}</Typography>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((grn) => (
            <TableRow key={grn.id} className="hover:bg-transparent">
              <TableCell className="align-top">
                <Typography variant="body-strong">
                  <EntityRef kind="grn" id={grn.id} value={grn.grn_number} />
                </Typography>
              </TableCell>
              <TableCell className="max-w-56 align-top">
                <TruncatedText value={warehouseLabel(grn)} />
              </TableCell>
              <TableCell className="align-top text-right tabular-nums">
                {grn.unit_count}
              </TableCell>
              <TableCell className="max-w-44 align-top">
                <TruncatedText value={grn.received_by_user?.name ?? DASH} />
              </TableCell>
              <TableCell className="align-top">
                <StatusBadge variant={GRN_STATUS_VARIANT[grn.status]}>
                  {GRN_STATUS_LABELS[grn.status]}
                </StatusBadge>
              </TableCell>
              <TableCell className="align-top">
                <Typography variant="body" tone="muted">
                  {formatIST_date(grn.created_at)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        className="border-t border-border px-[18px] py-3"
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PO_RECEIPTS_PAGE_SIZE))}
        pageSize={PO_RECEIPTS_PAGE_SIZE}
        total={total}
        isFetching={query.isFetching}
        onPageChange={setPage}
      />
    </>
  )
}
