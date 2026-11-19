import type { ReactNode } from "react"
import {
  Ban,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarX,
  CircleDot,
  ClipboardList,
  FileText,
  ShoppingCart,
  Tag,
  UserRound,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"
import { EntityRef } from "@/components/common/display/EntityRef"
import { DetailTextBlock } from "@/components/common/display/DetailTextBlock"
import { formatIST_date } from "@shared/lib/date"
import type { SalesReturnRequestWire } from "@modules/crm"

import { DetailFact, FactGrid } from "../shared/section-primitives"
import {
  SALES_RETURN_REASON_LABEL,
  SALES_RETURN_STATUS_LABEL,
  type SalesReturnReason,
  type SalesReturnStatus,
} from "../../constants/sales-return-status"
import { SALES_RETURN_REQUESTS_STRINGS as S } from "./sales-return-requests.strings"

interface SalesReturnSectionProps {
  sret: SalesReturnRequestWire
}

/** Cancellation reason — a highlighted callout at the very top so a cancelled
 *  return shows WHY at a glance (mirrors Dispatch detail). */
export function SalesReturnCancelReasonCallout({
  cancelReason,
}: {
  cancelReason: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3.5">
      <Ban className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        <Typography
          variant="caption"
          tone="danger"
          className="font-semibold uppercase tracking-wide"
        >
          {S.detail.cancelReason}
        </Typography>
        <Typography variant="body-strong" className="break-words">
          {cancelReason}
        </Typography>
      </div>
    </div>
  )
}

/** Order number as a link when present. A function, not a component, so DetailFact gets a raw value. */
function orderFactValue(sret: SalesReturnRequestWire): ReactNode {
  if (!sret.order_number) return S.detail.lines.unknown
  if (sret.entity_type !== "sales_orders") return sret.order_number
  return (
    <EntityRef kind="sales_order" id={sret.entity_id} value={sret.order_number}>
      {sret.order_number}
    </EntityRef>
  )
}

/** Overview — the header facts, now a titled card. */
export function SalesReturnOverviewCard({ sret }: SalesReturnSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="size-4 text-primary" />
          {S.detail.overviewHeading}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 6 facts → 3 + 3; 7 (completed / cancelled) → 4 + 3. */}
        <FactGrid
          className={
            sret.completed_at || sret.cancelled_at
              ? "lg:grid-cols-4"
              : "lg:grid-cols-3"
          }
        >
          <DetailFact
            icon={ShoppingCart}
            label={S.detail.order}
            value={orderFactValue(sret)}
          />
          <DetailFact
            icon={Building2}
            label={S.detail.customer}
            value={sret.account_name ?? S.detail.lines.unknown}
          />
          <DetailFact
            icon={Tag}
            label={S.detail.reason}
            value={
              SALES_RETURN_REASON_LABEL[sret.reason as SalesReturnReason] ??
              sret.reason
            }
          />
          {/* Plain text so it lines up with the other facts; the coloured
              status pill lives in the page header (like Dispatch). */}
          <DetailFact
            icon={CircleDot}
            label={S.list.columns.status}
            value={
              SALES_RETURN_STATUS_LABEL[sret.status as SalesReturnStatus] ??
              sret.status
            }
          />
          {/* Who raised the return — the user's name, whoever it was
              (a CRM sales user or a warehouse user). */}
          <DetailFact
            icon={UserRound}
            label={S.detail.raisedBy}
            value={sret.created_by_name || S.detail.lines.unknown}
          />
          <DetailFact
            icon={Calendar}
            label={S.detail.raisedOn}
            value={formatIST_date(sret.created_at)}
          />
          {sret.completed_at && (
            <DetailFact
              icon={CalendarCheck}
              label={S.detail.completedOn}
              value={formatIST_date(sret.completed_at)}
            />
          )}
          {sret.cancelled_at && (
            <DetailFact
              icon={CalendarX}
              label={S.detail.cancelledOn}
              value={formatIST_date(sret.cancelled_at)}
            />
          )}
        </FactGrid>

        {/* Description — always full width, clamped to 3 lines with a
            "... Show more" toggle. The global note moved down to the Units
            card (it belongs with the items it applies to). */}
        {sret.description && (
          <div className="border-t pt-4">
            <DetailTextBlock
              icon={FileText}
              label={S.detail.description}
              text={sret.description}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
