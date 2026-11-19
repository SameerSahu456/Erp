import { Link } from "react-router-dom"
import { ArrowUpRight, Package, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { formatINRCompact } from "@/lib/currency"
import { stripHtml } from "@/lib/utils"

import {
  MATERIAL_INQUIRY_STATUS_LABELS,
  MATERIAL_INQUIRY_STATUS_VARIANT,
} from "../../constants/material-inquiry-status"
import type { useMIResponseDetail } from "../../hooks/material-inquiries/useMIResponseDetail"
import { KV, LinkedEntityKV } from "./MIResponseStatBits"
import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

type Detail = ReturnType<typeof useMIResponseDetail>

export function MIResponseSidebar({
  detail,
  response,
}: {
  detail: Detail
  response: NonNullable<Detail["response"]>
}) {
  const { item, categoryNameById, mi, miIsLoading, miIsError, assignedToName, backHref } = detail

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{S.sidebar.vendorTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <User className="size-3" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">
                {response.vendor.name}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {response.vendor.code}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inquiry Item — the line this response answers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{S.sidebar.inquiryItemTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {item ? (
            <>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Package className="size-3" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">
                    {item.item_name}
                  </p>
                  {item.category_id &&
                    categoryNameById.get(item.category_id) && (
                      <Badge variant="secondary" className="mt-1">
                        {categoryNameById.get(item.category_id)}
                      </Badge>
                    )}
                </div>
              </div>
              {item.description && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {stripHtml(item.description)}
                </p>
              )}
              <div className="space-y-1.5 border-t pt-2.5 text-xs">
                <KV label={S.sidebar.qtyRequested} value={S.sidebar.units(item.qty_requested)} />
                {item.client_budget_per_unit != null && (
                  <KV
                    label={S.sidebar.clientBudgetPerUnit}
                    value={formatINRCompact(item.client_budget_per_unit, { decimals: true })}
                  />
                )}
                {item.client_timeline && (
                  <KV label={S.sidebar.clientTimeline} value={item.client_timeline} />
                )}
              </div>
            </>
          ) : miIsLoading ? (
            <p className="text-xs italic text-muted-foreground">
              {S.sidebar.loadingItem}
            </p>
          ) : (
            <p className="text-xs italic text-muted-foreground">
              {S.sidebar.itemUnavailable}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Parent Inquiry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{S.sidebar.parentInquiryTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <Link
            to={backHref}
            className="group flex items-center justify-between rounded-lg border bg-muted/10 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-muted/30"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">
                {mi ? mi.enquiry_number : S.sidebar.materialInquiryFallback}
              </p>
              {mi?.description && (
                <p
                  className="truncate text-xs text-muted-foreground"
                  title={stripHtml(mi.description)}
                >
                  {stripHtml(mi.description)}
                </p>
              )}
            </div>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>

          {mi ? (
            <div className="space-y-1.5 text-xs">
              {mi.assigned_to_id && (
                <KV label={S.sidebar.assignedTo} value={assignedToName} />
              )}
              {mi.lead_id && <LinkedEntityKV type="lead" id={mi.lead_id} />}
              {mi.deal_id && <LinkedEntityKV type="deal" id={mi.deal_id} />}
              {mi.client_budget != null && mi.client_budget > 0 && (
                <KV
                  label={S.sidebar.overallBudget}
                  value={formatINRCompact(mi.client_budget, { decimals: true })}
                />
              )}
              {mi.client_timeline && (
                <KV label={S.sidebar.clientTimeline} value={mi.client_timeline} />
              )}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-muted-foreground">{S.sidebar.status}</span>
                <StatusBadge variant={MATERIAL_INQUIRY_STATUS_VARIANT[mi.status] ?? "neutral"}>
                  {MATERIAL_INQUIRY_STATUS_LABELS[mi.status] ?? mi.status}
                </StatusBadge>
              </div>
            </div>
          ) : miIsLoading ? (
            <p className="text-xs italic text-muted-foreground">
              {S.sidebar.loadingDetails}
            </p>
          ) : miIsError ? (
            <p className="text-xs italic text-muted-foreground">
              {S.sidebar.detailsUnavailable}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
