/**
 * Sales Order detail — line items in the SAME read-only tabular grid the Quote
 * view and SO/Quote forms use (shared LineItemsGrid, `canEdit={false}`), so a
 * sales order reads exactly like its quote. Per-line approver and approval
 * status are trailing grid columns (as on the Quote view); the remaining
 * SO-only facts the grid has no column for (fulfillment, configuration notes,
 * serial, demo lineage) are listed underneath in `SoLineApprovals`.
 */
import { useMemo } from "react"
import { Link } from "react-router-dom"
import { Info } from "lucide-react"

import { StatusBadge, type StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Typography } from "@/components/ui/typography"
import { useUser } from "@modules/users"

import type {
  LineFulfillmentWire,
  SalesOrderLineReplacementWire,
  SalesOrderWire,
  SOLineCondition,
  SOLineStatus,
} from "../../../api"
import { groupSoItemsToTree, type SalesOrderItemTreeNode } from "../../../lib/bomTree"
import {
  LineItemsGrid,
  LINE_ITEMS_STRINGS,
  lineRateColumnLabel,
  type BuilderLineItem,
  type LineItemsGridTrailingColumn,
} from "../../line-items"
import { SALES_ORDERS_STRINGS as S } from "../sales-orders.strings"
import { SoLineApprovals } from "./SoLineApprovals"
import { SoLineReplacements } from "./SoLineReplacements"

const A = S.detail.items

const LINE_STATUS_VARIANT: Record<SOLineStatus, StatusBadgeVariant> = {
  Pending: "warning",
  Approved: "success",
  Rejected: "error",
}

// The backend sends the display name with each line (`approver_name` /
// `line_decided_by_name`), so the common path renders it directly. Only when a
// name is absent (older API / unresolvable user) do we fall back to a per-id
// `useUser` lookup — disabled (empty id) whenever a name is already in hand.
function ApproverName({
  approverId,
  name,
  isDraft,
}: {
  approverId: string | null
  name: string | null | undefined
  isDraft: boolean
}) {
  const userQuery = useUser(name ? "" : (approverId ?? ""))
  if (!approverId) {
    // A never-submitted Draft has no approver yet — that is not "missing".
    return (
      <Typography variant="helper" tone={isDraft ? "muted" : "danger"}>
        {isDraft ? LINE_ITEMS_STRINGS.grid.placeholders.conditionDash : S.detail.approver.missing}
      </Typography>
    )
  }
  if (name) {
    return (
      <Typography variant="helper" className="block truncate" title={name}>
        {name}
      </Typography>
    )
  }
  const user = userQuery.data
  if (!user) {
    return (
      <Typography variant="helper" tone="muted" className={userQuery.isLoading ? undefined : "font-mono"}>
        {userQuery.isLoading ? S.detail.approver.loading : `${approverId.slice(0, 8)}…`}
      </Typography>
    )
  }
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ")
  return (
    <Typography variant="helper" className="block truncate">
      {displayName || user.email}
    </Typography>
  )
}

function LineStatusCell({ node }: { node: SalesOrderItemTreeNode }) {
  const isRejected = node.line_status === "Rejected"
  const reason = isRejected || node.line_status === "Approved" ? node.line_decision_notes?.trim() : null
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <StatusBadge variant={LINE_STATUS_VARIANT[node.line_status]}>{node.line_status}</StatusBadge>
      {reason && (
        <TooltipProvider delay={150}>
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  className={`inline-flex shrink-0 cursor-help ${isRejected ? "text-destructive" : "text-success"}`}
                  aria-label={isRejected ? A.rejectionReason : A.approvalReason}
                >
                  <Info className="size-3.5" />
                </span>
              }
            />
            <TooltipContent className="whitespace-pre-wrap">{reason}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </span>
  )
}

function useApprovalColumns(
  tree: SalesOrderItemTreeNode[],
  isDraft: boolean,
): LineItemsGridTrailingColumn[] {
  return useMemo(() => {
    const byId = new Map(tree.map((n) => [n.id, n]))
    return [
      {
        key: "approver",
        header: A.columns.approver,
        widthClassName: "w-32",
        renderCell: (line) => {
          const node = byId.get(line.id)
          if (!node) return null
          // Once a line has been decided, show the user who decided it — not
          // the approver it was assigned to (a PM or superuser may have acted
          // on it). Pending lines (no `line_decided_by_id`) keep showing the
          // assigned approver.
          const decided = node.line_decided_by_id != null
          return (
            <ApproverName
              approverId={decided ? node.line_decided_by_id : node.approver_id}
              name={decided ? node.line_decided_by_name : node.approver_name}
              isDraft={isDraft}
            />
          )
        },
      },
      {
        key: "status",
        header: A.columns.status,
        widthClassName: "w-32",
        renderCell: (line) => {
          const node = byId.get(line.id)
          return node ? <LineStatusCell node={node} /> : null
        },
      },
    ]
  }, [tree, isDraft])
}

// Ret Qty column — rendered right after Qty via the grid's
// `afterQtyColumn` slot so it sits visually adjacent to the quantity
// field. Only surfaced when the SO has had any physical return so
// normal orders don't carry an extra empty column.
function useReturnQtyColumn(
  tree: SalesOrderItemTreeNode[],
): LineItemsGridTrailingColumn | undefined {
  return useMemo(() => {
    const byId = new Map(tree.map((n) => [n.id, n]))
    const anyReturned = tree.some((n) => Number(n.returned_qty ?? 0) > 0)
    if (!anyReturned) return undefined
    return {
      key: "returnQty",
      header: A.columns.returnQty,
      widthClassName: "w-20 right",
      renderCell: (line) => {
        const node = byId.get(line.id)
        if (!node) return null
        const returned = Number(node.returned_qty ?? 0)
        if (returned <= 0) {
          return (
            <Typography variant="helper" tone="muted" numeric align="end">
              —
            </Typography>
          )
        }
        const fully = returned >= Number(node.qty)
        return (
          <Typography variant="helper" tone={fully ? "warning" : "info"} numeric align="end">
            {returned}
          </Typography>
        )
      },
    }
  }, [tree])
}

const noop = () => {}

/** Hydrate the flat SO wire items into the shared grid's line model — the same
 *  projection the SO edit form uses (`useSalesOrderForm`), minus form drafts.
 *  `Remove` BOM rows are skipped: the grid only models `Add` components. */
function soItemsToBuilderLines(items: SalesOrderWire["items"]): BuilderLineItem[] {
  return groupSoItemsToTree(items).map((it) => ({
    id: it.id,
    serverId: it.id,
    type: it.part_variant_id ? "ims_part" : "description",
    partId: it.part_variant_id ?? undefined,
    partName: it.part_variant_id ? it.item_name : undefined,
    itemName: it.item_name,
    categoryId: it.category_id,
    oemId: it.oem_id ?? undefined,
    condition: (it.condition ?? undefined) as SOLineCondition | undefined,
    description: it.description ?? "",
    qty: Number(it.qty),
    rate: Number(it.rate),
    // Catalog sell_price snapshot taken when the line was picked — the grid's
    // List Price cell shows "0" when this is left off the builder line.
    listPrice: it.list_price ?? undefined,
    discountAmount: Number(it.discount_amount ?? 0),
    taxRate: Number(it.tax_rate ?? 0),
    isRental: it.is_rental,
    rentalPeriod: it.rental_period ?? undefined,
    rentalStartDate: it.rental_start_date ?? undefined,
    rentalEndDate: it.rental_end_date ?? undefined,
    warrantyLevel: it.warranty_level ?? undefined,
    bomChildren: it.children
      .filter((c) => c.config_action !== "Remove")
      .map((c) => ({
        id: c.id,
        serverChildId: c.id,
        partId: c.part_variant_id ?? undefined,
        itemName: c.item_name,
        categoryId: c.category_id ?? undefined,
        oemId: c.oem_id ?? undefined,
        condition: (c.condition ?? undefined) as SOLineCondition | undefined,
        description: c.description ?? undefined,
        qty: Number(c.qty),
        rate: Number(c.rate),
        listPrice: c.list_price ?? undefined,
        taxRate: Number(c.tax_rate ?? 0),
        discountAmount: Number(c.discount_amount ?? 0),
        warrantyLevel: c.warranty_level ?? undefined,
      })),
    isBomExpanded: true,
  }))
}

/** RENTALS ONLY — a trailing column that opens a line's tracked units and, while
 *  some of them are out, the Rental Return Request form scoped to that line. */
function useRentalColumn(
  trackedLineHref: ((lineId: string) => string) | undefined,
  returnLineHref: ((lineId: string) => string | undefined) | undefined,
): LineItemsGridTrailingColumn[] {
  return useMemo(() => {
    if (!trackedLineHref) return []
    return [
      {
        key: "rental",
        header: A.columns.rental,
        widthClassName: "w-36",
        renderCell: (line) => {
          const returnHref = returnLineHref?.(line.id)
          return (
            <span className="flex flex-col gap-0.5">
              <Link to={trackedLineHref(line.id)} className="text-primary hover:underline">
                <Typography variant="helper" tone="inherit">{S.detail.items.viewUnits}</Typography>
              </Link>
              {returnHref ? (
                <Link to={returnHref} className="text-primary hover:underline">
                  <Typography variant="helper" tone="inherit">{S.detail.items.raiseReturn}</Typography>
                </Link>
              ) : null}
            </span>
          )
        },
      },
    ]
  }, [trackedLineHref, returnLineHref])
}

export function SoDetailItemsGrid({
  so,
  fulfillmentByLineId,
  trackedLineHref,
  returnLineHref,
  replacementsByLineId,
}: {
  so: SalesOrderWire
  fulfillmentByLineId?: Map<string, LineFulfillmentWire>
  /** Approved replacements per line, appended under it. */
  replacementsByLineId?: Map<string, SalesOrderLineReplacementWire[]>
  /** Rentals only: where a line's tracked units live. Omitted → no Rental column. */
  trackedLineHref?: (lineId: string) => string
  /** Rentals only: the return form for one line, or undefined when nothing is out. */
  returnLineHref?: (lineId: string) => string | undefined
}) {
  const tree = useMemo(() => groupSoItemsToTree(so.items), [so.items])
  const lines = useMemo(() => soItemsToBuilderLines(so.items), [so.items])
  const approvalColumns = useApprovalColumns(tree, so.status === "Draft")
  const rentalColumns = useRentalColumn(trackedLineHref, returnLineHref)
  const trailingColumns = useMemo(() => [...approvalColumns, ...rentalColumns], [approvalColumns, rentalColumns])
  const returnQtyColumn = useReturnQtyColumn(tree)

  // Amount column = server-computed `gross_amount` (qty × rate, before
  // discount & tax) — the same figure the Quote / SO grids show.
  const calcAmounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const it of tree) m.set(it.id, Number(it.gross_amount))
    return m
  }, [tree])

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <LineItemsGrid
          priceLabel={lineRateColumnLabel(so.sellable_type === "rental_sales")}
          lines={lines}
          errors={{}}
          canEdit={false}
          showTax
          calcAmounts={calcAmounts}
          subtotal={Number(so.subtotal)}
          afterQtyColumn={returnQtyColumn}
          trailingColumns={trailingColumns}
          // An approved replacement is appended under the line it replaces —
          // the line itself stays what was ordered.
          renderLineDetail={(line) => {
            const replacements = replacementsByLineId?.get(line.id)
            return replacements?.length ? (
              <SoLineReplacements
                replacements={replacements}
                isRental={so.sellable_type === "rental_sales"}
              />
            ) : null
          }}
          // Rentals: every cell, at every level, opens the line's units in
          // Device Tracking instead of the full-value modal.
          cellHref={trackedLineHref}
          errorSummaryId="so-detail-items-error"
          onPatchLine={noop}
          onPickPart={noop}
          onPickChildPart={noop}
          onRemoveLine={noop}
          onAddChild={noop}
          onRemoveChild={noop}
          onPatchChild={noop}
        />
        <SoLineApprovals tree={tree} fulfillmentByLineId={fulfillmentByLineId} />
      </CardContent>
    </Card>
  )
}
