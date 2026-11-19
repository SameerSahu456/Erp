import { useState } from "react"
import {
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANT,
  useDevices,
  useDeviceStats,
  workflowStageBadge,
} from "@modules/wms"
import type { DeviceSummary } from "@modules/wms"

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
import { useDebounce } from "@/shared/hooks"
import { UI } from "@/shared/constants"

import type { PurchaseOrderItemView } from "../../api"

import { DASH, DETAIL_S } from "./po-detail-helpers"
import {
  EMPTY_PO_DEVICE_FILTERS,
  hasActiveDeviceFilters,
  PO_RECEIPTS_PAGE_SIZE,
  poDeviceParams,
  poDeviceStatsParams,
  type PODeviceFilters,
} from "./po-receipts-query"
import { PODevicesClearFilters, PODevicesFilters } from "./PODevicesFilters"
import { PODeviceStageTabs } from "./PODeviceStageTabs"

const D = DETAIL_S.devices

function productLabel(d: DeviceSummary): string {
  return d.part_variant_name ?? d.part_name ?? DASH
}

function StageCell({ device }: { device: DeviceSummary }) {
  if (!device.workflow_status) {
    return (
      <Typography variant="body" tone="muted">
        {DASH}
      </Typography>
    )
  }
  const badge = workflowStageBadge(
    device.workflow_status,
    device.vendor_prior_workflow_status,
    device.vendor_section_names,
  )
  return <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
}

/** Devices tab — every unit inwarded on any GRN against this PO, newest first.
 *  Stage quick tabs (with counts) over a filter bar: GRN, PO line item, status,
 *  assigned engineer, received date and a serial / part search. The serial
 *  opens the device dossier; the GRN number opens its batch. */
export function PODevicesTab({
  poId,
  lineItems,
  warehouseId,
  canSeeGrns,
  canPickEngineer,
}: {
  poId: string
  lineItems: readonly PurchaseOrderItemView[]
  warehouseId: string | null
  canSeeGrns: boolean
  canPickEngineer: boolean
}) {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<PODeviceFilters>(EMPTY_PO_DEVICE_FILTERS)
  const search = useDebounce(filters.search.trim(), UI.DEBOUNCE_SEARCH_MS)
  const applied = { ...filters, search }
  const query = useDevices(poDeviceParams(poId, page, applied))
  // One stats call feeds every stage-tab count, under all the OTHER filters.
  const stats = useDeviceStats(poDeviceStatsParams(poId, applied))
  const filtered = hasActiveDeviceFilters(filters)

  // Any filter change is a new dataset — back to page 1.
  const changeFilters = (next: PODeviceFilters) => {
    setFilters(next)
    setPage(1)
  }

  // No units on this PO at all — no point offering filters.
  if (!filtered && !query.isLoading && !query.isError && (query.data?.total ?? 0) === 0) {
    return (
      <Typography variant="body" tone="muted" asChild>
        <p className="px-[18px] py-6">{D.empty}</p>
      </Typography>
    )
  }

  return (
    <>
      <PODeviceStageTabs
        total={stats.data?.total ?? 0}
        byStage={stats.data?.by_workflow_status ?? {}}
        value={filters.stage}
        onChange={(stage) => changeFilters({ ...filters, stage })}
        trailing={<PODevicesClearFilters value={filters} onChange={changeFilters} />}
      />
      <PODevicesFilters
        poId={poId}
        lineItems={lineItems}
        warehouseId={warehouseId}
        canSeeGrns={canSeeGrns}
        canPickEngineer={canPickEngineer}
        value={filters}
        onChange={changeFilters}
      />
      <div className="border-t border-border">
        <DevicesTable query={query} page={page} onPageChange={setPage} />
      </div>
    </>
  )
}

function DevicesTable({
  query,
  page,
  onPageChange,
}: {
  query: ReturnType<typeof useDevices>
  page: number
  onPageChange: (page: number) => void
}) {
  if (query.isLoading) {
    return (
      <div className="space-y-2 px-[18px] py-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }
  if (query.isError) {
    return <LoadErrorState error={query.error} fallback={D.loadFailed} compact className="m-4" />
  }

  const rows = query.data?.items ?? []
  const total = query.data?.total ?? 0
  if (rows.length === 0) {
    return (
      <Typography variant="body" tone="muted" asChild>
        <p className="px-[18px] py-6">{D.noMatches}</p>
      </Typography>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>
              <Typography variant="badge" tone="muted">{D.columns.serial}</Typography>
            </TableHead>
            <TableHead>
              <Typography variant="badge" tone="muted">{D.columns.product}</Typography>
            </TableHead>
            <TableHead>
              <Typography variant="badge" tone="muted">{D.columns.grn}</Typography>
            </TableHead>
            <TableHead>
              <Typography variant="badge" tone="muted">{D.columns.warehouse}</Typography>
            </TableHead>
            <TableHead>
              <Typography variant="badge" tone="muted">{D.columns.stage}</Typography>
            </TableHead>
            <TableHead>
              <Typography variant="badge" tone="muted">{D.columns.status}</Typography>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((device) => (
            <TableRow key={device.id} className="hover:bg-transparent">
              <TableCell className="align-top">
                <Typography variant="body-strong">
                  <EntityRef kind="device" id={device.id} value={device.internal_serial} />
                </Typography>
                {device.manufacturer_serial && (
                  <Typography variant="caption" tone="muted" asChild>
                    <div>{device.manufacturer_serial}</div>
                  </Typography>
                )}
              </TableCell>
              <TableCell className="max-w-64 align-top">
                <TruncatedText value={productLabel(device)} />
              </TableCell>
              <TableCell className="align-top">
                {device.grn_number ? (
                  <EntityRef kind="grn" id={device.grn_batch_id} value={device.grn_number} />
                ) : (
                  DASH
                )}
              </TableCell>
              <TableCell className="max-w-44 align-top">
                <TruncatedText value={device.warehouse_name ?? DASH} />
              </TableCell>
              <TableCell className="align-top">
                <StageCell device={device} />
              </TableCell>
              <TableCell className="align-top">
                <StatusBadge variant={DEVICE_STATUS_VARIANT[device.status] ?? "neutral"}>
                  {DEVICE_STATUS_LABELS[device.status] ?? device.status}
                </StatusBadge>
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
        onPageChange={onPageChange}
      />
    </>
  )
}
