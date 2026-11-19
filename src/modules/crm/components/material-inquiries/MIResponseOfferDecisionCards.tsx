import { CheckCircle2, Clock, Package, User, XCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { formatINRCompact } from "@/lib/currency"
import { formatIST } from "@shared/lib/date"

import { MI_RESPONSE_PM_STATUS_VARIANT } from "../../constants/mi-response-status"
import type { useMIResponseDetail } from "../../hooks/material-inquiries/useMIResponseDetail"
import { Metric } from "./MIResponseStatBits"
import { MATERIAL_INQUIRIES_STRINGS as S } from "./material-inquiries.strings"

type Detail = ReturnType<typeof useMIResponseDetail>

export function MIResponseOfferDecisionCards({
  detail,
  response,
}: {
  detail: Detail
  response: NonNullable<Detail["response"]>
}) {
  const status = response.pm_status

  return (
    <>
      {/* Vendor offer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Package className="size-3.5" />
            </span>
            {S.offerDecision.vendorOfferTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Metric label={S.offerDecision.qtyAvailable} value={S.offerDecision.units(response.qty_available)} />
            <Metric
              label={S.offerDecision.qtyAllocated}
              value={S.offerDecision.units(response.qty_allocated)}
              tone={response.qty_allocated > 0 ? "success" : "default"}
            />
            <Metric
              label={S.offerDecision.costPerUnit}
              value={formatINRCompact(response.cost_price, { decimals: true })}
            />
            <Metric label={S.offerDecision.totalCost} value={formatINRCompact(detail.totalCost, { decimals: true })} />
            <Metric
              label={S.offerDecision.margin}
              value={response.margin_pct != null ? `${response.margin_pct}%` : "—"}
            />
            <Metric
              label={S.offerDecision.sellPerUnit}
              value={
                response.sell_price != null
                  ? formatINRCompact(response.sell_price, { decimals: true })
                  : "—"
              }
              tone={response.sell_price != null ? "success" : "default"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Procurement response */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <User className="size-3.5" />
            </span>
            {S.offerDecision.procurementResponseTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <Metric label={S.offerDecision.respondedBy} value={detail.respondedByName} />
            <Metric label={S.offerDecision.respondedOn} value={formatIST(response.responded_at)} />
          </div>
        </CardContent>
      </Card>

      {/* PM decision */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <span
              className={`inline-flex size-6 items-center justify-center rounded-md ${
                status === "approved"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : status === "rejected"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              }`}
            >
              {status === "approved" ? (
                <CheckCircle2 className="size-3.5" />
              ) : status === "rejected" ? (
                <XCircle className="size-3.5" />
              ) : (
                <Clock className="size-3.5" />
              )}
            </span>
            {S.offerDecision.pmDecisionTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge variant={MI_RESPONSE_PM_STATUS_VARIANT[status]}>
              {status === "approved" ? (
                <>
                  <CheckCircle2 className="mr-1 size-3" /> {S.offerDecision.approved}
                </>
              ) : status === "rejected" ? (
                <>
                  <XCircle className="mr-1 size-3" /> {S.offerDecision.rejected}
                </>
              ) : (
                <>
                  <Clock className="mr-1 size-3" /> {S.offerDecision.pendingPm}
                </>
              )}
            </StatusBadge>
            {response.pm_actioned_by && (
              <span className="text-xs text-muted-foreground">
                {S.offerDecision.byPrefix}{" "}
                <span className="font-medium text-foreground/80">
                  {detail.pmActionedByName}
                </span>
              </span>
            )}
            {response.pm_actioned_at && (
              <span className="text-xs text-muted-foreground">
                · {formatIST(response.pm_actioned_at)}
              </span>
            )}
          </div>

          {response.pm_notes ? (
            <div
              className={`rounded-lg border-l-[3px] px-4 py-3 ${
                status === "approved"
                  ? "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : status === "rejected"
                    ? "border-l-destructive bg-destructive/5"
                    : "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
              }`}
            >
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {S.offerDecision.descriptionLabel}
              </p>
              <div
                className="rte-content mt-1 text-sm leading-relaxed text-foreground/85"
                dangerouslySetInnerHTML={{ __html: response.pm_notes }}
              />
            </div>
          ) : status !== "pending" ? (
            <p className="text-xs italic text-muted-foreground">
              {S.offerDecision.noNote}
            </p>
          ) : (
            <p className="rounded-lg border border-dashed bg-muted/10 py-3 text-center text-xs italic text-muted-foreground">
              {S.offerDecision.waiting}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
